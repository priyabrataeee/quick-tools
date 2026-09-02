/**
 * Generates the favicon, the raster app icons and the social sharing image.
 *
 * The project has no image-processing dependency, so the shapes are rasterised
 * directly into an RGBA buffer with signed-distance anti-aliasing and encoded
 * as PNG using Node's built-in zlib. Run it with `npm run generate:icons`
 * whenever the brand mark changes.
 */
import { deflateSync } from 'node:zlib';
import { mkdirSync, writeFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = join(dirname(fileURLToPath(import.meta.url)), '..');
const iconsDir = join(root, 'public', 'icons');

const BRAND = [79, 70, 229];
const BRAND_DEEP = [124, 58, 237];
const WHITE = [255, 255, 255];

// --- PNG encoding -----------------------------------------------------------

function crc32(buffer) {
  let c;
  const table = crc32.table ?? (crc32.table = Array.from({ length: 256 }, (_, n) => {
    c = n;
    for (let k = 0; k < 8; k++) c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1;
    return c >>> 0;
  }));
  let crc = 0xffffffff;
  for (const byte of buffer) crc = table[(crc ^ byte) & 0xff] ^ (crc >>> 8);
  return (crc ^ 0xffffffff) >>> 0;
}

function chunk(type, data) {
  const length = Buffer.alloc(4);
  length.writeUInt32BE(data.length);
  const body = Buffer.concat([Buffer.from(type, 'ascii'), data]);
  const crc = Buffer.alloc(4);
  crc.writeUInt32BE(crc32(body));
  return Buffer.concat([length, body, crc]);
}

function encodePng(width, height, rgba) {
  const stride = width * 4;
  // Each scanline is prefixed with filter type 0 (None).
  const raw = Buffer.alloc((stride + 1) * height);
  for (let y = 0; y < height; y++) {
    raw[y * (stride + 1)] = 0;
    rgba.copy(raw, y * (stride + 1) + 1, y * stride, (y + 1) * stride);
  }

  const ihdr = Buffer.alloc(13);
  ihdr.writeUInt32BE(width, 0);
  ihdr.writeUInt32BE(height, 4);
  ihdr[8] = 8; // bit depth
  ihdr[9] = 6; // colour type: RGBA
  ihdr[10] = 0;
  ihdr[11] = 0;
  ihdr[12] = 0;

  return Buffer.concat([
    Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]),
    chunk('IHDR', ihdr),
    chunk('IDAT', deflateSync(raw, { level: 9 })),
    chunk('IEND', Buffer.alloc(0)),
  ]);
}

// --- Drawing ----------------------------------------------------------------

class Surface {
  constructor(width, height) {
    this.width = width;
    this.height = height;
    this.data = Buffer.alloc(width * height * 4);
  }

  blend(x, y, colour, alpha) {
    if (alpha <= 0 || x < 0 || y < 0 || x >= this.width || y >= this.height) return;
    const i = (y * this.width + x) * 4;
    const a = Math.min(1, alpha);
    const existing = this.data[i + 3] / 255;
    const outA = a + existing * (1 - a);
    for (let c = 0; c < 3; c++) {
      const src = colour[c];
      const dst = this.data[i + c];
      this.data[i + c] = Math.round((src * a + dst * existing * (1 - a)) / (outA || 1));
    }
    this.data[i + 3] = Math.round(outA * 255);
  }

  /**
   * Fills every pixel whose signed distance is negative, anti-aliasing the
   * one-pixel band around the edge.
   */
  fill(sdf, colourAt) {
    for (let y = 0; y < this.height; y++) {
      for (let x = 0; x < this.width; x++) {
        const d = sdf(x + 0.5, y + 0.5);
        if (d > 1) continue;
        const alpha = d <= 0 ? 1 : 1 - d;
        this.blend(x, y, colourAt(x, y), alpha);
      }
    }
  }
}

const roundedRect = (x0, y0, x1, y1, radius) => (px, py) => {
  const cx = Math.max(x0 + radius, Math.min(px, x1 - radius));
  const cy = Math.max(y0 + radius, Math.min(py, y1 - radius));
  const dx = px - cx;
  const dy = py - cy;
  const inside = px >= x0 && px <= x1 && py >= y0 && py <= y1;
  const dist = Math.hypot(dx, dy) - radius;
  return inside && dx === 0 && dy === 0 ? -radius : dist;
};

const ring = (cx, cy, radius, thickness) => (px, py) =>
  Math.abs(Math.hypot(px - cx, py - cy) - radius) - thickness / 2;

const capsule = (x0, y0, x1, y1, thickness) => (px, py) => {
  const dx = x1 - x0;
  const dy = y1 - y0;
  const lengthSq = dx * dx + dy * dy || 1;
  const t = Math.max(0, Math.min(1, ((px - x0) * dx + (py - y0) * dy) / lengthSq));
  return Math.hypot(px - (x0 + t * dx), py - (y0 + t * dy)) - thickness / 2;
};

