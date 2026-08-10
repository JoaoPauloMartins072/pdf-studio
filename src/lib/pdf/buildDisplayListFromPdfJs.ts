import type { PDFDocumentProxy, PDFPageProxy } from "pdfjs-dist";
import { OPS } from "pdfjs-dist";
import type { DocumentDisplayList, PageDisplayList } from "@/core/display-list/types";
import type { BBox, Matrix2D, RgbColor } from "@/core/document-model/types";

type PdfJsTextItem = {
  str?: string;
  transform?: number[];
  width?: number;
  height?: number;
  fontName?: string;
};

type PdfJsTextStyle = {
  ascent?: number;
  descent?: number;
  fontFamily?: string;
  vertical?: boolean;
};

type PageGfxExtras = {
  textFills: Array<{ x: number; y: number; color: RgbColor }>;
  filledRects: Array<{ bbox: BBox; color: RgbColor }>;
};

/** Cap PDF ascent when metrics claim ~full em (common); matches pdf.js TextLayer ~0.8. */
const DEFAULT_ASCENT_RATIO = 0.8;

/**
 * Stage 1+6 bridge: pdf.js text + operator-list images → Display List.
 * Lives outside folio-core so the core stays free of pdf.js.
 */
export async function buildDisplayListFromPdfJs(
  pdf: PDFDocumentProxy,
  pageIndices?: number[],
): Promise<DocumentDisplayList> {
  const indices =
    pageIndices ?? Array.from({ length: pdf.numPages }, (_, i) => i);

  const pages: PageDisplayList[] = [];

  for (const pageIndex of indices) {
    const page = await pdf.getPage(pageIndex + 1);
    const viewport = page.getViewport({ scale: 1 });
    const ops: PageDisplayList["ops"] = [];

    const gfx = await collectPageGraphics(page, viewport.width, viewport.height);
    const content = await page.getTextContent();
    const styles = (content.styles ?? {}) as Record<string, PdfJsTextStyle>;

    content.items.forEach((raw, i) => {
      const item = raw as PdfJsTextItem;
      if (!item.str?.trim() || !item.transform || item.transform.length < 6) return;

      const matrix = item.transform.slice(0, 6) as Matrix2D;
      const style = item.fontName ? styles[item.fontName] : undefined;
      const ascentRatio = ascentRatioFromStyle(style);
      const bboxNorm = textItemBBoxNorm(matrix, item, viewport, ascentRatio);
      const tx = matrix[4];
      const ty = matrix[5];
      const fillColor =
        nearestFillColor(gfx.textFills, tx, ty) ?? ({ r: 0, g: 0, b: 0 } as RgbColor);
      const coverColor = coverColorForText(bboxNorm, gfx.filledRects);

      ops.push({
        op: "text",
        objectId: `text_${pageIndex}_${i}`,
        content: item.str,
        matrix,
        fontSize: Math.hypot(matrix[2], matrix[3]),
        fontName: item.fontName ?? null,
        fontFamily: style?.fontFamily ?? null,
        fillColor,
        coverColor,
        bboxNorm,
        hasUnicodeMap: !item.str.includes("\uFFFD"),
      });
    });

    const imageOps = await extractImageOps(page, pageIndex, viewport.width, viewport.height);
    ops.push(...imageOps);

    pages.push({
      pageIndex,
      width: viewport.width,
      height: viewport.height,
      ops,
    });
  }

  return { pages };
}

function ascentRatioFromStyle(style: PdfJsTextStyle | undefined): number {
  if (!style || !Number.isFinite(style.ascent) || (style.ascent ?? 0) <= 0) {
    return DEFAULT_ASCENT_RATIO;
  }
  const ascent = style.ascent!;
  const descent = Math.abs(style.descent ?? 0);
  let ratio =
    descent > 0 ? ascent / (ascent + descent) : Math.min(Math.max(ascent, 0.5), 1.2);
  // Many embedded fonts report ascent≈1.0; TextLayer uses ~0.8 for CSS fallbacks.
  if (ratio > 0.92) ratio = DEFAULT_ASCENT_RATIO;
  return Math.min(Math.max(ratio, 0.55), 0.92);
}

