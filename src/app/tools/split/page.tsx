"use client";

import { useState } from "react";
import { PdfFileDropzone } from "@/components/PdfFileDropzone";
import { ToolFinishCheckout } from "@/components/ToolFinishCheckout";
import { PdfToolPageShell } from "@/components/PdfToolPageShell";
import { downloadPdfFile } from "@/lib/downloadPdfFile";
import {
  extractPages,
  getPageCount,
  parsePageRange,
  splitPdfToPages,
} from "@/lib/pdf/splitPdfBytes";

export default function SplitPage() {
  const [file, setFile] = useState<File | null>(null);
  const [pageCount, setPageCount] = useState(0);
  const [mode, setMode] = useState<"all" | "range">("all");
  const [range, setRange] = useState("1-1");
  const [error, setError] = useState<string | null>(null);
  const [exportedAll, setExportedAll] = useState(false);

  async function onFiles(files: File[]) {
    const f = files[0];
    if (!f) return;
    setError(null);
    setExportedAll(false);
    try {
      const count = await getPageCount(await f.arrayBuffer());
      setFile(f);
      setPageCount(count);
      setRange(count > 1 ? `1-${count}` : "1");
    } catch (e) {
      setError(e instanceof Error ? e.message : "Could not read PDF");
    }
  }

  return (
    <PdfToolPageShell
      title="Split PDF"
      description="Extract a page range into one file, or export every page separately after unlock."
    >
      <PdfFileDropzone multiple={false} label="Drop a PDF to split" onFiles={onFiles} />

      {file && (
        <div className="rounded-2xl border border-[var(--ink)]/10 bg-white/70 p-5">
          <p className="text-sm text-[var(--ink)]">
            <span className="font-medium">{file.name}</span>
            <span className="text-[var(--muted)]"> · {pageCount} pages</span>
          </p>

          <div className="mt-4 flex flex-wrap gap-2">
            <button
              type="button"
              onClick={() => setMode("all")}
              className={`rounded-md px-3 py-1.5 text-sm ${
                mode === "all"
                  ? "bg-[var(--ink)] text-[var(--paper)]"
                  : "bg-[var(--ink)]/5 text-[var(--muted)]"
              }`}
            >
              Each page separate
            </button>
            <button
              type="button"
              onClick={() => setMode("range")}
              className={`rounded-md px-3 py-1.5 text-sm ${
                mode === "range"
                  ? "bg-[var(--ink)] text-[var(--paper)]"
                  : "bg-[var(--ink)]/5 text-[var(--muted)]"
              }`}
            >
              Page range
            </button>
          </div>

          {mode === "range" && (
            <label className="mt-4 block text-sm text-[var(--muted)]">
              Pages (e.g. 1-3,5)
              <input
                value={range}
                onChange={(e) => setRange(e.target.value)}
                className="mt-1 w-full rounded-lg border border-[var(--ink)]/15 bg-white px-3 py-2 text-[var(--ink)] outline-none focus:border-[var(--accent)]"
              />
            </label>
          )}
        </div>
      )}

      {error && (
        <p className="text-sm text-red-700" role="alert">
          {error}
        </p>
      )}

      <ToolFinishCheckout
        ready={Boolean(file)}
        tool="split"
        filename={
          mode === "range"
            ? `${file?.name.replace(/\.pdf$/i, "") || "extract"}-extract.pdf`
            : "page-1.pdf"
        }
        getBytes={async () => {
          if (!file) throw new Error("No file");
          const buf = await file.arrayBuffer();
          if (mode === "range") {
            return extractPages(buf, parsePageRange(range, pageCount));
          }
          const parts = await splitPdfToPages(buf);
          for (let i = 1; i < parts.length; i++) {
            downloadPdfFile(parts[i].bytes, `page-${parts[i].pageNumber}.pdf`);
          }
          setExportedAll(true);
          return parts[0].bytes;
        }}
      />

      {exportedAll && mode === "all" && (
        <p className="text-sm text-[var(--muted)]">
          Each page was saved as a separate PDF in your downloads folder.
        </p>
      )}
    </PdfToolPageShell>
  );
}
