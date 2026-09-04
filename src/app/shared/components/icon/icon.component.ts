import { ChangeDetectionStrategy, Component, computed, input } from '@angular/core';

interface IconShape {
  /** SVG path `d` attributes. */
  paths?: string[];
  /** Circles as `[cx, cy, r]`. */
  circles?: [number, number, number][];
  /** Rects as `[x, y, width, height, rx]`. */
  rects?: [number, number, number, number, number][];
  /** Render with `fill` instead of `stroke` (used for solid glyphs). */
  filled?: boolean;
}

/**
 * Inline SVG icon set.
 *
 * These are drawn inline rather than loaded from an icon font so the app works
 * offline, has no render-blocking font request and no flash of un-styled
 * ligature text.
 */
const ICONS: Record<string, IconShape> = {
  // Brand mark. Filled, so it matches the favicon and app icons exactly.
  bolt: { filled: true, paths: ['M13 2L3 14h9l-1 8 10-12h-9z'] },
  code: { paths: ['M8 6 2 12l6 6', 'M16 6l6 6-6 6'] },
  braces: {
    paths: [
      'M8 4H7a2 2 0 0 0-2 2v3a2 2 0 0 1-2 2 2 2 0 0 1 2 2v3a2 2 0 0 0 2 2h1',
      'M16 4h1a2 2 0 0 1 2 2v3a2 2 0 0 0 2 2 2 2 0 0 0-2 2v3a2 2 0 0 1-2 2h-1',
    ],
  },
  'check-circle': { paths: ['M8.5 12.5 11 15l4.5-5'], circles: [[12, 12, 9]] },
  minimize: { paths: ['M5 12h14', 'M9 8l3 3 3-3', 'M9 16l3-3 3 3'] },
  key: { paths: ['M9.6 13.4 20 3', 'M16.5 6.5l2.5 2.5', 'M14 9l2.5 2.5'], circles: [[7, 16, 3.2]] },
  fingerprint: {
    paths: [
      'M12 10a2 2 0 0 1 2 2c0 3-.6 5.4-1.6 7.6',
      'M8 12a4 4 0 0 1 8 0c0 3.8-.8 6.2-2 8.4',
      'M5 12.5a7 7 0 0 1 14-.5c0 2.2-.2 4.3-.8 6.2',
      'M6.2 6.6a8.6 8.6 0 0 1 11.8.6',
    ],
  },
  regex: { paths: ['M12 4v8', 'M8.4 6 15.6 10', 'M15.6 6 8.4 10'], circles: [[6.5, 17.5, 1.6]] },
  clock: { paths: ['M12 7v5.2l3.6 2.1'], circles: [[12, 12, 9]] },
  timer: { paths: ['M10 2h4', 'M12 14V9.5'], circles: [[12, 14, 8]] },
  hash: { paths: ['M4 9h16', 'M4 15h16', 'M10 3 8 21', 'M16 3l-2 18'] },
  database: {
    paths: [
      'M4 6c0-1.7 3.6-3 8-3s8 1.3 8 3-3.6 3-8 3-8-1.3-8-3z',
      'M4 6v6c0 1.7 3.6 3 8 3s8-1.3 8-3V6',
      'M4 12v6c0 1.7 3.6 3 8 3s8-1.3 8-3v-6',
    ],
  },
  file: { paths: ['M14 3H7a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h10a2 2 0 0 0 2-2V8z', 'M14 3v5h5'] },
  'file-text': {
    paths: [
      'M14 3H7a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h10a2 2 0 0 0 2-2V8z',
      'M14 3v5h5',
      'M9 13h6',
      'M9 17h5',
    ],
  },
  'file-code': {
    paths: [
      'M14 3H7a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h10a2 2 0 0 0 2-2V8z',
      'M14 3v5h5',
      'M10.5 12.5 8.5 15l2 2.5',
      'M14 12.5l2 2.5-2 2.5',
    ],
  },
  'file-plus': {
    paths: [
      'M14 3H7a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h10a2 2 0 0 0 2-2V8z',
      'M14 3v5h5',
      'M12 12.5v6',
      'M9 15.5h6',
    ],
  },
  'file-image': {
    paths: [
      'M14 3H7a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h10a2 2 0 0 0 2-2V8z',
      'M14 3v5h5',
      'M7.5 19l3.5-3.5L14 18',
    ],
    circles: [[10, 12.5, 1.2]],
  },
  link: {
    paths: [
      'M10.5 13.5a5 5 0 0 0 7.1 0l2-2a5 5 0 0 0-7.1-7.1l-1 1',
      'M13.5 10.5a5 5 0 0 0-7.1 0l-2 2a5 5 0 0 0 7.1 7.1l1-1',
    ],
  },
  text: { paths: ['M4 6h16', 'M4 12h16', 'M4 18h10'] },
  type: { paths: ['M4 6.5V4h16v2.5', 'M12 4v16', 'M9 20h6'] },
  'letter-case': {
    paths: ['M3 18 7.5 6 12 18', 'M4.4 14.5h6.2', 'M15 18v-5.5a3 3 0 0 1 6 0V18', 'M15 15.5h6'],
  },
  paragraph: { paths: ['M13 4v16', 'M17.5 4v16', 'M17.5 4H10a5 5 0 0 0 0 10h3'] },
  sort: { paths: ['M7 4.5v15', 'M4 8l3-3.5L10 8', 'M17 19.5v-15', 'M14 16l3 3.5 3-3.5'] },
  filter: { paths: ['M4 5h16l-6 7v6.5l-4 2V12z'] },
  swap: { paths: ['M7 4 3 8l4 4', 'M3 8h13', 'M17 20l4-4-4-4', 'M21 16H8'] },
  broom: { paths: ['M15 3 9.5 8.5', 'M5 19.5 9 11l5 5-8.5 4z', 'M9.5 11.5l4 4'] },
  image: {
    rects: [[3, 4, 18, 16, 2]],
    circles: [[9, 10, 1.8]],
    paths: ['M4 17.5 8.6 13l4.4 4.4 3-3 4 4'],
  },
  resize: { paths: ['M15 3h6v6', 'M9 21H3v-6', 'M21 3l-7.5 7.5', 'M3 21l7.5-7.5'] },
  crop: { paths: ['M6 2v14a2 2 0 0 0 2 2h14', 'M2 6h14a2 2 0 0 1 2 2v14'] },
  download: { paths: ['M12 3v12', 'M7.5 10.5 12 15l4.5-4.5', 'M4 17v3a1 1 0 0 0 1 1h14a1 1 0 0 0 1-1v-3'] },
  upload: { paths: ['M12 15V3', 'M7.5 7.5 12 3l4.5 4.5', 'M4 17v3a1 1 0 0 0 1 1h14a1 1 0 0 0 1-1v-3'] },
  palette: {
    paths: ['M12 3a9 9 0 1 0 0 18 2 2 0 0 0 2-2v-1a2 2 0 0 1 2-2h1a4 4 0 0 0 4-4 9 9 0 0 0-9-9z'],
    circles: [
      [7.5, 12.5, 1.1],
      [9.5, 7.8, 1.1],
      [14.5, 7.8, 1.1],
    ],
  },
  contrast: { circles: [[12, 12, 9]], paths: ['M12 3a9 9 0 0 1 0 18z'] },
  star: { paths: ['M12 3.5l2.7 5.6 6.1.9-4.4 4.3 1 6.1-5.4-2.9-5.4 2.9 1-6.1L3.2 10l6.1-.9z'] },
  heart: { paths: ['M12 20.5S4.5 16 4.5 10.8A4.3 4.3 0 0 1 12 7.9a4.3 4.3 0 0 1 7.5 2.9C19.5 16 12 20.5 12 20.5z'] },
  coffee: {
    paths: [
      'M4 9h13v5.5a4.5 4.5 0 0 1-4.5 4.5h-4A4.5 4.5 0 0 1 4 14.5V9z',
      'M17 10.5h1.5a2.5 2.5 0 0 1 0 5H17',
      'M8.5 2.5v3',
      'M12.5 2.5v3',
    ],
  },
  'heart-filled': {
    filled: true,
    paths: ['M12 20.5S4.5 16 4.5 10.8A4.3 4.3 0 0 1 12 7.9a4.3 4.3 0 0 1 7.5 2.9C19.5 16 12 20.5 12 20.5z'],
  },
  shadow: { rects: [[3, 3, 13, 13, 2]], paths: ['M8 21h11a2 2 0 0 0 2-2V8'] },
  gradient: { rects: [[3, 3, 18, 18, 2]], paths: ['M3 14 14 3', 'M10 21 21 10'] },
  corner: { paths: ['M4 20V10a6 6 0 0 1 6-6h10'] },
  ruler: { paths: ['M3 15 15 3l6 6L9 21z', 'M7 11l2 2', 'M10 8l2 2', 'M13 5l2 2'] },
  columns: { rects: [[3, 4, 18, 16, 2]], paths: ['M9 4v16', 'M15 4v16'] },
  // A split pane with a minus on one side and a plus on the other: reads as a
  // diff at 20px, where bracket- or arrow-based marks are indistinguishable
  // from the `braces` icon.
  compare: {
    rects: [[3, 4, 18, 16, 2]],
    paths: ['M12 4v16', 'M6 12h3.5', 'M14.5 12H18', 'M16.25 10.25v3.5'],
  },
  grid: { rects: [[3, 3, 18, 18, 2]], paths: ['M9 3v18', 'M15 3v18', 'M3 9h18', 'M3 15h18'] },
  percent: {
    paths: ['M6 18 18 6'],
    circles: [
      [7.5, 7.5, 2.5],
      [16.5, 16.5, 2.5],
    ],
  },
  bank: { paths: ['M3 10 12 4l9 6', 'M5.5 10.5v7.5', 'M9.8 10.5v7.5', 'M14.2 10.5v7.5', 'M18.5 10.5v7.5', 'M3 20.5h18'] },
  receipt: { paths: ['M6 3h12v18l-2-1.5-2 1.5-2-1.5-2 1.5L8 19.5 6 21z', 'M9.5 8h5', 'M9.5 12h5'] },
  'trending-up': { paths: ['M3 17 9 11l4 4 8-8', 'M15 7h6v6'] },
  chart: { paths: ['M4.5 20V10.5', 'M9.5 20V4.5', 'M14.5 20v-6', 'M19.5 20v-9', 'M3 20.5h18'] },
  tag: {
    paths: ['M20.5 12.5 12.5 4.5A2 2 0 0 0 11 4H5a1 1 0 0 0-1 1v6a2 2 0 0 0 .6 1.4l8 8a1.5 1.5 0 0 0 2.1 0l5.8-5.8a1.5 1.5 0 0 0 0-2.1z'],
    circles: [[8, 8, 1.2]],
  },
  cake: { paths: ['M3.5 20.5h17', 'M5 20.5V15a2 2 0 0 1 2-2h10a2 2 0 0 1 2 2v5.5', 'M12 13V9.5', 'M8.5 13v-3', 'M15.5 13v-3', 'M12 6.5V5'] },
  calendar: { rects: [[3, 5, 18, 16, 2]], paths: ['M8 3v4', 'M16 3v4', 'M3 10h18'] },
  'calendar-check': { rects: [[3, 5, 18, 16, 2]], paths: ['M8 3v4', 'M16 3v4', 'M3 10h18', 'M9 15l2 2 4-4'] },
  globe: { circles: [[12, 12, 9]], paths: ['M3 12h18', 'M12 3a14 14 0 0 1 0 18', 'M12 3a14 14 0 0 0 0 18'] },
  weight: { paths: ['M6.5 7.5h11l2 13H4.5z'], circles: [[12, 5, 2.5]] },
  thermometer: { paths: ['M14 14.2V5a2 2 0 1 0-4 0v9.2a4 4 0 1 0 4 0z'] },
  square: { rects: [[4, 4, 16, 16, 2]] },
  gauge: { paths: ['M12 14.5 16 9.5', 'M4.2 18a9 9 0 1 1 15.6 0'] },
  beaker: { paths: ['M9 3v6l-5 9a2 2 0 0 0 1.8 3h12.4a2 2 0 0 0 1.8-3l-5-9V3', 'M8 3h8', 'M6.2 15h11.6'] },
  currency: {
    circles: [[12, 12, 9]],
    paths: ['M15 9.2A3 3 0 0 0 12 7.5c-1.8 0-3 .9-3 2.1 0 2.7 6 1.7 6 4.4 0 1.3-1.2 2.2-3 2.2a3 3 0 0 1-3-1.8', 'M12 6v1.5', 'M12 16.5V18'],
  },
  scissors: {
    circles: [
      [6, 7, 2.5],
      [6, 17, 2.5],
    ],
    paths: ['M8.2 8.4 20 19', 'M8.2 15.6 20 5'],
  },
  rotate: { paths: ['M3.5 12a8.5 8.5 0 1 0 2.8-6.3', 'M3 4.5v5h5'] },
  search: { circles: [[11, 11, 7]], paths: ['M16.2 16.2 21 21'] },
  sun: {
    circles: [[12, 12, 4]],
    paths: ['M12 2v2.2', 'M12 19.8V22', 'M4.6 4.6l1.6 1.6', 'M17.8 17.8l1.6 1.6', 'M2 12h2.2', 'M19.8 12H22', 'M4.6 19.4l1.6-1.6', 'M17.8 6.2l1.6-1.6'],
  },
  moon: { paths: ['M20.5 14.7A8.6 8.6 0 0 1 9.3 3.5a8.6 8.6 0 1 0 11.2 11.2z'] },
  monitor: { rects: [[3, 4, 18, 12, 2]], paths: ['M8.5 20.5h7', 'M12 16.5v4'] },
  share: {
    circles: [
      [18, 5, 2.8],
      [6, 12, 2.8],
      [18, 19, 2.8],
    ],
    paths: ['M8.5 13.4 15.5 17.6', 'M15.5 6.4 8.5 10.6'],
  },
  'chevron-right': { paths: ['M9.5 5 16.5 12l-7 7'] },
  'chevron-down': { paths: ['M5 9.5 12 16.5l7-7'] },
  'chevron-up': { paths: ['M5 14.5 12 7.5l7 7'] },
  'arrow-right': { paths: ['M4 12h15', 'M13.5 6.5 19 12l-5.5 5.5'] },
  x: { paths: ['M6 6l12 12', 'M18 6 6 18'] },
  menu: { paths: ['M4 7h16', 'M4 12h16', 'M4 17h16'] },
  external: { paths: ['M14 4h6v6', 'M20 4 11.5 12.5', 'M18 14.5V19a1.5 1.5 0 0 1-1.5 1.5h-11A1.5 1.5 0 0 1 4 19V8a1.5 1.5 0 0 1 1.5-1.5H10'] },
  check: { paths: ['M5 12.5 9.5 17 19 7'] },
  copy: { rects: [[9, 9, 11, 11, 2]], paths: ['M6 15H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h8a2 2 0 0 1 2 2v1'] },
  trash: { paths: ['M4 7h16', 'M9.5 7V5.2A1.2 1.2 0 0 1 10.7 4h2.6a1.2 1.2 0 0 1 1.2 1.2V7', 'M6.5 7l.9 12.1a1.5 1.5 0 0 0 1.5 1.4h6.2a1.5 1.5 0 0 0 1.5-1.4L17.5 7'] },
  refresh: { paths: ['M20.5 12a8.5 8.5 0 0 1-14.6 5.9L3.5 15.5', 'M3.5 20v-4.5H8', 'M3.5 12a8.5 8.5 0 0 1 14.6-5.9l2.4 2.4', 'M20.5 4v4.5H16'] },
  alert: { paths: ['M12 4 2.8 20h18.4z', 'M12 10v4.2'], circles: [[12, 17.2, 0.9]] },
  info: { circles: [[12, 12, 9], [12, 8, 0.9]], paths: ['M12 11.2V17'] },
  brush: { paths: ['M17 3l4 4L9.5 18.5l-5 1.5 1.5-5z', 'M14 6l4 4'] },
  lock: { rects: [[4, 10, 16, 11, 2]], paths: ['M8 10V7a4 4 0 0 1 8 0v3'] },
  sparkle: { paths: ['M12 3l1.9 5.1L19 10l-5.1 1.9L12 17l-1.9-5.1L5 10l5.1-1.9z', 'M18.5 15.5l.8 2.2 2.2.8-2.2.8-.8 2.2-.8-2.2-2.2-.8 2.2-.8z'] },
  home: { paths: ['M3 11 12 3l9 8', 'M6 9.7V20h12V9.7'] },
  layers: { paths: ['M12 3 3 8l9 5 9-5z', 'M3 13l9 5 9-5', 'M3 17.5l9 5 9-5'] },
  sliders: {
    paths: ['M4 6h8', 'M18 6h2', 'M4 12h2', 'M12 12h8', 'M4 18h10', 'M20 18h0'],
    circles: [
      [15, 6, 2.2],
      [9, 12, 2.2],
      [17, 18, 2.2],
    ],
  },
  arrows: { paths: ['M7 4 3 8l4 4', 'M3 8h13', 'M17 20l4-4-4-4', 'M21 16H8'] },
};

