"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import type { PointerEvent as ReactPointerEvent, RefObject } from "react";
import {
  dirtyObjectIdSet,
} from "@/core/document-model/diff";
import { CommandEngine } from "@/core/commands/engine";
import {
  InsertImageObjectCommand,
  InsertPathObjectCommand,
} from "@/core/commands/objectCommands";
import {
  AlignObjectsCommand,
  DeleteObjectsCommand,
  DuplicateObjectsCommand,
  MoveObjectsCommand,
  ReorderObjectCommand,
  type AlignMode,
  type ZOrderMode,
} from "@/core/commands/selectionCommands";
import { ReplaceTextCommand } from "@/core/commands/replaceTextCommand";
import type { EditableDocument, ObjectId, TextObject } from "@/core/document-model/types";
import { BBoxHitTester } from "@/core/hit-testing/hitTester";
import { objectsOnPage, pageIdForIndex } from "@/core/hit-testing/queries";
import { FolioPdfLibSerializer } from "@/core/serializer/pdfLibSerializer";
import { useUndoRedoEdits } from "@/hooks/useUndoRedoEdits";
import { useLoadPdfFile } from "@/hooks/useLoadPdfFile";
import { downloadPdfFile } from "@/lib/downloadPdfFile";
import { annotationsToSerializeOverlays } from "@/lib/editor/annotationsToOverlays";
import {
  createDrawDraft,
  createHighlightDraft,
  createTextAnnotation,
  moveOrResizeAnnotation,
  updateAnnotationText,
} from "@/lib/editor/buildAnnotation";
import { makeSignatureDataUrl, pointerToNorm, readFileAsDataUrl } from "@/lib/editor/pageNormCoords";
import type {
  Annotation,
  DrawAnnotation,
  EditorTool,
  HighlightAnnotation,
  PageMeta,
  Point,
} from "@/lib/editor/editorModel";

type DragState = { id: string; mode: "move" | "resize"; ox: number; oy: number };
type MetaHistoryKind = "annotation" | "command";
type ModelDragState = { ids: ObjectId[]; ox: number; oy: number; dx: number; dy: number };

export function toolCursor(tool: EditorTool): string {
  if (tool === "draw" || tool === "highlight") return "crosshair";
  if (tool === "addText" || tool === "sign" || tool === "image") return "cell";
  if (tool === "editText") return "text";
  return "default";
}

function cloneDocument(doc: EditableDocument): EditableDocument {
  return structuredClone(doc);
}