/** Same transform composition pdf.js TextLayer uses (viewport × text matrix). */
function textItemBBoxNorm(
  matrix: Matrix2D,
  item: PdfJsTextItem,
  viewport: { width: number; height: number; transform: number[] },
  ascentRatio: number,
): BBox {
  const vt = viewport.transform as Matrix2D;
  const tm = multiply(vt, matrix);
  const fontHeight = Math.hypot(tm[2], tm[3]);
  const ascent = fontHeight * ascentRatio;
  const left = tm[4];
  const top = tm[5] - ascent;
  // item.width is already in the same user space as the text matrix translation.
  const advance = item.width ?? (item.str?.length ?? 1) * fontHeight * 0.5;

  return {
    x: left / viewport.width,
    y: top / viewport.height,
    width: Math.max(advance / viewport.width, 0.001),
    height: Math.max(fontHeight / viewport.height, 0.001),
  };
}

/**
 * Single operator-list pass: text fill colors + filled rectangles (header bars).
 * Payslips like Threadstone paint blue bars then black text — cover must be the bar color.
 */
async function collectPageGraphics(
  page: PDFPageProxy,
  pageWidth: number,
  pageHeight: number,
): Promise<PageGfxExtras> {
  const opList = await page.getOperatorList();
  const textFills: PageGfxExtras["textFills"] = [];
  const filledRects: PageGfxExtras["filledRects"] = [];
  const stack: Array<{ ctm: Matrix2D; fill: RgbColor; textMatrix: Matrix2D; lineMatrix: Matrix2D }> =
    [];
  let ctm: Matrix2D = [1, 0, 0, 1, 0, 0];
  let fill: RgbColor = { r: 0, g: 0, b: 0 };
  let textMatrix: Matrix2D = [1, 0, 0, 1, 0, 0];
  let lineMatrix: Matrix2D = [1, 0, 0, 1, 0, 0];
  let pendingRect: BBox | null = null;

  const fnArray = opList.fnArray;
  const argsArray = opList.argsArray;

  for (let i = 0; i < fnArray.length; i++) {
    const fn = fnArray[i];
    const args = argsArray[i] as unknown[];

    switch (fn) {
      case OPS.save:
        stack.push({
          ctm: ctm.slice() as Matrix2D,
          fill: { ...fill },
          textMatrix: textMatrix.slice() as Matrix2D,
          lineMatrix: lineMatrix.slice() as Matrix2D,
        });
        break;
      case OPS.restore: {
        const prev = stack.pop();
        if (prev) {
          ctm = prev.ctm;
          fill = prev.fill;
          textMatrix = prev.textMatrix;
          lineMatrix = prev.lineMatrix;
        }
        break;
      }
      case OPS.transform: {
        const m = args as number[];
        if (m.length >= 6) {
          ctm = multiply(ctm, [m[0]!, m[1]!, m[2]!, m[3]!, m[4]!, m[5]!]);
        }
        break;
      }
      case OPS.beginText:
        textMatrix = lineMatrix.slice() as Matrix2D;
        break;
      case OPS.setTextMatrix: {
        const m = args as number[];
        if (m.length >= 6) {
          textMatrix = [m[0]!, m[1]!, m[2]!, m[3]!, m[4]!, m[5]!];
          lineMatrix = textMatrix.slice() as Matrix2D;
        }
        break;
      }
      case OPS.moveText: {
        const [tx, ty] = args as number[];
        // Tm = [1 0 0 1 tx ty] × lineMatrix (PDF text positioning)
        textMatrix = multiply(lineMatrix, [1, 0, 0, 1, tx ?? 0, ty ?? 0]);
        lineMatrix = textMatrix.slice() as Matrix2D;
        break;
      }
      case OPS.nextLine:
        textMatrix = multiply(lineMatrix, [1, 0, 0, 1, 0, -1]);
        lineMatrix = textMatrix.slice() as Matrix2D;
        break;
      case OPS.setFillRGBColor: {
        fill = parseRgbArgs(args);
        break;
      }
      case OPS.setFillGray: {
        const g = parseColorComponent((args as number[])[0] ?? 0);
        fill = { r: g, g, b: g };
        break;
      }
      case OPS.setFillCMYKColor: {
        const [c, m, y, k] = args as number[];
        fill = cmykToRgb(
          parseColorComponent(c ?? 0),
          parseColorComponent(m ?? 0),
          parseColorComponent(y ?? 0),
          parseColorComponent(k ?? 0),
        );
        break;
      }
      case OPS.constructPath: {
        const rect = rectangleFromConstructPath(args, ctm, pageWidth, pageHeight);
        if (rect && !isNearWhite(fill)) {
          pendingRect = rect;
        } else {
          pendingRect = null;
        }
        break;
      }
      case OPS.fill:
      case OPS.eoFill:
      case OPS.fillStroke:
      case OPS.eoFillStroke: {
        if (pendingRect) {
          filledRects.push({
            bbox: pendingRect,
            color: { ...fill },
          });
          pendingRect = null;
        }
        break;
      }
      case OPS.showText:
      case OPS.nextLineShowText:
      case OPS.showSpacedText: {
        const abs = multiply(ctm, textMatrix);
        textFills.push({ x: abs[4], y: abs[5], color: { ...fill } });
        break;
      }
      default:
        break;
    }
  }

  return { textFills, filledRects };
}

