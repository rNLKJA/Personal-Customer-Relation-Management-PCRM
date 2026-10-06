import { zonedParts } from "./legacy/convert";
import { APP_TIME_ZONE, dayKey } from "./time";

/** Small, framework-free calculations behind the home dashboard. */

export function greeting(now: Date, timeZone = APP_TIME_ZONE): string {
  const h = zonedParts(now, timeZone).hour;
  if (h < 5) return "Good evening";
  if (h < 12) return "Good morning";
  if (h < 18) return "Good afternoon";
  return "Good evening";
}

export function splitByNow<T extends { dateTime: Date }>(records: readonly T[], now: Date) {
  const upcoming = records
    .filter((r) => r.dateTime.getTime() > now.getTime())
    .sort((a, b) => a.dateTime.getTime() - b.dateTime.getTime());
  const past = records
    .filter((r) => r.dateTime.getTime() <= now.getTime())
    .sort((a, b) => b.dateTime.getTime() - a.dateTime.getTime());
  return { upcoming, past };
}

/** Meetings whose Melbourne calendar month equals `now`'s. */
export function countThisMonth(records: readonly { dateTime: Date }[], now: Date): number {
  const month = dayKey(now).slice(0, 7);
  return records.filter((r) => dayKey(r.dateTime).slice(0, 7) === month).length;
}

/**
 * "Reconnect" suggestions: contacts with no upcoming meeting whose last
 * meeting is at least `days` old (or who were added that long ago and never
 * met), longest-neglected first.
 */
export function reconnectCandidates<
  T extends { lastMeeting: Date | null; nextMeeting: Date | null; addDate: Date },
>(contacts: readonly T[], now: Date, days = 45): (T & { since: Date })[] {
  const cutoff = now.getTime() - days * 864e5;
  return contacts
    .filter((c) => !c.nextMeeting)
    .map((c) => ({ ...c, since: c.lastMeeting ?? c.addDate }))
    .filter((c) => c.since.getTime() <= cutoff)
    .sort((a, b) => a.since.getTime() - b.since.getTime());
}
