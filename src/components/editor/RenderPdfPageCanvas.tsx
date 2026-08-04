"use client";

import { useEffect, useRef, useState } from "react";
import type { PDFDocumentProxy, RenderTask } from "pdfjs-dist";

type Props = {
  pdf: PDFDocumentProxy;
  pageIndex: number;
  scale?: number;
  className?: string;
  onRendered?: (width: number, height: number) => void;
};

export function RenderPdfPageCanvas({ pdf, pageIndex, scale = 1.35, className, onRendered }: Props) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    let renderTask: RenderTask | null = null;

    (async () => {
      try {
        const page = await pdf.getPage(pageIndex + 1);
        if (cancelled) return;
        const viewport = page.getViewport({ scale });
        const canvas = canvasRef.current;
        if (!canvas) return;
        const ctx = canvas.getContext("2d");
        if (!ctx) return;

        const outputScale = window.devicePixelRatio || 1;
        canvas.width = Math.floor(viewport.width * outputScale);
        canvas.height = Math.floor(viewport.height * outputScale);
        canvas.style.width = `${viewport.width}px`;
        canvas.style.height = `${viewport.height}px`;
        ctx.setTransform(outputScale, 0, 0, outputScale, 0, 0);

        renderTask = page.render({
          canvasContext: ctx,
          viewport,
        });
        await renderTask.promise;
        if (!cancelled) onRendered?.(viewport.width, viewport.height);
      } catch (e) {
        if (!cancelled) setError(e instanceof Error ? e.message : "Failed to render page");
      }
    })();

    return () => {
      cancelled = true;
      try {
        renderTask?.cancel();
      } catch {
        /* ignore */
      }
    };
  }, [pdf, pageIndex, scale, onRendered]);

  if (error) {
    return (
      <div className="rounded bg-red-50 p-4 text-sm text-red-700" role="alert">
        {error}
      </div>
    );
  }

  return <canvas ref={canvasRef} className={className} />;
}
