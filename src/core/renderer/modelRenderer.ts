import type { DocumentDisplayList } from "@/core/display-list/types";
import { dirtyObjectIdSet } from "@/core/document-model/diff";
import type {
  DocumentPage,
  EditableDocument,
  ImageObject,
  ObjectId,
  PathObject,
  TextObject,
} from "@/core/document-model/types";
import {
  rgbToRgba,
  type DocumentRenderer,
  type RenderPageOptions,
  type RenderTarget,
} from "@/core/renderer/types";

/**
 * Stage 5–6 renderer — paints text / paths / image placeholders from the model.
 * Image bitmaps with dataUrl are finished by the UI layer (async decode).
 */
export class FolioModelRenderer implements DocumentRenderer {
  renderPage(
    document: EditableDocument,
    displayList: DocumentDisplayList | null,
    pageIndex: number,
    target: RenderTarget,
    options: RenderPageOptions = {},
  ): void {
    const mode = options.mode ?? "full";
    target.clear();

    const page =
      document.pages.find((p) => p.index === pageIndex) ??
      document.pages.find((p) => p.id === `page_${pageIndex}`);
    if (!page) return;

    if (mode === "dirty") {
      const dirtyIds = resolveDirtyIds(document, options);
      for (const obj of page.objects) {
        if (!dirtyIds.has(obj.id)) continue;
        if (obj.kind === "text" || obj.kind === "path" || obj.kind === "image") {
          paintObject(target, page, obj, true);
        }
      }
      return;
    }

    if (page.objects.length > 0) {
      for (const obj of page.objects) {
        if (obj.kind === "text" || obj.kind === "path" || obj.kind === "image") {
          paintObject(target, page, obj, false);
        }
      }
      return;
    }

    if (displayList) {
      paintDisplayListText(target, displayList, pageIndex, document);
    }
  }
}

function resolveDirtyIds(
  document: EditableDocument,
  options: RenderPageOptions,
): Set<ObjectId> {
  if (options.dirtyObjectIds) return new Set(options.dirtyObjectIds);
  if (options.baseline) return dirtyObjectIdSet(options.baseline, document);
  return new Set();
}

function paintObject(
  target: RenderTarget,
  page: DocumentPage,
  obj: TextObject | ImageObject | PathObject,
  coverBackground: boolean,
): void {
  if (obj.kind === "text") {
    paintTextObject(target, page, obj, coverBackground);
    return;
  }
  if (obj.kind === "path") {
    paintPathObject(target, obj);
    return;
  }
  if (obj.kind === "image") {
    paintImagePlaceholder(target, obj, coverBackground);
  }
}

function paintTextObject(
  target: RenderTarget,
  page: DocumentPage,
  obj: TextObject,
  coverBackground: boolean,
): void {
  const x = obj.bbox.x * target.width;
  const y = obj.bbox.y * target.height;
  const w = Math.max(obj.bbox.width * target.width, obj.content.length * obj.fontSize * 0.5);
  const h = Math.max(obj.bbox.height * target.height, 1);
  const fontSize = Math.max(8, obj.fontSize * (target.height / Math.max(page.height, 1)));

  if (coverBackground) {
    target.fillRect(x, y, w, h, { r: 1, g: 1, b: 1, a: 1 });
  }

  target.fillText(obj.content || " ", x, y, {
    fontSize,
    color: rgbToRgba(obj.fillColor),
    maxWidth: w,
  });
}

function paintPathObject(target: RenderTarget, obj: PathObject): void {
  const pts: Array<{ x: number; y: number }> = [];
  for (const op of obj.ops) {
    if (op.op === "moveTo" || op.op === "lineTo") {
      pts.push({ x: op.x * target.width, y: op.y * target.height });
    }
  }
  const stroke = obj.strokeColor ?? { r: 0.88, g: 0.11, b: 0.28 };
  target.strokePolyline(pts, {
    color: rgbToRgba(stroke),
    lineWidth: obj.strokeWidth ?? 2,
  });
}

function paintImagePlaceholder(
  target: RenderTarget,
  obj: ImageObject,
  coverBackground: boolean,
): void {
  const x = obj.bbox.x * target.width;
  const y = obj.bbox.y * target.height;
  const w = obj.bbox.width * target.width;
  const h = obj.bbox.height * target.height;
  if (coverBackground || !obj.dataUrl) {
    target.fillRect(x, y, w, h, { r: 1, g: 1, b: 1, a: 1 });
  }
  if (!obj.dataUrl) {
    target.fillRect(x, y, w, h, { r: 0.85, g: 0.88, b: 0.92, a: 0.9 });
  }
  // Bitmap draw is done by ModelDirtyRenderCanvas (async image decode).
}

function paintDisplayListText(
  target: RenderTarget,
  displayList: DocumentDisplayList,
  pageIndex: number,
  document: EditableDocument,
): void {
  const pageDl = displayList.pages.find((p) => p.pageIndex === pageIndex);
  if (!pageDl) return;

  const liveById = new Map<ObjectId, TextObject>();
  const modelPage = document.pages.find((p) => p.index === pageIndex);
  if (modelPage) {
    for (const obj of modelPage.objects) {
      if (obj.kind === "text") liveById.set(obj.id, obj);
    }
  }

  for (const op of pageDl.ops) {
    if (op.op !== "text" || !op.bboxNorm) continue;
    const live = op.objectId ? liveById.get(op.objectId) : undefined;
    const content = live?.content ?? op.content;
    const bbox = live?.bbox ?? op.bboxNorm;
    const fontSize = Math.max(
      8,
      (live?.fontSize ?? op.fontSize) * (target.height / Math.max(pageDl.height, 1)),
    );
    target.fillText(content || " ", bbox.x * target.width, bbox.y * target.height, {
      fontSize,
      color: rgbToRgba(live?.fillColor ?? op.fillColor),
      maxWidth: bbox.width * target.width,
    });
  }
}
