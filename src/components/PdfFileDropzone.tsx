"use client";

import { useCallback, useRef, useState } from "react";
import { Upload } from "lucide-react";

type PdfFileDropzoneProps = {
  multiple?: boolean;
  onFiles: (files: File[]) => void;
  label?: string;
  hint?: string;
};

export function PdfFileDropzone({
  multiple = false,
  onFiles,
  label = "Drop PDFs here",
  hint = "or click to browse — processed in your browser",
}: PdfFileDropzoneProps) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [dragging, setDragging] = useState(false);

  const take = useCallback(
    (list: FileList | null) => {
      if (!list?.length) return;
      const pdfs = Array.from(list).filter(
        (f) => f.type === "application/pdf" || f.name.toLowerCase().endsWith(".pdf"),
      );
      if (pdfs.length) onFiles(pdfs);
    },
    [onFiles],
  );

  return (
    <button
      type="button"
      onClick={() => inputRef.current?.click()}
      onDragEnter={(e) => {
        e.preventDefault();
        setDragging(true);
      }}
      onDragOver={(e) => {
        e.preventDefault();
        setDragging(true);
      }}
      onDragLeave={(e) => {
        e.preventDefault();
        setDragging(false);
      }}
      onDrop={(e) => {
        e.preventDefault();
        setDragging(false);
        take(e.dataTransfer.files);
      }}
      className={`group flex w-full flex-col items-center justify-center gap-3 rounded-2xl border-2 border-dashed px-6 py-14 text-center transition ${
        dragging
          ? "border-[var(--accent)] bg-[var(--accent)]/15"
          : "border-[var(--ink)]/20 bg-white/50 hover:border-[var(--ink)]/40 hover:bg-white/80"
      }`}
    >
      <span
        className={`flex h-12 w-12 items-center justify-center rounded-xl transition ${
          dragging
            ? "bg-[var(--accent)] text-[var(--ink)]"
            : "bg-[var(--ink)]/8 text-[var(--ink)] group-hover:bg-[var(--ink)] group-hover:text-[var(--paper)]"
        }`}
      >
        <Upload className="h-5 w-5" />
      </span>
      <div>
        <p className="font-[family-name:var(--font-display)] text-lg text-[var(--ink)]">
          {label}
        </p>
        <p className="mt-1 text-sm text-[var(--muted)]">{hint}</p>
      </div>
      <input
        ref={inputRef}
        type="file"
        accept="application/pdf,.pdf"
        multiple={multiple}
        className="hidden"
        onChange={(e) => {
          take(e.target.files);
          e.target.value = "";
        }}
      />
    </button>
  );
}
