import type { EditableDocument, ObjectId, TextObject, PageObject } from "@/core/document-model/types";

/** True when the live TextObject content differs from the open-time baseline. */
export function isTextObjectDirty(
  baseline: EditableDocument,
  live: EditableDocument,
  objectId: ObjectId,
): boolean {
  const a = findObject(baseline, objectId);
  const b = findObject(live, objectId);
  if (!a || !b || a.kind !== "text" || b.kind !== "text") return false;
  return a.content !== b.content;
}

export function dirtyTextObjects(
  baseline: EditableDocument,
  live: EditableDocument,
): TextObject[] {
  const dirty: TextObject[] = [];
  for (const page of live.pages) {
    for (const obj of page.objects) {
      if (obj.kind !== "text") continue;
      if (isTextObjectDirty(baseline, live, obj.id)) dirty.push(obj);
    }
  }
  return dirty;
}

/** Objects added, removed, or geometrically/content-changed vs baseline. */
export function dirtyPageObjects(
  baseline: EditableDocument,
  live: EditableDocument,
): PageObject[] {
  const baselineById = indexById(baseline);
  const liveById = indexById(live);
  const dirty: PageObject[] = [];

  for (const [id, liveObj] of liveById) {
    const baseObj = baselineById.get(id);
    if (!baseObj) {
      dirty.push(liveObj);
      continue;
    }
    if (objectChanged(baseObj, liveObj)) dirty.push(liveObj);
  }
  return dirty;
}

export function removedPageObjects(
  baseline: EditableDocument,
  live: EditableDocument,
): PageObject[] {
  const liveIds = new Set(indexById(live).keys());
  const removed: PageObject[] = [];
  for (const page of baseline.pages) {
    for (const obj of page.objects) {
      if (!liveIds.has(obj.id)) removed.push(obj);
    }
  }
  return removed;
}

export function dirtyObjectIdSet(
  baseline: EditableDocument,
  live: EditableDocument,
): Set<ObjectId> {
  return new Set(dirtyPageObjects(baseline, live).map((o) => o.id));
}

function indexById(document: EditableDocument): Map<ObjectId, PageObject> {
  const map = new Map<ObjectId, PageObject>();
  for (const page of document.pages) {
    for (const obj of page.objects) map.set(obj.id, obj);
  }
  return map;
}

function findObject(document: EditableDocument, objectId: ObjectId): PageObject | null {
  return indexById(document).get(objectId) ?? null;
}

function objectChanged(a: PageObject, b: PageObject): boolean {
  if (a.kind !== b.kind) return true;
  if (
    a.bbox.x !== b.bbox.x ||
    a.bbox.y !== b.bbox.y ||
    a.bbox.width !== b.bbox.width ||
    a.bbox.height !== b.bbox.height
  ) {
    return true;
  }
  if (a.kind === "text" && b.kind === "text") return a.content !== b.content;
  if (a.kind === "image" && b.kind === "image") return a.dataUrl !== b.dataUrl;
  if (a.kind === "path" && b.kind === "path") {
    return JSON.stringify(a.ops) !== JSON.stringify(b.ops);
  }
  return false;
}
