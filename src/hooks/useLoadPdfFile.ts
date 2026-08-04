"use client";

import { useCallback, useState } from "react";
import type { PDFDocumentProxy } from "pdfjs-dist";
import type { EditableDocument } from "@/core/document-model/types";
import type { DocumentDisplayList } from "@/core/display-list/types";
import { openDocumentFromDisplayList } from "@/core/pipeline/openDocument";
import type { ExtractedTextItem, PageMeta } from "@/lib/editor/editorModel";
import {
  extractedTextItemsFromDocument,
  pageMetaFromDocument,
} from "@/lib/editor/textItemsFromDocument";
import { buildDisplayListFromPdfJs } from "@/lib/pdf/buildDisplayListFromPdfJs";
import { openPdfDocument } from "@/lib/pdf/loadPdfJsWorker";

export type OpenedPdf = {
  pdf: PDFDocumentProxy;
  sourceBytes: Uint8Array;
  filename: string;
  pageOrder: number[];
  pageMeta: PageMeta[];
  /** Legacy overlay hit targets — derived from the document model. */
  textItems: ExtractedTextItem[];
  /** Stage 1: Editable Document Model (read-only for editing until Stage 3). */
  documentModel: EditableDocument;
  displayList: DocumentDisplayList;
};

export function useLoadPdfFile() {
  const [doc, setDoc] = useState<OpenedPdf | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const openFile = useCallback(async (file: File) => {
    setLoading(true);
    setError(null);
    try {
      const bytes = new Uint8Array(await file.arrayBuffer());
      const pdf = await openPdfDocument(bytes);
      const pageOrder = Array.from({ length: pdf.numPages }, (_, i) => i);

      // Stage 1 path: pdf.js → Display List → Editable Document Model
      const displayList = await buildDisplayListFromPdfJs(pdf, pageOrder);
      const sourceName = file.name || "document.pdf";
      const { document: documentModel } = openDocumentFromDisplayList(
        displayList,
        sourceName,
      );

      const pageMeta = pageMetaFromDocument(documentModel);
      const textItems = extractedTextItemsFromDocument(documentModel);

      setDoc({
        pdf,
        sourceBytes: bytes,
        filename: sourceName.replace(/\.pdf$/i, "") + "-edited.pdf",
        pageOrder,
        pageMeta,
        textItems,
        documentModel,
        displayList,
      });
    } catch (e) {
      setDoc(null);
      setError(e instanceof Error ? e.message : "Could not open PDF");
    } finally {
      setLoading(false);
    }
  }, []);

  const reset = useCallback(() => {
    setDoc(null);
    setError(null);
  }, []);

  return { doc, setDoc, loading, error, openFile, reset };
}
