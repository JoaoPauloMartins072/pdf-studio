import { PDFDocument, PDFFont, PDFPage, rgb, StandardFonts, degrees } from "pdf-lib";
import fontkit from "@pdf-lib/fontkit";
import type { ImageObject, PathObject, TextObject } from "@/core/document-model/types";
import {
  dirtyPageObjects,
  removedPageObjects,
} from "@/core/document-model/diff";
import type {
  DocumentSerializer,
  SerializeInput,
  SerializeOverlay,
} from "@/core/serializer/types";

/**
 * Official serializer (Stages 4–6).
 *
 * - Structural text / images / paths from EditableDocument vs baseline
 * - Additive overlays: highlight / addText (legacy tools)
 *
 * Cover+write for text/image removal stays inside the serializer until
 * content-stream rewrite lands.
 */
export class FolioPdfLibSerializer implements DocumentSerializer {
  async serialize(input: SerializeInput): Promise<Uint8Array> {
    const {
      sourceBytes,
      document,
      baseline,
      pageOrder,
      pageMeta,
      overlays = [],
      options,
    } = input;

    const src = await PDFDocument.load(sourceBytes, { ignoreEncryption: true });
    const out = await PDFDocument.create();
    const fonts = await resolveFonts(out);
    const copied = await out.copyPages(src, pageOrder);

    const dirtyObjs = groupByPageIndex(dirtyPageObjects(baseline, document), document);
    const removed = groupRemovedByPageIndex(removedPageObjects(baseline, document), baseline);

    for (let i = 0; i < copied.length; i++) {
      const page = copied[i]!;
      const srcIndex = pageOrder[i]!;
      const meta = pageMeta[srcIndex];
      if (meta?.rotation) {
        page.setRotation(degrees((page.getRotation().angle + meta.rotation) % 360));
      }
      out.addPage(page);

      const { width, height } = page.getSize();

      for (const removedObj of removed.get(srcIndex) ?? []) {
        coverObject(page, removedObj, width, height);
      }

      for (const obj of dirtyObjs.get(srcIndex) ?? []) {
        if (obj.kind === "text") {
          writeStructuralTextReplace(page, obj, width, height, fonts);
        } else if (obj.kind === "image") {
          await writeModelImage(out, page, obj, width, height);
        } else if (obj.kind === "path") {
          writeModelPath(page, obj, width, height);
        }
      }

      const pageOverlays = overlays.filter((o) => o.pageIndex === srcIndex);
      for (const overlay of pageOverlays) {
        await writeOverlay(out, page, overlay, width, height, fonts);
      }
    }

    return out.save({ useObjectStreams: options?.useObjectStreams ?? true });
  }
}

function groupByPageIndex<T extends { id: string }>(
  objects: T[],
  document: SerializeInput["document"],
): Map<number, T[]> {
  const map = new Map<number, T[]>();
  for (const obj of objects) {
    const page = document.pages.find((p) => p.objects.some((o) => o.id === obj.id));
    const pageIndex = page?.index ?? 0;
    const list = map.get(pageIndex) ?? [];
    list.push(obj);
    map.set(pageIndex, list);
  }
  return map;
}

function groupRemovedByPageIndex(
  objects: ReturnType<typeof removedPageObjects>,
  baseline: SerializeInput["baseline"],
): Map<number, typeof objects> {
  const map = new Map<number, typeof objects>();
  for (const obj of objects) {
    const page = baseline.pages.find((p) => p.objects.some((o) => o.id === obj.id));
    const pageIndex = page?.index ?? 0;
    const list = map.get(pageIndex) ?? [];
    list.push(obj);
    map.set(pageIndex, list);
  }
  return map;
}

function coverObject(
  page: PDFPage,
  obj: { bbox: { x: number; y: number; width: number; height: number } },
  pageWidth: number,
  pageHeight: number,
): void {
  page.drawRectangle({
    x: obj.bbox.x * pageWidth,
    y: toPdfY(pageHeight, obj.bbox.y, obj.bbox.height),
    width: obj.bbox.width * pageWidth,
    height: obj.bbox.height * pageHeight,
    color: rgb(1, 1, 1),
    borderWidth: 0,
  });
}

