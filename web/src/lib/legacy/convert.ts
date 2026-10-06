/**
 * Port of the `convert(str)` helper that the 2021 front-end duplicated in
 * `src/API/record/Record.js`, `src/API/contact/Contact.js` and
 * `src/API/map/google_map/map_acmp.js`.
 *
 * It formats a date as `YYYY-MM-DD hh:mm am|pm` (12-hour clock, hours always
 * two digits). The original used the browser's local time zone via
 * `Date#getHours()` etc. The port keeps that behaviour when `timeZone` is
 * omitted, and can also format in an explicit IANA zone (the revived app always
 * passes `Australia/Melbourne` so server- and client-rendered output agree).
 */
export function convert(input: string | number | Date, timeZone?: string): string {
  const date = input instanceof Date ? input : new Date(input);
  const parts = timeZone ? zonedParts(date, timeZone) : localParts(date);

  const month = ("0" + parts.month).slice(-2);
  const day = ("0" + parts.day).slice(-2);

  let hours = parts.hour;
  const minutes = ("0" + parts.minute).slice(-2);
  const ampm = hours >= 12 ? "pm" : "am";

  hours = hours % 12;
  hours = hours ? hours : 12; // the hour '0' should be '12'

  let strTime: string;
  if (hours > 9) {
    strTime = " " + hours + ":" + minutes + " " + ampm;
  } else {
    strTime = " 0" + hours + ":" + minutes + " " + ampm;
  }

  return [parts.year, month, day].join("-") + strTime;
}

/** The `YYYY-MM-DD` day key the original map filter compared lexically. */
export function convertDay(input: string | number | Date, timeZone?: string): string {
  return convert(input, timeZone).split(" ")[0];
}

interface Parts {
  year: number;
  month: number; // 1-12
  day: number;
  hour: number; // 0-23
  minute: number;
}

function localParts(date: Date): Parts {
  return {
    year: date.getFullYear(),
    month: date.getMonth() + 1,
    day: date.getDate(),
    hour: date.getHours(),
    minute: date.getMinutes(),
  };
}

const formatterCache = new Map<string, Intl.DateTimeFormat>();

function formatterFor(timeZone: string): Intl.DateTimeFormat {
  let f = formatterCache.get(timeZone);
  if (!f) {
    f = new Intl.DateTimeFormat("en-AU", {
      timeZone,
      year: "numeric",
      month: "numeric",
      day: "numeric",
      hour: "numeric",
      minute: "numeric",
      hourCycle: "h23",
    });
    formatterCache.set(timeZone, f);
  }
  return f;
}

export function zonedParts(date: Date, timeZone: string): Parts {
  const out: Record<string, number> = {};
  for (const p of formatterFor(timeZone).formatToParts(date)) {
    if (p.type !== "literal") out[p.type] = Number(p.value);
  }
  return {
    year: out.year,
    month: out.month,
    day: out.day,
    hour: out.hour === 24 ? 0 : out.hour,
    minute: out.minute,
  };
}
