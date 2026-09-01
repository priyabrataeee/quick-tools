/**
 * A compact YAML parser and serialiser covering the configuration subset:
 * nested mappings, sequences, scalars, quoted strings, comments, block scalars
 * and inline flow collections.
 *
 * Anchors, aliases, custom tags and multiple documents are intentionally not
 * supported — they are rare in hand-written config, and reporting them is far
 * better than silently mis-parsing them.
 */

export class YamlError extends Error {
  readonly line: number | undefined;

  constructor(message: string, line?: number) {
    super(line ? `Line ${line}: ${message}` : message);
    this.name = 'YamlError';
    this.line = line;
  }
}

interface Line {
  indent: number;
  text: string;
  /** 1-based source line number, for error messages. */
  n: number;
  /** The original line, needed for block scalars. */
  raw: string;
}

/** Removes a trailing comment, ignoring `#` inside quotes. */
function stripComment(text: string): string {
  let inSingle = false;
  let inDouble = false;
  for (let i = 0; i < text.length; i++) {
    const ch = text[i];
    if (ch === "'" && !inDouble) inSingle = !inSingle;
    else if (ch === '"' && !inSingle) inDouble = !inDouble;
    else if (ch === '#' && !inSingle && !inDouble) {
      // A `#` only starts a comment when preceded by whitespace or at the start.
      if (i === 0 || /\s/.test(text[i - 1])) return text.slice(0, i);
    }
  }
  return text;
}

function toLines(source: string): Line[] {
  const out: Line[] = [];
  const rawLines = source.replace(/\r\n?/g, '\n').split('\n');

  rawLines.forEach((raw, index) => {
    const n = index + 1;
    const withoutComment = stripComment(raw);
    if (!withoutComment.trim()) return;

    const trimmedStart = withoutComment.replace(/^\s*/, '');
    const indentText = withoutComment.slice(0, withoutComment.length - trimmedStart.length);
    if (indentText.includes('\t')) {
      throw new YamlError('Tabs cannot be used for indentation in YAML — use spaces.', n);
    }

    const text = trimmedStart.trimEnd();
    if (text === '---' || text === '...') return;

    out.push({ indent: indentText.length, text, n, raw });
  });

  return out;
}

const KEY_RE = /^(?:"((?:[^"\\]|\\.)*)"|'((?:[^']|'')*)'|([^:#]+?))\s*:(\s|$)/;

