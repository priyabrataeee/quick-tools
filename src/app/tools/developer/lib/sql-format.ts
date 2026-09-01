/**
 * A small, dialect-agnostic SQL pretty-printer.
 *
 * It tokenises first so that string literals, quoted identifiers and comments
 * are never re-cased or broken across lines — the usual failure mode of
 * regex-only formatters.
 */

const KEYWORDS = new Set([
  'select', 'from', 'where', 'insert', 'into', 'values', 'update', 'set', 'delete', 'create',
  'table', 'alter', 'drop', 'add', 'column', 'index', 'view', 'join', 'inner', 'left', 'right',
  'full', 'outer', 'cross', 'on', 'using', 'group', 'by', 'order', 'having', 'limit', 'offset',
  'union', 'all', 'distinct', 'as', 'and', 'or', 'not', 'in', 'is', 'null', 'like', 'ilike',
  'between', 'exists', 'case', 'when', 'then', 'else', 'end', 'asc', 'desc', 'with', 'recursive',
  'primary', 'key', 'foreign', 'references', 'unique', 'default', 'constraint', 'cascade',
  'returning', 'over', 'partition', 'window', 'fetch', 'next', 'rows', 'only', 'true', 'false',
]);

/** Clauses that start a new line at the current indent level. */
const BREAK_BEFORE = new Set([
  'select', 'from', 'where', 'group', 'order', 'having', 'limit', 'offset', 'union', 'values',
  'set', 'returning', 'window', 'fetch',
]);

/** Words that can precede JOIN. Only the first of a run starts a new line. */
const JOIN_MODIFIERS = new Set(['inner', 'left', 'right', 'full', 'cross', 'outer']);

interface Token {
  text: string;
  kind: 'word' | 'string' | 'comment' | 'punct' | 'number' | 'whitespace';
}

function tokenize(sql: string): Token[] {
  const tokens: Token[] = [];
  let i = 0;

  while (i < sql.length) {
    const ch = sql[i];

    // Line comment
    if (ch === '-' && sql[i + 1] === '-') {
      const end = sql.indexOf('\n', i);
      const stop = end === -1 ? sql.length : end;
      tokens.push({ text: sql.slice(i, stop), kind: 'comment' });
      i = stop;
      continue;
    }

    // Block comment
    if (ch === '/' && sql[i + 1] === '*') {
      const end = sql.indexOf('*/', i + 2);
      const stop = end === -1 ? sql.length : end + 2;
      tokens.push({ text: sql.slice(i, stop), kind: 'comment' });
      i = stop;
      continue;
    }

    // Quoted string or identifier — consume to the matching close quote,
    // honouring SQL's doubled-quote escape.
    if (ch === "'" || ch === '"' || ch === '`') {
      let j = i + 1;
      while (j < sql.length) {
        if (sql[j] === ch) {
          if (sql[j + 1] === ch) j += 2;
          else break;
        } else j++;
      }
      tokens.push({ text: sql.slice(i, Math.min(j + 1, sql.length)), kind: 'string' });
      i = j + 1;
      continue;
    }

    if (/\s/.test(ch)) {
      let j = i;
      while (j < sql.length && /\s/.test(sql[j])) j++;
      tokens.push({ text: ' ', kind: 'whitespace' });
      i = j;
      continue;
    }

    if (/[\w$]/.test(ch)) {
      let j = i;
      while (j < sql.length && /[\w$.]/.test(sql[j])) j++;
      const text = sql.slice(i, j);
      tokens.push({ text, kind: /^\d/.test(text) ? 'number' : 'word' });
      i = j;
      continue;
    }

    tokens.push({ text: ch, kind: 'punct' });
    i++;
  }

  return tokens;
}