/** Signed distance to a simple polygon: negative inside, positive outside. */
const polygon = (points) => (px, py) => {
  let distance = Infinity;
  let inside = false;

  for (let i = 0, j = points.length - 1; i < points.length; j = i++) {
    const [xi, yi] = points[i];
    const [xj, yj] = points[j];

    const ex = xj - xi;
    const ey = yj - yi;
    const wx = px - xi;
    const wy = py - yi;
    const t = Math.max(0, Math.min(1, (wx * ex + wy * ey) / (ex * ex + ey * ey || 1)));
    distance = Math.min(distance, Math.hypot(wx - t * ex, wy - t * ey));

    // Ray cast to the right for the inside/outside test.
    if (yi > py !== yj > py && px < ((xj - xi) * (py - yi)) / (yj - yi) + xi) inside = !inside;
  }

  return inside ? -distance : distance;
};

const mix = (a, b, t) => a.map((v, i) => Math.round(v + (b[i] - v) * t));

/**
 * The OnDevice Tools mark: a solid bolt.
 *
 * A filled silhouette is the only thing that survives a 16px favicon — the
 * earlier outlined wrench collapsed into an unreadable blob at that size. The
 * geometry is the canonical bolt polygon, expressed in a 24×24 box and scaled
 * into the requested square.
 */
const BOLT = [
  [13, 2],
  [3, 14],
  [12, 14],
  [11, 22],
  [21, 10],
  [12, 10],
];

function drawMark(surface, ox, oy, size, colour) {
  const u = size / 24;
  const points = BOLT.map(([x, y]) => [ox + x * u, oy + y * u]);
  surface.fill(polygon(points), () => colour);
}

function makeIcon(size) {
  const surface = new Surface(size, size);
  const background = (x, y) => mix(BRAND, BRAND_DEEP, (x + y) / (size * 2));
  surface.fill(roundedRect(0, 0, size, size, size * 0.22), background);
  // 0.62 of the tile, centred: enough breathing room that the mark still reads
  // once a launcher applies its own rounded mask.
  const markSize = size * 0.62;
  drawMark(surface, (size - markSize) / 2, (size - markSize) / 2, markSize, WHITE);
  return encodePng(size, size, surface.data);
}

// --- 5x7 bitmap font, enough for the wordmark -------------------------------

const GLYPHS = {
  A: ['01110', '10001', '10001', '11111', '10001', '10001', '10001'],
  B: ['11110', '10001', '10001', '11110', '10001', '10001', '11110'],
  C: ['01110', '10001', '10000', '10000', '10000', '10001', '01110'],
  D: ['11110', '10001', '10001', '10001', '10001', '10001', '11110'],
  E: ['11111', '10000', '10000', '11110', '10000', '10000', '11111'],
  F: ['11111', '10000', '10000', '11110', '10000', '10000', '10000'],
  G: ['01110', '10001', '10000', '10111', '10001', '10001', '01111'],
  H: ['10001', '10001', '10001', '11111', '10001', '10001', '10001'],
  I: ['11111', '00100', '00100', '00100', '00100', '00100', '11111'],
  J: ['00111', '00010', '00010', '00010', '00010', '10010', '01100'],
  K: ['10001', '10010', '10100', '11000', '10100', '10010', '10001'],
  L: ['10000', '10000', '10000', '10000', '10000', '10000', '11111'],
  M: ['10001', '11011', '10101', '10101', '10001', '10001', '10001'],
  N: ['10001', '11001', '11001', '10101', '10011', '10011', '10001'],
  O: ['01110', '10001', '10001', '10001', '10001', '10001', '01110'],
  P: ['11110', '10001', '10001', '11110', '10000', '10000', '10000'],
  Q: ['01110', '10001', '10001', '10001', '10101', '10010', '01101'],
  R: ['11110', '10001', '10001', '11110', '10100', '10010', '10001'],
  S: ['01111', '10000', '10000', '01110', '00001', '00001', '11110'],
  T: ['11111', '00100', '00100', '00100', '00100', '00100', '00100'],
  U: ['10001', '10001', '10001', '10001', '10001', '10001', '01110'],
  V: ['10001', '10001', '10001', '10001', '10001', '01010', '00100'],
  W: ['10001', '10001', '10001', '10101', '10101', '11011', '10001'],
  X: ['10001', '10001', '01010', '00100', '01010', '10001', '10001'],
  Y: ['10001', '10001', '01010', '00100', '00100', '00100', '00100'],
  Z: ['11111', '00001', '00010', '00100', '01000', '10000', '11111'],
  '0': ['01110', '10001', '10011', '10101', '11001', '10001', '01110'],
  '1': ['00100', '01100', '00100', '00100', '00100', '00100', '01110'],
  '2': ['01110', '10001', '00001', '00010', '00100', '01000', '11111'],
  '3': ['11111', '00010', '00100', '00010', '00001', '10001', '01110'],
  '4': ['00010', '00110', '01010', '10010', '11111', '00010', '00010'],
  '5': ['11111', '10000', '11110', '00001', '00001', '10001', '01110'],
  '6': ['00110', '01000', '10000', '11110', '10001', '10001', '01110'],
  '7': ['11111', '00001', '00010', '00100', '01000', '01000', '01000'],
  '8': ['01110', '10001', '10001', '01110', '10001', '10001', '01110'],
  '9': ['01110', '10001', '10001', '01111', '00001', '00010', '01100'],
  '.': ['00000', '00000', '00000', '00000', '00000', '01100', '01100'],
  ',': ['00000', '00000', '00000', '00000', '01100', '01100', '01000'],
  '-': ['00000', '00000', '00000', '11111', '00000', '00000', '00000'],
  '/': ['00001', '00010', '00010', '00100', '01000', '01000', '10000'],
  ':': ['00000', '01100', '01100', '00000', '01100', '01100', '00000'],
  '!': ['00100', '00100', '00100', '00100', '00100', '00000', '00100'],
  '?': ['01110', '10001', '00001', '00010', '00100', '00000', '00100'],
  ' ': ['00000', '00000', '00000', '00000', '00000', '00000', '00000'],
};