/** Internal writer for structural text diffs. TODO: content-stream rewrite. */
function writeStructuralTextReplace(
  page: PDFPage,
  obj: TextObject,
  pageWidth: number,
  pageHeight: number,
  fonts: { latin: PDFFont; unicode: PDFFont },
): void {
  const size = Math.max(8, obj.fontSize * (pageHeight / 792));
  const font = pickFont(obj.content, fonts);
  const cover = obj.coverColor ?? { r: 1, g: 1, b: 1 };
  const fillRgb = resolveExportFill(obj.fillColor, cover);
  const fill = rgb(clamp01(fillRgb.r), clamp01(fillRgb.g), clamp01(fillRgb.b));

  page.drawRectangle({
    x: obj.bbox.x * pageWidth,
    y: toPdfY(pageHeight, obj.bbox.y, obj.bbox.height),
    width: Math.max(obj.bbox.width * pageWidth, obj.content.length * obj.fontSize * 0.55),
    height: obj.bbox.height * pageHeight,
    color: rgb(clamp01(cover.r), clamp01(cover.g), clamp01(cover.b)),
    borderWidth: 0,
  });
  page.drawText(obj.content || " ", {
    x: obj.bbox.x * pageWidth,
    y: pageHeight - obj.bbox.y * pageHeight - size,
    size,
    font,
    color: fill,
  });
}

function resolveExportFill(
  fill: { r: number; g: number; b: number } | null,
  cover: { r: number; g: number; b: number },
): { r: number; g: number; b: number } {
  const f = fill ?? { r: 0.07, g: 0.07, b: 0.07 };
  const fillLum = 0.2126 * f.r + 0.7152 * f.g + 0.0722 * f.b;
  const coverLum = 0.2126 * cover.r + 0.7152 * cover.g + 0.0722 * cover.b;
  if (fillLum < 0.2 && coverLum < 0.55) {
    return { r: 1, g: 1, b: 1 };
  }
  return f;
}

async function writeModelImage(
  out: PDFDocument,
  page: PDFPage,
  obj: ImageObject,
  width: number,
  height: number,
): Promise<void> {
  coverObject(page, obj, width, height);
  if (!obj.dataUrl) return;
  try {
    const img = await embedDataUrl(out, obj.dataUrl);
    page.drawImage(img, {
      x: obj.bbox.x * width,
      y: toPdfY(height, obj.bbox.y, obj.bbox.height),
      width: obj.bbox.width * width,
      height: obj.bbox.height * height,
    });
  } catch {
    /* skip broken image */
  }
}

function writeModelPath(
  page: PDFPage,
  obj: PathObject,
  width: number,
  height: number,
): void {
  const pts: Array<{ x: number; y: number }> = [];
  for (const op of obj.ops) {
    if (op.op === "moveTo" || op.op === "lineTo") {
      pts.push({ x: op.x * width, y: height - op.y * height });
    }
  }
  if (pts.length < 2) return;
  const c = obj.strokeColor ?? { r: 0.88, g: 0.11, b: 0.28 };
  for (let i = 1; i < pts.length; i++) {
    page.drawLine({
      start: pts[i - 1]!,
      end: pts[i]!,
      thickness: obj.strokeWidth ?? 2,
      color: rgb(clamp01(c.r), clamp01(c.g), clamp01(c.b)),
    });
  }
}

