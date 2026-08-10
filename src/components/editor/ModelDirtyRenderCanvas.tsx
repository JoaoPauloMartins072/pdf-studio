"use client";

import { useEffect, useMemo, useRef } from "react";
import type { DocumentDisplayList } from "@/core/display-list/types";
import type { EditableDocument, ObjectId, RgbColor } from "@/core/document-model/types";
import { objectsOnPage } from "@/core/hit-testing/queries";
import { Canvas2DRenderTarget } from "@/core/renderer/canvas2dTarget";
import { FolioModelRenderer } from "@/core/renderer/modelRenderer";
import { sampleCoverColorFromCanvas } from "@/lib/editor/sampleTextStyle";

type Props = {
  documentModel: EditableDocument;
  baseline: EditableDocument;
  displayList: DocumentDisplayList | null;
  pageIndex: number;
  width: number;
  height: number;
  dirtyObjectIds: ReadonlySet<ObjectId>;
  /** Persist sampled cover colors so export matches the dirty preview. */
  onCoverSampled?: (objectId: ObjectId, color: RgbColor) => void;
  className?: string;
};

/**
 * Stage 5–6 hybrid layer: FolioModelRenderer for dirty model objects
 * over the pdf.js raster; decodes image dataUrls asynchronously.
 * Samples the underlying pdf.js canvas for cover colors (header bars, etc.).
 */
export function ModelDirtyRenderCanvas({
  documentModel,
  baseline,
  displayList,
  pageIndex,
  width,
  height,
  dirtyObjectIds,
  onCoverSampled,
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

    const baseCanvas = findBasePdfCanvas(canvas);
    let paintDoc = documentModel;

    if (baseCanvas) {
      const pageObjects = objectsOnPage(documentModel, pageIndex);
      let touched = false;
      const pages = documentModel.pages.map((page) => {
        if (page.index !== pageIndex) return page;
        return {
          ...page,
          objects: page.objects.map((obj) => {
            if (obj.kind !== "text" || !dirtyObjectIds.has(obj.id) || obj.coverColor) {
              return obj;
            }
            const cover = sampleCoverColorFromCanvas(baseCanvas, obj.bbox, width, height);
            onCoverSampled?.(obj.id, cover);
            touched = true;
            return { ...obj, coverColor: cover };
          }),
        };
      });
      if (touched) {
        paintDoc = { ...documentModel, pages };
      }
    }

    const target = new Canvas2DRenderTarget(ctx, width, height);
    renderer.renderPage(paintDoc, displayList, pageIndex, target, {
      mode: "dirty",
      baseline,
      dirtyObjectIds,
    });

    let cancelled = false;
    const pageObjects = objectsOnPage(paintDoc, pageIndex);
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
    onCoverSampled,
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
      className={`pointer-events-none absolute left-0 top-0 ${className ?? ""}`}
      aria-hidden
    />
  );
}

function findBasePdfCanvas(dirtyCanvas: HTMLCanvasElement): HTMLCanvasElement | null {
  const parent = dirtyCanvas.parentElement;
  if (!parent) return null;
  for (const child of Array.from(parent.children)) {
    if (child instanceof HTMLCanvasElement && child !== dirtyCanvas) {
      return child;
    }
  }
  return null;
}
