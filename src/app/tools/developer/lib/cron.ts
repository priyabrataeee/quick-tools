/**
 * Standard five-field Unix crontab support: validation, a plain-English
 * description, and the next few run times computed in local time.
 */

export interface CronField {
  name: string;
  min: number;
  max: number;
  names?: string[];
}

export const CRON_FIELDS: CronField[] = [
  { name: 'minute', min: 0, max: 59 },
  { name: 'hour', min: 0, max: 23 },
  { name: 'day of month', min: 1, max: 31 },
  {
    name: 'month',
    min: 1,
    max: 12,
    names: ['jan', 'feb', 'mar', 'apr', 'may', 'jun', 'jul', 'aug', 'sep', 'oct', 'nov', 'dec'],
  },
  { name: 'day of week', min: 0, max: 6, names: ['sun', 'mon', 'tue', 'wed', 'thu', 'fri', 'sat'] },
];

const MONTH_LABELS = [
  'January', 'February', 'March', 'April', 'May', 'June',
  'July', 'August', 'September', 'October', 'November', 'December',
];
const DAY_LABELS = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];

export class CronError extends Error {}

/** Expands one crontab field into the set of values it matches. */
export function expandField(expression: string, field: CronField): number[] {
  const values = new Set<number>();

  for (const part of expression.split(',')) {
    const chunk = part.trim();
    if (!chunk) throw new CronError(`Empty value in the ${field.name} field.`);

    const [rangePart, stepPart] = chunk.split('/');
    const step = stepPart === undefined ? 1 : Number(stepPart);
    if (!Number.isInteger(step) || step < 1) {
      throw new CronError(`"${stepPart}" is not a valid step in the ${field.name} field.`);
    }

    let from: number;
    let to: number;

    if (rangePart === '*') {
      from = field.min;
      to = field.max;
    } else if (rangePart.includes('-')) {
      const [a, b] = rangePart.split('-');
      from = toNumber(a, field);
      to = toNumber(b, field);
      if (from > to) throw new CronError(`Range "${rangePart}" is reversed in the ${field.name} field.`);
    } else {
      from = toNumber(rangePart, field);
      to = stepPart === undefined ? from : field.max;
    }

    for (let v = from; v <= to; v += step) values.add(v);
  }

  const list = [...values].sort((a, b) => a - b);
  if (!list.length) throw new CronError(`The ${field.name} field matches nothing.`);
  return list;
}

function toNumber(token: string, field: CronField): number {
  const trimmed = token.trim().toLowerCase();
  if (field.names) {
    const index = field.names.indexOf(trimmed.slice(0, 3));
    if (index !== -1) return index + field.min;
  }
  const value = Number(trimmed);
  if (!Number.isInteger(value) || value < field.min || value > field.max) {
    // Sunday is commonly written as 7 as well as 0.
    if (field.name === 'day of week' && value === 7) return 0;
    throw new CronError(
      `"${token}" is out of range for the ${field.name} field (${field.min}–${field.max}).`,
    );
  }
  return value;
}

export function parseCron(expression: string): number[][] {
  const parts = expression.trim().split(/\s+/);
  if (parts.length !== 5) {
    throw new CronError(
      `A cron expression has exactly 5 fields; this one has ${parts.length === 1 && !parts[0] ? 0 : parts.length}.`,
    );
  }
  return parts.map((part, index) => expandField(part, CRON_FIELDS[index]));
}

/** Turns an expression into a sentence such as "At 09:30 on Monday". */
export function describeCron(expression: string): string {
  const parts = expression.trim().split(/\s+/);
  if (parts.length !== 5) return '';
  const [minute, hour, dayOfMonth, month, dayOfWeek] = parts;

  const timePhrase = describeTime(minute, hour);
  const dayPhrase = describeDays(dayOfMonth, dayOfWeek);
  const monthPhrase = month === '*' ? '' : ` in ${listValues(month, MONTH_LABELS, 1)}`;

  return `${timePhrase}${dayPhrase}${monthPhrase}.`.replace(/\s+/g, ' ');
}