async function writeOverlay(
  out: PDFDocument,
  page: PDFPage,
  overlay: SerializeOverlay,
  width: number,
  height: number,
  fonts: { latin: PDFFont; unicode: PDFFont },
): Promise<void> {
  switch (overlay.kind) {
    case "highlight": {
      const c = hexToRgb(overlay.color);
      page.drawRectangle({
        x: overlay.x * width,
        y: toPdfY(height, overlay.y, overlay.height),
        width: overlay.width * width,
        height: overlay.height * height,
        color: rgb(c.r, c.g, c.b),
        opacity: 0.35,
        borderWidth: 0,
      });
      break;
    }
    case "addText": {
      const c = hexToRgb(overlay.color);
      const size = Math.max(8, overlay.fontSize);
      const text = overlay.text || " ";
      const font = pickFont(text, fonts);
      page.drawText(text, {
        x: overlay.x * width,
        y: height - overlay.y * height - size,
        size,
        font,
        color: rgb(c.r, c.g, c.b),
        maxWidth: overlay.width * width,
      });
      break;
    }
    case "draw": {
      if (overlay.points.length < 2) break;
      const c = hexToRgb(overlay.color);
      for (let p = 1; p < overlay.points.length; p++) {
        const a = overlay.points[p - 1]!;
        const b = overlay.points[p]!;
        page.drawLine({
          start: { x: a.x * width, y: height - a.y * height },
          end: { x: b.x * width, y: height - b.y * height },
          thickness: overlay.strokeWidth,
          color: rgb(c.r, c.g, c.b),
        });
      }
      break;
    }
    case "image": {
      try {
        const img = await embedDataUrl(out, overlay.dataUrl);
        page.drawImage(img, {
          x: overlay.x * width,
          y: toPdfY(height, overlay.y, overlay.height),
          width: overlay.width * width,
          height: overlay.height * height,
        });
      } catch {
        /* skip broken image */
      }
      break;
    }
  }
}

function hexToRgb(hex: string): { r: number; g: number; b: number } {
  const h = hex.replace("#", "").trim();
  const full =
    h.length === 3
      ? h
          .split("")
          .map((c) => c + c)
          .join("")
      : h;
  const n = Number.parseInt(full, 16);
  if (!Number.isFinite(n) || full.length !== 6) return { r: 0, g: 0, b: 0 };
  return {
    r: ((n >> 16) & 255) / 255,
    g: ((n >> 8) & 255) / 255,
    b: (n & 255) / 255,
  };
}

function clamp01(n: number): number {
  if (n > 1) return Math.min(1, n / 255);
  return Math.min(1, Math.max(0, n));
}

function toPdfY(pageHeight: number, topNorm: number, boxHeightNorm = 0) {
  return pageHeight - (topNorm + boxHeightNorm) * pageHeight;
}

function needsUnicodeFont(text: string): boolean {
  for (const ch of text) {
    const code = ch.codePointAt(0) ?? 0;
    if (code > 0xff) return true;
  }
  return false;
}

async function loadFontBytes(): Promise<Uint8Array | null> {
  const candidates =
    typeof window === "undefined"
      ? [
          ["public", "fonts", "NotoSansJP-Regular.ttf"],
          ["public", "fonts", "NotoSansJP-Regular.otf"],
          ["public", "fonts", "NotoSans-Regular.ttf"],
        ]
      : [
          "/fonts/NotoSansJP-Regular.ttf",
          "/fonts/NotoSansJP-Regular.otf",
          "/fonts/NotoSans-Regular.ttf",
        ];

  for (const candidate of candidates) {
    try {
      if (typeof window === "undefined") {
        const { readFile } = await import("node:fs/promises");
        const { join } = await import("node:path");
        const path = join(process.cwd(), ...(candidate as string[]));
        return new Uint8Array(await readFile(path));
      }
      const res = await fetch(candidate as string);
      if (!res.ok) continue;
      return new Uint8Array(await res.arrayBuffer());
    } catch {
      /* try next */
    }
  }
  return null;
}

async function resolveFonts(out: PDFDocument): Promise<{
  latin: PDFFont;
  unicode: PDFFont;
}> {
  const latin = await out.embedFont(StandardFonts.Helvetica);
  const bytes = await loadFontBytes();
  if (!bytes) return { latin, unicode: latin };
  out.registerFontkit(fontkit);
  let unicode: PDFFont;
  try {
    unicode = await out.embedFont(bytes, { subset: true });
  } catch {
    unicode = await out.embedFont(bytes, { subset: false });
  }
  return { latin, unicode };
}

function pickFont(text: string, fonts: { latin: PDFFont; unicode: PDFFont }): PDFFont {
  return needsUnicodeFont(text) ? fonts.unicode : fonts.latin;
}

async function embedDataUrl(pdf: PDFDocument, dataUrl: string) {
  const res = await fetch(dataUrl);
  const bytes = new Uint8Array(await res.arrayBuffer());
  if (dataUrl.startsWith("data:image/jpeg") || dataUrl.startsWith("data:image/jpg")) {
    return pdf.embedJpg(bytes);
  }
  return pdf.embedPng(bytes);
}
