import type { DocumentDisplayList } from "@/core/display-list/types";
import type { EditableDocument, ObjectId, RgbColor } from "@/core/document-model/types";

/**
 * Core renderer — paints from Display List / Document Model.
 * Must not depend on React. UI hosts the surface (canvas/SVG).
 */

export type Rgba = { r: number; g: number; b: number; a?: number };

export type RenderTarget = {
  width: number;
  height: number;
  clear(): void;
  fillRect(x: number, y: number, w: number, h: number, color: Rgba): void;
  fillText(
    text: string,
    x: number,
    y: number,
    opts: {
      fontSize: number;
      color: Rgba;
      fontFamily?: string;
      maxWidth?: number;
    },
  ): void;
  strokePolyline(
    points: Array<{ x: number; y: number }>,
    opts: { color: Rgba; lineWidth: number },
  ): void;
};

export type RenderPageOptions = {
  /**
   * `full` — paint all page objects from the model (and/or display list).
   * `dirty` — only objects whose content differs from baseline (hybrid preview).
   */
  mode?: "full" | "dirty";
  baseline?: EditableDocument;
  /** Limit dirty rendering to these ids when provided. */
  dirtyObjectIds?: ReadonlySet<ObjectId>;
};

export interface DocumentRenderer {
  renderPage(
    document: EditableDocument,
    displayList: DocumentDisplayList | null,
    pageIndex: number,
    target: RenderTarget,
    options?: RenderPageOptions,
  ): void;
}

/** Stage 0 stub — clears target only. */
export class StubDocumentRenderer implements DocumentRenderer {
  renderPage(
    _document: EditableDocument,
    _displayList: DocumentDisplayList | null,
    _pageIndex: number,
    target: RenderTarget,
    _options?: RenderPageOptions,
  ): void {
    target.clear();
  }
}

export function rgbToRgba(color: RgbColor | null, fallback: Rgba = { r: 0.07, g: 0.07, b: 0.07 }): Rgba {
  if (!color) return fallback;
  return {
    r: color.r > 1 ? color.r / 255 : color.r,
    g: color.g > 1 ? color.g / 255 : color.g,
    b: color.b > 1 ? color.b / 255 : color.b,
    a: 1,
  };
}
