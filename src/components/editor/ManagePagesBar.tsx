"use client";

import { RotateCw, Trash2 } from "lucide-react";

type Props = {
  pageLabel: string;
  canDelete: boolean;
  onRotate: () => void;
  onDelete: () => void;
};

export function ManagePagesBar({ pageLabel, canDelete, onRotate, onDelete }: Props) {
  return (
    <div className="flex items-center gap-2 border-b border-zinc-200 bg-white px-4 py-2 text-sm">
      <span className="text-zinc-500">{pageLabel}</span>
      <button
        type="button"
        onClick={onRotate}
        className="inline-flex items-center gap-1 rounded-md border border-zinc-200 px-3 py-1.5 hover:bg-zinc-50"
      >
        <RotateCw className="h-4 w-4" /> Rotate 90°
      </button>
      <button
        type="button"
        onClick={onDelete}
        disabled={!canDelete}
        className="inline-flex items-center gap-1 rounded-md border border-zinc-200 px-3 py-1.5 hover:bg-zinc-50 disabled:opacity-40"
      >
        <Trash2 className="h-4 w-4" /> Delete page
      </button>
    </div>
  );
}
