import type { Rgba, RenderTarget } from "@/core/renderer/types";

/** Minimal canvas 2D surface — keeps core free of React. */
export type Canvas2DLike = {
  canvas: { width: number; height: number };
  clearRect(x: number, y: number, w: number, h: number): void;
  fillRect(x: number, y: number, w: number, h: number): void;
  fillText(text: string, x: number, y: number, maxWidth?: number): void;
  beginPath(): void;
  moveTo(x: number, y: number): void;
  lineTo(x: number, y: number): void;
  stroke(): void;
  fillStyle: unknown;
  strokeStyle: unknown;
  lineWidth: number;
  lineCap: string;
  lineJoin: string;
  font: string;
  textBaseline: "top" | "hanging" | "middle" | "alphabetic" | "ideographic" | "bottom";
};

/**
 * Adapts a CanvasRenderingContext2D (or duck-typed equivalent) to RenderTarget.
 * Coordinates are CSS pixels of the bitmap already sized by the UI.
 */
export class Canvas2DRenderTarget implements RenderTarget {
  readonly width: number;
  readonly height: number;

  constructor(
    private readonly ctx: Canvas2DLike,
    width: number,
    height: number,
  ) {
    this.width = width;
    this.height = height;
  }

  clear(): void {
    this.ctx.clearRect(0, 0, this.ctx.canvas.width, this.ctx.canvas.height);
  }

  fillRect(x: number, y: number, w: number, h: number, color: Rgba): void {
    this.ctx.fillStyle = rgbaCss(color);
    this.ctx.fillRect(x, y, w, h);
  }

  fillText(
    text: string,
    x: number,
    y: number,
    opts: {
      fontSize: number;
      color: Rgba;
      fontFamily?: string;
      maxWidth?: number;
    },
  ): void {
    this.ctx.fillStyle = rgbaCss(opts.color);
    this.ctx.font = `${Math.max(1, opts.fontSize)}px ${opts.fontFamily ?? "Helvetica, Arial, sans-serif"}`;
    this.ctx.textBaseline = "top";
    if (opts.maxWidth != null) {
      this.ctx.fillText(text, x, y, opts.maxWidth);
    } else {
      this.ctx.fillText(text, x, y);
    }
  }

  strokePolyline(
    points: Array<{ x: number; y: number }>,
    opts: { color: Rgba; lineWidth: number },
  ): void {
    if (points.length < 2) return;
    this.ctx.strokeStyle = rgbaCss(opts.color);
    this.ctx.lineWidth = opts.lineWidth;
    this.ctx.lineCap = "round";
    this.ctx.lineJoin = "round";
    this.ctx.beginPath();
    this.ctx.moveTo(points[0]!.x, points[0]!.y);
    for (let i = 1; i < points.length; i++) {
      this.ctx.lineTo(points[i]!.x, points[i]!.y);
    }
    this.ctx.stroke();
  }
}

function rgbaCss(c: Rgba): string {
  const a = c.a ?? 1;
  return `rgba(${Math.round(c.r * 255)}, ${Math.round(c.g * 255)}, ${Math.round(c.b * 255)}, ${a})`;
}
