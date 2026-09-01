export interface XmlResult {
  output: string;
  error?: string;
}

/**
 * Re-indents XML by nesting depth.
 *
 * Well-formedness is checked with DOMParser first — the browser's own parser
 * gives far better diagnostics than anything hand-rolled — but the actual
 * re-indent works on the raw token stream so comments, CDATA and processing
 * instructions survive untouched.
 */
export function formatXml(xml: string, indentSize = 2): XmlResult {
  const trimmed = xml.trim();
  if (!trimmed) return { output: '' };

  const parseError = checkWellFormed(trimmed);
  if (parseError) return { output: '', error: parseError };

  const indent = ' '.repeat(indentSize);
  const lines: string[] = [];
  let depth = 0;

  // Split into tags and the text between them.
  const tokens = trimmed
    .replace(/>\s+</g, '><')
    .split(/(<!\[CDATA\[[\s\S]*?\]\]>|<!--[\s\S]*?-->|<[^>]+>)/)
    .filter((t) => t.trim().length > 0);

  for (let i = 0; i < tokens.length; i++) {
    const token = tokens[i].trim();

    if (token.startsWith('</')) {
      depth = Math.max(0, depth - 1);
      lines.push(indent.repeat(depth) + token);
      continue;
    }

    const isSelfClosing = token.endsWith('/>');
    const isDeclaration = token.startsWith('<?') || token.startsWith('<!');
    const isOpenTag = token.startsWith('<') && !isSelfClosing && !isDeclaration;

    if (isOpenTag) {
      // Collapse <tag>text</tag> onto a single line — it reads far better.
      const next = tokens[i + 1]?.trim();
      const afterNext = tokens[i + 2]?.trim();
      if (next && !next.startsWith('<') && afterNext?.startsWith('</')) {
        lines.push(indent.repeat(depth) + token + next + afterNext);
        i += 2;
        continue;
      }
      lines.push(indent.repeat(depth) + token);
      depth++;
      continue;
    }

    lines.push(indent.repeat(depth) + token);
  }

  return { output: lines.join('\n') };
}

export function minifyXml(xml: string): XmlResult {
  const trimmed = xml.trim();
  if (!trimmed) return { output: '' };
  const parseError = checkWellFormed(trimmed);
  if (parseError) return { output: '', error: parseError };
  return { output: trimmed.replace(/>\s+</g, '><').replace(/\s{2,}/g, ' ') };
}

function checkWellFormed(xml: string): string | undefined {
  if (typeof DOMParser === 'undefined') return undefined;
  const doc = new DOMParser().parseFromString(xml, 'application/xml');
  const error = doc.querySelector('parsererror');
  if (!error) return undefined;
  return (error.textContent ?? 'The document is not well-formed XML.').trim().split('\n')[0];
}
