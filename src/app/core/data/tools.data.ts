import { Tool } from '../tool.types';
import { DEVELOPER_TOOLS } from './tools/developer';
import { TEXT_TOOLS } from './tools/text';
import { IMAGE_TOOLS } from './tools/image';
import { PDF_TOOLS } from './tools/pdf';
import { CSS_TOOLS } from './tools/css';
import { COLOR_TOOLS } from './tools/color';
import { CALCULATOR_TOOLS } from './tools/calculator';
import { CONVERTER_TOOLS } from './tools/converter';
import { DATETIME_TOOLS } from './tools/datetime';

/**
 * The complete tool registry.
 *
 * This array is the single source of truth for routing, search, SEO metadata
 * and the generated sitemap. Keep it sorted by category for readability; the
 * UI sorts by its own criteria at render time.
 */
export const TOOLS: Tool[] = [
  ...DEVELOPER_TOOLS,
  ...TEXT_TOOLS,
  ...IMAGE_TOOLS,
  ...PDF_TOOLS,
  ...CSS_TOOLS,
  ...COLOR_TOOLS,
  ...CALCULATOR_TOOLS,
  ...CONVERTER_TOOLS,
  ...DATETIME_TOOLS,
];
