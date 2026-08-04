import { PDFDocument, PDFFont, rgb, StandardFonts, degrees } from "pdf-lib";
import fontkit from "@pdf-lib/fontkit";
import { hexToRgb } from "@/lib/parseHexColor";
import type { Annotation, PageMeta } from "@/lib/editor/editorModel";
import { loadPdfDocument } from "@/lib/pdf/loadPdfDocument";

async function embedDataUrl(pdf: PDFDocument, dataUrl: string) {
  const res = await fetch(dataUrl);
  const bytes = new Uint8Array(await res.arrayBuffer());
  if (dataUrl.startsWith("data:image/jpeg") || dataUrl.startsWith("data:image/jpg")) {
    return pdf.embedJpg(bytes);
  }
  return pdf.embedPng(bytes);
}

function toPdfY(pageHeight: number, topNorm: number, boxHeightNorm = 0) {
  return pageHeight - (topNorm + boxHeightNorm) * pageHeight;
}

function needsUnicodeFont(text: string): boolean {
  for (const ch of text) {
    const code = ch.codePointAt(0) ?? 0;
    // Outside basic WinAnsi-ish Latin-1 printable range → use Unicode font
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
  if (!bytes) {
    return { latin, unicode: latin };
  }
  out.registerFontkit(fontkit);
  // Prefer subset for smaller downloads; fall back if fontkit subset fails on this face
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

/**
 * Bake editor annotations into a new PDF.
 * Page order / rotation / deletions come from `pageOrder` + `pageMeta`.
 */
export async function bakeEditsIntoPdf(
  sourceBytes: Uint8Array,
  annotations: Annotation[],
  pageOrder: number[],
  pageMeta: PageMeta[],
): Promise<Uint8Array> {
  const src = await loadPdfDocument(sourceBytes);
  const out = await PDFDocument.create();
  const fonts = await resolveFonts(out);
  const copied = await out.copyPages(src, pageOrder);

  for (let i = 0; i < copied.length; i++) {
    const page = copied[i];
    const srcIndex = pageOrder[i];
    const meta = pageMeta[srcIndex];
    if (meta?.rotation) {
      page.setRotation(degrees((page.getRotation().angle + meta.rotation) % 360));
    }
    out.addPage(page);

    const { width, height } = page.getSize();
    const pageAnns = annotations.filter((a) => a.pageIndex === srcIndex);

    for (const ann of pageAnns) {
      switch (ann.type) {
        case "highlight": {
          const c = hexToRgb(ann.color);
          page.drawRectangle({
            x: ann.x * width,
            y: toPdfY(height, ann.y, ann.height),
            width: ann.width * width,
            height: ann.height * height,
            color: rgb(c.r, c.g, c.b),
            opacity: 0.35,
            borderWidth: 0,
          });
          break;
        }
        case "nativeText": {
          const c = hexToRgb(ann.color);
          const size = Math.max(8, ann.fontSize * (height / 792));
          const font = pickFont(ann.text, fonts);
          page.drawRectangle({
            x: ann.x * width,
            y: toPdfY(height, ann.y, ann.height),
            width: Math.max(ann.width * width, ann.text.length * ann.fontSize * 0.55),
            height: ann.height * height,
            color: rgb(1, 1, 1),
            borderWidth: 0,
          });
          page.drawText(ann.text, {
            x: ann.x * width,
            y: height - ann.y * height - size,
            size,
            font,
            color: rgb(c.r, c.g, c.b),
          });
          break;
        }
        case "text": {
          const c = hexToRgb(ann.color);
          const size = Math.max(8, ann.fontSize);
          const text = ann.text || " ";
          const font = pickFont(text, fonts);
          page.drawText(text, {
            x: ann.x * width,
            y: height - ann.y * height - size,
            size,
            font,
            color: rgb(c.r, c.g, c.b),
            maxWidth: ann.width * width,
          });
          break;
        }
        case "draw": {
          if (ann.points.length < 2) break;
          const c = hexToRgb(ann.color);
          for (let p = 1; p < ann.points.length; p++) {
            const a = ann.points[p - 1];
            const b = ann.points[p];
            page.drawLine({
              start: { x: a.x * width, y: height - a.y * height },
              end: { x: b.x * width, y: height - b.y * height },
              thickness: ann.strokeWidth,
              color: rgb(c.r, c.g, c.b),
            });
          }
          break;
        }
        case "image":
        case "signature": {
          try {
            const img = await embedDataUrl(out, ann.dataUrl);
            page.drawImage(img, {
              x: ann.x * width,
              y: toPdfY(height, ann.y, ann.height),
              width: ann.width * width,
              height: ann.height * height,
            });
          } catch {
            /* skip broken image */
          }
          break;
        }
      }
    }
  }

  return out.save();
}