function unquote(value: string): string {
  if (value.length >= 2 && value.startsWith('"') && value.endsWith('"')) {
    return value
      .slice(1, -1)
      .replace(/\\n/g, '\n')
      .replace(/\\t/g, '\t')
      .replace(/\\"/g, '"')
      .replace(/\\\\/g, '\\');
  }
  if (value.length >= 2 && value.startsWith("'") && value.endsWith("'")) {
    return value.slice(1, -1).replace(/''/g, "'");
  }
  return value;
}

/** Splits a flow collection body on commas that are not nested or quoted. */
function splitFlow(body: string): string[] {
  const parts: string[] = [];
  let depth = 0;
  let current = '';
  let inSingle = false;
  let inDouble = false;

  for (const ch of body) {
    if (ch === "'" && !inDouble) inSingle = !inSingle;
    else if (ch === '"' && !inSingle) inDouble = !inDouble;

    if (!inSingle && !inDouble) {
      if (ch === '[' || ch === '{') depth++;
      else if (ch === ']' || ch === '}') depth--;
      else if (ch === ',' && depth === 0) {
        parts.push(current);
        current = '';
        continue;
      }
    }
    current += ch;
  }
  if (current.trim()) parts.push(current);
  return parts.map((p) => p.trim()).filter((p) => p.length > 0);
}

function parseScalar(raw: string, lineNo: number): unknown {
  const value = raw.trim();
  if (value === '' || value === '~' || value === 'null' || value === 'Null' || value === 'NULL') {
    return null;
  }

  if (value.startsWith('[') && value.endsWith(']')) {
    return splitFlow(value.slice(1, -1)).map((item) => parseScalar(item, lineNo));
  }

  if (value.startsWith('{') && value.endsWith('}')) {
    const map: Record<string, unknown> = {};
    for (const entry of splitFlow(value.slice(1, -1))) {
      const separator = entry.indexOf(':');
      if (separator === -1) throw new YamlError(`Expected "key: value" inside { }`, lineNo);
      const key = unquote(entry.slice(0, separator).trim());
      map[key] = parseScalar(entry.slice(separator + 1), lineNo);
    }
    return map;
  }

  if (value.startsWith('"') || value.startsWith("'")) return unquote(value);

  if (value === 'true' || value === 'True' || value === 'TRUE') return true;
  if (value === 'false' || value === 'False' || value === 'FALSE') return false;

  if (/^-?\d+$/.test(value)) {
    const asNumber = Number(value);
    return Number.isSafeInteger(asNumber) ? asNumber : value;
  }
  if (/^-?\d*\.\d+(?:[eE][+-]?\d+)?$/.test(value) || /^-?\d+[eE][+-]?\d+$/.test(value)) {
    return Number(value);
  }

  return value;
}

export function parseYaml(source: string): unknown {
  const lines = toLines(source);
  if (!lines.length) return null;

  let cursor = 0;

  /** Collects the body of a `|` or `>` block scalar. */
  const readBlockScalar = (header: string, parentIndent: number): string => {
    const style = header[0];
    const chomp = header.slice(1).trim();
    const body: string[] = [];
    let blockIndent = -1;

    while (cursor < lines.length && lines[cursor].indent > parentIndent) {
      const line = lines[cursor];
      if (blockIndent === -1) blockIndent = line.indent;
      body.push(line.raw.slice(blockIndent).replace(/\s+$/, ''));
      cursor++;
    }

    let text: string;
    if (style === '>') {
      // Folded: single newlines become spaces, blank lines stay as breaks.
      text = body
        .reduce<string[]>((acc, current) => {
          if (current === '') acc.push('');
          else if (acc.length && acc[acc.length - 1] !== '') acc[acc.length - 1] += ` ${current}`;
          else acc.push(current);
          return acc;
        }, [])
        .join('\n');
    } else {
      text = body.join('\n');
    }

    if (chomp === '-') return text;
    if (chomp === '+') return `${text}\n`;
    return text ? `${text}\n` : '';
  };

  const parseValue = (indent: number): unknown => {
    if (cursor >= lines.length) return null;
    return lines[cursor].text.startsWith('-') ? parseSequence(indent) : parseMapping(indent);
  };

  const parseSequence = (indent: number): unknown[] => {
    const items: unknown[] = [];

    while (cursor < lines.length && lines[cursor].indent === indent) {
      const line = lines[cursor];
      if (!/^-(\s|$)/.test(line.text)) break;

      const rest = line.text.slice(1).replace(/^\s*/, '');
      const restColumn = line.indent + (line.text.length - rest.length);

      if (!rest) {
        cursor++;
        if (cursor < lines.length && lines[cursor].indent > indent) {
          items.push(parseValue(lines[cursor].indent));
        } else {
          items.push(null);
        }
        continue;
      }

      const keyMatch = KEY_RE.exec(rest);
      if (keyMatch) {
        // `- key: value` starts a mapping whose first key sits on this line.
        // Rewrite the line so the mapping parser sees a normal entry.
        lines[cursor] = { ...line, indent: restColumn, text: rest };
        items.push(parseMapping(restColumn));
        continue;
      }

      const blockMatch = /^([|>][-+]?)$/.exec(rest);
      if (blockMatch) {
        cursor++;
        items.push(readBlockScalar(blockMatch[1], indent));
        continue;
      }

      items.push(parseScalar(rest, line.n));
      cursor++;
    }

    return items;
  };

  const parseMapping = (indent: number): Record<string, unknown> => {
    const map: Record<string, unknown> = {};

    while (cursor < lines.length && lines[cursor].indent === indent) {
      const line = lines[cursor];
      if (/^-(\s|$)/.test(line.text)) break;

      const match = KEY_RE.exec(line.text);
      if (!match) {
        throw new YamlError(`Expected "key: value" but found "${line.text}"`, line.n);
      }

      const key = unquote((match[1] ?? match[2] ?? match[3] ?? '').trim());
      // `match[0]` covers `key:` plus the single separator character, so the
      // remainder of the line is the inline value (empty when the value is
      // nested on following lines).
      const rest = line.text.slice(match[0].length).trim();

      const blockMatch = /^([|>][-+]?)$/.exec(rest);
      if (blockMatch) {
        cursor++;
        map[key] = readBlockScalar(blockMatch[1], indent);
        continue;
      }

      if (rest === '') {
        cursor++;
        if (cursor < lines.length && lines[cursor].indent > indent) {
          map[key] = parseValue(lines[cursor].indent);
        } else if (
          cursor < lines.length &&
          lines[cursor].indent === indent &&
          /^-(\s|$)/.test(lines[cursor].text)
        ) {
          // A sequence may be written at the same indent as its key.
          map[key] = parseSequence(indent);
        } else {
          map[key] = null;
        }
        continue;
      }

      map[key] = parseScalar(rest, line.n);
      cursor++;
    }

    return map;
  };

  const result = parseValue(lines[0].indent);

  if (cursor < lines.length) {
    throw new YamlError(
      `Unexpected indentation — "${lines[cursor].text}" does not line up with the block above it.`,
      lines[cursor].n,
    );
  }

  return result;
}

const NEEDS_QUOTES = /^(?:$|[-?:,[\]{}#&*!|>'"%@`]|.*: |.*\s#|true$|false$|null$|~$|-?\d)/;

function formatScalar(value: unknown): string {
  if (value === null || value === undefined) return 'null';
  if (typeof value === 'boolean') return String(value);
  if (typeof value === 'number') return Number.isFinite(value) ? String(value) : 'null';

  const text = String(value);
  if (text.includes('\n')) return `|-\n${text.split('\n').map((l) => `  ${l}`).join('\n')}`;
  if (NEEDS_QUOTES.test(text) && !/^-?\d+(\.\d+)?$/.test(text)) {
    return `"${text.replace(/\\/g, '\\\\').replace(/"/g, '\\"')}"`;
  }
  if (/^-?\d+(\.\d+)?$/.test(text)) return `"${text}"`;
  return text;
}

/** Serialises a JSON-compatible value as YAML. */
export function toYaml(value: unknown, depth = 0): string {
  const pad = '  '.repeat(depth);

  if (Array.isArray(value)) {
    if (!value.length) return `${pad}[]`;
    return value
      .map((item) => {
        if (item !== null && typeof item === 'object') {
          const nested = toYaml(item, depth + 1).replace(/^\s{2}/, '');
          return `${pad}- ${nested.trimStart()}`;
        }
        return `${pad}- ${formatScalar(item)}`;
      })
      .join('\n');
  }

  if (value !== null && typeof value === 'object') {
    const entries = Object.entries(value as Record<string, unknown>);
    if (!entries.length) return `${pad}{}`;
    return entries
      .map(([key, item]) => {
        if (Array.isArray(item)) {
          if (!item.length) return `${pad}${key}: []`;
          return `${pad}${key}:\n${toYaml(item, depth + 1)}`;
        }
        if (item !== null && typeof item === 'object') {
          if (!Object.keys(item).length) return `${pad}${key}: {}`;
          return `${pad}${key}:\n${toYaml(item, depth + 1)}`;
        }
        const scalar = formatScalar(item);
        if (scalar.startsWith('|-')) {
          return `${pad}${key}: |-\n${String(item)
            .split('\n')
            .map((l) => `${pad}  ${l}`)
            .join('\n')}`;
        }
        return `${pad}${key}: ${scalar}`;
      })
      .join('\n');
  }

  return `${pad}${formatScalar(value)}`;
}
