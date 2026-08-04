"use client";

import { useEffect, useMemo, useRef } from "react";
import type { DocumentDisplayList } from "@/core/display-list/types";
import type { EditableDocument, ObjectId } from "@/core/document-model/types";
import { objectsOnPage } from "@/core/hit-testing/queries";
import { Canvas2DRenderTarget } from "@/core/renderer/canvas2dTarget";
import { FolioModelRenderer } from "@/core/renderer/modelRenderer";

type Props = {
  documentModel: EditableDocument;
  baseline: EditableDocument;
  displayList: DocumentDisplayList | null;
  pageIndex: number;
  width: number;
  height: number;
  dirtyObjectIds: ReadonlySet<ObjectId>;
  className?: string;
};

/**
 * Stage 5–6 hybrid layer: FolioModelRenderer for dirty model objects
 * over the pdf.js raster; decodes image dataUrls asynchronously.
 */
export function ModelDirtyRenderCanvas({
  documentModel,
  baseline,
  displayList,
  pageIndex,
  width,
  height,
  dirtyObjectIds,
  className,
}: Props) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const renderer = useMemo(() => new FolioModelRenderer(), []);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas || width <= 0 || height <= 0) return;

    const dpr = window.devicePixelRatio || 1;
    canvas.width = Math.floor(width * dpr);
    canvas.height = Math.floor(height * dpr);
    canvas.style.width = `${width}px`;
    canvas.style.height = `${height}px`;

    const ctx = canvas.getContext("2d");
    if (!ctx) return;
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);

    const target = new Canvas2DRenderTarget(ctx, width, height);
    renderer.renderPage(documentModel, displayList, pageIndex, target, {
      mode: "dirty",
      baseline,
      dirtyObjectIds,
    });

    let cancelled = false;
    const pageObjects = objectsOnPage(documentModel, pageIndex);
    for (const obj of pageObjects) {
      if (obj.kind !== "image" || !obj.dataUrl || !dirtyObjectIds.has(obj.id)) continue;
      const img = new Image();
      img.onload = () => {
        if (cancelled) return;
        ctx.drawImage(
          img,
          obj.bbox.x * width,
          obj.bbox.y * height,
          obj.bbox.width * width,
          obj.bbox.height * height,
        );
      };
      img.src = obj.dataUrl;
    }

    return () => {
      cancelled = true;
    };
  }, [
    baseline,
    dirtyObjectIds,
    displayList,
    documentModel,
    height,
    pageIndex,
    renderer,
    width,
  ]);

  if (dirtyObjectIds.size === 0) {
    return null;
  }

  return (
    <canvas
      ref={canvasRef}
      className={`pointer-events-none absolute inset-0 ${className ?? ""}`}
      aria-hidden
    />
  );
}
