"use client";

import Link from "next/link";
import { Check, FilePlus2, Mail } from "lucide-react";

type Props = {
  onOpen: () => void;
  onDone?: () => void;
  showDone?: boolean;
};

export function EditorHeader({ onOpen, onDone, showDone }: Props) {
  return (
    <header className="flex items-center justify-between border-b border-zinc-200 bg-white px-4 py-2.5">
      <Link href="/" className="flex items-center gap-2">
        <span className="flex h-8 w-8 items-center justify-center rounded bg-rose-600 text-white">
          <FilePlus2 className="h-4 w-4" />
        </span>
        <span className="text-lg font-semibold text-zinc-900">Folio</span>
      </Link>
      <div className="flex items-center gap-2">
        <button
          type="button"
          onClick={onOpen}
          className="inline-flex items-center gap-1.5 rounded-lg border border-zinc-200 bg-white px-3 py-2 text-sm font-medium text-zinc-700 hover:bg-zinc-50"
        >
          <Mail className="h-4 w-4" />
          Open PDF
        </button>
        {showDone && onDone && (
          <button
            type="button"
            onClick={onDone}
            className="inline-flex items-center gap-1.5 rounded-lg bg-rose-600 px-4 py-2 text-sm font-semibold text-white hover:bg-rose-700"
          >
            <Check className="h-4 w-4" />
            Done
          </button>
        )}
      </div>
    </header>
  );
}
