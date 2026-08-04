import type { Annotation } from "@/lib/editor/editorModel";
import type { SerializeOverlay } from "@/core/serializer/types";

/**
 * Maps legacy overlay annotations to serializer overlays.
 * Skips nativeText — structural text must come from the document model.
 */
export function annotationsToSerializeOverlays(
  annotations: Annotation[],
): SerializeOverlay[] {
  const overlays: SerializeOverlay[] = [];

  for (const ann of annotations) {
    switch (ann.type) {
      case "nativeText":
        break;
      case "highlight":
        overlays.push({
          kind: "highlight",
          pageIndex: ann.pageIndex,
          x: ann.x,
          y: ann.y,
          width: ann.width,
          height: ann.height,
          color: ann.color,
        });
        break;
      case "text":
        overlays.push({
          kind: "addText",
          pageIndex: ann.pageIndex,
          x: ann.x,
          y: ann.y,
          width: ann.width,
          height: ann.height,
          text: ann.text,
          fontSize: ann.fontSize,
          color: ann.color,
        });
        break;
      case "draw":
        overlays.push({
          kind: "draw",
          pageIndex: ann.pageIndex,
          points: ann.points,
          color: ann.color,
          strokeWidth: ann.strokeWidth,
        });
        break;
      case "image":
      case "signature":
        overlays.push({
          kind: "image",
          pageIndex: ann.pageIndex,
          x: ann.x,
          y: ann.y,
          width: ann.width,
          height: ann.height,
          dataUrl: ann.dataUrl,
        });
        break;
    }
  }

  return overlays;
}