function rectangleFromConstructPath(
  args: unknown[],
  ctm: Matrix2D,
  pageWidth: number,
  pageHeight: number,
): BBox | null {
  const ops = args[0] as number[] | undefined;
  const coords = args[1] as number[] | undefined;
  if (!ops || !coords || ops.length === 0) return null;

  // pdf.js packs rectangle as OPS.rectangle (19) with x,y,w,h in coords.
  if (ops[0] !== OPS.rectangle && !ops.includes(OPS.rectangle)) return null;
  if (coords.length < 4) return null;

  const x = coords[0]!;
  const y = coords[1]!;
  const w = coords[2]!;
  const h = coords[3]!;
  const corners: Array<[number, number]> = [
    [x, y],
    [x + w, y],
    [x, y + h],
    [x + w, y + h],
  ];
  const mapped = corners.map(([px, py]) => {
    const [a, b, c, d, e, f] = ctm;
    return [a * px + c * py + e, b * px + d * py + f] as const;
  });
  const xs = mapped.map((p) => p[0]);
  const ys = mapped.map((p) => p[1]);
  const minX = Math.min(...xs);
  const maxX = Math.max(...xs);
  const minY = Math.min(...ys);
  const maxY = Math.max(...ys);
  return {
    x: minX / pageWidth,
    y: 1 - maxY / pageHeight,
    width: Math.max((maxX - minX) / pageWidth, 0.0005),
    height: Math.max((maxY - minY) / pageHeight, 0.0005),
  };
}

function coverColorForText(textBBox: BBox, rects: PageGfxExtras["filledRects"]): RgbColor | null {
  const cx = textBBox.x + textBBox.width / 2;
  const cy = textBBox.y + textBBox.height / 2;
  let best: { color: RgbColor; area: number } | null = null;
  for (const rect of rects) {
    const inside =
      cx >= rect.bbox.x &&
      cx <= rect.bbox.x + rect.bbox.width &&
      cy >= rect.bbox.y &&
      cy <= rect.bbox.y + rect.bbox.height;
    if (!inside) continue;
    const area = rect.bbox.width * rect.bbox.height;
    // Prefer the smallest containing painted rect (cell / header chip).
    if (!best || area < best.area) best = { color: rect.color, area };
  }
  return best?.color ?? null;
}

function nearestFillColor(
  samples: PageGfxExtras["textFills"],
  x: number,
  y: number,
  maxDist = 4,
): RgbColor | null {
  if (samples.length === 0) return null;
  let best: RgbColor | null = null;
  let bestD = maxDist;
  for (const s of samples) {
    const d = Math.hypot(s.x - x, s.y - y);
    if (d < bestD) {
      bestD = d;
      best = s.color;
    }
  }
  return best;
}

function parseRgbArgs(args: unknown[]): RgbColor {
  const list = Array.isArray(args) ? args : Array.from(args as ArrayLike<number>);
  return {
    r: parseColorComponent(Number(list[0] ?? 0)),
    g: parseColorComponent(Number(list[1] ?? 0)),
    b: parseColorComponent(Number(list[2] ?? 0)),
  };
}

