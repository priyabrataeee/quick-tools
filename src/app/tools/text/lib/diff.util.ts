/**
 * Line and word diffing built on Myers' O(ND) algorithm.
 *
 * Myers is used rather than a full LCS table because its cost scales with the
 * *number of differences* rather than the size of the inputs: two nearly
 * identical 5,000-line files diff in milliseconds, where an LCS matrix would
 * allocate 25 million cells.
 */

export type DiffOp = 'equal' | 'insert' | 'delete';

export interface Edit {
  op: DiffOp;
  /** Index into the left sequence (for `equal` and `delete`). */
  aIndex: number;
  /** Index into the right sequence (for `equal` and `insert`). */
  bIndex: number;
}

/**
 * Ceiling on the edit distance Myers will explore. Beyond this the two texts
 * share so little that a diff is not meaningful, and the trace would grow large
 * enough to hurt. Callers fall back to a positional comparison.
 */
const MAX_EDIT_DISTANCE = 5000;

/**
 * Shortest edit script between two sequences, or `null` if the inputs differ by
 * more than `MAX_EDIT_DISTANCE` edits.
 */
export function diffSequences<T>(a: readonly T[], b: readonly T[]): Edit[] | null {
  // Trimming the common head and tail first is what makes the common case —
  // a small change inside a large file — cheap.
  let head = 0;
  while (head < a.length && head < b.length && a[head] === b[head]) head++;

  let tail = 0;
  while (
    tail < a.length - head &&
    tail < b.length - head &&
    a[a.length - 1 - tail] === b[b.length - 1 - tail]
  ) {
    tail++;
  }

  const midA = a.slice(head, a.length - tail);
  const midB = b.slice(head, b.length - tail);

  const middle = midA.length === 0 || midB.length === 0 ? trivialEdits(midA, midB, head) : myers(midA, midB, head);
  if (!middle) return null;

  const edits: Edit[] = [];
  for (let i = 0; i < head; i++) edits.push({ op: 'equal', aIndex: i, bIndex: i });
  edits.push(...middle);
  for (let i = 0; i < tail; i++) {
    edits.push({
      op: 'equal',
      aIndex: a.length - tail + i,
      bIndex: b.length - tail + i,
    });
  }
  return edits;
}

/** One side is empty, so every element is a pure insert or delete. */
function trivialEdits<T>(midA: readonly T[], midB: readonly T[], offset: number): Edit[] {
  const edits: Edit[] = [];
  for (let i = 0; i < midA.length; i++) {
    edits.push({ op: 'delete', aIndex: offset + i, bIndex: offset });
  }
  for (let i = 0; i < midB.length; i++) {
    edits.push({ op: 'insert', aIndex: offset + midA.length, bIndex: offset + i });
  }
  return edits;
}

function myers<T>(a: readonly T[], b: readonly T[], offset: number): Edit[] | null {
  const n = a.length;
  const m = b.length;
  const max = Math.min(n + m, MAX_EDIT_DISTANCE);
  const size = 2 * max + 1;

  const v = new Int32Array(size);
  const trace: Int32Array[] = [];

  for (let d = 0; d <= max; d++) {
    trace.push(v.slice());

    for (let k = -d; k <= d; k += 2) {
      let x: number;
      if (k === -d || (k !== d && v[k - 1 + max] < v[k + 1 + max])) {
        x = v[k + 1 + max];
      } else {
        x = v[k - 1 + max] + 1;
      }
      let y = x - k;

      // Follow the diagonal as far as the sequences agree.
      while (x < n && y < m && a[x] === b[y]) {
        x++;
        y++;
      }
      v[k + max] = x;

      if (x >= n && y >= m) return backtrack(trace, n, m, max, offset);
    }
  }

  return null;
}

function backtrack(
  trace: Int32Array[],
  n: number,
  m: number,
  max: number,
  offset: number,
): Edit[] {
  const edits: Edit[] = [];
  let x = n;
  let y = m;

  for (let d = trace.length - 1; d >= 0 && (x > 0 || y > 0); d--) {
    const v = trace[d];
    const k = x - y;

    let prevK: number;
    if (k === -d || (k !== d && v[k - 1 + max] < v[k + 1 + max])) prevK = k + 1;
    else prevK = k - 1;

    const prevX = v[prevK + max];
    const prevY = prevX - prevK;

    while (x > prevX && y > prevY) {
      edits.push({ op: 'equal', aIndex: offset + x - 1, bIndex: offset + y - 1 });
      x--;
      y--;
    }

    if (d > 0) {
      if (x === prevX) edits.push({ op: 'insert', aIndex: offset + x, bIndex: offset + y - 1 });
      else edits.push({ op: 'delete', aIndex: offset + x - 1, bIndex: offset + y });
      x = prevX;
      y = prevY;
    }
  }

  return edits.reverse();
}

