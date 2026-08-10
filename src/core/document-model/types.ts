/**
 * Editable Document Model — source of truth for Folio PDF editing.
 * UI and canvas are consequences of this model; never the reverse.
 */

export type ObjectId = string;
export type PageId = string;
export type ResourceId = string;

/** How an object may be edited. Fallbacks are exceptions, not the default path. */
export type Editability =
  | "structural"
  | "visual-fallback"
  | "ocr-assisted"
  | "read-only";

/** PDF user space point (origin bottom-left unless noted). */
export type Point = { x: number; y: number };

/** Axis-aligned box in page space. */
export type BBox = {
  x: number;
  y: number;
  width: number;
  height: number;
};

/** 3×3 affine matrix stored as PDF's 6-number form [a b c d e f]. */
export type Matrix2D = [number, number, number, number, number, number];

export type RgbColor = { r: number; g: number; b: number };

export type PageObjectBase = {
  id: ObjectId;
  pageId: PageId;
  bbox: BBox;
  transform: Matrix2D;
  editability: Editability;
  /** Z-order within the page content (paint order). */
  zIndex: number;
};

export type TextObject = PageObjectBase & {
  kind: "text";
  content: string;
  fontResourceId: ResourceId | null;
  /** CSS/pdf.js fallback family when known (for preview). */
  fontFamily: string | null;
  fontSize: number;
  fillColor: RgbColor | null;
  /**
   * Background to cover when rewriting glyphs (sampled from page raster or
   * inferred). Null → treat as white until sampled.
   */
  coverColor: RgbColor | null;
  /** Raw PDF text encoding / ToUnicode availability. */
  hasUnicodeMap: boolean;
};

export type ImageObject = PageObjectBase & {
  kind: "image";
  resourceId: ResourceId;
  widthPx: number;
  heightPx: number;
  /**
   * Browser-inserted (or extracted) image payload for preview/export.
   * Null for PDF-embedded images not yet decoded to pixels.
   */
  dataUrl: string | null;
};

export type PathObject = PageObjectBase & {
  kind: "path";
  /** Normalized page coords (origin top-left 0–1), matching editor hit-testing. */
  ops: PathOp[];
  fillColor: RgbColor | null;
  strokeColor: RgbColor | null;
  strokeWidth: number | null;
};

export type PathOp =
  | { op: "moveTo"; x: number; y: number }
  | { op: "lineTo"; x: number; y: number }
  | { op: "curveTo"; x1: number; y1: number; x2: number; y2: number; x3: number; y3: number }
  | { op: "close" };

export type ShapeObject = PageObjectBase & {
  kind: "shape";
  shape: "rect" | "ellipse" | "line";
  fillColor: RgbColor | null;
  strokeColor: RgbColor | null;
  strokeWidth: number | null;
};

/** PDF annotation dictionary objects (sticky notes, links, etc.). */
export type AnnotationObject = PageObjectBase & {
  kind: "annotation";
  subtype: string;
  contents: string | null;
};

export type PageObject =
  | TextObject
  | ImageObject
  | PathObject
  | ShapeObject
  | AnnotationObject;

export type FontResource = {
  id: ResourceId;
  kind: "font";
  name: string;
  embedded: boolean;
  isType0: boolean;
};

export type ImageResource = {
  id: ResourceId;
  kind: "image";
  width: number;
  height: number;
  /** Deferred payload; bytes filled by object loader / decoder. */
  data: Uint8Array | null;
  /** Stage 6: data-URL for images inserted or decoded in the browser. */
  dataUrl: string | null;
};

export type ExtGStateResource = {
  id: ResourceId;
  kind: "extGState";
  raw: Record<string, unknown>;
};

export type DocumentResource = FontResource | ImageResource | ExtGStateResource;

export type PageResources = {
  fonts: Record<ResourceId, FontResource>;
  images: Record<ResourceId, ImageResource>;
  extGStates: Record<ResourceId, ExtGStateResource>;
};

export type DocumentPage = {
  id: PageId;
  /** Zero-based index in current page order. */
  index: number;
  width: number;
  height: number;
  rotation: 0 | 90 | 180 | 270;
  objects: PageObject[];
  resources: PageResources;
};

export type EditableDocument = {
  id: string;
  /** Original filename hint (no path). */
  sourceName: string;
  pages: DocumentPage[];
  /** Document-level resources shared across pages when applicable. */
  resources: DocumentResource[];
  /** Monotonic revision bumped by the Command Engine. */
  revision: number;
};

export function createEmptyDocument(sourceName = "untitled.pdf"): EditableDocument {
  return {
    id: `doc_${Math.random().toString(36).slice(2, 10)}`,
    sourceName,
    pages: [],
    resources: [],
    revision: 0,
  };
}

export function identityMatrix(): Matrix2D {
  return [1, 0, 0, 1, 0, 0];
}
