import { PDFDocument } from "pdf-lib";

/**
 * MVP compress: rebuild the PDF with object streams.
 * Heavier compression (image downsample / Ghostscript) comes later server-side.
 */
export async function compressPdf(file: ArrayBuffer): Promise<{
  bytes: Uint8Array;
  originalBytes: number;
  compressedBytes: number;
  ratio: number;
}> {
  const originalBytes = file.byteLength;
  const src = await PDFDocument.load(file, { ignoreEncryption: true });
  const out = await PDFDocument.create();
  const pages = await out.copyPages(src, src.getPageIndices());
  for (const page of pages) {
    out.addPage(page);
  }

  const bytes = await out.save({ useObjectStreams: true });
  const compressedBytes = bytes.byteLength;
  const ratio =
    originalBytes === 0 ? 0 : 1 - compressedBytes / originalBytes;

  return { bytes, originalBytes, compressedBytes, ratio };
}

export function formatBytes(n: number): string {
  if (n < 1024) return `${n} B`;
  if (n < 1024 * 1024) return `${(n / 1024).toFixed(1)} KB`;
  return `${(n / (1024 * 1024)).toFixed(2)} MB`;
}
