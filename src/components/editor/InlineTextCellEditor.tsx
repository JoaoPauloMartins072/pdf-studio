"use client";

import { useEffect, useRef } from "react";
import type { TextObject } from "@/core/document-model/types";

type Props = {
  object: TextObject;
  draft: string;
  viewport: { w: number; h: number };
  pageHeight: number;
  onChange: (value: string) => void;
  onCommit: () => void;
  onCancel: () => void;
};

/**
 * Excel-like in-place text cell over a model TextObject bbox.
 * Enter commits, Escape cancels, blur commits.
 */
export function InlineTextCellEditor({
  object,
  draft,
  viewport,
  pageHeight,
  onChange,
  onCommit,
  onCancel,
}: Props) {
  const inputRef = useRef<HTMLInputElement>(null);
  const cover = object.coverColor ?? { r: 1, g: 1, b: 1 };
  const fill = object.fillColor ?? { r: 0.07, g: 0.07, b: 0.07 };
  const fontPx = Math.max(
    8,
    object.fontSize * (viewport.h / Math.max(pageHeight, 1)),
  );

  const left = object.bbox.x * viewport.w;
  const top = object.bbox.y * viewport.h;
  const width = Math.max(object.bbox.width * viewport.w, fontPx * 2);
  const height = Math.max(object.bbox.height * viewport.h, fontPx * 1.15);

  useEffect(() => {
    const el = inputRef.current;
    if (!el) return;
    el.focus();
    el.select();
  }, [object.id]);

  return (
    <input
      ref={inputRef}
      data-inline-edit
      value={draft}
      onChange={(e) => onChange(e.target.value)}
      onKeyDown={(e) => {
        e.stopPropagation();
        if (e.key === "Enter") {
          e.preventDefault();
          onCommit();
        } else if (e.key === "Escape") {
          e.preventDefault();
          onCancel();
        }
      }}
      onBlur={() => onCommit()}
      onPointerDown={(e) => e.stopPropagation()}
      className="absolute z-20 box-border border-2 border-sky-500 px-0.5 outline-none"
      style={{
        left,
        top,
        width,
        height,
        fontSize: fontPx,
        lineHeight: 1,
        fontFamily: object.fontFamily ?? "Helvetica, Arial, sans-serif",
        color: rgbCss(fill),
        background: rgbCss(cover),
      }}
      aria-label="Edit text cell"
    />
  );
}

function rgbCss(c: { r: number; g: number; b: number }): string {
  const r = c.r > 1 ? c.r : Math.round(c.r * 255);
  const g = c.g > 1 ? c.g : Math.round(c.g * 255);
  const b = c.b > 1 ? c.b : Math.round(c.b * 255);
  return `rgb(${r}, ${g}, ${b})`;
}