/**
 * All mutable editor session state + actions for FolioPdfWorkspace.
 * Text edits go through CommandEngine (Stage 3). Overlay annotations keep
 * their own snapshot history; a meta-stack unifies Ctrl+Z order.
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
  const [selectedObjectIds, setSelectedObjectIds] = useState<ObjectId[]>([]);
  const [hoverObjectId, setHoverObjectId] = useState<ObjectId | null>(null);
  const [checkoutOpen, setCheckoutOpen] = useState(false);
  const [viewport, setViewport] = useState({ w: 600, h: 800 });
  const [drawDraft, setDrawDraft] = useState<DrawAnnotation | null>(null);
  const [highlightDraft, setHighlightDraft] = useState<HighlightAnnotation | null>(null);
  const [drag, setDrag] = useState<DragState | null>(null);
  const [modelDrag, setModelDrag] = useState<ModelDragState | null>(null);
  const [pendingImagePos, setPendingImagePos] = useState<Point | null>(null);
  const [documentModel, setDocumentModel] = useState<EditableDocument | null>(null);
  const [baselineModel, setBaselineModel] = useState<EditableDocument | null>(null);
  const [historyTick, setHistoryTick] = useState(0);

  const fileInputRef = useRef<HTMLInputElement>(null);
  const imageInputRef = useRef<HTMLInputElement>(null);
  const overlayRef = useRef<HTMLDivElement>(null);
  const historyClearRef = useRef<() => void>(() => undefined);
  const hitTester = useMemo(() => new BBoxHitTester(), []);
  const engineRef = useRef<CommandEngine | null>(null);
  const baselineRef = useRef<EditableDocument | null>(null);
  const metaPastRef = useRef<MetaHistoryKind[]>([]);
  const metaFutureRef = useRef<MetaHistoryKind[]>([]);

  const history = useUndoRedoEdits(
    useCallback(
      () => ({ annotations, pageOrder, pageMeta }),
      [annotations, pageOrder, pageMeta],
    ),
  );
  historyClearRef.current = history.clear;

  const bumpHistory = () => setHistoryTick((n) => n + 1);

  useEffect(() => {
    if (!doc) {
      engineRef.current = null;
      baselineRef.current = null;
      setDocumentModel(null);
      setBaselineModel(null);
      return;
    }
    const baseline = cloneDocument(doc.documentModel);
    baselineRef.current = baseline;
    setBaselineModel(baseline);
    const engine = new CommandEngine(cloneDocument(doc.documentModel));
    engineRef.current = engine;
    setDocumentModel(engine.getDocument());
    const unsub = engine.subscribe((next) => setDocumentModel(next));

    setAnnotations([]);
    setPageOrder(doc.pageOrder);
    setPageMeta(doc.pageMeta);
    setCurrent(0);
    setSelectedId(null);
    setSelectedObjectIds([]);
    setHoverObjectId(null);
    metaPastRef.current = [];
    metaFutureRef.current = [];
    historyClearRef.current();
    bumpHistory();

    return () => {
      unsub();
    };
  }, [doc?.sourceBytes, doc]);

  const srcPageIndex = pageOrder[current] ?? 0;
  const pageAnns = useMemo(
    () => annotations.filter((a) => a.pageIndex === srcPageIndex),
    [annotations, srcPageIndex],
  );
  const pageObjects = useMemo(() => {
    if (!documentModel) return [];
    const objs = objectsOnPage(documentModel, srcPageIndex);
    if (!modelDrag) return objs;
    const ids = new Set(modelDrag.ids);
    return objs.map((obj) => {
      if (!ids.has(obj.id) || !("bbox" in obj)) return obj;
      return {
        ...obj,
        bbox: {
          ...obj.bbox,
          x: obj.bbox.x + modelDrag.dx,
          y: obj.bbox.y + modelDrag.dy,
        },
      };
    });
  }, [documentModel, srcPageIndex, modelDrag]);

  const dirtyObjectIds = useMemo(() => {
    const baseline = baselineRef.current;
    if (!baseline || !documentModel) return new Set<ObjectId>();
    return dirtyObjectIdSet(baseline, documentModel);
  }, [documentModel, historyTick]);

  function dispatchCommand(command: import("@/core/commands/types").FolioCommand) {
    const engine = engineRef.current;
    if (!engine) return;
    engine.dispatch(command);
    metaPastRef.current.push("command");
    metaFutureRef.current = [];
    bumpHistory();
  }

  const hitModelAt = useCallback(
    (clientX: number, clientY: number) => {
      if (!documentModel || !overlayRef.current) return null;
      const p = pointerToNorm(clientX, clientY, overlayRef.current);
      return hitTester.hitTest(documentModel, pageIdForIndex(srcPageIndex), p);
    },
    [documentModel, hitTester, srcPageIndex],
  );

  const pushAnnotationHistory = useCallback(() => {
    history.push();
    metaPastRef.current.push("annotation");
    metaFutureRef.current = [];
    bumpHistory();
  }, [history]);

  const applySnapshot = useCallback(
    (snap: { annotations: Annotation[]; pageOrder: number[]; pageMeta: PageMeta[] } | null) => {
      if (!snap) return;
      setAnnotations(snap.annotations);
      setPageOrder(snap.pageOrder);
      setPageMeta(snap.pageMeta);
    },
    [],
  );

  const undo = useCallback(() => {
    const kind = metaPastRef.current.pop();
    if (!kind) return;
    if (kind === "command") {
      engineRef.current?.undo();
      metaFutureRef.current.push("command");
    } else {
      applySnapshot(history.undo());
      metaFutureRef.current.push("annotation");
    }
    bumpHistory();
  }, [applySnapshot, history]);

  const redo = useCallback(() => {
    const kind = metaFutureRef.current.pop();
    if (!kind) return;
    if (kind === "command") {
      engineRef.current?.redo();
      metaPastRef.current.push("command");
    } else {
      applySnapshot(history.redo());
      metaPastRef.current.push("annotation");
    }
    bumpHistory();
  }, [applySnapshot, history]);

  const canUndo = metaPastRef.current.length > 0;
  const canRedo = metaFutureRef.current.length > 0;
  void historyTick;

  const pickPdf = useCallback(() => fileInputRef.current?.click(), []);
  const pickImage = useCallback(() => imageInputRef.current?.click(), []);

  const deleteSelected = useCallback(() => {
    if (selectedObjectIds.length > 0 && engineRef.current) {
      try {
        engineRef.current.dispatch(new DeleteObjectsCommand(selectedObjectIds));
        metaPastRef.current.push("command");
        metaFutureRef.current = [];
        bumpHistory();
        setSelectedObjectIds([]);
      } catch {
        /* ignore */
      }
      return;
    }
    if (!selectedId) return;
    pushAnnotationHistory();
    setAnnotations((all) => all.filter((a) => a.id !== selectedId));
    setSelectedId(null);
  }, [pushAnnotationHistory, selectedId, selectedObjectIds]);

  const duplicateSelected = useCallback(() => {
    if (selectedObjectIds.length === 0) return;
    try {
      const cmd = new DuplicateObjectsCommand(selectedObjectIds);
      dispatchCommand(cmd);
      setSelectedObjectIds(cmd.getCreatedIds());
      setSelectedId(null);
    } catch {
      /* ignore */
    }
  }, [selectedObjectIds]);

  const alignSelected = useCallback(
    (mode: AlignMode) => {
      if (selectedObjectIds.length < 2) return;
      try {
        dispatchCommand(new AlignObjectsCommand(selectedObjectIds, mode));
      } catch (err) {
        window.alert(err instanceof Error ? err.message : "Align failed");
      }
    },
    [selectedObjectIds],
  );

  const reorderSelected = useCallback(
    (mode: ZOrderMode) => {
      const id = selectedObjectIds[selectedObjectIds.length - 1];
      if (!id) return;
      try {
        dispatchCommand(new ReorderObjectCommand(id, mode));
      } catch {
        /* ignore */
      }
    },
    [selectedObjectIds],
  );

  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === "z") {
        e.preventDefault();
        if (e.shiftKey) redo();
        else undo();
      }
      if (e.key === "Escape") {
        setSelectedObjectIds([]);
        setSelectedId(null);
      }
      if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === "d") {
        e.preventDefault();
        duplicateSelected();
      }
      if (e.key === "Delete" || e.key === "Backspace") {
        const tag = (e.target as HTMLElement)?.tagName;
        if (tag === "INPUT" || tag === "TEXTAREA") return;
        deleteSelected();
      }
    }
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [deleteSelected, duplicateSelected, redo, undo]);

  function editTextObject(object: TextObject) {
    if (object.editability !== "structural" && object.editability !== "ocr-assisted") {
      window.alert(
        "This text cannot be edited structurally (missing Unicode map or read-only). Visual fallback is not the default path.",
      );
      return;
    }
    const next = window.prompt("Edit text", object.content);
    if (next == null || next === object.content) return;
    try {
      dispatchCommand(new ReplaceTextCommand(object.id, next));
      setSelectedObjectIds([object.id]);
      setSelectedId(null);
    } catch (err) {
      window.alert(err instanceof Error ? err.message : "Could not edit text");
    }
  }

  function onOverlayPointerDown(e: ReactPointerEvent<HTMLDivElement>) {
    if (!overlayRef.current) return;
    const target = e.target as HTMLElement;
    if (target.closest("[data-ann]")) return;

    const p = pointerToNorm(e.clientX, e.clientY, overlayRef.current);
    const multi = e.ctrlKey || e.metaKey || e.shiftKey;

    if (tool === "addText") {
      pushAnnotationHistory();
      const ann = createTextAnnotation(srcPageIndex, p);
      setAnnotations((all) => [...all, ann]);
      setSelectedId(ann.id);
      setSelectedObjectIds([]);
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
      const dataUrl = makeSignatureDataUrl();
      dispatchCommand(
        new InsertImageObjectCommand(
          srcPageIndex,
          { x: p.x, y: p.y, width: 0.32, height: 0.08 },
          dataUrl,
        ),
      );
      setSelectedId(null);
      setTool("select");
      return;
    }
    if (tool === "image") {
      setPendingImagePos(p);
      pickImage();
      return;
    }

    if (tool === "select" || tool === "editText") {
      const hit = hitModelAt(e.clientX, e.clientY);
      if (hit) {
        setSelectedId(null);
        if (tool === "editText" && hit.object.kind === "text") {
          setSelectedObjectIds([hit.objectId]);
          editTextObject(hit.object);
          return;
        }
        if (tool === "select") {
          let nextIds: ObjectId[];
          if (multi) {
            if (selectedObjectIds.includes(hit.objectId)) {
              nextIds = selectedObjectIds.filter((id) => id !== hit.objectId);
            } else {
              nextIds = [...selectedObjectIds, hit.objectId];
            }
          } else if (selectedObjectIds.includes(hit.objectId)) {
            nextIds = selectedObjectIds;
          } else {
            nextIds = [hit.objectId];
          }
          setSelectedObjectIds(nextIds);
          if (nextIds.length > 0) {
            setModelDrag({ ids: nextIds, ox: p.x, oy: p.y, dx: 0, dy: 0 });
            target.setPointerCapture(e.pointerId);
          }
        }
        return;
      }
      setSelectedObjectIds([]);
      setSelectedId(null);
      return;
    }

    setSelectedId(null);
    setSelectedObjectIds([]);
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
    if (drag) {
      const dx = p.x - drag.ox;
      const dy = p.y - drag.oy;
      setAnnotations((all) =>
        all.map((a) => (a.id === drag.id ? moveOrResizeAnnotation(a, drag.mode, dx, dy) : a)),
      );
      setDrag({ ...drag, ox: p.x, oy: p.y });
      return;
    }

    if (modelDrag) {
      setModelDrag({
        ...modelDrag,
        dx: p.x - modelDrag.ox,
        dy: p.y - modelDrag.oy,
      });
      return;
    }

    if (tool === "select" || tool === "editText") {
      const hit = hitModelAt(e.clientX, e.clientY);
      setHoverObjectId(hit?.objectId ?? null);
      return;
    }
    setHoverObjectId(null);
  }

  function onOverlayPointerUp() {
    if (drawDraft) {
      if (drawDraft.points.length > 1) {
        try {
          dispatchCommand(
            new InsertPathObjectCommand(
              srcPageIndex,
              drawDraft.points,
              { r: 0.88, g: 0.11, b: 0.28 },
              drawDraft.strokeWidth,
            ),
          );
        } catch {
          /* ignore short paths */
        }
      }
      setDrawDraft(null);
    }
    if (highlightDraft) {
      if (highlightDraft.width > 0.01) {
        pushAnnotationHistory();
        setAnnotations((all) => [...all, highlightDraft]);
      }
      setHighlightDraft(null);
    }
    if (modelDrag && (Math.abs(modelDrag.dx) > 0.001 || Math.abs(modelDrag.dy) > 0.001)) {
      dispatchCommand(new MoveObjectsCommand(modelDrag.ids, modelDrag.dx, modelDrag.dy));
    }
    setModelDrag(null);
    setDrag(null);
  }

  function startAnnDrag(e: ReactPointerEvent, id: string, mode: "move" | "resize") {
    e.stopPropagation();
    if (!overlayRef.current) return;
    if (tool !== "select" && tool !== "editText") return;
    pushAnnotationHistory();
    const p = pointerToNorm(e.clientX, e.clientY, overlayRef.current);
    setSelectedId(id);
    setSelectedObjectIds([]);
    setDrag({ id, mode, ox: p.x, oy: p.y });
    (e.target as HTMLElement).setPointerCapture?.(e.pointerId);
  }

  async function onImagePicked(file: File) {
    const pos = pendingImagePos ?? { x: 0.1, y: 0.1 };
    const dataUrl = await readFileAsDataUrl(file);
    dispatchCommand(
      new InsertImageObjectCommand(srcPageIndex, {
        x: pos.x,
        y: pos.y,
        width: 0.28,
        height: 0.18,
      }, dataUrl),
    );
    setSelectedId(null);
    setPendingImagePos(null);
    setTool("select");
  }

  function rotateCurrent() {
    pushAnnotationHistory();
    setPageMeta((meta) =>
      meta.map((m, i) =>
        i === srcPageIndex ? { ...m, rotation: (m.rotation + 90) % 360 } : m,
      ),
    );
  }

  function deleteCurrentPage() {
    if (pageOrder.length <= 1) return;
    pushAnnotationHistory();
    const removing = srcPageIndex;
    setPageOrder((order) => order.filter((i) => i !== removing));
    setAnnotations((all) => all.filter((a) => a.pageIndex !== removing));
    setSelectedObjectIds([]);
    setCurrent((c) => Math.min(c, pageOrder.length - 2));
  }

  const serializer = useMemo(() => new FolioPdfLibSerializer(), []);

  async function generateAndDownload() {
    if (!doc || !documentModel || !baselineRef.current) return;
    const bytes = await serializer.serialize({
      sourceBytes: doc.sourceBytes,
      document: documentModel,
      baseline: baselineRef.current,
      pageOrder,
      pageMeta,
      overlays: annotationsToSerializeOverlays(annotations),
    });
    downloadPdfFile(bytes, doc.filename);
    setCheckoutOpen(false);
  }

  function selectTool(next: EditorTool) {
    setTool(next);
    setHoverObjectId(null);
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
    selectedObjectIds,
    selectedObjectId: selectedObjectIds[selectedObjectIds.length - 1] ?? null,
    hoverObjectId,
    dirtyObjectIds,
    checkoutOpen,
    setCheckoutOpen,
    viewport,
    setViewport,
    drawDraft,
    highlightDraft,
    srcPageIndex,
    pageAnns,
    pageObjects,
    documentModel,
    baselineModel,
    history: {
      canUndo,
      canRedo,
      undo,
      redo,
    },
    fileInputRef: fileInputRef as RefObject<HTMLInputElement>,
    imageInputRef: imageInputRef as RefObject<HTMLInputElement>,
    overlayRef: overlayRef as RefObject<HTMLDivElement>,
    pickPdf,
    applySnapshot,
    deleteSelected,
    duplicateSelected,
    alignSelected,
    reorderSelected,
    onOverlayPointerDown,
    onOverlayPointerMove,
    onOverlayPointerUp,
    clearHoverObject: () => setHoverObjectId(null),
    startAnnDrag,
    onImagePicked,
    rotateCurrent,
    deleteCurrentPage,
    generateAndDownload,
    updateText: (id: string, text: string) =>
      setAnnotations((all) => updateAnnotationText(all, id, text)),
  };
}