// ---------------------------------------------------------------------------
// Line-level comparison
// ---------------------------------------------------------------------------

export interface CompareOptions {
  ignoreCase: boolean;
  /** Collapse runs of whitespace and trim the ends before comparing. */
  ignoreWhitespace: boolean;
  /** Drop blank lines from both sides entirely. */
  ignoreBlankLines: boolean;
}

export interface Segment {
  text: string;
  changed: boolean;
}

export type RowType = 'equal' | 'add' | 'remove' | 'modify';

export interface DiffRow {
  type: RowType;
  leftNumber: number | null;
  rightNumber: number | null;
  left: string | null;
  right: string | null;
  /** Word-level segments, present only on `modify` rows. */
  leftSegments: Segment[] | null;
  rightSegments: Segment[] | null;
}

export interface DiffResult {
  rows: DiffRow[];
  added: number;
  removed: number;
  modified: number;
  unchanged: number;
  /**
   * True when the texts were too dissimilar for the diff algorithm and a
   * positional line-by-line comparison was used instead.
   */
  approximate: boolean;
}

interface NumberedLine {
  text: string;
  number: number;
}

function toLines(text: string, ignoreBlankLines: boolean): NumberedLine[] {
  const lines = text.replace(/\r\n?/g, '\n').split('\n');
  const out: NumberedLine[] = [];
  lines.forEach((line, index) => {
    if (ignoreBlankLines && line.trim() === '') return;
    out.push({ text: line, number: index + 1 });
  });
  return out;
}

function normalise(line: string, options: CompareOptions): string {
  let value = line;
  if (options.ignoreWhitespace) value = value.trim().replace(/\s+/g, ' ');
  if (options.ignoreCase) value = value.toLowerCase();
  return value;
}

export function compareText(
  leftText: string,
  rightText: string,
  options: CompareOptions,
): DiffResult {
  const left = toLines(leftText, options.ignoreBlankLines);
  const right = toLines(rightText, options.ignoreBlankLines);

  const leftKeys = left.map((l) => normalise(l.text, options));
  const rightKeys = right.map((l) => normalise(l.text, options));

  const edits = diffSequences(leftKeys, rightKeys);
  const rows = edits
    ? buildRows(edits, left, right, options)
    : positionalRows(left, right, options);

  const result: DiffResult = {
    rows,
    added: 0,
    removed: 0,
    modified: 0,
    unchanged: 0,
    approximate: !edits,
  };

  for (const row of rows) {
    if (row.type === 'add') result.added++;
    else if (row.type === 'remove') result.removed++;
    else if (row.type === 'modify') result.modified++;
    else result.unchanged++;
  }

  return result;
}

/**
 * Turns the flat edit script into aligned rows, pairing a run of deletions with
 * the run of insertions that follows it so a changed line reads as one row
 * rather than a removal and an unrelated addition.
 */
function buildRows(
  edits: Edit[],
  left: NumberedLine[],
  right: NumberedLine[],
  options: CompareOptions,
): DiffRow[] {
  const rows: DiffRow[] = [];
  let pendingRemovals: NumberedLine[] = [];
  let pendingAdditions: NumberedLine[] = [];

  const flush = () => {
    const pairs = Math.min(pendingRemovals.length, pendingAdditions.length);

    for (let i = 0; i < pairs; i++) {
      const from = pendingRemovals[i];
      const to = pendingAdditions[i];
      const [leftSegments, rightSegments] = diffWords(from.text, to.text, options);
      rows.push({
        type: 'modify',
        leftNumber: from.number,
        rightNumber: to.number,
        left: from.text,
        right: to.text,
        leftSegments,
        rightSegments,
      });
    }

    for (let i = pairs; i < pendingRemovals.length; i++) {
      rows.push({
        type: 'remove',
        leftNumber: pendingRemovals[i].number,
        rightNumber: null,
        left: pendingRemovals[i].text,
        right: null,
        leftSegments: null,
        rightSegments: null,
      });
    }

    for (let i = pairs; i < pendingAdditions.length; i++) {
      rows.push({
        type: 'add',
        leftNumber: null,
        rightNumber: pendingAdditions[i].number,
        left: null,
        right: pendingAdditions[i].text,
        leftSegments: null,
        rightSegments: null,
      });
    }

    pendingRemovals = [];
    pendingAdditions = [];
  };

  for (const edit of edits) {
    if (edit.op === 'delete') {
      pendingRemovals.push(left[edit.aIndex]);
      continue;
    }
    if (edit.op === 'insert') {
      pendingAdditions.push(right[edit.bIndex]);
      continue;
    }

    flush();
    const line = left[edit.aIndex];
    rows.push({
      type: 'equal',
      leftNumber: line.number,
      rightNumber: right[edit.bIndex].number,
      left: line.text,
      right: right[edit.bIndex].text,
      leftSegments: null,
      rightSegments: null,
    });
  }

  flush();
  return rows;
}

