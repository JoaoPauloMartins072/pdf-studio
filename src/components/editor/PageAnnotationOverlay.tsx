"use client";

import type { PointerEvent } from "react";
import type {
  Annotation,
  DrawAnnotation,
  EditorTool,
  ExtractedTextItem,
  HighlightAnnotation,
} from "@/lib/editor/editorModel";
import { pointsToSvgPath } from "@/lib/editor/pageNormCoords";

type Props = {
  tool: EditorTool;
  viewport: { w: number; h: number };
  annotations: Annotation[];
  textItems: ExtractedTextItem[];
  selectedId: string | null;
  drawDraft: DrawAnnotation | null;
  highlightDraft: HighlightAnnotation | null;
  onSelect: (id: string | null) => void;
  onEditNative: (item: ExtractedTextItem) => void;
  onStartDrag: (e: PointerEvent, id: string, mode: "move" | "resize") => void;
  onChangeText: (id: string, text: string) => void;
};

export function PageAnnotationOverlay({
  tool,
  viewport,
  annotations,
  textItems,
  selectedId,
  drawDraft,
  highlightDraft,
  onSelect,
  onEditNative,
  onStartDrag,
  onChangeText,
}: Props) {
  return (
    <>
      {(tool === "editText" || tool === "select") &&
        textItems.map((t) => (
          <button
            key={t.id}
            type="button"
            data-text-item
            title={t.text}
            onClick={(e) => {
              e.stopPropagation();
              if (tool === "editText") onEditNative(t);
            }}
            className={`absolute border border-transparent ${
              tool === "editText" ? "hover:border-sky-400 hover:bg-sky-200/30" : ""
            }`}
            style={{
              left: `${t.x * 100}%`,
              top: `${t.y * 100}%`,
              width: `${t.width * 100}%`,
              height: `${t.height * 100}%`,
            }}
          />
        ))}

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
