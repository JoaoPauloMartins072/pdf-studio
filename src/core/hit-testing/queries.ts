import type {
  EditableDocument,
  ObjectId,
  PageId,
  PageObject,
  TextObject,
} from "@/core/document-model/types";

export function pageIdForIndex(pageIndex: number): PageId {
  return `page_${pageIndex}`;
}

export function findPageObject(
  document: EditableDocument,
  objectId: ObjectId,
): PageObject | null {
  for (const page of document.pages) {
    const found = page.objects.find((o) => o.id === objectId);
    if (found) return found;
  }
  return null;
}

export function findTextObject(
  document: EditableDocument,
  objectId: ObjectId,
): TextObject | null {
  const obj = findPageObject(document, objectId);
  return obj?.kind === "text" ? obj : null;
}

export function objectsOnPage(
  document: EditableDocument,
  pageIndex: number,
): PageObject[] {
  const page =
    document.pages.find((p) => p.index === pageIndex) ??
    document.pages.find((p) => p.id === pageIdForIndex(pageIndex));
  return page?.objects ?? [];
}
