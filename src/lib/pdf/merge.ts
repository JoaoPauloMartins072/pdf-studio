import { PDFDocument } from "pdf-lib";

export async function mergePdfs(files: ArrayBuffer[]): Promise<Uint8Array> {
  if (files.length === 0) {
    throw new Error("Add at least one PDF.");
  }

  const merged = await PDFDocument.create();

  for (const bytes of files) {
    const src = await PDFDocument.load(bytes, { ignoreEncryption: true });
    const pages = await merged.copyPages(src, src.getPageIndices());
    for (const page of pages) {
      merged.addPage(page);
    }
  }

  return merged.save({ useObjectStreams: true });
}
