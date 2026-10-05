import { zonedParts } from "./legacy/convert";
import { bootstrapCI, mean, type BootstrapResult } from "./stats";
import { APP_TIME_ZONE } from "./time";

/**
 * Light analytics behind /insights. Framework-free and deterministic: every
 * bootstrap uses a fixed, displayed seed. All calendar maths is done in
 * Melbourne time, like the rest of the app.
 */

const DAY_MS = 864e5;
const pad = (n: number) => String(n).padStart(2, "0");

/** Days since 1970-01-01 of an instant's Melbourne calendar date. */
function zonedDayNumber(date: Date, timeZone = APP_TIME_ZONE): number {
  const p = zonedParts(date, timeZone);
  return Math.round(Date.UTC(p.year, p.month - 1, p.day) / DAY_MS);
}

function dayNumberToKey(n: number): string {
  const d = new Date(n * DAY_MS);
  return `${d.getUTCFullYear()}-${pad(d.getUTCMonth() + 1)}-${pad(d.getUTCDate())}`;
}

/** 0 = Monday ... 6 = Sunday, for a day number. */
function weekdayOf(dayNumber: number): number {
  // 1970-01-01 was a Thursday (index 3 with Monday = 0).
  return (((dayNumber + 3) % 7) + 7) % 7;
}

function mondayOf(dayNumber: number): number {
  return dayNumber - weekdayOf(dayNumber);
}

// ------------------------------------------------------- meetings per week --

export interface WeekCount {
  /** Monday of the week, YYYY-MM-DD (Melbourne). */
  weekStart: string;
  count: number;
}

/**
 * Meetings per complete Monday-Sunday week. Only meetings that already
 * happened count; the current, unfinished week is excluded (it would bias the
 * last bar down). The series starts at the week of the earliest meeting, or
 * `maxWeeks` weeks ago, whichever is later, so weeks before the person used
 * the app are not counted as zeros.
 */
export function weeklyMeetingCounts(
  records: readonly { dateTime: Date }[],
  now: Date,
  maxWeeks = 26,
): WeekCount[] {
  const currentMonday = mondayOf(zonedDayNumber(now));
  const past = records.filter((r) => r.dateTime.getTime() <= now.getTime());
  if (past.length === 0) return [];
  const earliestMonday = Math.min(...past.map((r) => mondayOf(zonedDayNumber(r.dateTime))));
  const firstMonday = Math.max(earliestMonday, currentMonday - 7 * maxWeeks);
  const weeks = Math.max(0, (currentMonday - firstMonday) / 7);
  const counts = new Array<number>(weeks).fill(0);
  for (const r of past) {
    const i = (mondayOf(zonedDayNumber(r.dateTime)) - firstMonday) / 7;
    if (i >= 0 && i < weeks) counts[i]++;
  }
  return counts.map((count, i) => ({ weekStart: dayNumberToKey(firstMonday + 7 * i), count }));
}

export interface BandPoint {
  weekStart: string;
  count: number;
  /** Trailing-window mean and its bootstrap interval (null until the window is full). */
  band: BootstrapResult | null;
}

export const WEEKLY_WINDOW = 8;
export const WEEKLY_RESAMPLES = 2000;
export const WEEKLY_SEED = 4399;

/**
 * Trailing `window`-week mean of meetings per week with a 95% percentile
 * bootstrap interval, resampling the weeks in the window. Treats those weeks
 * as exchangeable (no trend, no autocorrelation) - stated on the page.
 */
export function weeklyBand(
  weeks: readonly WeekCount[],
  window = WEEKLY_WINDOW,
  resamples = WEEKLY_RESAMPLES,
  seed = WEEKLY_SEED,
): BandPoint[] {
  return weeks.map((w, i) => {
    if (i + 1 < window) return { ...w, band: null };
    const slice = weeks.slice(i + 1 - window, i + 1).map((x) => x.count);
    return { ...w, band: bootstrapCI(slice, mean, { resamples, seed }) };
  });
}

export function overallWeeklyRate(
  weeks: readonly WeekCount[],
  resamples = WEEKLY_RESAMPLES,
  seed = WEEKLY_SEED,
): BootstrapResult | null {
  return bootstrapCI(
    weeks.map((w) => w.count),
    mean,
    { resamples, seed },
  );
}

// --------------------------------------------------- weekday x hour heatmap --

export const WEEKDAYS = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"] as const;

export interface Heatmap {
  /** cells[weekday][hour] = meetings; weekday 0 = Monday. */
  cells: number[][];
  total: number;
  max: number;
  /** Inclusive hour range worth drawing (at least 7am-9pm). */
  hours: [number, number];
}

export function weekdayHourHeatmap(
  records: readonly { dateTime: Date }[],
  timeZone = APP_TIME_ZONE,
): Heatmap {
  const cells = Array.from({ length: 7 }, () => new Array<number>(24).fill(0));
  let lo = 7;
  let hi = 21;
  for (const r of records) {
    const p = zonedParts(r.dateTime, timeZone);
    const day = Math.round(Date.UTC(p.year, p.month - 1, p.day) / DAY_MS);
    cells[weekdayOf(day)][p.hour]++;
    lo = Math.min(lo, p.hour);
    hi = Math.max(hi, p.hour);
  }
  const max = Math.max(0, ...cells.flat());
  return { cells, total: records.length, max, hours: [lo, hi] };
}

// ------------------------------------------------------- contacts by recency --

export const RECENCY_BUCKETS = [
  { key: "30", label: "Within 30 days", maxDays: 30 },
  { key: "90", label: "31-90 days", maxDays: 90 },
  { key: "180", label: "91-180 days", maxDays: 180 },
  { key: "365", label: "181-365 days", maxDays: 365 },
  { key: "older", label: "Over a year", maxDays: Infinity },
] as const;

export interface RecencyBucket {
  key: string;
  label: string;
  count: number;
  share: number;
}

/**
 * Contacts grouped by days since the last meeting that already happened,
 * plus "never met". A census of the whole address book, not a sample, so it
 * is shown without confidence intervals.
 */
export function contactsByRecency(
  contacts: readonly { lastMeeting: Date | null; nextMeeting: Date | null }[],
  now: Date,
): { buckets: RecencyBucket[]; total: number; withUpcoming: number } {
  const total = contacts.length;
  const counts = new Map<string, number>();
  for (const c of contacts) {
    let key = "never";
    if (c.lastMeeting) {
      const days = Math.max(0, (now.getTime() - c.lastMeeting.getTime()) / DAY_MS);
      key = RECENCY_BUCKETS.find((b) => days <= b.maxDays)!.key;
    }
    counts.set(key, (counts.get(key) ?? 0) + 1);
  }
  const buckets = [
    ...RECENCY_BUCKETS.map((b) => ({ key: b.key, label: b.label })),
    { key: "never", label: "Never met" },
  ].map((b) => {
    const count = counts.get(b.key) ?? 0;
    return { ...b, count, share: total ? count / total : 0 };
  });
  return { buckets, total, withUpcoming: contacts.filter((c) => c.nextMeeting).length };
}
