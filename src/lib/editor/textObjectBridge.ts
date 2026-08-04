import type { TextObject } from "@/core/document-model/types";
import type { ExtractedTextItem } from "@/lib/editor/editorModel";

/** Stage 2→3 bridge: TextObject → legacy ExtractedTextItem for nativeText bake. */
export function textObjectToExtractedItem(
  object: TextObject,
  pageIndex: number,
): ExtractedTextItem {
  return {
    id: object.id,
    pageIndex,
    text: object.content,
    x: object.bbox.x,
    y: object.bbox.y,
    width: object.bbox.width,
    height: object.bbox.height,
    fontSize: object.fontSize,
  };
}
