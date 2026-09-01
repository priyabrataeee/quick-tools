/** Small helpers shared across tools. All are pure and browser-safe. */

/** Triggers a browser download for an in-memory blob. */
export function downloadBlob(blob: Blob, filename: string): void {
  const url = URL.createObjectURL(blob);
  const anchor = document.createElement('a');
  anchor.href = url;
  anchor.download = filename;
  document.body.appendChild(anchor);
  anchor.click();
  anchor.remove();
  // Firefox cancels an in-flight download if the object URL is revoked
  // synchronously, so give it a moment.
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}

export function downloadText(text: string, filename: string, mime = 'text/plain;charset=utf-8'): void {
  downloadBlob(new Blob([text], { type: mime }), filename);
}

/** Human-readable byte size, e.g. `1.4 MB`. */
export function formatBytes(bytes: number, decimals = 1): string {
  if (!Number.isFinite(bytes) || bytes < 0) return '—';
  if (bytes === 0) return '0 B';
  const units = ['B', 'KB', 'MB', 'GB', 'TB'];
  const i = Math.min(Math.floor(Math.log(bytes) / Math.log(1024)), units.length - 1);
  const value = bytes / Math.pow(1024, i);
  return `${value.toFixed(i === 0 ? 0 : decimals)} ${units[i]}`;
}

/** UTF-8 aware byte length of a string. */
export function byteLength(text: string): string {
  return formatBytes(new TextEncoder().encode(text).length);
}

/** Clamps a number into a range, tolerating NaN. */
export function clamp(value: number, min: number, max: number): number {
  if (!Number.isFinite(value)) return min;
  return Math.min(max, Math.max(min, value));
}

/** Splits a string into user-perceived characters, not UTF-16 code units. */
export function graphemes(text: string): string[] {
  const Seg = (Intl as unknown as { Segmenter?: typeof Intl.Segmenter }).Segmenter;
  if (Seg) {
    const segmenter = new Seg(undefined, { granularity: 'grapheme' });
    return Array.from(segmenter.segment(text), (s) => s.segment);
  }
  // Array.from still splits surrogate pairs correctly, just not full clusters.
  return Array.from(text);
}

/** Formats a number with locale grouping, guarding against NaN. */
export function formatNumber(value: number, maximumFractionDigits = 2): string {
  if (!Number.isFinite(value)) return '—';
  return value.toLocaleString(undefined, { maximumFractionDigits });
}

/** Reads a File as a data URL. */
export function readAsDataUrl(file: Blob): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(reader.result as string);
    reader.onerror = () => reject(reader.error ?? new Error('Could not read file'));
    reader.readAsDataURL(file);
  });
}

/** Decodes an image file into an HTMLImageElement. */
export function loadImage(src: string): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.onload = () => resolve(img);
    img.onerror = () => reject(new Error('Could not decode this image'));
    img.src = src;
  });
}

/** Promise wrapper around canvas.toBlob. */
export function canvasToBlob(canvas: HTMLCanvasElement, type: string, quality?: number): Promise<Blob> {
  return new Promise((resolve, reject) => {
    canvas.toBlob(
      (blob) => (blob ? resolve(blob) : reject(new Error('Could not encode this image'))),
      type,
      quality,
    );
  });
}

/**
 * Parses page-range syntax such as `1-3, 7, 10-12` into a sorted, de-duplicated
 * list of 1-based page numbers bounded by `max`.
 */
export function parsePageRanges(input: string, max: number): number[] {
  const pages = new Set<number>();
  for (const part of input.split(',')) {
    const chunk = part.trim();
    if (!chunk) continue;
    const range = /^(\d+)\s*-\s*(\d+)$/.exec(chunk);
    if (range) {
      const from = Math.max(1, parseInt(range[1], 10));
      const to = Math.min(max, parseInt(range[2], 10));
      for (let p = from; p <= to; p++) pages.add(p);
    } else if (/^\d+$/.test(chunk)) {
      const page = parseInt(chunk, 10);
      if (page >= 1 && page <= max) pages.add(page);
    }
  }
  return [...pages].sort((a, b) => a - b);
}
