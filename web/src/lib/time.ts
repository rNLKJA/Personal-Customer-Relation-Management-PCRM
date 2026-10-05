import { zonedParts } from "./legacy/convert";

/** All dates are displayed in Melbourne time so server and client agree. */
export const APP_TIME_ZONE = "Australia/Melbourne";

const pad = (n: number) => String(n).padStart(2, "0");

/** UTC instant -> `YYYY-MM-DDTHH:mm` wall time in `timeZone` (for datetime-local inputs). */
export function toZonedInputValue(date: Date, timeZone = APP_TIME_ZONE): string {
  const p = zonedParts(date, timeZone);
  return `${p.year}-${pad(p.month)}-${pad(p.day)}T${pad(p.hour)}:${pad(p.minute)}`;
}

/** `YYYY-MM-DD` day key of an instant in `timeZone`. */
export function dayKey(date: Date | string | number, timeZone = APP_TIME_ZONE): string {
  const p = zonedParts(new Date(date), timeZone);
  return `${p.year}-${pad(p.month)}-${pad(p.day)}`;
}

/** Offset (ms) of `timeZone` from UTC at the given instant. */
function offsetMs(date: Date, timeZone: string): number {
  const p = zonedParts(date, timeZone);
  const asUtc = Date.UTC(p.year, p.month - 1, p.day, p.hour, p.minute);
  const truncated = Math.floor(date.getTime() / 60000) * 60000;
  return asUtc - truncated;
}

/**
 * `YYYY-MM-DDTHH:mm` wall time in `timeZone` -> UTC instant. Handles DST by
 * re-evaluating the offset at the first guess (good enough for minutes).
 */
export function fromZonedInputValue(value: string, timeZone = APP_TIME_ZONE): Date | null {
  const m = /^(\d{4})-(\d{2})-(\d{2})(?:T(\d{2}):(\d{2}))?$/.exec(value);
  if (!m) return null;
  const [, y, mo, d, h = "0", mi = "0"] = m;
  const naive = Date.UTC(+y, +mo - 1, +d, +h, +mi);
  let guess = naive - offsetMs(new Date(naive), timeZone);
  guess = naive - offsetMs(new Date(guess), timeZone);
  const result = new Date(guess);
  return Number.isNaN(result.getTime()) ? null : result;
}

const dateFmt = new Intl.DateTimeFormat("en-AU", {
  timeZone: APP_TIME_ZONE,
  weekday: "short",
  day: "numeric",
  month: "short",
  year: "numeric",
});
const timeFmt = new Intl.DateTimeFormat("en-AU", {
  timeZone: APP_TIME_ZONE,
  hour: "numeric",
  minute: "2-digit",
  hour12: true,
});
const shortDateFmt = new Intl.DateTimeFormat("en-AU", {
  timeZone: APP_TIME_ZONE,
  day: "numeric",
  month: "short",
});
const monthFmt = new Intl.DateTimeFormat("en-AU", {
  timeZone: APP_TIME_ZONE,
  month: "long",
  year: "numeric",
});

export const formatDate = (d: Date | string | number) => dateFmt.format(new Date(d));
export const formatTime = (d: Date | string | number) => timeFmt.format(new Date(d)).replace(/\s?([ap])\.?m\.?/i, " $1m");
export const formatShortDate = (d: Date | string | number) => shortDateFmt.format(new Date(d));
export const formatMonth = (d: Date | string | number) => monthFmt.format(new Date(d));
export const formatDateTime = (d: Date | string | number) => `${formatDate(d)} · ${formatTime(d)}`;

/** "3 days ago", "in 2 hours" relative to `now`. */
export function formatRelative(date: Date | string | number, now: Date = new Date()): string {
  const diff = new Date(date).getTime() - now.getTime();
  const abs = Math.abs(diff);
  const rtf = new Intl.RelativeTimeFormat("en-AU", { numeric: "auto" });
  const units: [Intl.RelativeTimeFormatUnit, number][] = [
    ["year", 365 * 864e5],
    ["month", 30 * 864e5],
    ["week", 7 * 864e5],
    ["day", 864e5],
    ["hour", 36e5],
    ["minute", 6e4],
  ];
  for (const [unit, ms] of units) {
    if (abs >= ms) return rtf.format(Math.round(diff / ms), unit);
  }
  return "just now";
}

/**
 * Request time for Server Components. They render once per request, so
 * reading the clock is intentional (the React purity lint targets client
 * re-renders).
 */
export function requestNow(): number {
  return Date.now();
}