function describeTime(minute: string, hour: string): string {
  if (minute === '*' && hour === '*') return 'Every minute';
  if (hour === '*') {
    if (minute.startsWith('*/')) return `Every ${minute.slice(2)} minutes`;
    return `At minute ${minute} of every hour`;
  }
  if (minute === '*') return `Every minute during hour ${hour}`;

  if (/^\d+$/.test(minute) && /^\d+$/.test(hour)) {
    return `At ${hour.padStart(2, '0')}:${minute.padStart(2, '0')}`;
  }
  if (minute.startsWith('*/')) return `Every ${minute.slice(2)} minutes during hour ${hour}`;
  return `At minute ${minute} past hour ${hour}`;
}

function describeDays(dayOfMonth: string, dayOfWeek: string): string {
  const everyDate = dayOfMonth === '*';
  const everyWeekday = dayOfWeek === '*';

  if (everyDate && everyWeekday) return ' every day';
  if (everyDate) return ` on ${listValues(dayOfWeek, DAY_LABELS, 0)}`;
  if (everyWeekday) return ` on day ${dayOfMonth} of the month`;
  return ` on day ${dayOfMonth} of the month and on ${listValues(dayOfWeek, DAY_LABELS, 0)}`;
}

function listValues(expression: string, labels: string[], offset: number): string {
  if (expression.startsWith('*/')) return `every ${expression.slice(2)}`;
  const items = expression
    .split(',')
    .flatMap((part) => {
      if (part.includes('-')) {
        const [a, b] = part.split('-').map(Number);
        return Number.isFinite(a) && Number.isFinite(b)
          ? Array.from({ length: b - a + 1 }, (_, i) => a + i)
          : [];
      }
      const n = Number(part);
      return Number.isFinite(n) ? [n] : [];
    })
    .map((n) => labels[n - offset] ?? String(n));

  if (items.length <= 1) return items[0] ?? expression;
  return `${items.slice(0, -1).join(', ')} and ${items[items.length - 1]}`;
}

/**
 * Next run times, found by stepping minute by minute from now.
 *
 * The search is capped at four years of minutes, which is enough to cover
 * "29 February" while still terminating on an expression that can never fire.
 */
export function nextRuns(expression: string, count = 5, from = new Date()): Date[] {
  const [minutes, hours, daysOfMonth, months, daysOfWeek] = parseCron(expression);
  const runs: Date[] = [];

  const cursor = new Date(from.getTime());
  cursor.setSeconds(0, 0);
  cursor.setMinutes(cursor.getMinutes() + 1);

  const limit = 60 * 24 * 366 * 4;
  const restrictedDom = daysOfMonth.length !== 31;
  const restrictedDow = daysOfWeek.length !== 7;

  for (let i = 0; i < limit && runs.length < count; i++) {
    const matchesDom = daysOfMonth.includes(cursor.getDate());
    const matchesDow = daysOfWeek.includes(cursor.getDay());

    // Cron ORs the two day fields when both are restricted.
    const dayMatches =
      restrictedDom && restrictedDow ? matchesDom || matchesDow : matchesDom && matchesDow;

    if (
      minutes.includes(cursor.getMinutes()) &&
      hours.includes(cursor.getHours()) &&
      months.includes(cursor.getMonth() + 1) &&
      dayMatches
    ) {
      runs.push(new Date(cursor.getTime()));
    }

    cursor.setMinutes(cursor.getMinutes() + 1);
  }

  return runs;
}

export const CRON_PRESETS = [
  { label: 'Every minute', expression: '* * * * *' },
  { label: 'Every 5 minutes', expression: '*/5 * * * *' },
  { label: 'Every hour', expression: '0 * * * *' },
  { label: 'Every day at midnight', expression: '0 0 * * *' },
  { label: 'Every weekday at 09:00', expression: '0 9 * * 1-5' },
  { label: 'Every Monday at 08:30', expression: '30 8 * * 1' },
  { label: 'First of the month', expression: '0 0 1 * *' },
  { label: 'Every quarter', expression: '0 0 1 1,4,7,10 *' },
];
