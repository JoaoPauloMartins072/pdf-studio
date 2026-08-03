import type { Point } from "@/lib/editor/types";

export function clamp01(n: number) {
  return Math.min(1, Math.max(0, n));
}

/** Normalized page coords (0–1), origin top-left. */
export function pointerToNorm(
  clientX: number,
  clientY: number,
  el: HTMLElement,
): Point {
  const r = el.getBoundingClientRect();
  return {
    x: clamp01((clientX - r.left) / r.width),
    y: clamp01((clientY - r.top) / r.height),
  };
}

export function pointsToSvgPath(
  points: Point[],
  widthPx: number,
  heightPx: number,
): string {
  return points
    .map((pt, i) => `${i === 0 ? "M" : "L"} ${pt.x * widthPx} ${pt.y * heightPx}`)
    .join(" ");
}

export function readFileAsDataUrl(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(String(reader.result));
    reader.onerror = reject;
    reader.readAsDataURL(file);
  });
}

export function makeSignatureDataUrl(label = "Signature"): string {
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="360" height="100"><text x="8" y="68" font-family="Segoe Script, Brush Script MT, cursive" font-size="48" fill="#1d4ed8">${label}</text></svg>`;
  return `data:image/svg+xml;base64,${btoa(svg)}`;
}
