import type { EditableDocument } from "@/core/document-model/types";
import type { ExtractedTextItem, PageMeta } from "@/lib/editor/editorModel";

/**
 * Legacy overlay bridge: derive ExtractedTextItem[] from the Editable Document Model
 * so the current editor UI keeps working while Stage 2 migrates hit-testing.
 */
export function extractedTextItemsFromDocument(
  document: EditableDocument,
): ExtractedTextItem[] {
  const items: ExtractedTextItem[] = [];

  for (const page of document.pages) {
    for (const obj of page.objects) {
      if (obj.kind !== "text") continue;
      items.push({
        id: obj.id,
        pageIndex: page.index,
        text: obj.content,
        x: obj.bbox.x,
        y: obj.bbox.y,
        width: obj.bbox.width,
        height: obj.bbox.height,
        fontSize: obj.fontSize,
      });
    }
  }

  return items;
}

export function pageMetaFromDocument(document: EditableDocument): PageMeta[] {
  return document.pages.map((page) => ({
    width: page.width,
    height: page.height,
    rotation: page.rotation,
  }));
}

export function countTextObjects(document: EditableDocument): number {
  return document.pages.reduce(
    (n, page) => n + page.objects.filter((o) => o.kind === "text").length,
    0,
  );
}
