"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import type { PointerEvent as ReactPointerEvent, RefObject } from "react";
import { useUndoRedoEdits } from "@/hooks/useUndoRedoEdits";
import { useLoadPdfFile } from "@/hooks/useLoadPdfFile";
import { downloadPdfFile } from "@/lib/downloadPdfFile";
import {
  createDrawDraft,
  createHighlightDraft,
  createImageAnnotation,
  createNativeTextEdit,
  createSignatureAnnotation,
  createTextAnnotation,
  moveOrResizeAnnotation,
  updateAnnotationText,
} from "@/lib/editor/buildAnnotation";
import { pointerToNorm, readFileAsDataUrl } from "@/lib/editor/pageNormCoords";
import type {
  Annotation,
  DrawAnnotation,
  EditorTool,
  ExtractedTextItem,
  HighlightAnnotation,
  PageMeta,
  Point,
} from "@/lib/editor/editorModel";
import { bakeEditsIntoPdf } from "@/lib/pdf/bakeEditsIntoPdf";

type DragState = { id: string; mode: "move" | "resize"; ox: number; oy: number };

export function toolCursor(tool: EditorTool): string {
  if (tool === "draw" || tool === "highlight") return "crosshair";
  if (tool === "addText" || tool === "sign" || tool === "image") return "cell";
  return "default";
}

/**
 * All mutable editor session state + actions for FolioPdfWorkspace.
 * Kept separate so the UI component stays mostly declarative.
 */
