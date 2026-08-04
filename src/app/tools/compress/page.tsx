"use client";

import { useState } from "react";
import { PdfFileDropzone } from "@/components/PdfFileDropzone";
import { ToolFinishCheckout } from "@/components/ToolFinishCheckout";
import { PdfToolPageShell } from "@/components/PdfToolPageShell";
import { compressPdf, formatBytes } from "@/lib/pdf/compressPdfBytes";

export default function CompressPage() {
  const [file, setFile] = useState<File | null>(null);
  const [stats, setStats] = useState<{
    originalBytes: number;
    compressedBytes: number;
    ratio: number;
    bytes: Uint8Array;
  } | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function onFiles(files: File[]) {
    const f = files[0];
    if (!f) return;
    setFile(f);
    setStats(null);
    setError(null);
    setBusy(true);
    try {
      const result = await compressPdf(await f.arrayBuffer());
      setStats(result);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Compress failed");
    } finally {
      setBusy(false);
    }
  }

  return (
    <PdfToolPageShell
      title="Compress PDF"
      description="Rebuild your PDF with leaner object streams. Heavy image compression comes in a later release."
    >
      <PdfFileDropzone
        multiple={false}
        label={busy ? "Compressing…" : "Drop a PDF to compress"}
        onFiles={onFiles}
      />

      {stats && file && (
        <div className="grid gap-3 rounded-2xl border border-[var(--ink)]/10 bg-white/70 p-5 sm:grid-cols-3">
          <div>
            <p className="text-xs uppercase tracking-wide text-[var(--muted)]">Original</p>
            <p className="mt-1 font-[family-name:var(--font-display)] text-xl text-[var(--ink)]">
              {formatBytes(stats.originalBytes)}
            </p>
          </div>
          <div>
            <p className="text-xs uppercase tracking-wide text-[var(--muted)]">New size</p>
            <p className="mt-1 font-[family-name:var(--font-display)] text-xl text-[var(--ink)]">
              {formatBytes(stats.compressedBytes)}
            </p>
          </div>
          <div>
            <p className="text-xs uppercase tracking-wide text-[var(--muted)]">Saved</p>
            <p className="mt-1 font-[family-name:var(--font-display)] text-xl text-[var(--ink)]">
              {stats.ratio > 0 ? `${(stats.ratio * 100).toFixed(1)}%` : "Similar size"}
            </p>
          </div>
        </div>
      )}

      {error && (
        <p className="text-sm text-red-700" role="alert">
          {error}
        </p>
      )}

      <ToolFinishCheckout
        ready={Boolean(stats)}
        tool="compress"
        filename={
          file ? `${file.name.replace(/\.pdf$/i, "")}-compressed.pdf` : "compressed.pdf"
        }
        getBytes={async () => {
          if (!stats) throw new Error("Nothing to download");
          return stats.bytes;
        }}
      />
    </PdfToolPageShell>
  );
}
