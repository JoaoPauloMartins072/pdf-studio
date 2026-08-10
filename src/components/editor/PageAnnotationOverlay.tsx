"use client";

import type { PointerEvent } from "react";
import { InlineTextCellEditor } from "@/components/editor/InlineTextCellEditor";
import type {
  Annotation,
  DrawAnnotation,
  EditorTool,
  HighlightAnnotation,
} from "@/lib/editor/editorModel";
import type { ObjectId, PageObject, TextObject } from "@/core/document-model/types";
import { pointsToSvgPath } from "@/lib/editor/pageNormCoords";

type InlineEditState = {
  objectId: ObjectId;
  draft: string;
};

type Props = {
  tool: EditorTool;
  viewport: { w: number; h: number };
  pageHeight: number;
  annotations: Annotation[];
  /** Page objects from the Editable Document Model (Stage 2 selection). */
  pageObjects: PageObject[];
  selectedId: string | null;
  selectedObjectIds: ObjectId[];
  hoverObjectId: ObjectId | null;
  inlineEdit: InlineEditState | null;
  drawDraft: DrawAnnotation | null;
  highlightDraft: HighlightAnnotation | null;
  onSelect: (id: string | null) => void;
  onStartDrag: (e: PointerEvent, id: string, mode: "move" | "resize") => void;
  onChangeText: (id: string, text: string) => void;
  onInlineDraftChange: (draft: string) => void;
  onInlineCommit: () => void;
  onInlineCancel: () => void;
};

export function PageAnnotationOverlay({
  tool,
  viewport,
  pageHeight,
  annotations,
  pageObjects,
  selectedId,
  selectedObjectIds,
  hoverObjectId,
  inlineEdit,
  drawDraft,
  highlightDraft,
  onSelect,
  onStartDrag,
  onChangeText,
  onInlineDraftChange,
  onInlineCommit,
  onInlineCancel,
}: Props) {
  const showModelChrome = tool === "editText" || tool === "select";
  const selectedSet = new Set(selectedObjectIds);
  const editingObject =
    inlineEdit &&
    (pageObjects.find((o) => o.id === inlineEdit.objectId && o.kind === "text") as
      | TextObject
      | undefined);

  return (
    <>
      {showModelChrome &&
        pageObjects.map((obj) => {
          const selected = selectedSet.has(obj.id);
          const hovered = hoverObjectId === obj.id;
          const editIdle = tool === "editText" && obj.kind === "text";
          const isEditing = inlineEdit?.objectId === obj.id;

          if (isEditing) return null;
          if (!selected && !hovered && !editIdle) return null;

          return (
            <div
              key={obj.id}
              data-model-object={obj.id}
              className={`absolute box-border pointer-events-none ${
                selected
                  ? "border-2 border-sky-500 bg-sky-400/15"
                  : hovered
                    ? "border border-sky-400 bg-sky-300/10"
                    : "border border-sky-500/50 bg-transparent"
              }`}
              style={{
                left: obj.bbox.x * viewport.w,
                top: obj.bbox.y * viewport.h,
                width: Math.max(obj.bbox.width * viewport.w, 2),
                height: Math.max(obj.bbox.height * viewport.h, 2),
              }}
              title={obj.kind === "text" ? obj.content : obj.kind}
            />
          );
        })}

      {editingObject && inlineEdit && (
        <InlineTextCellEditor
          object={editingObject}
          draft={inlineEdit.draft}
          viewport={viewport}
          pageHeight={pageHeight}
          onChange={onInlineDraftChange}
          onCommit={onInlineCommit}
          onCancel={onInlineCancel}
        />
      )}

      {annotations.map((ann) => {
        if (ann.type === "draw") {
          return (
            <svg
              key={ann.id}
              data-ann
              className="pointer-events-none absolute inset-0 h-full w-full"
            >
              <path
                d={pointsToSvgPath(ann.points, viewport.w, viewport.h)}
                fill="none"
                stroke={ann.color}
                strokeWidth={ann.strokeWidth}
                strokeLinecap="round"
                strokeLinejoin="round"
              />
            </svg>
          );
        }

        if (ann.type === "highlight") {
          return (
            <div
              key={ann.id}
              data-ann
              onPointerDown={(e) => onStartDrag(e, ann.id, "move")}
              className={`absolute ${selectedId === ann.id ? "ring-2 ring-rose-500" : ""}`}
              style={{
                left: `${ann.x * 100}%`,
                top: `${ann.y * 100}%`,
                width: `${ann.width * 100}%`,
                height: `${ann.height * 100}%`,
                background: ann.color,
                opacity: 0.4,
              }}
            />
          );
        }

        if (ann.type === "image" || ann.type === "signature") {
          return (
            <div
              key={ann.id}
              data-ann
              onPointerDown={(e) => onStartDrag(e, ann.id, "move")}
              className={`absolute ${selectedId === ann.id ? "ring-2 ring-rose-500" : ""}`}
              style={{
                left: `${ann.x * 100}%`,
                top: `${ann.y * 100}%`,
                width: `${ann.width * 100}%`,
                height: `${ann.height * 100}%`,
              }}
            >
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={ann.dataUrl} alt="" className="h-full w-full object-contain" draggable={false} />
              {selectedId === ann.id && (
                <span
                  onPointerDown={(e) => onStartDrag(e, ann.id, "resize")}
                  className="absolute bottom-0 right-0 h-3 w-3 cursor-se-resize bg-rose-600"
                />
              )}
            </div>
          );
        }

        if (ann.type === "text" || ann.type === "nativeText") {
          return (
            <div
              key={ann.id}
              data-ann
              onPointerDown={(e) => onStartDrag(e, ann.id, "move")}
              className={`absolute ${selectedId === ann.id ? "ring-2 ring-rose-500" : ""}`}
              style={{
                left: `${ann.x * 100}%`,
                top: `${ann.y * 100}%`,
                width: `${ann.width * 100}%`,
                minHeight: `${ann.height * 100}%`,
              }}
            >
              {ann.type === "nativeText" && <div className="absolute inset-0 bg-white" />}
              <textarea
                value={ann.text}
                onChange={(e) => onChangeText(ann.id, e.target.value)}
                onFocus={() => onSelect(ann.id)}
                className="relative z-[1] w-full resize-none bg-transparent p-0 text-left outline-none"
                style={{
                  fontSize: ann.type === "text" ? ann.fontSize : Math.max(10, ann.fontSize * 0.9),
                  color: ann.color,
                  lineHeight: 1.15,
                  fontFamily: "Helvetica, Arial, sans-serif",
                }}
                rows={2}
              />
              {selectedId === ann.id && (
                <span
                  onPointerDown={(e) => onStartDrag(e, ann.id, "resize")}
                  className="absolute bottom-0 right-0 z-[2] h-3 w-3 cursor-se-resize bg-rose-600"
                />
              )}
            </div>
          );
        }

        return null;
      })}

      {drawDraft && (
        <svg className="pointer-events-none absolute inset-0 h-full w-full">
          <path
            d={pointsToSvgPath(drawDraft.points, viewport.w, viewport.h)}
            fill="none"
            stroke={drawDraft.color}
            strokeWidth={drawDraft.strokeWidth}
            strokeLinecap="round"
          />
        </svg>
      )}
      {highlightDraft && (
        <div
          className="pointer-events-none absolute opacity-40"
          style={{
            left: `${highlightDraft.x * 100}%`,
            top: `${highlightDraft.y * 100}%`,
            width: `${highlightDraft.width * 100}%`,
            height: `${highlightDraft.height * 100}%`,
            background: highlightDraft.color,
          }}
        />
      )}
    </>
  );
}