export const ICON_NAMES = Object.keys(ICONS);

@Component({
  selector: 'app-icon',
  changeDetection: ChangeDetectionStrategy.OnPush,
  host: { class: 'inline-block shrink-0', 'aria-hidden': 'true' },
  template: `
    <svg
      viewBox="0 0 24 24"
      class="w-full h-full"
      [attr.fill]="shape().filled ? 'currentColor' : 'none'"
      [attr.stroke]="shape().filled ? 'none' : 'currentColor'"
      [attr.stroke-width]="strokeWidth()"
      stroke-linecap="round"
      stroke-linejoin="round"
      focusable="false"
      aria-hidden="true"
    >
      @for (d of shape().paths ?? []; track d) {
        <path [attr.d]="d" />
      }
      @for (c of shape().circles ?? []; track $index) {
        <circle [attr.cx]="c[0]" [attr.cy]="c[1]" [attr.r]="c[2]" />
      }
      @for (r of shape().rects ?? []; track $index) {
        <rect [attr.x]="r[0]" [attr.y]="r[1]" [attr.width]="r[2]" [attr.height]="r[3]" [attr.rx]="r[4]" />
      }
    </svg>
  `,
})
export class IconComponent {
  readonly name = input.required<string>();
  readonly strokeWidth = input(1.7);

  /** Falls back to a neutral glyph so a typo never renders an empty box. */
  protected readonly shape = computed<IconShape>(() => ICONS[this.name()] ?? ICONS['square']);
}
