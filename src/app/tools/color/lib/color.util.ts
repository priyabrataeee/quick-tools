export interface Rgb {
  r: number;
  g: number;
  b: number;
  a: number;
}

/** Parses hex (3/4/6/8 digit), rgb(), rgba(), hsl() and hsla() notation. */
export function parseColor(input: string): Rgb | null {
  const value = input.trim().toLowerCase();
  if (!value) return null;

  const hex = /^#?([0-9a-f]{3,8})$/.exec(value);
  if (hex) {
    const digits = hex[1];
    const expand = (s: string) =>
      s
        .split('')
        .map((c) => c + c)
        .join('');

    if (digits.length === 3 || digits.length === 4) {
      const full = expand(digits);
      return {
        r: parseInt(full.slice(0, 2), 16),
        g: parseInt(full.slice(2, 4), 16),
        b: parseInt(full.slice(4, 6), 16),
        a: digits.length === 4 ? parseInt(full.slice(6, 8), 16) / 255 : 1,
      };
    }
    if (digits.length === 6 || digits.length === 8) {
      return {
        r: parseInt(digits.slice(0, 2), 16),
        g: parseInt(digits.slice(2, 4), 16),
        b: parseInt(digits.slice(4, 6), 16),
        a: digits.length === 8 ? parseInt(digits.slice(6, 8), 16) / 255 : 1,
      };
    }
    return null;
  }

  const rgb = /^rgba?\(([^)]+)\)$/.exec(value);
  if (rgb) {
    const parts = rgb[1].split(/[,/\s]+/).filter(Boolean).map(Number);
    if (parts.length < 3 || parts.some((n) => !Number.isFinite(n))) return null;
    return {
      r: clampByte(parts[0]),
      g: clampByte(parts[1]),
      b: clampByte(parts[2]),
      a: parts[3] === undefined ? 1 : Math.min(1, Math.max(0, parts[3])),
    };
  }

  const hsl = /^hsla?\(([^)]+)\)$/.exec(value);
  if (hsl) {
    const parts = hsl[1]
      .split(/[,/\s]+/)
      .filter(Boolean)
      .map((p) => parseFloat(p));
    if (parts.length < 3 || parts.some((n) => !Number.isFinite(n))) return null;
    const rgbValue = hslToRgb(parts[0], parts[1], parts[2]);
    return { ...rgbValue, a: parts[3] === undefined ? 1 : Math.min(1, Math.max(0, parts[3])) };
  }

  return null;
}

function clampByte(value: number): number {
  return Math.round(Math.min(255, Math.max(0, value)));
}

export function toHex({ r, g, b, a }: Rgb, includeAlpha = false): string {
  const part = (n: number) => clampByte(n).toString(16).padStart(2, '0');
  const base = `#${part(r)}${part(g)}${part(b)}`;
  return includeAlpha && a < 1 ? `${base}${part(a * 255)}` : base;
}

export function rgbToHsl({ r, g, b }: Rgb): { h: number; s: number; l: number } {
  const rn = r / 255;
  const gn = g / 255;
  const bn = b / 255;
  const max = Math.max(rn, gn, bn);
  const min = Math.min(rn, gn, bn);
  const delta = max - min;

  let h = 0;
  if (delta !== 0) {
    if (max === rn) h = ((gn - bn) / delta) % 6;
    else if (max === gn) h = (bn - rn) / delta + 2;
    else h = (rn - gn) / delta + 4;
  }
  h = Math.round(h * 60);
  if (h < 0) h += 360;

  const l = (max + min) / 2;
  const s = delta === 0 ? 0 : delta / (1 - Math.abs(2 * l - 1));

  return { h, s: Math.round(s * 100), l: Math.round(l * 100) };
}

