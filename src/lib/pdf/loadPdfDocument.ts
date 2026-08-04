import { PDFDocument } from "pdf-lib";

/** Shared pdf-lib open — ignores encryption flags common in bank statements. */
export async function loadPdfDocument(bytes: ArrayBuffer | Uint8Array): Promise<PDFDocument> {
  return PDFDocument.load(bytes, { ignoreEncryption: true });
}
