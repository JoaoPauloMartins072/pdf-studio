import { PDFDocument } from "pdf-lib";
import { loadPdfDocument } from "@/lib/pdf/loadPdfDocument";

export type SplitResult = {
  pageNumber: number;
  bytes: Uint8Array;
};

/** Parse "1-3,5" into unique sorted 1-based page numbers. */
export function parsePageRange(input: string, maxPage: number): number[] {
  const pages = new Set<number>();

  for (const part of input.split(",")) {
    const trimmed = part.trim();
    if (!trimmed) continue;

    if (trimmed.includes("-")) {
      const [aRaw, bRaw] = trimmed.split("-");
      const a = parseInt(aRaw.trim(), 10);
      const b = parseInt(bRaw.trim(), 10);
      if (!Number.isFinite(a) || !Number.isFinite(b)) continue;
      const start = Math.min(a, b);
      const end = Math.max(a, b);
      for (let i = start; i <= end; i++) {
        if (i >= 1 && i <= maxPage) pages.add(i);
      }
      continue;
    }

    const n = parseInt(trimmed, 10);
    if (n >= 1 && n <= maxPage) pages.add(n);
  }

  return Array.from(pages).sort((a, b) => a - b);
}

/** One PDF per page. */
export async function splitPdfToPages(file: ArrayBuffer): Promise<SplitResult[]> {
  const src = await loadPdfDocument(file);
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
  const src = await loadPdfDocument(file);
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
  const src = await loadPdfDocument(file);
  return src.getPageCount();
}