function drawText(surface, text, x, y, pixelSize, colour) {
  let cursor = x;
  for (const char of text.toUpperCase()) {
    const glyph = GLYPHS[char];
    if (!glyph) {
      cursor += pixelSize * 6;
      continue;
    }
    glyph.forEach((row, ry) => {
      row.split('').forEach((cell, rx) => {
        if (cell !== '1') return;
        for (let dy = 0; dy < pixelSize; dy++) {
          for (let dx = 0; dx < pixelSize; dx++) {
            surface.blend(
              Math.round(cursor + rx * pixelSize + dx),
              Math.round(y + ry * pixelSize + dy),
              colour,
              1,
            );
          }
        }
      });
    });
    cursor += pixelSize * 6;
  }
  return cursor;
}

function makeOgImage() {
  const width = 1200;
  const height = 630;
  const surface = new Surface(width, height);

  const background = (x, y) => mix(BRAND, BRAND_DEEP, (x / width) * 0.7 + (y / height) * 0.3);
  surface.fill(() => -1, background);

  drawMark(surface, 96, 150, 200, WHITE);
  drawText(surface, 'ONDEVICE TOOLS', 96, 380, 11, WHITE);
  drawText(surface, 'FREE BROWSER TOOLS', 96, 470, 6, [224, 222, 255]);
  drawText(surface, 'NOTHING YOU TYPE LEAVES THIS PAGE', 96, 530, 4, [199, 195, 255]);

  return encodePng(width, height, surface.data);
}

// --- ICO container ----------------------------------------------------------

/** Packs PNG images into an ICO file. */
function makeIco(images) {
  const HEADER = 6;
  const ENTRY = 16;

  const header = Buffer.alloc(HEADER);
  header.writeUInt16LE(0, 0); // reserved
  header.writeUInt16LE(1, 2); // 1 = icon
  header.writeUInt16LE(images.length, 4);

  const entries = [];
  let offset = HEADER + ENTRY * images.length;

  for (const png of images) {
    // The PNG's IHDR carries the dimensions; 0 means 256 in an ICO entry.
    const width = png.readUInt32BE(16);
    const height = png.readUInt32BE(20);

    const entry = Buffer.alloc(ENTRY);
    entry.writeUInt8(width >= 256 ? 0 : width, 0);
    entry.writeUInt8(height >= 256 ? 0 : height, 1);
    entry.writeUInt8(0, 2); // palette size
    entry.writeUInt8(0, 3); // reserved
    entry.writeUInt16LE(1, 4); // colour planes
    entry.writeUInt16LE(32, 6); // bits per pixel
    entry.writeUInt32LE(png.length, 8);
    entry.writeUInt32LE(offset, 12);

    entries.push(entry);
    offset += png.length;
  }

  return Buffer.concat([header, ...entries, ...images]);
}

// --- Run --------------------------------------------------------------------

mkdirSync(iconsDir, { recursive: true });

const pngs = new Map();
for (const size of [16, 32, 48, 96, 144, 180, 192, 256, 512]) {
  const png = makeIcon(size);
  pngs.set(size, png);
  writeFileSync(join(iconsDir, `icon-${size}.png`), png);
}

// The browser tab icon. Every current browser accepts PNG-encoded entries
// inside an ICO container, which avoids hand-rolling a BMP encoder.
writeFileSync(join(root, 'public', 'favicon.ico'), makeIco([16, 32, 48].map((s) => pngs.get(s))));

writeFileSync(join(root, 'public', 'og-image.png'), makeOgImage());

console.log('Generated app icons in public/icons and public/og-image.png');
