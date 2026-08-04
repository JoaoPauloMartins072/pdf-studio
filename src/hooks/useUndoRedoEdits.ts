"use client";

import { useCallback, useRef, useState } from "react";
import type { Annotation, PageMeta } from "@/lib/editor/editorModel";

export type PdfEditSnapshot = {
  annotations: Annotation[];
  pageOrder: number[];
  pageMeta: PageMeta[];
};

const MAX_HISTORY = 40;

function cloneSnap(s: PdfEditSnapshot): PdfEditSnapshot {
  return {
    annotations: structuredClone(s.annotations),
    pageOrder: [...s.pageOrder],
    pageMeta: structuredClone(s.pageMeta),
  };
}

export function useUndoRedoEdits(getSnapshot: () => PdfEditSnapshot) {
  const pastRef = useRef<PdfEditSnapshot[]>([]);
  const futureRef = useRef<PdfEditSnapshot[]>([]);
  const [, bump] = useState(0);
  const getRef = useRef(getSnapshot);
  getRef.current = getSnapshot;

  const refresh = () => bump((n) => n + 1);

  const push = useCallback(() => {
    pastRef.current = [
      ...pastRef.current.slice(-(MAX_HISTORY - 1)),
      cloneSnap(getRef.current()),
    ];
    futureRef.current = [];
    refresh();
  }, []);

  const clear = useCallback(() => {
    pastRef.current = [];
    futureRef.current = [];
    refresh();
  }, []);

  const undo = useCallback((): PdfEditSnapshot | null => {
    const past = pastRef.current;
    if (!past.length) return null;
    const prev = past[past.length - 1];
    futureRef.current = [cloneSnap(getRef.current()), ...futureRef.current];
    pastRef.current = past.slice(0, -1);
    refresh();
    return prev;
  }, []);

  const redo = useCallback((): PdfEditSnapshot | null => {
    const future = futureRef.current;
    if (!future.length) return null;
    const next = future[0];
    pastRef.current = [...pastRef.current, cloneSnap(getRef.current())];
    futureRef.current = future.slice(1);
    refresh();
    return next;
  }, []);

  return {
    canUndo: pastRef.current.length > 0,
    canRedo: futureRef.current.length > 0,
    push,
    clear,
    undo,
    redo,
  };
}
