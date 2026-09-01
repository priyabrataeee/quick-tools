import { Tool } from '../../tool.types';

export const COLOR_TOOLS: Tool[] = [
  {
    id: 'color-converter',
    name: 'Color Converter',
    description: 'Convert between HEX, RGB, HSL, HSB and CMYK with a live preview.',
    category: 'color',
    icon: 'palette',
    keywords: ['hex to rgb', 'hsl', 'cmyk', 'color picker', 'rgba'],
    added: '2026-02-26',
    popular: true,
    faqs: [
      { q: 'What is the difference between HSL and HSB?', a: 'Both use hue and saturation, but HSL varies lightness towards white and black, while HSB varies brightness towards black only. Design tools usually show HSB.' },
      { q: 'Is CMYK accurate for print?', a: 'The conversion here is the standard naive formula. Real print work needs an ICC profile for the specific press and paper.' },
      { q: 'Does it support alpha?', a: 'Yes. Set an alpha value and the RGBA, HSLA and eight-digit hex forms are all produced.' },
    ],
    about: [
      'Every colour on screen can be written several ways, and each notation suits a different job: hex for CSS, RGB for canvas work, HSL for building tints and shades programmatically.',
      'This converter keeps every representation in sync as you adjust any one of them, with a live swatch, an eyedropper where the browser supports it, and copy buttons on each format.',
    ],
  },
  {
    id: 'contrast-checker',
    name: 'Color Contrast Checker',
    description: 'Check text contrast against WCAG AA and AAA accessibility levels.',
    category: 'color',
    icon: 'contrast',
    keywords: ['wcag', 'accessibility', 'a11y', 'contrast ratio', 'readable'],
    added: '2026-02-26',
    trending: true,
    faqs: [
      { q: 'What ratio do I need?', a: 'WCAG AA requires 4.5:1 for normal text and 3:1 for large text. AAA requires 7:1 and 4.5:1 respectively.' },
      { q: 'What counts as large text?', a: 'At least 18.66 pixels bold, or 24 pixels regular.' },
      { q: 'Does contrast apply to icons and borders?', a: 'Yes. Meaningful non-text elements such as icons and input borders need at least 3:1 under WCAG 2.1.' },
    ],
    about: [
      'Contrast ratio is the most testable accessibility requirement there is, and low-contrast text is one of the most common failures found in audits.',
      'This checker computes the WCAG relative luminance ratio between your foreground and background, shows pass or fail for each conformance level and text size, and previews real text at both sizes.',
    ],
  },
];