export function useFolioPdfWorkspace() {
  const { doc, loading, error, openFile } = useLoadPdfFile();
  const [annotations, setAnnotations] = useState<Annotation[]>([]);
  const [pageOrder, setPageOrder] = useState<number[]>([]);
  const [pageMeta, setPageMeta] = useState<PageMeta[]>([]);
  const [current, setCurrent] = useState(0);
  const [tool, setTool] = useState<EditorTool>("select");
  const [showThumbs, setShowThumbs] = useState(true);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [checkoutOpen, setCheckoutOpen] = useState(false);
  const [viewport, setViewport] = useState({ w: 600, h: 800 });
  const [drawDraft, setDrawDraft] = useState<DrawAnnotation | null>(null);
  const [highlightDraft, setHighlightDraft] = useState<HighlightAnnotation | null>(null);
  const [drag, setDrag] = useState<DragState | null>(null);
  const [pendingImagePos, setPendingImagePos] = useState<Point | null>(null);

  const fileInputRef = useRef<HTMLInputElement>(null);
  const imageInputRef = useRef<HTMLInputElement>(null);
  const overlayRef = useRef<HTMLDivElement>(null);
  const historyClearRef = useRef<() => void>(() => undefined);

  const history = useUndoRedoEdits(
    useCallback(
      () => ({ annotations, pageOrder, pageMeta }),
      [annotations, pageOrder, pageMeta],
    ),
  );
  historyClearRef.current = history.clear;

  useEffect(() => {
    if (!doc) return;
    setAnnotations([]);
    setPageOrder(doc.pageOrder);
    setPageMeta(doc.pageMeta);
    setCurrent(0);
    setSelectedId(null);
    historyClearRef.current();
  }, [doc?.sourceBytes, doc]);

  const srcPageIndex = pageOrder[current] ?? 0;
  const pageAnns = useMemo(
    () => annotations.filter((a) => a.pageIndex === srcPageIndex),
    [annotations, srcPageIndex],
  );
  const pageTexts = useMemo(
    () => (doc?.textItems ?? []).filter((t) => t.pageIndex === srcPageIndex),
    [doc?.textItems, srcPageIndex],
  );

  const applySnapshot = useCallback(
    (snap: { annotations: Annotation[]; pageOrder: number[]; pageMeta: PageMeta[] } | null) => {
      if (!snap) return;
      setAnnotations(snap.annotations);
      setPageOrder(snap.pageOrder);
      setPageMeta(snap.pageMeta);
    },
    [],
  );

  const pickPdf = useCallback(() => fileInputRef.current?.click(), []);
  const pickImage = useCallback(() => imageInputRef.current?.click(), []);

  const deleteSelected = useCallback(() => {
    if (!selectedId) return;
    history.push();
    setAnnotations((all) => all.filter((a) => a.id !== selectedId));
    setSelectedId(null);
  }, [history, selectedId]);

  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === "z") {
        e.preventDefault();
        applySnapshot(e.shiftKey ? history.redo() : history.undo());
      }
      if (e.key === "Delete" || e.key === "Backspace") {
        const tag = (e.target as HTMLElement)?.tagName;
        if (tag === "INPUT" || tag === "TEXTAREA") return;
        deleteSelected();
      }
    }
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [applySnapshot, deleteSelected, history]);

  function onOverlayPointerDown(e: ReactPointerEvent<HTMLDivElement>) {
    if (!overlayRef.current) return;
    const target = e.target as HTMLElement;
    if (target.closest("[data-ann]") || target.closest("[data-text-item]")) return;

    const p = pointerToNorm(e.clientX, e.clientY, overlayRef.current);

    if (tool === "addText") {
      history.push();
      const ann = createTextAnnotation(srcPageIndex, p);
      setAnnotations((all) => [...all, ann]);
      setSelectedId(ann.id);
      setTool("select");
      return;
    }
    if (tool === "draw") {
      setDrawDraft(createDrawDraft(srcPageIndex, p));
      target.setPointerCapture(e.pointerId);
      return;
    }
    if (tool === "highlight") {
      setHighlightDraft(createHighlightDraft(srcPageIndex, p));
      target.setPointerCapture(e.pointerId);
      return;
    }
    if (tool === "sign") {
      history.push();
      const ann = createSignatureAnnotation(srcPageIndex, p);
      setAnnotations((all) => [...all, ann]);
      setSelectedId(ann.id);
      setTool("select");
      return;
    }
    if (tool === "image") {
      setPendingImagePos(p);
      pickImage();
      return;
    }
    setSelectedId(null);
  }

  function onOverlayPointerMove(e: ReactPointerEvent<HTMLDivElement>) {
    if (!overlayRef.current) return;
    const p = pointerToNorm(e.clientX, e.clientY, overlayRef.current);

    if (drawDraft) {
      setDrawDraft({ ...drawDraft, points: [...drawDraft.points, p] });
      return;
    }
    if (highlightDraft) {
      setHighlightDraft({
        ...highlightDraft,
        x: Math.min(highlightDraft.x, p.x),
        width: Math.max(Math.abs(p.x - highlightDraft.x), 0.01),
      });
      return;
    }
    if (!drag) return;
    const dx = p.x - drag.ox;
    const dy = p.y - drag.oy;
    setAnnotations((all) =>
      all.map((a) => (a.id === drag.id ? moveOrResizeAnnotation(a, drag.mode, dx, dy) : a)),
    );
    setDrag({ ...drag, ox: p.x, oy: p.y });
  }

  function onOverlayPointerUp() {
    if (drawDraft) {
      if (drawDraft.points.length > 1) {
        history.push();
        setAnnotations((all) => [...all, drawDraft]);
      }
      setDrawDraft(null);
    }
    if (highlightDraft) {
      if (highlightDraft.width > 0.01) {
        history.push();
        setAnnotations((all) => [...all, highlightDraft]);
      }
      setHighlightDraft(null);
    }
    setDrag(null);
  }

  function startAnnDrag(e: ReactPointerEvent, id: string, mode: "move" | "resize") {
    e.stopPropagation();
    if (!overlayRef.current) return;
    if (tool !== "select" && tool !== "editText") return;
    history.push();
    const p = pointerToNorm(e.clientX, e.clientY, overlayRef.current);
    setSelectedId(id);
    setDrag({ id, mode, ox: p.x, oy: p.y });
    (e.target as HTMLElement).setPointerCapture?.(e.pointerId);
  }

  function editNativeText(item: ExtractedTextItem) {
    const next = window.prompt("Edit text", item.text);
    if (next == null || next === item.text) return;
    history.push();
    const ann = createNativeTextEdit(item, next);
    setAnnotations((all) => [
      ...all.filter((a) => !(a.type === "nativeText" && a.x === item.x && a.y === item.y)),
      ann,
    ]);
    setSelectedId(ann.id);
  }

  async function onImagePicked(file: File) {
    const pos = pendingImagePos ?? { x: 0.1, y: 0.1 };
    const dataUrl = await readFileAsDataUrl(file);
    history.push();
    const ann = createImageAnnotation(srcPageIndex, pos, dataUrl);
    setAnnotations((all) => [...all, ann]);
    setSelectedId(ann.id);
    setPendingImagePos(null);
    setTool("select");
  }

  function rotateCurrent() {
    history.push();
    setPageMeta((meta) =>
      meta.map((m, i) =>
        i === srcPageIndex ? { ...m, rotation: (m.rotation + 90) % 360 } : m,
      ),
    );
  }

  function deleteCurrentPage() {
    if (pageOrder.length <= 1) return;
    history.push();
    const removing = srcPageIndex;
    setPageOrder((order) => order.filter((i) => i !== removing));
    setAnnotations((all) => all.filter((a) => a.pageIndex !== removing));
    setCurrent((c) => Math.min(c, pageOrder.length - 2));
  }

  async function generateAndDownload() {
    if (!doc) return;
    const bytes = await bakeEditsIntoPdf(doc.sourceBytes, annotations, pageOrder, pageMeta);
    downloadPdfFile(bytes, doc.filename);
    setCheckoutOpen(false);
  }

  function selectTool(next: EditorTool) {
    setTool(next);
    if (next === "image") pickImage();
  }

  return {
    doc,
    loading,
    error,
    openFile,
    annotations,
    setAnnotations,
    pageOrder,
    pageMeta,
    current,
    setCurrent,
    tool,
    selectTool,
    showThumbs,
    setShowThumbs,
    selectedId,
    setSelectedId,
    checkoutOpen,
    setCheckoutOpen,
    viewport,
    setViewport,
    drawDraft,
    highlightDraft,
    srcPageIndex,
    pageAnns,
    pageTexts,
    history,
    fileInputRef: fileInputRef as RefObject<HTMLInputElement>,
    imageInputRef: imageInputRef as RefObject<HTMLInputElement>,
    overlayRef: overlayRef as RefObject<HTMLDivElement>,
    pickPdf,
    applySnapshot,
    deleteSelected,
    onOverlayPointerDown,
    onOverlayPointerMove,
    onOverlayPointerUp,
    startAnnDrag,
    editNativeText,
    onImagePicked,
    rotateCurrent,
    deleteCurrentPage,
    generateAndDownload,
    updateText: (id: string, text: string) =>
      setAnnotations((all) => updateAnnotationText(all, id, text)),
  };
}
