import type { PDFDocumentProxy } from "pdfjs-dist";
import { openDocumentFromDisplayList } from "@/core/pipeline/openDocument";
import type { ExtractedTextItem } from "@/lib/editor/editorModel";
import { extractedTextItemsFromDocument } from "@/lib/editor/textItemsFromDocument";
import { buildDisplayListFromPdfJs } from "@/lib/pdf/buildDisplayListFromPdfJs";

/**
 * @deprecated Prefer buildDisplayListFromPdfJs → openDocumentFromDisplayList.
 * Kept as a thin wrapper for any legacy callers.
 */
export async function extractPageTextItems(
  doc: PDFDocumentProxy,
  pageIndices: number[],
): Promise<ExtractedTextItem[]> {
  const displayList = await buildDisplayListFromPdfJs(doc, pageIndices);
  const { document } = openDocumentFromDisplayList(displayList, "extract.pdf");
  const items = extractedTextItemsFromDocument(document);
  const allowed = new Set(pageIndices);
  return items.filter((t) => allowed.has(t.pageIndex));
}
