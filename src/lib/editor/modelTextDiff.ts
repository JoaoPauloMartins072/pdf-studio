import type { EditableDocument } from "@/core/document-model/types";
import {
  dirtyTextObjects as coreDirtyTextObjects,
  isTextObjectDirty as coreIsTextObjectDirty,
  dirtyPageObjects,
  removedPageObjects,
  dirtyObjectIdSet,
} from "@/core/document-model/diff";

export const isTextObjectDirty = coreIsTextObjectDirty;
export const dirtyTextObjects = coreDirtyTextObjects;
export { dirtyPageObjects, removedPageObjects, dirtyObjectIdSet };

/** @deprecated Stage 3 bridge — Stage 4 serializer reads model diffs directly. */
export function nativeTextAnnotationsFromModelDiff(
  _baseline: EditableDocument,
  _live: EditableDocument,
): never {
  throw new Error(
    "nativeTextAnnotationsFromModelDiff was removed in Stage 4. Use FolioPdfLibSerializer.",
  );
}
