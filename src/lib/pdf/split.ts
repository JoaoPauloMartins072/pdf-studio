import { PDFDocument } from "pdf-lib";

export type SplitResult = {
  pageNumber: number;
  bytes: Uint8Array;
};

/** One PDF per page. */
export async function splitPdfToPages(file: ArrayBuffer): Promise<SplitResult[]> {
  const src = await PDFDocument.load(file, { ignoreEncryption: true });
  const count = src.getPageCount();
  const results: SplitResult[] = [];

  for (let i = 0; i < count; i++) {
    const out = await PDFDocument.create();
    const [page] = await out.copyPages(src, [i]);
    out.addPage(page);
    results.push({
      pageNumber: i + 1,
      bytes: await out.save({ useObjectStreams: true }),
    });
  }

  return results;
}

/** Keep only the given 1-based page numbers. */
export async function extractPages(
  file: ArrayBuffer,
  pageNumbers: number[],
): Promise<Uint8Array> {
  const src = await PDFDocument.load(file, { ignoreEncryption: true });
  const max = src.getPageCount();
  const indices = pageNumbers
    .map((n) => n - 1)
    .filter((i) => i >= 0 && i < max);

  if (indices.length === 0) {
    throw new Error("No valid pages selected.");
  }

  const out = await PDFDocument.create();
  const pages = await out.copyPages(src, indices);
  for (const page of pages) {
    out.addPage(page);
  }

  return out.save({ useObjectStreams: true });
}

export async function getPageCount(file: ArrayBuffer): Promise<number> {
  const src = await PDFDocument.load(file, { ignoreEncryption: true });
  return src.getPageCount();
}
