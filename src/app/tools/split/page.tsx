"use client";

import { useState } from "react";
import { Dropzone } from "@/components/Dropzone";
import { Paywall } from "@/components/Paywall";
import { ToolShell } from "@/components/ToolShell";
import { extractPages, getPageCount, splitPdfToPages } from "@/lib/pdf/split";
import { downloadBytes } from "@/lib/download";

export default function SplitPage() {
  const [file, setFile] = useState<File | null>(null);
  const [pageCount, setPageCount] = useState(0);
  const [mode, setMode] = useState<"all" | "range">("all");
  const [range, setRange] = useState("1-1");
  const [error, setError] = useState<string | null>(null);
  const [unlocked, setUnlocked] = useState(false);

  async function onFiles(files: File[]) {
    const f = files[0];
    if (!f) return;
    setError(null);
    setUnlocked(false);
    try {
      const count = await getPageCount(await f.arrayBuffer());
      setFile(f);
      setPageCount(count);
      setRange(count > 1 ? `1-${count}` : "1");
    } catch (e) {
      setError(e instanceof Error ? e.message : "Could not read PDF");
    }
  }

  function parseRange(input: string, max: number): number[] {
    const pages = new Set<number>();
    for (const part of input.split(",")) {
      const trimmed = part.trim();
      if (!trimmed) continue;
      if (trimmed.includes("-")) {
        const [a, b] = trimmed.split("-").map((x) => parseInt(x.trim(), 10));
        if (!Number.isFinite(a) || !Number.isFinite(b)) continue;
        const start = Math.min(a, b);
        const end = Math.max(a, b);
        for (let i = start; i <= end; i++) {
          if (i >= 1 && i <= max) pages.add(i);
        }
      } else {
        const n = parseInt(trimmed, 10);
        if (n >= 1 && n <= max) pages.add(n);
      }
    }
    return Array.from(pages).sort((a, b) => a - b);
  }

  return (
    <ToolShell
      title="Split PDF"
      description="Extract a page range into one file, or export every page separately after unlock."
    >
      <Dropzone multiple={false} label="Drop a PDF to split" onFiles={onFiles} />

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

      <Paywall
        ready={Boolean(file)}
        tool="split"
        filename={
          mode === "range"
            ? file?.name.replace(/\.pdf$/i, "") + "-extract.pdf" || "extract.pdf"
            : "page-1.pdf"
        }
        getBytes={async () => {
          if (!file) throw new Error("No file");
          const buf = await file.arrayBuffer();
          if (mode === "range") {
            const pages = parseRange(range, pageCount);
            return extractPages(buf, pages);
          }
          // For "all pages" mode: download page 1 here; unlock also triggers zip-like sequential downloads
          const parts = await splitPdfToPages(buf);
          // Download remaining pages after first
          for (let i = 1; i < parts.length; i++) {
            downloadBytes(parts[i].bytes, `page-${parts[i].pageNumber}.pdf`);
          }
          setUnlocked(true);
          return parts[0].bytes;
        }}
      />

      {unlocked && mode === "all" && (
        <p className="text-sm text-[var(--muted)]">
          Each page was saved as a separate PDF in your downloads folder.
        </p>
      )}
    </ToolShell>
  );
}
