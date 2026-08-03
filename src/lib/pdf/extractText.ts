import type { PDFDocumentProxy } from "pdfjs-dist";
import type { ExtractedTextItem } from "@/lib/editor/types";

type TextContentItem = {
  str?: string;
  transform?: number[];
  width?: number;
  height?: number;
};

/** Extract selectable text boxes in normalized top-left coords. */
export async function extractPageTextItems(
  doc: PDFDocumentProxy,
  pageIndices: number[],
): Promise<ExtractedTextItem[]> {
  const items: ExtractedTextItem[] = [];

  for (const pageIndex of pageIndices) {
    const page = await doc.getPage(pageIndex + 1);
    const viewport = page.getViewport({ scale: 1 });
    const content = await page.getTextContent();

    content.items.forEach((raw, i) => {
      const item = raw as TextContentItem;
      if (!item.str?.trim() || !item.transform) return;

      const [, , , , tx, ty] = item.transform;
      const fontSize = Math.hypot(item.transform[2] ?? 0, item.transform[3] ?? 1);
      const w = (item.width ?? item.str.length * fontSize * 0.5) / viewport.width;
      const h = Math.max(fontSize, item.height ?? fontSize) / viewport.height;
      const x = tx / viewport.width;
      const y = 1 - ty / viewport.height - h;

      items.push({
        id: `t_${pageIndex}_${i}`,
        pageIndex,
        text: item.str,
        x,
        y,
        width: Math.max(w, 0.02),
        height: Math.max(h, 0.012),
        fontSize,
      });
    });
  }

  return items;
}
