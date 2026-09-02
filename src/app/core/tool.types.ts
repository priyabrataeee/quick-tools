/**
 * Shared types for the OnDevice Tools tool registry.
 *
 * Every tool in the app is described once, here, and that single description
 * drives the router, the search palette, the SEO/JSON-LD tags, the FAQ block
 * and the "related tools" rail. Adding a tool means adding one entry plus one
 * lazily loaded component.
 */

export type CategoryId =
  | 'developer'
  | 'text'
  | 'image'
  | 'pdf'
  | 'css'
  | 'color'
  | 'calculator'
  | 'converter'
  | 'datetime';

export interface ToolFaq {
  /** Question, rendered in the FAQ accordion and in FAQPage JSON-LD. */
  q: string;
  /** Plain-text answer (no markup — it is also emitted as structured data). */
  a: string;
}

export interface Tool {
  /** URL slug; the tool lives at `/tools/{id}`. */
  id: string;
  name: string;
  /** One-line summary used on cards, in search and as the meta description base. */
  description: string;
  category: CategoryId;
  /** Key of the inline SVG icon set (see `icon.component.ts`). */
  icon: string;
  /** Extra search terms that are not already in the name or description. */
  keywords: string[];
  /** ISO date the tool shipped — powers the "Recently added" rail. */
  added: string;
  popular?: boolean;
  trending?: boolean;
  faqs: ToolFaq[];
  /** Long-form SEO copy, one string per paragraph. */
  about: string[];
}

export interface Category {
  id: CategoryId;
  name: string;
  description: string;
  icon: string;
}

export const CATEGORIES: readonly Category[] = [
  { id: 'developer', name: 'Developer Tools', description: 'Formatters, encoders, decoders and generators for everyday development work.', icon: 'code' },
  { id: 'text', name: 'Text Tools', description: 'Count, clean, sort and transform text without leaving your browser.', icon: 'text' },
  { id: 'image', name: 'Image Tools', description: 'Compress, resize, crop and convert images entirely on your device.', icon: 'image' },
  { id: 'pdf', name: 'PDF Tools', description: 'Merge, split, rotate and build PDFs — your files never leave your machine.', icon: 'file' },
  { id: 'css', name: 'CSS Tools', description: 'Visual generators that write modern CSS for you.', icon: 'brush' },
  { id: 'color', name: 'Color Tools', description: 'Convert, inspect and check the accessibility of colors.', icon: 'palette' },
  { id: 'calculator', name: 'Calculators', description: 'Everyday finance and maths calculators with transparent formulas.', icon: 'percent' },
  { id: 'converter', name: 'Converters', description: 'Fast, accurate unit conversion for length, weight, temperature and more.', icon: 'ruler' },
  { id: 'datetime', name: 'Date & Time', description: 'Work out ages, durations, working days and timestamps.', icon: 'calendar' },
];

export function categoryById(id: CategoryId): Category {
  const found = CATEGORIES.find((c) => c.id === id);
  if (!found) throw new Error(`Unknown category: ${id}`);
  return found;
}
