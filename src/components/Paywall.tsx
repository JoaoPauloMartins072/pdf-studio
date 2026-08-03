"use client";

import { useState } from "react";
import { Download, Loader2 } from "lucide-react";
import { downloadBytes } from "@/lib/download";
import { CheckoutModal } from "@/components/editor/CheckoutModal";

type PaywallProps = {
  ready: boolean;
  filename: string;
  getBytes: () => Promise<Uint8Array> | Uint8Array;
  /** Kept for API compatibility; checkout is demo-only for now. */
  tool?: string;
};

/**
 * Shared finish flow for merge/split/compress.
 * Opens the same demo checkout as the editor, then downloads locally.
 */
export function Paywall({ ready, filename, getBytes }: PaywallProps) {
  const [open, setOpen] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function confirmDownload() {
    setBusy(true);
    setError(null);
    try {
      const bytes = await getBytes();
      downloadBytes(bytes, filename);
      setOpen(false);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Download failed");
      throw e;
    } finally {
      setBusy(false);
    }
  }

  if (!ready) {
    return (
      <div className="rounded-2xl border border-[var(--ink)]/10 bg-white/40 px-5 py-6 text-sm text-[var(--muted)]">
        Prepare your PDF first — then download the finished file.
      </div>
    );
  }

  return (
    <>
      <div className="rounded-2xl border border-[var(--ink)]/10 bg-white/70 p-5 shadow-[0_20px_50px_-30px_rgba(28,36,28,0.45)]">
        <p className="font-[family-name:var(--font-display)] text-lg text-[var(--ink)]">
          Ready to download
        </p>
        <p className="mt-1 text-sm text-[var(--muted)]">
          Demo checkout — choose a payment method, tap Pay, and get your PDF. No real charge yet.
        </p>
        <button
          type="button"
          disabled={busy}
          onClick={() => setOpen(true)}
          className="mt-5 inline-flex items-center gap-2 rounded-lg bg-[var(--ink)] px-4 py-2.5 text-sm font-semibold text-[var(--paper)] transition hover:bg-[var(--ink-soft)] disabled:opacity-60"
        >
          {busy ? <Loader2 className="h-4 w-4 animate-spin" /> : <Download className="h-4 w-4" />}
          Finish & download
        </button>
        {error && (
          <p className="mt-3 text-sm text-red-700" role="alert">
            {error}
          </p>
        )}
      </div>
      <CheckoutModal
        open={open}
        filename={filename}
        onClose={() => setOpen(false)}
        onConfirm={confirmDownload}
      />
    </>
  );
}
