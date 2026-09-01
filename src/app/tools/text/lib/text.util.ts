import { graphemes } from '../../../core/utils';

export interface TextStats {
  words: number;
  characters: number;
  charactersNoSpaces: number;
  sentences: number;
  paragraphs: number;
  lines: number;
  uniqueWords: number;
  longestWord: string;
  readingMinutes: number;
  speakingMinutes: number;
}

const WORD_RE = /[\p{L}\p{N}][\p{L}\p{N}'’-]*/gu;

export function analyseText(text: string, wpm = 225, spm = 150): TextStats {
  const trimmed = text.trim();
  const words = trimmed ? (trimmed.match(WORD_RE) ?? []) : [];
  const unique = new Set(words.map((w) => w.toLowerCase()));

  const sentences = trimmed ? (trimmed.match(/[^.!?…]+[.!?…]+(\s|$)|[^.!?…]+$/g) ?? []).length : 0;
  const paragraphs = trimmed ? trimmed.split(/\n\s*\n/).filter((p) => p.trim()).length : 0;

  return {
    words: words.length,
    characters: text.length,
    charactersNoSpaces: text.replace(/\s/g, '').length,
    sentences,
    paragraphs,
    lines: text ? text.split('\n').length : 0,
    uniqueWords: unique.size,
    longestWord: words.reduce((longest, w) => (w.length > longest.length ? w : longest), ''),
    readingMinutes: words.length / wpm,
    speakingMinutes: words.length / spm,
  };
}

/** Renders a duration in minutes as e.g. `4 min 12 sec`. */
export function formatDuration(minutes: number): string {
  if (!Number.isFinite(minutes) || minutes <= 0) return '0 sec';
  const totalSeconds = Math.round(minutes * 60);
  const mins = Math.floor(totalSeconds / 60);
  const secs = totalSeconds % 60;
  if (mins === 0) return `${secs} sec`;
  return secs ? `${mins} min ${secs} sec` : `${mins} min`;
}

/** Splits a string into words, understanding camelCase and every separator. */
export function splitWords(text: string): string[] {
  return text
    .replace(/([a-z0-9])([A-Z])/g, '$1 $2')
    .replace(/([A-Z]+)([A-Z][a-z])/g, '$1 $2')
    .split(/[\s_\-./\\]+/)
    .filter(Boolean);
}

const TITLE_CASE_MINOR = new Set([
  'a', 'an', 'and', 'as', 'at', 'but', 'by', 'for', 'in', 'nor', 'of', 'on', 'or', 'per', 'the',
  'to', 'up', 'via', 'vs',
]);

export const CASE_TRANSFORMS: { id: string; label: string; example: string; apply: (t: string) => string }[] = [
  { id: 'upper', label: 'UPPERCASE', example: 'HELLO WORLD', apply: (t) => t.toUpperCase() },
  { id: 'lower', label: 'lowercase', example: 'hello world', apply: (t) => t.toLowerCase() },
  {
    id: 'title',
    label: 'Title Case',
    example: 'Hello World',
    apply: (t) =>
      t.replace(/\S+/g, (word, offset: number, whole: string) => {
        const lower = word.toLowerCase();
        const isEdge = offset === 0 || offset + word.length >= whole.trimEnd().length;
        if (!isEdge && TITLE_CASE_MINOR.has(lower)) return lower;
        return lower.charAt(0).toUpperCase() + lower.slice(1);
      }),
  },
  {
    id: 'sentence',
    label: 'Sentence case',
    example: 'Hello world',
    apply: (t) =>
      t
        .toLowerCase()
        .replace(/(^\s*\w|[.!?]\s+\w)/g, (match) => match.toUpperCase()),
  },
  {
    id: 'camel',
    label: 'camelCase',
    example: 'helloWorld',
    apply: (t) =>
      splitWords(t)
        .map((w, i) =>
          i === 0 ? w.toLowerCase() : w.charAt(0).toUpperCase() + w.slice(1).toLowerCase(),
        )
        .join(''),
  },
  {
    id: 'pascal',
    label: 'PascalCase',
    example: 'HelloWorld',
    apply: (t) =>
      splitWords(t)
        .map((w) => w.charAt(0).toUpperCase() + w.slice(1).toLowerCase())
        .join(''),
  },
  {
    id: 'snake',
    label: 'snake_case',
    example: 'hello_world',
    apply: (t) => splitWords(t).map((w) => w.toLowerCase()).join('_'),
  },
  {
    id: 'constant',
    label: 'CONSTANT_CASE',
    example: 'HELLO_WORLD',
    apply: (t) => splitWords(t).map((w) => w.toUpperCase()).join('_'),
  },
  {
    id: 'kebab',
    label: 'kebab-case',
    example: 'hello-world',
    apply: (t) => splitWords(t).map((w) => w.toLowerCase()).join('-'),
  },
  {
    id: 'alternating',
    label: 'aLtErNaTiNg',
    example: 'hElLo WoRlD',
    apply: (t) =>
      Array.from(t)
        .map((c, i) => (i % 2 ? c.toUpperCase() : c.toLowerCase()))
        .join(''),
  },
];

const STOP_WORDS = new Set([
  'a', 'an', 'and', 'are', 'as', 'at', 'be', 'but', 'by', 'for', 'if', 'in', 'into', 'is', 'it',
  'no', 'not', 'of', 'on', 'or', 'such', 'that', 'the', 'their', 'then', 'there', 'these', 'they',
  'this', 'to', 'was', 'will', 'with',
]);

export interface SlugOptions {
  separator: string;
  lowercase: boolean;
  removeStopWords: boolean;
  maxLength: number;
}

export function slugify(text: string, options: SlugOptions): string {
  // NFD splits accented characters into base + combining mark so the marks can
  // be stripped, turning "é" into "e".
  let slug = text
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .replace(/[^\p{L}\p{N}]+/gu, ' ')
    .trim();

  if (options.lowercase) slug = slug.toLowerCase();

  let words = slug.split(/\s+/).filter(Boolean);
  if (options.removeStopWords) {
    const kept = words.filter((w) => !STOP_WORDS.has(w.toLowerCase()));
    // Never return an empty slug just because every word was a stop word.
    if (kept.length) words = kept;
  }

  let result = words.join(options.separator);
  if (options.maxLength > 0 && result.length > options.maxLength) {
    result = result.slice(0, options.maxLength);
    const lastSeparator = result.lastIndexOf(options.separator);
    if (lastSeparator > 0) result = result.slice(0, lastSeparator);
  }
  return result;
}

const LOREM_WORDS = `lorem ipsum dolor sit amet consectetur adipiscing elit sed do eiusmod tempor
incididunt ut labore et dolore magna aliqua enim ad minim veniam quis nostrud exercitation ullamco
laboris nisi aliquip ex ea commodo consequat duis aute irure in reprehenderit voluptate velit esse
cillum eu fugiat nulla pariatur excepteur sint occaecat cupidatat non proident sunt culpa qui
officia deserunt mollit anim id est laborum curabitur pretium tincidunt lacus nulla gravida orci a
odio nullam varius turpis et commodo pharetra est eros suscipit magna imperdiet sagittis montes
nascetur ridiculus mus`
  .split(/\s+/)
  .filter(Boolean);

const CLASSIC_OPENING = 'Lorem ipsum dolor sit amet, consectetur adipiscing elit';

function randomWord(): string {
  return LOREM_WORDS[Math.floor(Math.random() * LOREM_WORDS.length)];
}

function makeSentence(minWords = 6, maxWords = 18): string {
  const count = minWords + Math.floor(Math.random() * (maxWords - minWords + 1));
  const words: string[] = [];
  for (let i = 0; i < count; i++) {
    words.push(randomWord());
    // Occasional commas keep the rhythm from feeling machine-generated.
    if (i > 2 && i < count - 2 && Math.random() < 0.12) words[words.length - 1] += ',';
  }
  const sentence = words.join(' ');
  return sentence.charAt(0).toUpperCase() + sentence.slice(1) + '.';
}

export function makeParagraph(sentenceCount = 4, startClassic = false): string {
  const sentences: string[] = [];
  if (startClassic) sentences.push(`${CLASSIC_OPENING}.`);
  while (sentences.length < sentenceCount) sentences.push(makeSentence());
  return sentences.join(' ');
}

export function makeWords(count: number, startClassic = false): string {
  const words: string[] = startClassic ? CLASSIC_OPENING.toLowerCase().replace(/,/g, '').split(' ') : [];
  while (words.length < count) words.push(randomWord());
  return words.slice(0, count).join(' ');
}

export function makeSentences(count: number, startClassic = false): string {
  const sentences: string[] = [];
  if (startClassic) sentences.push(`${CLASSIC_OPENING}.`);
  while (sentences.length < count) sentences.push(makeSentence());
  return sentences.slice(0, count).join(' ');
}

/** Reverses a string without splitting emoji or combining characters. */
export function reverseGraphemes(text: string): string {
  return graphemes(text).reverse().join('');
}
