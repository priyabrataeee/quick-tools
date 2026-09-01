export interface JsonError {
  message: string;
  line?: number;
  column?: number;
  /** The offending line plus a caret marker, for display. */
  excerpt?: string;
}

export interface JsonStats {
  keys: number;
  arrays: number;
  objects: number;
  depth: number;
  values: number;
}

/**
 * Parses JSON and, on failure, converts the engine's character offset into a
 * line/column pair with a visual excerpt.
 *
 * V8 reports "position 42"; Firefox reports "line 3 column 5". Both are
 * handled so the error is equally useful in either browser.
 */
export function parseJson(text: string): { value: unknown } | { error: JsonError } {
  try {
    return { value: JSON.parse(text) };
  } catch (e) {
    const message = e instanceof Error ? e.message : String(e);
    const offsetMatch = /position (\d+)/.exec(message);
    const lineColMatch = /line (\d+) column (\d+)/.exec(message);

    let line: number | undefined;
    let column: number | undefined;

    if (lineColMatch) {
      line = Number(lineColMatch[1]);
      column = Number(lineColMatch[2]);
    } else if (offsetMatch) {
      const offset = Math.min(Number(offsetMatch[1]), text.length);
      const before = text.slice(0, offset);
      line = before.split('\n').length;
      column = offset - before.lastIndexOf('\n');
    }

    let excerpt: string | undefined;
    if (line !== undefined && column !== undefined) {
      const source = text.split('\n')[line - 1] ?? '';
      excerpt = `${source}\n${' '.repeat(Math.max(0, column - 1))}^`;
    }

    return { error: { message: message.replace(/^JSON\.parse: /, ''), line, column, excerpt } };
  }
}

/** Walks a parsed value and counts its shape. */
export function jsonStats(value: unknown): JsonStats {
  const stats: JsonStats = { keys: 0, arrays: 0, objects: 0, depth: 0, values: 0 };

  const walk = (node: unknown, depth: number): void => {
    stats.depth = Math.max(stats.depth, depth);
    if (Array.isArray(node)) {
      stats.arrays++;
      for (const item of node) walk(item, depth + 1);
      return;
    }
    if (node !== null && typeof node === 'object') {
      stats.objects++;
      for (const [, v] of Object.entries(node)) {
        stats.keys++;
        walk(v, depth + 1);
      }
      return;
    }
    stats.values++;
  };

  walk(value, 1);
  return stats;
}

/** Recursively sorts object keys so two documents can be compared by eye. */
export function sortKeysDeep(value: unknown): unknown {
  if (Array.isArray(value)) return value.map(sortKeysDeep);
  if (value !== null && typeof value === 'object') {
    const entries = Object.entries(value as Record<string, unknown>).sort(([a], [b]) =>
      a.localeCompare(b),
    );
    return Object.fromEntries(entries.map(([k, v]) => [k, sortKeysDeep(v)]));
  }
  return value;
}
