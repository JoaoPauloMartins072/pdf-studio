"use client";

import { useMemo, useState } from "react";
import { GripVertical, X } from "lucide-react";
import { Dropzone } from "@/components/Dropzone";
import { Paywall } from "@/components/Paywall";
import { ToolShell } from "@/components/ToolShell";
import { mergePdfs } from "@/lib/pdf/merge";

type Item = { id: string; file: File };

export default function MergePage() {
  const [items, setItems] = useState<Item[]>([]);
  const [error, setError] = useState<string | null>(null);

  const ready = items.length >= 2;

  const getBytes = useMemo(
    () => async () => {
      const buffers = await Promise.all(items.map((i) => i.file.arrayBuffer()));
      return mergePdfs(buffers);
    },
    [items],
  );

  return (
    <ToolShell
      title="Merge PDFs"
      description="Combine multiple PDFs into one file. Reorder before unlocking download."
    >
      <Dropzone
        multiple
        label="Drop PDFs to merge"
        onFiles={(files) => {
          setError(null);
          setItems((prev) => [
            ...prev,
            ...files.map((file) => ({
              id: `${file.name}-${file.size}-${crypto.randomUUID()}`,
              file,
            })),
          ]);
        }}
      />

      {items.length > 0 && (
        <ul className="space-y-2">
          {items.map((item, index) => (
            <li
              key={item.id}
              className="flex items-center gap-3 rounded-xl border border-[var(--ink)]/10 bg-white/70 px-3 py-3"
            >
              <GripVertical className="h-4 w-4 shrink-0 text-[var(--muted)]" />
              <span className="w-6 text-sm text-[var(--muted)]">{index + 1}</span>
              <span className="min-w-0 flex-1 truncate text-sm text-[var(--ink)]">
                {item.file.name}
              </span>
              <div className="flex gap-1">
                <button
                  type="button"
                  className="rounded px-2 py-1 text-xs text-[var(--muted)] hover:bg-[var(--ink)]/5 hover:text-[var(--ink)]"
                  disabled={index === 0}
                  onClick={() =>
                    setItems((prev) => {
                      const next = [...prev];
                      [next[index - 1], next[index]] = [next[index], next[index - 1]];
                      return next;
                    })
                  }
                >
                  Up
                </button>
                <button
                  type="button"
                  className="rounded px-2 py-1 text-xs text-[var(--muted)] hover:bg-[var(--ink)]/5 hover:text-[var(--ink)]"
                  disabled={index === items.length - 1}
                  onClick={() =>
                    setItems((prev) => {
                      const next = [...prev];
                      [next[index], next[index + 1]] = [next[index + 1], next[index]];
                      return next;
                    })
                  }
                >
                  Down
                </button>
                <button
                  type="button"
                  aria-label="Remove"
                  className="rounded p-1 text-[var(--muted)] hover:bg-red-50 hover:text-red-700"
                  onClick={() => setItems((prev) => prev.filter((x) => x.id !== item.id))}
                >
                  <X className="h-4 w-4" />
                </button>
              </div>
            </li>
          ))}
        </ul>
      )}

      {items.length === 1 && (
        <p className="text-sm text-[var(--muted)]">Add at least one more PDF to merge.</p>
      )}

      {error && (
        <p className="text-sm text-red-700" role="alert">
          {error}
        </p>
      )}

      <Paywall
        ready={ready}
        tool="merge"
        filename="merged.pdf"
        getBytes={async () => {
          try {
            return await getBytes();
          } catch (e) {
            const msg = e instanceof Error ? e.message : "Merge failed";
            setError(msg);
            throw e;
          }
        }}
      />
    </ToolShell>
  );
}