/** pdf.js may emit 0–1 floats or 0–255 byte channels. */
function parseColorComponent(n: number): number {
  if (!Number.isFinite(n)) return 0;
  if (n > 1) return Math.min(1, Math.max(0, n / 255));
  return Math.min(1, Math.max(0, n));
}

function isNearWhite(c: RgbColor): boolean {
  return c.r > 0.92 && c.g > 0.92 && c.b > 0.92;
}

async function extractImageOps(
  page: PDFPageProxy,
  pageIndex: number,
  pageWidth: number,
  pageHeight: number,
): Promise<PageDisplayList["ops"]> {
  const opList = await page.getOperatorList();
  const out: PageDisplayList["ops"] = [];
  const stack: Matrix2D[] = [];
  let ctm: Matrix2D = [1, 0, 0, 1, 0, 0];
  let imageCount = 0;

  const fnArray = opList.fnArray;
  const argsArray = opList.argsArray;

  for (let i = 0; i < fnArray.length; i++) {
    const fn = fnArray[i];
    const args = argsArray[i] as unknown[];

    switch (fn) {
      case OPS.save:
        stack.push(ctm.slice() as Matrix2D);
        break;
      case OPS.restore:
        ctm = stack.pop() ?? ([1, 0, 0, 1, 0, 0] as Matrix2D);
        break;
      case OPS.transform: {
        const m = args as number[];
        if (m.length >= 6) {
          ctm = multiply(ctm, [m[0]!, m[1]!, m[2]!, m[3]!, m[4]!, m[5]!]);
        }
        break;
      }
      case OPS.paintImageXObject:
      case OPS.paintInlineImageXObject:
      case OPS.paintImageMaskXObject: {
        const resourceName =
          typeof args?.[0] === "string" ? args[0] : `xobject_${pageIndex}_${imageCount}`;
        const bbox = unitSquareBBoxNorm(ctm, pageWidth, pageHeight);
        out.push({
          op: "image",
          objectId: `img_${pageIndex}_${imageCount}`,
          resourceName,
          matrix: ctm.slice() as Matrix2D,
          bboxNorm: bbox,
          widthPx: 0,
          heightPx: 0,
          dataUrl: null,
        });
        imageCount += 1;
        break;
      }
      default:
        break;
    }
  }

  return out;
}

function multiply(a: Matrix2D, b: Matrix2D): Matrix2D {
  return [
    a[0] * b[0] + a[2] * b[1],
    a[1] * b[0] + a[3] * b[1],
    a[0] * b[2] + a[2] * b[3],
    a[1] * b[2] + a[3] * b[3],
    a[0] * b[4] + a[2] * b[5] + a[4],
    a[1] * b[4] + a[3] * b[5] + a[5],
  ];
}

function unitSquareBBoxNorm(
  matrix: Matrix2D,
  pageWidth: number,
  pageHeight: number,
): BBox {
  const corners: Array<[number, number]> = [
    [0, 0],
    [1, 0],
    [0, 1],
    [1, 1],
  ];
  const mapped = corners.map(([x, y]) => {
    const [a, b, c, d, e, f] = matrix;
    return [a * x + c * y + e, b * x + d * y + f] as const;
  });
  const xs = mapped.map((p) => p[0]);
  const ys = mapped.map((p) => p[1]);
  const minX = Math.min(...xs);
  const maxX = Math.max(...xs);
  const minY = Math.min(...ys);
  const maxY = Math.max(...ys);
  return {
    x: minX / pageWidth,
    y: 1 - maxY / pageHeight,
    width: Math.max((maxX - minX) / pageWidth, 0.01),
    height: Math.max((maxY - minY) / pageHeight, 0.01),
  };
}

function cmykToRgb(c: number, m: number, y: number, k: number): RgbColor {
  return {
    r: clamp01(1 - Math.min(1, c + k)),
    g: clamp01(1 - Math.min(1, m + k)),
    b: clamp01(1 - Math.min(1, y + k)),
  };
}

function clamp01(n: number): number {
  if (!Number.isFinite(n)) return 0;
  return Math.min(1, Math.max(0, n));
}