export function hslToRgb(h: number, s: number, l: number): { r: number; g: number; b: number } {
  const sat = s / 100;
  const light = l / 100;
  const k = (n: number) => (n + h / 30) % 12;
  const a = sat * Math.min(light, 1 - light);
  const f = (n: number) => light - a * Math.max(-1, Math.min(k(n) - 3, Math.min(9 - k(n), 1)));
  return { r: Math.round(f(0) * 255), g: Math.round(f(8) * 255), b: Math.round(f(4) * 255) };
}

export function rgbToHsb({ r, g, b }: Rgb): { h: number; s: number; v: number } {
  const rn = r / 255;
  const gn = g / 255;
  const bn = b / 255;
  const max = Math.max(rn, gn, bn);
  const min = Math.min(rn, gn, bn);
  const delta = max - min;

  let h = 0;
  if (delta !== 0) {
    if (max === rn) h = ((gn - bn) / delta) % 6;
    else if (max === gn) h = (bn - rn) / delta + 2;
    else h = (rn - gn) / delta + 4;
  }
  h = Math.round(h * 60);
  if (h < 0) h += 360;

  return { h, s: Math.round((max === 0 ? 0 : delta / max) * 100), v: Math.round(max * 100) };
}

/**
 * Naive CMYK conversion. Real print work needs an ICC profile; this is the
 * standard device-independent approximation everyone uses for reference.
 */
export function rgbToCmyk({ r, g, b }: Rgb): { c: number; m: number; y: number; k: number } {
  const rn = r / 255;
  const gn = g / 255;
  const bn = b / 255;
  const k = 1 - Math.max(rn, gn, bn);
  if (k === 1) return { c: 0, m: 0, y: 0, k: 100 };
  return {
    c: Math.round(((1 - rn - k) / (1 - k)) * 100),
    m: Math.round(((1 - gn - k) / (1 - k)) * 100),
    y: Math.round(((1 - bn - k) / (1 - k)) * 100),
    k: Math.round(k * 100),
  };
}

/** WCAG 2.x relative luminance. */
export function relativeLuminance({ r, g, b }: Rgb): number {
  const channel = (value: number) => {
    const v = value / 255;
    return v <= 0.03928 ? v / 12.92 : Math.pow((v + 0.055) / 1.055, 2.4);
  };
  return 0.2126 * channel(r) + 0.7152 * channel(g) + 0.0722 * channel(b);
}

export function contrastRatio(a: Rgb, b: Rgb): number {
  const la = relativeLuminance(a);
  const lb = relativeLuminance(b);
  const lighter = Math.max(la, lb);
  const darker = Math.min(la, lb);
  return (lighter + 0.05) / (darker + 0.05);
}

/** Quantises an image's pixels into a representative palette. */
export function extractPalette(
  data: Uint8ClampedArray,
  paletteSize: number,
): { hex: string; share: number }[] {
  const buckets = new Map<string, { count: number; r: number; g: number; b: number }>();
  let sampled = 0;

  // Step over pixels rather than reading every one — a 12MP photo has plenty
  // of colour information in a 1-in-4 sample and this keeps the UI responsive.
  for (let i = 0; i < data.length; i += 16) {
    const alpha = data[i + 3];
    if (alpha < 125) continue;

    const r = data[i];
    const g = data[i + 1];
    const b = data[i + 2];

    // 5 bits per channel: fine enough to separate shades, coarse enough to group.
    const key = `${r >> 3},${g >> 3},${b >> 3}`;
    const bucket = buckets.get(key);
    if (bucket) {
      bucket.count++;
      bucket.r += r;
      bucket.g += g;
      bucket.b += b;
    } else {
      buckets.set(key, { count: 1, r, g, b });
    }
    sampled++;
  }

  if (!sampled) return [];

  return [...buckets.values()]
    .sort((a, b) => b.count - a.count)
    .slice(0, paletteSize)
    .map((bucket) => ({
      hex: toHex({
        r: Math.round(bucket.r / bucket.count),
        g: Math.round(bucket.g / bucket.count),
        b: Math.round(bucket.b / bucket.count),
        a: 1,
      }),
      share: Math.round((bucket.count / sampled) * 1000) / 10,
    }));
}
