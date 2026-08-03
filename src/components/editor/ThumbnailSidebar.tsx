"use client";

import type { PDFDocumentProxy } from "pdfjs-dist";
import { PdfPageCanvas } from "@/components/editor/PdfPageCanvas";

type Props = {
  pdf: PDFDocumentProxy;
  pageOrder: number[];
  current: number;
  onSelect: (viewIndex: number) => void;
};

export function ThumbnailSidebar({ pdf, pageOrder, current, onSelect }: Props) {
  return (
    <aside className="w-36 shrink-0 overflow-y-auto border-r border-zinc-200 bg-white p-3">
      {pageOrder.map((srcIdx, viewIdx) => (
        <button
          key={`${srcIdx}-${viewIdx}`}
          type="button"
          onClick={() => onSelect(viewIdx)}
          className={`mb-3 block w-full overflow-hidden rounded border-2 bg-zinc-50 ${
            viewIdx === current ? "border-rose-500" : "border-transparent hover:border-zinc-300"
          }`}
        >
          <div className="relative">
            <PdfPageCanvas pdf={pdf} pageIndex={srcIdx} scale={0.22} className="w-full" />
            <span className="absolute bottom-1 left-1 flex h-5 min-w-5 items-center justify-center rounded-full bg-rose-600 px-1 text-[10px] font-semibold text-white">
              {viewIdx + 1}
            </span>
          </div>
        </button>
      ))}
    </aside>
  );
}
