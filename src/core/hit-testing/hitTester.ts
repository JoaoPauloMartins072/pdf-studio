import type { BBox, EditableDocument, ObjectId, PageId, PageObject } from "@/core/document-model/types";

/**
 * Hit testing against the Editable Document Model (not pixels).
 * Coordinates are in page space, origin top-left, normalized 0–1
 * (matches current editor overlay convention for an easier Stage 2 bridge).
 */

export type HitTestPoint = { x: number; y: number };

export type HitResult = {
  objectId: ObjectId;
  pageId: PageId;
  object: PageObject;
};

export interface HitTester {
  hitTest(document: EditableDocument, pageId: PageId, point: HitTestPoint): HitResult | null;
}

function pointInBBox(p: HitTestPoint, box: BBox): boolean {
  return (
    p.x >= box.x &&
    p.y >= box.y &&
    p.x <= box.x + box.width &&
    p.y <= box.y + box.height
  );
}

/**
 * Top-most object (highest zIndex) whose bbox contains the point.
 */
export class BBoxHitTester implements HitTester {
  hitTest(document: EditableDocument, pageId: PageId, point: HitTestPoint): HitResult | null {
    const page = document.pages.find((p) => p.id === pageId);
    if (!page) return null;

    const candidates = page.objects
      .filter((o) => pointInBBox(point, o.bbox))
      .sort((a, b) => b.zIndex - a.zIndex);

    const object = candidates[0];
    if (!object) return null;
    return { objectId: object.id, pageId, object };
  }
}
