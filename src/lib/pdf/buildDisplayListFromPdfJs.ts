import type { PDFDocumentProxy, PDFPageProxy } from "pdfjs-dist";
import { OPS } from "pdfjs-dist";
import type { DocumentDisplayList, PageDisplayList } from "@/core/display-list/types";
import type { Matrix2D } from "@/core/document-model/types";

type PdfJsTextItem = {
  str?: string;
  transform?: number[];
  width?: number;
  height?: number;
  fontName?: string;
};

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

    const content = await page.getTextContent();
    content.items.forEach((raw, i) => {
      const item = raw as PdfJsTextItem;
      if (!item.str?.trim() || !item.transform || item.transform.length < 6) return;

      const matrix = item.transform.slice(0, 6) as Matrix2D;
      const fontSize = Math.hypot(item.transform[2] ?? 0, item.transform[3] ?? 1);
      const advance = item.width ?? item.str.length * fontSize * 0.5;
      const boxH = Math.max(fontSize, item.height ?? fontSize);
      const tx = item.transform[4]!;
      const ty = item.transform[5]!;

      ops.push({
        op: "text",
        objectId: `text_${pageIndex}_${i}`,
        content: item.str,
        matrix,
        fontSize,
        fontName: item.fontName ?? null,
        fillColor: { r: 0, g: 0, b: 0 },
        bboxNorm: {
          x: tx / viewport.width,
          y: 1 - ty / viewport.height - boxH / viewport.height,
          width: Math.max(advance / viewport.width, 0.02),
          height: Math.max(boxH / viewport.height, 0.012),
        },
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
): { x: number; y: number; width: number; height: number } {
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
