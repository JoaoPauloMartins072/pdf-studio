export type EditorTool =
  | "select"
  | "addText"
  | "editText"
  | "sign"
  | "draw"
  | "highlight"
  | "image"
  | "managePages";

export type Point = { x: number; y: number };

/** Coordinates are normalized 0–1 relative to page size, origin top-left. */
export type AnnotationBase = {
  id: string;
  pageIndex: number;
};

export type TextAnnotation = AnnotationBase & {
  type: "text";
  x: number;
  y: number;
  width: number;
  height: number;
  text: string;
  fontSize: number;
  color: string;
};

export type DrawAnnotation = AnnotationBase & {
  type: "draw";
  points: Point[];
  color: string;
  strokeWidth: number;
};

export type HighlightAnnotation = AnnotationBase & {
  type: "highlight";
  x: number;
  y: number;
  width: number;
  height: number;
  color: string;
};

export type ImageAnnotation = AnnotationBase & {
  type: "image";
  x: number;
  y: number;
  width: number;
  height: number;
  dataUrl: string;
};

export type SignatureAnnotation = AnnotationBase & {
  type: "signature";
  x: number;
  y: number;
  width: number;
  height: number;
  dataUrl: string;
};

/** Covers original PDF text and writes a replacement. */
export type NativeTextEdit = AnnotationBase & {
  type: "nativeText";
  x: number;
  y: number;
  width: number;
  height: number;
  text: string;
  fontSize: number;
  color: string;
};

export type Annotation =
  | TextAnnotation
  | DrawAnnotation
  | HighlightAnnotation
  | ImageAnnotation
  | SignatureAnnotation
  | NativeTextEdit;

export type PageMeta = {
  width: number;
  height: number;
  rotation: number;
};

export type ExtractedTextItem = {
  id: string;
  pageIndex: number;
  text: string;
  x: number;
  y: number;
  width: number;
  height: number;
  fontSize: number;
};

export function uid(prefix = "a"): string {
  return `${prefix}_${Math.random().toString(36).slice(2, 10)}`;
}
