"use client";

import {
  AlignCenterHorizontal,
  AlignCenterVertical,
  AlignEndHorizontal,
  AlignEndVertical,
  AlignStartHorizontal,
  AlignStartVertical,
  BringToFront,
  Copy,
  SendToBack,
} from "lucide-react";
import type { AlignMode, ZOrderMode } from "@/core/commands/selectionCommands";

type Props = {
  selectionCount: number;
  onDuplicate: () => void;
  onAlign: (mode: AlignMode) => void;
  onZOrder: (mode: ZOrderMode) => void;
};

export function SelectionActionsBar({
  selectionCount,
  onDuplicate,
  onAlign,
  onZOrder,
}: Props) {
  if (selectionCount === 0) return null;

  const canAlign = selectionCount >= 2;

  return (
    <div className="flex items-center gap-1 overflow-x-auto border-b border-zinc-200 bg-white px-2 py-1 text-[11px] text-zinc-600">
      <span className="mr-2 whitespace-nowrap px-1 text-zinc-500">
        {selectionCount} selected
      </span>

      <button
        type="button"
        onClick={onDuplicate}
        className="flex items-center gap-1 rounded-md px-2 py-1 hover:bg-zinc-100"
        title="Duplicate (Ctrl+D)"
      >
        <Copy className="h-3.5 w-3.5" strokeWidth={1.6} />
        Duplicate
      </button>

      <div className="mx-1 h-4 w-px bg-zinc-200" />

      <button
        type="button"
        disabled={!canAlign}
        onClick={() => onAlign("left")}
        className="rounded-md p-1.5 hover:bg-zinc-100 disabled:opacity-35"
        title="Align left"
      >
        <AlignStartVertical className="h-3.5 w-3.5" strokeWidth={1.6} />
      </button>
      <button
        type="button"
        disabled={!canAlign}
        onClick={() => onAlign("centerX")}
        className="rounded-md p-1.5 hover:bg-zinc-100 disabled:opacity-35"
        title="Align center X"
      >
        <AlignCenterVertical className="h-3.5 w-3.5" strokeWidth={1.6} />
      </button>
      <button
        type="button"
        disabled={!canAlign}
        onClick={() => onAlign("right")}
        className="rounded-md p-1.5 hover:bg-zinc-100 disabled:opacity-35"
        title="Align right"
      >
        <AlignEndVertical className="h-3.5 w-3.5" strokeWidth={1.6} />
      </button>
      <button
        type="button"
        disabled={!canAlign}
        onClick={() => onAlign("top")}
        className="rounded-md p-1.5 hover:bg-zinc-100 disabled:opacity-35"
        title="Align top"
      >
        <AlignStartHorizontal className="h-3.5 w-3.5" strokeWidth={1.6} />
      </button>
      <button
        type="button"
        disabled={!canAlign}
        onClick={() => onAlign("centerY")}
        className="rounded-md p-1.5 hover:bg-zinc-100 disabled:opacity-35"
        title="Align center Y"
      >
        <AlignCenterHorizontal className="h-3.5 w-3.5" strokeWidth={1.6} />
      </button>
      <button
        type="button"
        disabled={!canAlign}
        onClick={() => onAlign("bottom")}
        className="rounded-md p-1.5 hover:bg-zinc-100 disabled:opacity-35"
        title="Align bottom"
      >
        <AlignEndHorizontal className="h-3.5 w-3.5" strokeWidth={1.6} />
      </button>

      <div className="mx-1 h-4 w-px bg-zinc-200" />

      <button
        type="button"
        onClick={() => onZOrder("front")}
        className="rounded-md p-1.5 hover:bg-zinc-100"
        title="Bring to front"
      >
        <BringToFront className="h-3.5 w-3.5" strokeWidth={1.6} />
      </button>
      <button
        type="button"
        onClick={() => onZOrder("back")}
        className="rounded-md p-1.5 hover:bg-zinc-100"
        title="Send to back"
      >
        <SendToBack className="h-3.5 w-3.5" strokeWidth={1.6} />
      </button>
    </div>
  );
}
