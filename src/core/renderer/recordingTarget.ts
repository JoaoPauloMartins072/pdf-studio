/**
 * In-memory RenderTarget for tests — records draw calls, no DOM.
 */
import type { Rgba, RenderTarget } from "@/core/renderer/types";

export type RecordedOp =
  | { op: "clear" }
  | { op: "fillRect"; x: number; y: number; w: number; h: number; color: Rgba }
  | {
      op: "fillText";
      text: string;
      x: number;
      y: number;
      fontSize: number;
      color: Rgba;
    }
  | {
      op: "strokePolyline";
      points: Array<{ x: number; y: number }>;
      color: Rgba;
      lineWidth: number;
    };

export class RecordingRenderTarget implements RenderTarget {
  readonly ops: RecordedOp[] = [];

  constructor(
    readonly width: number,
    readonly height: number,
  ) {}

  clear(): void {
    this.ops.push({ op: "clear" });
  }

  fillRect(x: number, y: number, w: number, h: number, color: Rgba): void {
    this.ops.push({ op: "fillRect", x, y, w, h, color });
  }

  fillText(
    text: string,
    x: number,
    y: number,
    opts: { fontSize: number; color: Rgba; fontFamily?: string; maxWidth?: number },
  ): void {
    this.ops.push({
      op: "fillText",
      text,
      x,
      y,
      fontSize: opts.fontSize,
      color: opts.color,
    });
  }

  strokePolyline(
    points: Array<{ x: number; y: number }>,
    opts: { color: Rgba; lineWidth: number },
  ): void {
    this.ops.push({
      op: "strokePolyline",
      points,
      color: opts.color,
      lineWidth: opts.lineWidth,
    });
  }
}
