import type { PDFDocumentProxy } from "pdfjs-dist";

let loading: Promise<typeof import("pdfjs-dist")> | null = null;

export function loadPdfJs() {
  if (!loading) {
    loading = import("pdfjs-dist").then((pdfjs) => {
      pdfjs.GlobalWorkerOptions.workerSrc = "/pdf.worker.min.mjs";
      return pdfjs;
    });
  }
  return loading;
}

export async function openPdfDocument(bytes: Uint8Array): Promise<PDFDocumentProxy> {
  const pdfjs = await loadPdfJs();
  return pdfjs.getDocument({ data: bytes.slice() }).promise;
}
