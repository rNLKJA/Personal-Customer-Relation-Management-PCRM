/**
 * Month-grid maths for the calendar view (the original shipped an unused
 * `react-calendar`; the revival shows meetings on it). Pure functions on
 * `YYYY-MM-DD` day keys so they are time-zone agnostic.
 */

export interface MonthRef {
  year: number;
  month: number; // 1-12
}

export interface DayCell {
  key: string; // YYYY-MM-DD
  day: number;
  inMonth: boolean;
  weekday: number; // 0 = Monday ... 6 = Sunday
}

const pad = (n: number) => String(n).padStart(2, "0");

export function monthKey(m: MonthRef): string {
  return `${m.year}-${pad(m.month)}`;
}

export function parseMonth(value: string | undefined | null, fallback: MonthRef): MonthRef {
  const match = /^(\d{4})-(\d{2})$/.exec(value ?? "");
  if (!match) return fallback;
  const year = Number(match[1]);
  const month = Number(match[2]);
  if (month < 1 || month > 12 || year < 1970 || year > 2200) return fallback;
  return { year, month };
}

export function shiftMonth(m: MonthRef, delta: number): MonthRef {
  const index = m.year * 12 + (m.month - 1) + delta;
  return { year: Math.floor(index / 12), month: (index % 12) + 1 };
}

export function daysInMonth(m: MonthRef): number {
  return new Date(Date.UTC(m.year, m.month, 0)).getUTCDate();
}

/** Weeks (Monday first) covering the whole month, padded with adjacent days. */
export function monthGrid(m: MonthRef): DayCell[][] {
  const first = new Date(Date.UTC(m.year, m.month - 1, 1));
  const lead = (first.getUTCDay() + 6) % 7; // days before the 1st (Monday-based)
  const total = Math.ceil((lead + daysInMonth(m)) / 7) * 7;
  const weeks: DayCell[][] = [];
  for (let i = 0; i < total; i++) {
    const d = new Date(Date.UTC(m.year, m.month - 1, 1 - lead + i));
    const cell: DayCell = {
      key: `${d.getUTCFullYear()}-${pad(d.getUTCMonth() + 1)}-${pad(d.getUTCDate())}`,
      day: d.getUTCDate(),
      inMonth: d.getUTCMonth() === m.month - 1,
      weekday: i % 7,
    };
    if (i % 7 === 0) weeks.push([]);
    weeks[weeks.length - 1].push(cell);
  }
  return weeks;
}

export function groupByDay<T>(items: readonly T[], keyOf: (item: T) => string): Map<string, T[]> {
  const map = new Map<string, T[]>();
  for (const item of items) {
    const k = keyOf(item);
    const list = map.get(k);
    if (list) list.push(item);
    else map.set(k, [item]);
  }
  return map;
}
