"use client";

import type { ComponentType } from "react";
import type { EditorTool } from "@/lib/editor/editorModel";
import {
  Highlighter,
  Image as ImageIcon,
  LayoutList,
  MousePointer2,
  Pencil,
  PenLine,
  Redo2,
  RotateCcw,
  Signature,
  Trash2,
  Type,
  Undo2,
} from "lucide-react";

type ToolDef = {
  id: EditorTool;
  label: string;
  icon: ComponentType<{ className?: string; strokeWidth?: number }>;
};

const TOOLS: ToolDef[] = [
  { id: "select", label: "Select", icon: MousePointer2 },
  { id: "addText", label: "Add text", icon: Type },
  { id: "editText", label: "Edit text", icon: Pencil },
  { id: "sign", label: "Sign", icon: Signature },
  { id: "draw", label: "Draw", icon: PenLine },
  { id: "highlight", label: "Highlight", icon: Highlighter },
  { id: "image", label: "Image", icon: ImageIcon },
  { id: "managePages", label: "Manage pages", icon: LayoutList },
];

type Props = {
  tool: EditorTool;
  onTool: (t: EditorTool) => void;
  showThumbs: boolean;
  onToggleThumbs: () => void;
  canUndo: boolean;
  canRedo: boolean;
  onUndo: () => void;
  onRedo: () => void;
  onDeleteSelected: () => void;
  hasSelection: boolean;
};

export function PdfToolsToolbar({
  tool,
  onTool,
  showThumbs,
  onToggleThumbs,
  canUndo,
  canRedo,
  onUndo,
  onRedo,
  onDeleteSelected,
  hasSelection,
}: Props) {
  return (
    <div className="flex items-stretch gap-1 overflow-x-auto border-b border-zinc-200 bg-white px-2 py-1.5">
      <button
        type="button"
        onClick={onToggleThumbs}
        className={`flex min-w-[68px] flex-col items-center gap-0.5 rounded-md px-2 py-1.5 text-[11px] ${
          showThumbs ? "bg-rose-50 text-rose-700" : "text-zinc-600 hover:bg-zinc-100"
        }`}
      >
        <LayoutList className="h-5 w-5" strokeWidth={1.6} />
        Thumbnails
      </button>

      <div className="mx-1 w-px self-stretch bg-zinc-200" />

      <button
        type="button"
        disabled={!canUndo}
        onClick={onUndo}
        className="flex min-w-[56px] flex-col items-center gap-0.5 rounded-md px-2 py-1.5 text-[11px] text-zinc-600 hover:bg-zinc-100 disabled:opacity-35"
      >
        <Undo2 className="h-5 w-5" strokeWidth={1.6} />
        Undo
      </button>
      <button
        type="button"
        disabled={!canRedo}
        onClick={onRedo}
        className="flex min-w-[56px] flex-col items-center gap-0.5 rounded-md px-2 py-1.5 text-[11px] text-zinc-600 hover:bg-zinc-100 disabled:opacity-35"
      >
        <Redo2 className="h-5 w-5" strokeWidth={1.6} />
        Redo
      </button>

      <div className="mx-1 w-px self-stretch bg-zinc-200" />

      {TOOLS.map((t) => {
        const Icon = t.icon;
        const active = tool === t.id;
        return (
          <button
            key={t.id}
            type="button"
            onClick={() => onTool(t.id)}
            className={`flex min-w-[68px] flex-col items-center gap-0.5 rounded-md px-2 py-1.5 text-[11px] ${
              active ? "bg-rose-50 text-rose-700" : "text-zinc-600 hover:bg-zinc-100"
            }`}
          >
            <Icon className="h-5 w-5" strokeWidth={1.6} />
            {t.label}
          </button>
        );
      })}

      <div className="mx-1 w-px self-stretch bg-zinc-200" />

      <button
        type="button"
        disabled={!hasSelection}
        onClick={onDeleteSelected}
        className="flex min-w-[56px] flex-col items-center gap-0.5 rounded-md px-2 py-1.5 text-[11px] text-zinc-600 hover:bg-zinc-100 disabled:opacity-35"
      >
        <Trash2 className="h-5 w-5" strokeWidth={1.6} />
        Delete
      </button>
      <button
        type="button"
        onClick={() => onTool("managePages")}
        className="flex min-w-[68px] flex-col items-center gap-0.5 rounded-md px-2 py-1.5 text-[11px] text-zinc-600 hover:bg-zinc-100"
        title="Rotate current page from Manage pages"
      >
        <RotateCcw className="h-5 w-5" strokeWidth={1.6} />
        Pages
      </button>
    </div>
  );
}
