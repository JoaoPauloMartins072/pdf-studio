"use client";

import { useCallback, useState } from "react";
import type { PDFDocumentProxy } from "pdfjs-dist";
import type { ExtractedTextItem, PageMeta } from "@/lib/editor/editorModel";
import { extractPageTextItems } from "@/lib/pdf/extractPdfTextBoxes";
import { openPdfDocument } from "@/lib/pdf/loadPdfJsWorker";

export type OpenedPdf = {
  pdf: PDFDocumentProxy;
  sourceBytes: Uint8Array;
  filename: string;
  pageOrder: number[];
  pageMeta: PageMeta[];
  textItems: ExtractedTextItem[];
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
      const pageMeta: PageMeta[] = [];

      for (let i = 0; i < pdf.numPages; i++) {
        const page = await pdf.getPage(i + 1);
        const v = page.getViewport({ scale: 1 });
        pageMeta.push({ width: v.width, height: v.height, rotation: 0 });
      }

      const textItems = await extractPageTextItems(pdf, pageOrder);
      setDoc({
        pdf,
        sourceBytes: bytes,
        filename: file.name.replace(/\.pdf$/i, "") + "-edited.pdf",
        pageOrder,
        pageMeta,
        textItems,
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
