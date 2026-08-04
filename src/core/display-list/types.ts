/**
 * Display List — ordered paint operations produced by the Graphics Interpreter.
 * Bridge between content streams and the Editable Document Model.
 * Not the editing surface; the Editable Document Model is.
 */

import type { BBox, Matrix2D, RgbColor } from "@/core/document-model/types";

export type DisplayListOp =
  | DisplayListSave
  | DisplayListRestore
  | DisplayListConcat
  | DisplayListSetFillColor
  | DisplayListSetStrokeColor
  | DisplayListSetLineWidth
  | DisplayListFillPath
  | DisplayListStrokePath
  | DisplayListText
  | DisplayListImage
  | DisplayListDrawPath
  | DisplayListForm;

export type DisplayListSave = { op: "save" };
export type DisplayListRestore = { op: "restore" };
export type DisplayListConcat = { op: "concat"; matrix: Matrix2D };
export type DisplayListSetFillColor = { op: "setFillColor"; color: RgbColor };
export type DisplayListSetStrokeColor = { op: "setStrokeColor"; color: RgbColor };
export type DisplayListSetLineWidth = { op: "setLineWidth"; width: number };

export type DisplayListFillPath = {
  op: "fillPath";
  pathId: string;
};

export type DisplayListStrokePath = {
  op: "strokePath";
  pathId: string;
};

export type DisplayListText = {
  op: "text";
  /** Stable id once promoted into the document model. */
  objectId?: string;
  content: string;
  matrix: Matrix2D;
  fontSize: number;
  fontName: string | null;
  fillColor: RgbColor | null;
  /**
   * Normalized top-left bbox (0–1) when the producer already computed it
   * (e.g. pdf.js Stage 1 bridge). Preferred for hit-testing alignment.
   */
  bboxNorm?: BBox;
  /** True when Unicode / ToUnicode mapping is believed available. */
  hasUnicodeMap?: boolean;
};

export type DisplayListImage = {
  op: "image";
  objectId?: string;
  resourceName: string;
  matrix: Matrix2D;
  bboxNorm?: BBox;
  widthPx?: number;
  heightPx?: number;
  dataUrl?: string | null;
};

export type DisplayListDrawPath = {
  op: "drawPath";
  objectId?: string;
  /** Normalized top-left path ops (0–1). */
  pathOps: Array<
    | { op: "moveTo"; x: number; y: number }
    | { op: "lineTo"; x: number; y: number }
    | { op: "curveTo"; x1: number; y1: number; x2: number; y2: number; x3: number; y3: number }
    | { op: "close" }
  >;
  bboxNorm: BBox;
  fillColor: RgbColor | null;
  strokeColor: RgbColor | null;
  strokeWidth: number | null;
};

export type DisplayListForm = {
  op: "form";
  resourceName: string;
  matrix: Matrix2D;
};

export type PageDisplayList = {
  pageIndex: number;
  width: number;
  height: number;
  ops: DisplayListOp[];
};

export type DocumentDisplayList = {
  pages: PageDisplayList[];
};
