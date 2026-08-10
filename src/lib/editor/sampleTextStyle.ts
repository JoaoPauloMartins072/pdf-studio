import type { BBox, RgbColor } from "@/core/document-model/types";

/**
 * Sample the page raster just outside a text bbox to recover header/bar
 * backgrounds (avoids sampling the glyph pixels themselves).
 */
export function sampleCoverColorFromCanvas(
  canvas: HTMLCanvasElement,
  bbox: BBox,
  cssWidth: number,
  cssHeight: number,
): RgbColor {
  const ctx = canvas.getContext("2d", { willReadFrequently: true });
  if (!ctx || cssWidth <= 0 || cssHeight <= 0) {
    return { r: 1, g: 1, b: 1 };
  }

  const sx = canvas.width / cssWidth;
  const sy = canvas.height / cssHeight;
  const padX = Math.max(bbox.width * 0.02, 0.002);
  const padY = Math.max(bbox.height * 0.08, 0.002);

  const points: Array<[number, number]> = [
    [bbox.x - padX, bbox.y + bbox.height * 0.5],
    [bbox.x + bbox.width + padX, bbox.y + bbox.height * 0.5],
    [bbox.x + bbox.width * 0.5, bbox.y - padY],
    [bbox.x + bbox.width * 0.5, bbox.y + bbox.height + padY],
    [bbox.x + padX, bbox.y + padY],
    [bbox.x + bbox.width - padX, bbox.y + bbox.height - padY],
  ];

  let r = 0;
  let g = 0;
  let b = 0;
  let n = 0;

  for (const [nx, ny] of points) {
    const cx = Math.round(clamp(nx, 0, 0.999) * cssWidth * sx);
    const cy = Math.round(clamp(ny, 0, 0.999) * cssHeight * sy);
    try {
      const data = ctx.getImageData(cx, cy, 1, 1).data;
      r += data[0]! / 255;
      g += data[1]! / 255;
      b += data[2]! / 255;
      n += 1;
    } catch {
      /* tainted / out of bounds */
    }
  }

  if (n === 0) return { r: 1, g: 1, b: 1 };
  return { r: r / n, g: g / n, b: b / n };
}

/** Prefer extracted fill; if missing/near-black on a dark cover, use white. */
export function resolveTextFillColor(
  fill: RgbColor | null,
  cover: RgbColor,
): RgbColor {
  const f = fill ?? { r: 0, g: 0, b: 0 };
  const fillLum = 0.2126 * f.r + 0.7152 * f.g + 0.0722 * f.b;
  const coverLum = 0.2126 * cover.r + 0.7152 * cover.g + 0.0722 * cover.b;
  if (fillLum < 0.2 && coverLum < 0.55) {
    return { r: 1, g: 1, b: 1 };
  }
  return f;
}

function clamp(n: number, min: number, max: number): number {
  return Math.min(max, Math.max(min, n));
}