/** Fallback when the texts exceed the edit-distance ceiling. */
function positionalRows(
  left: NumberedLine[],
  right: NumberedLine[],
  options: CompareOptions,
): DiffRow[] {
  const rows: DiffRow[] = [];
  const length = Math.max(left.length, right.length);

  for (let i = 0; i < length; i++) {
    const from = left[i];
    const to = right[i];

    if (from && to) {
      const same = normalise(from.text, options) === normalise(to.text, options);
      const [leftSegments, rightSegments] = same
        ? [null, null]
        : diffWords(from.text, to.text, options);
      rows.push({
        type: same ? 'equal' : 'modify',
        leftNumber: from.number,
        rightNumber: to.number,
        left: from.text,
        right: to.text,
        leftSegments,
        rightSegments,
      });
    } else if (from) {
      rows.push({
        type: 'remove',
        leftNumber: from.number,
        rightNumber: null,
        left: from.text,
        right: null,
        leftSegments: null,
        rightSegments: null,
      });
    } else {
      rows.push({
        type: 'add',
        leftNumber: null,
        rightNumber: to.number,
        left: null,
        right: to.text,
        leftSegments: null,
        rightSegments: null,
      });
    }
  }

  return rows;
}

// ---------------------------------------------------------------------------
// Word-level comparison
// ---------------------------------------------------------------------------

/** Splits into words, punctuation and whitespace runs, losing nothing. */
function tokenise(text: string): string[] {
  return text.match(/\s+|[\p{L}\p{N}_]+|[^\s\p{L}\p{N}_]/gu) ?? [];
}

/**
 * Word-level segments for a pair of changed lines. Returns `[null, null]` when
 * the lines are too different for an inline highlight to be readable — in that
 * case the whole line is simply shown as changed.
 */
function diffWords(
  leftText: string,
  rightText: string,
  options: CompareOptions,
): [Segment[] | null, Segment[] | null] {
  const leftTokens = tokenise(leftText);
  const rightTokens = tokenise(rightText);

  const key = (token: string) => (options.ignoreCase ? token.toLowerCase() : token);
  const edits = diffSequences(leftTokens.map(key), rightTokens.map(key));
  if (!edits) return [null, null];

  const leftSegments: Segment[] = [];
  const rightSegments: Segment[] = [];

  for (const edit of edits) {
    if (edit.op === 'equal') {
      push(leftSegments, leftTokens[edit.aIndex], false);
      push(rightSegments, rightTokens[edit.bIndex], false);
    } else if (edit.op === 'delete') {
      push(leftSegments, leftTokens[edit.aIndex], true);
    } else {
      push(rightSegments, rightTokens[edit.bIndex], true);
    }
  }

  // If almost everything changed, per-word highlighting is just noise.
  const changedShare = (segments: Segment[]) => {
    const total = segments.reduce((sum, s) => sum + s.text.length, 0);
    if (!total) return 0;
    return segments.filter((s) => s.changed).reduce((sum, s) => sum + s.text.length, 0) / total;
  };
  if (changedShare(leftSegments) > 0.8 && changedShare(rightSegments) > 0.8) {
    return [null, null];
  }

  return [leftSegments, rightSegments];
}

/** Appends a token, merging into the previous segment when the state matches. */
function push(segments: Segment[], token: string, changed: boolean): void {
  const last = segments[segments.length - 1];
  if (last && last.changed === changed) last.text += token;
  else segments.push({ text: token, changed });
}

// ---------------------------------------------------------------------------
// Output
// ---------------------------------------------------------------------------

/** Renders the comparison as a plain unified diff, suitable for copy or download. */
export function toUnifiedDiff(rows: DiffRow[]): string {
  const lines: string[] = ['--- Original', '+++ Changed'];

  for (const row of rows) {
    switch (row.type) {
      case 'equal':
        lines.push(` ${row.left ?? ''}`);
        break;
      case 'add':
        lines.push(`+${row.right ?? ''}`);
        break;
      case 'remove':
        lines.push(`-${row.left ?? ''}`);
        break;
      case 'modify':
        lines.push(`-${row.left ?? ''}`);
        lines.push(`+${row.right ?? ''}`);
        break;
    }
  }

  return lines.join('\n');
}
