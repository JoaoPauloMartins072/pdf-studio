import {
  type Annotation,
  type DrawAnnotation,
  type ExtractedTextItem,
  type HighlightAnnotation,
  type ImageAnnotation,
  type NativeTextEdit,
  type Point,
  type SignatureAnnotation,
  type TextAnnotation,
  uid,
} from "@/lib/editor/types";
import { makeSignatureDataUrl } from "@/lib/editor/geometry";

export function createTextAnnotation(pageIndex: number, p: Point): TextAnnotation {
  return {
    id: uid("text"),
    type: "text",
    pageIndex,
    x: p.x,
    y: p.y,
    width: 0.28,
    height: 0.04,
    text: "Type here",
    fontSize: 14,
    color: "#111111",
  };
}

export function createDrawDraft(pageIndex: number, p: Point): DrawAnnotation {
  return {
    id: uid("draw"),
    type: "draw",
    pageIndex,
    points: [p],
    color: "#e11d48",
    strokeWidth: 2.2,
  };
}

export function createHighlightDraft(pageIndex: number, p: Point): HighlightAnnotation {
  return {
    id: uid("hl"),
    type: "highlight",
    pageIndex,
    x: p.x,
    y: p.y,
    width: 0.001,
    height: 0.028,
    color: "#facc15",
  };
}

export function createSignatureAnnotation(
  pageIndex: number,
  p: Point,
): SignatureAnnotation {
  return {
    id: uid("sig"),
    type: "signature",
    pageIndex,
    x: p.x,
    y: p.y,
    width: 0.32,
    height: 0.08,
    dataUrl: makeSignatureDataUrl(),
  };
}

export function createImageAnnotation(
  pageIndex: number,
  p: Point,
  dataUrl: string,
): ImageAnnotation {
  return {
    id: uid("img"),
    type: "image",
    pageIndex,
    x: p.x,
    y: p.y,
    width: 0.28,
    height: 0.18,
    dataUrl,
  };
}

export function createNativeTextEdit(
  item: ExtractedTextItem,
  text: string,
): NativeTextEdit {
  return {
    id: uid("native"),
    type: "nativeText",
    pageIndex: item.pageIndex,
    x: item.x,
    y: item.y,
    width: Math.max(item.width, text.length * 0.008),
    height: item.height,
    text,
    fontSize: item.fontSize,
    color: "#111111",
  };
}

export function moveOrResizeAnnotation(
  ann: Annotation,
  mode: "move" | "resize",
  dx: number,
  dy: number,
): Annotation {
  if (!("x" in ann) || !("width" in ann)) return ann;
  if (mode === "move") {
    return {
      ...ann,
      x: Math.min(1 - ann.width, Math.max(0, ann.x + dx)),
      y: Math.min(1 - ann.height, Math.max(0, ann.y + dy)),
    };
  }
  return {
    ...ann,
    width: Math.min(1 - ann.x, Math.max(0.04, ann.width + dx)),
    height: Math.min(1 - ann.y, Math.max(0.02, ann.height + dy)),
  };
}

export function updateAnnotationText(
  annotations: Annotation[],
  id: string,
  text: string,
): Annotation[] {
  return annotations.map((a) =>
    a.id === id && (a.type === "text" || a.type === "nativeText") ? { ...a, text } : a,
  );
}