export function formatSql(sql: string, indentSize = 2): string {
  const tokens = tokenize(sql).filter((t) => t.kind !== 'whitespace');
  if (!tokens.length) return '';

  const pad = (level: number) => ' '.repeat(Math.max(0, level) * indentSize);
  let depth = 0;
  let line = '';
  const lines: string[] = [];
  /** One entry per open parenthesis: did it start a subquery? */
  const subqueryParens: boolean[] = [];

  const flush = () => {
    if (line.trim()) lines.push(pad(depth) + line.trim());
    line = '';
  };

  for (let i = 0; i < tokens.length; i++) {
    const token = tokens[i];
    const lower = token.text.toLowerCase();
    const isKeyword = token.kind === 'word' && KEYWORDS.has(lower);
    const text = isKeyword ? token.text.toUpperCase() : token.text;

    if (token.kind === 'comment') {
      flush();
      lines.push(pad(depth) + token.text);
      continue;
    }

    if (token.kind === 'punct') {
      if (token.text === '(') {
        // Only a parenthesis that starts a subquery earns its own indent level;
        // a function call's parentheses stay inline.
        const next = tokens[i + 1];
        const opensSubquery =
          next?.kind === 'word' && ['select', 'with'].includes(next.text.toLowerCase());
        subqueryParens.push(opensSubquery);

        if (opensSubquery) {
          line = `${line.trimEnd()} (`.trim();
          flush();
          depth++;
        } else {
          // `count(` reads as a function call; `IN (` reads as a clause.
          const previous = tokens[i - 1];
          const afterKeyword =
            !previous || previous.kind !== 'word' || KEYWORDS.has(previous.text.toLowerCase());
          line += !line.trim() ? '(' : afterKeyword ? ' (' : '(';
        }
        continue;
      }
      if (token.text === ')') {
        if (subqueryParens.pop()) {
          flush();
          depth = Math.max(0, depth - 1);
          line = ')';
        } else {
          line = line.trimEnd() + ')';
        }
        continue;
      }
      if (token.text === ',') {
        line = line.trimEnd() + ',';
        continue;
      }
      if (token.text === ';') {
        line = line.trimEnd() + ';';
        flush();
        continue;
      }
      line += ` ${token.text}`;
      continue;
    }

    if (isKeyword) {
      // A join phrase such as `LEFT OUTER JOIN` must break once, at its first
      // word — not once per word.
      const previousWord = tokens[i - 1]?.text.toLowerCase() ?? '';
      const followedByJoin =
        tokens[i + 1]?.text.toLowerCase() === 'join' || tokens[i + 2]?.text.toLowerCase() === 'join';
      const startsJoin =
        !JOIN_MODIFIERS.has(previousWord) &&
        (lower === 'join' ? true : JOIN_MODIFIERS.has(lower) && followedByJoin);

      // `group`/`order` only break when followed by `by`.
      const needsBy = lower === 'group' || lower === 'order';
      const breaks =
        (BREAK_BEFORE.has(lower) && (!needsBy || tokens[i + 1]?.text.toLowerCase() === 'by')) ||
        startsJoin;

      if (breaks) {
        flush();
        line = text;
        continue;
      }

      if (lower === 'and' || lower === 'or') {
        flush();
        line = text;
        continue;
      }
    }

    line += !line || line.endsWith('(') ? text : ` ${text}`;
  }

  flush();
  return lines.join('\n');
}

/** Collapses a query onto one line, preserving strings and dropping comments. */
export function minifySql(sql: string): string {
  const tokens = tokenize(sql).filter((t) => t.kind !== 'comment' && t.kind !== 'whitespace');

  let out = '';
  for (let i = 0; i < tokens.length; i++) {
    const token = tokens[i];
    const previous = tokens[i - 1];

    let separator = ' ';
    if (!out) separator = '';
    else if (token.text === ',' || token.text === ';' || token.text === ')') separator = '';
    else if (token.text === '(') {
      separator =
        previous?.kind === 'word' && !KEYWORDS.has(previous.text.toLowerCase()) ? '' : ' ';
    } else if (previous?.text === '(') separator = '';

    out += separator + token.text;
  }

  return out;
}
