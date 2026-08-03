"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { AnnotationLayer } from "@/components/editor/AnnotationLayer";
import { CheckoutModal } from "@/components/editor/CheckoutModal";
import { EditorEmptyState } from "@/components/editor/EditorEmptyState";
import { EditorHeader } from "@/components/editor/EditorHeader";
import { EditorToolbar } from "@/components/editor/EditorToolbar";
import { ManagePagesBar } from "@/components/editor/ManagePagesBar";
import { PdfPageCanvas } from "@/components/editor/PdfPageCanvas";
import { ThumbnailSidebar } from "@/components/editor/ThumbnailSidebar";
import { useEditorHistory } from "@/hooks/useEditorHistory";
import { usePdfDocument } from "@/hooks/usePdfDocument";
import { downloadBytes } from "@/lib/download";
import {
  createDrawDraft,
  createHighlightDraft,
  createImageAnnotation,
  createNativeTextEdit,
  createSignatureAnnotation,
  createTextAnnotation,
  moveOrResizeAnnotation,
  updateAnnotationText,
} from "@/lib/editor/annotations";
import { pointerToNorm, readFileAsDataUrl } from "@/lib/editor/geometry";
import type {
  Annotation,
  DrawAnnotation,
  EditorTool,
  ExtractedTextItem,
  HighlightAnnotation,
  PageMeta,
  Point,
} from "@/lib/editor/types";
import { exportEditedPdf } from "@/lib/pdf/exportEdited";

type DragState = { id: string; mode: "move" | "resize"; ox: number; oy: number };

function toolCursor(tool: EditorTool): string {
  if (tool === "draw" || tool === "highlight") return "crosshair";
  if (tool === "addText" || tool === "sign" || tool === "image") return "cell";
  return "default";
}

export function PdfEditor() {
  const { doc, loading, error, openFile } = usePdfDocument();
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

  const history = useEditorHistory(
    useCallback(
      () => ({ annotations, pageOrder, pageMeta }),
      [annotations, pageOrder, pageMeta],
    ),
  );

  // Sync local editor state when a new PDF is opened
  useEffect(() => {
    if (!doc) return;
    setAnnotations([]);
    setPageOrder(doc.pageOrder);
    setPageMeta(doc.pageMeta);
    setCurrent(0);
    setSelectedId(null);
    history.clear();
    // eslint-disable-next-line react-hooks/exhaustive-deps -- only reset on new document bytes
  }, [doc?.sourceBytes]);

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

  const pickPdf = () => fileInputRef.current?.click();

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

  function onOverlayPointerDown(e: React.PointerEvent<HTMLDivElement>) {
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
      (e.target as HTMLElement).setPointerCapture(e.pointerId);
      return;
    }
    if (tool === "highlight") {
      setHighlightDraft(createHighlightDraft(srcPageIndex, p));
      (e.target as HTMLElement).setPointerCapture(e.pointerId);
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
      imageInputRef.current?.click();
      return;
    }
    setSelectedId(null);
  }

  function onOverlayPointerMove(e: React.PointerEvent<HTMLDivElement>) {
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

  function startAnnDrag(e: React.PointerEvent, id: string, mode: "move" | "resize") {
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
    const bytes = await exportEditedPdf(doc.sourceBytes, annotations, pageOrder, pageMeta);
    downloadBytes(bytes, doc.filename);
    setCheckoutOpen(false);
  }

  const fileInput = (
    <input
      ref={fileInputRef}
      type="file"
      accept="application/pdf,.pdf"
      className="hidden"
      onChange={(e) => {
        const f = e.target.files?.[0];
        if (f) void openFile(f);
        e.target.value = "";
      }}
    />
  );

  if (!doc) {
    return (
      <EditorEmptyState
        loading={loading}
        error={error}
        onPick={pickPdf}
        fileInput={fileInput}
      />
    );
  }

  return (
    <div className="flex h-screen flex-col bg-zinc-200">
      <EditorHeader onOpen={pickPdf} showDone onDone={() => setCheckoutOpen(true)} />

      <EditorToolbar
        tool={tool}
        onTool={(t) => {
          setTool(t);
          if (t === "image") imageInputRef.current?.click();
        }}
        showThumbs={showThumbs}
        onToggleThumbs={() => setShowThumbs((v) => !v)}
        canUndo={history.canUndo}
        canRedo={history.canRedo}
        onUndo={() => applySnapshot(history.undo())}
        onRedo={() => applySnapshot(history.redo())}
        onDeleteSelected={deleteSelected}
        hasSelection={!!selectedId}
      />

      {tool === "managePages" && (
        <ManagePagesBar
          pageLabel={`Page ${current + 1} of ${pageOrder.length}`}
          canDelete={pageOrder.length > 1}
          onRotate={rotateCurrent}
          onDelete={deleteCurrentPage}
        />
      )}

      <div className="flex min-h-0 flex-1">
        {showThumbs && (
          <ThumbnailSidebar
            pdf={doc.pdf}
            pageOrder={pageOrder}
            current={current}
            onSelect={setCurrent}
          />
        )}

        <div className="flex flex-1 justify-center overflow-auto p-6">
          <div
            className="relative bg-white shadow-lg"
            style={{
              width: viewport.w,
              transform: `rotate(${pageMeta[srcPageIndex]?.rotation ?? 0}deg)`,
            }}
          >
            <PdfPageCanvas
              pdf={doc.pdf}
              pageIndex={srcPageIndex}
              scale={1.25}
              onRendered={(w, h) => setViewport({ w, h })}
            />
            <div
              ref={overlayRef}
              className="absolute inset-0 touch-none"
              style={{ cursor: toolCursor(tool) }}
              onPointerDown={onOverlayPointerDown}
              onPointerMove={onOverlayPointerMove}
              onPointerUp={onOverlayPointerUp}
            >
              <AnnotationLayer
                tool={tool}
                viewport={viewport}
                annotations={pageAnns}
                textItems={pageTexts}
                selectedId={selectedId}
                drawDraft={drawDraft}
                highlightDraft={highlightDraft}
                onSelect={setSelectedId}
                onEditNative={editNativeText}
                onStartDrag={startAnnDrag}
                onChangeText={(id, text) => setAnnotations((all) => updateAnnotationText(all, id, text))}
              />
            </div>
          </div>
        </div>
      </div>

      {fileInput}
      <input
        ref={imageInputRef}
        type="file"
        accept="image/*"
        className="hidden"
        onChange={(e) => {
          const f = e.target.files?.[0];
          if (f) void onImagePicked(f);
          e.target.value = "";
        }}
      />

      <CheckoutModal
        open={checkoutOpen}
        filename={doc.filename}
        onClose={() => setCheckoutOpen(false)}
        onConfirm={generateAndDownload}
      />
    </div>
  );
}
