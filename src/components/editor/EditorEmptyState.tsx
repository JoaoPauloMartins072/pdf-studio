"use client";

import type { ReactNode } from "react";
import { Upload } from "lucide-react";
import { EditorHeader } from "@/components/editor/EditorHeader";

type Props = {
  loading: boolean;
  error: string | null;
  onPick: () => void;
  fileInput: ReactNode;
};

export function EditorEmptyState({ loading, error, onPick, fileInput }: Props) {
  return (
    <div className="flex min-h-screen flex-col bg-zinc-100">
      <EditorHeader onOpen={onPick} />
      <div className="flex flex-1 items-center justify-center p-6">
        <div className="w-full max-w-lg rounded-2xl border border-zinc-200 bg-white p-8 shadow-sm">
          <h1 className="text-2xl font-semibold text-zinc-900">Open a PDF to edit</h1>
          <p className="mt-2 text-sm text-zinc-500">
            Add text, draw, highlight, sign, insert images, manage pages — then tap Done to
            download your edited file.
          </p>
          <button
            type="button"
            disabled={loading}
            onClick={onPick}
            className="mt-6 flex w-full flex-col items-center gap-3 rounded-xl border-2 border-dashed border-zinc-300 px-6 py-12 text-zinc-600 transition hover:border-rose-400 hover:bg-rose-50/40"
          >
            <Upload className="h-8 w-8" />
            <span className="font-medium">{loading ? "Opening…" : "Drop or choose a PDF"}</span>
          </button>
          {fileInput}
          {error && (
            <p className="mt-3 text-sm text-red-600" role="alert">
              {error}
            </p>
          )}
        </div>
      </div>
    </div>
  );
}
