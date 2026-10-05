import { describe, expect, it } from "vitest";
import {
  contactsByRecency,
  overallWeeklyRate,
  weekdayHourHeatmap,
  weeklyBand,
  weeklyMeetingCounts,
} from "./analytics";

// Wed 7 Oct 2026, 10:00 in Melbourne (AEDT, UTC+11).
const now = new Date("2026-10-06T23:00:00Z");
// Daylight saving starts on Sun 4 Oct 2026: AEST (+10) before, AEDT (+11) after.
const melb = (iso: string) => new Date(`${iso}${iso < "2026-10-04T02" ? "+10:00" : "+11:00"}`);

describe("weeklyMeetingCounts", () => {
  it("counts complete Monday-Sunday weeks in Melbourne time and skips the current week", () => {
    const weeks = weeklyMeetingCounts(
      [
        { dateTime: melb("2026-09-21T09:00:00") }, // Mon
        { dateTime: melb("2026-09-27T23:30:00") }, // Sun night, same week
        { dateTime: melb("2026-09-28T00:15:00") }, // Mon after midnight -> next week
        { dateTime: melb("2026-10-06T12:00:00") }, // current week: excluded
        { dateTime: melb("2026-10-20T12:00:00") }, // future: excluded
      ],
      now,
    );
    expect(weeks).toEqual([
      { weekStart: "2026-09-21", count: 2 },
      { weekStart: "2026-09-28", count: 1 },
    ]);
  });

  it("caps the history and returns nothing without past meetings", () => {
    const old = [{ dateTime: melb("2025-01-06T09:00:00") }];
    expect(weeklyMeetingCounts(old, now, 4)).toHaveLength(4);
    expect(weeklyMeetingCounts([], now)).toEqual([]);
  });
});

describe("weeklyBand", () => {
  const weeks = [1, 0, 2, 1, 3, 0, 1, 2, 4, 1].map((count, i) => ({
    weekStart: `w${i}`,
    count,
  }));

  it("starts once the window is full and brackets the trailing mean", () => {
    const band = weeklyBand(weeks, 4, 500, 1);
    expect(band.slice(0, 3).every((p) => p.band === null)).toBe(true);
    const p = band[3].band!;
    expect(p.estimate).toBeCloseTo((1 + 0 + 2 + 1) / 4, 12);
    expect(p.lower).toBeLessThanOrEqual(p.estimate);
    expect(p.upper).toBeGreaterThanOrEqual(p.estimate);
    expect(p).toMatchObject({ seed: 1, resamples: 500, n: 4 });
  });

  it("is deterministic for a seed", () => {
    expect(weeklyBand(weeks, 4, 300, 9)).toEqual(weeklyBand(weeks, 4, 300, 9));
  });

  it("reports the overall weekly rate with its sample size", () => {
    const r = overallWeeklyRate(weeks, 1000, 3)!;
    expect(r.estimate).toBeCloseTo(1.5, 12);
    expect(r.n).toBe(10);
  });
});

describe("weekdayHourHeatmap", () => {
  it("bins by Melbourne weekday and hour", () => {
    const h = weekdayHourHeatmap([
      { dateTime: melb("2026-10-05T09:30:00") }, // Mon 9am
      { dateTime: melb("2026-10-05T09:45:00") }, // Mon 9am
      { dateTime: melb("2026-10-11T22:10:00") }, // Sun 10pm
    ]);
    expect(h.cells[0][9]).toBe(2);
    expect(h.cells[6][22]).toBe(1);
    expect(h.total).toBe(3);
    expect(h.max).toBe(2);
    expect(h.hours).toEqual([7, 22]);
  });
});

describe("contactsByRecency", () => {
  it("buckets by days since the last meeting, with never-met separately", () => {
    const d = (days: number) => new Date(now.getTime() - days * 864e5);
    const r = contactsByRecency(
      [
        { lastMeeting: d(3), nextMeeting: null },
        { lastMeeting: d(30), nextMeeting: d(-2) },
        { lastMeeting: d(45), nextMeeting: null },
        { lastMeeting: d(400), nextMeeting: null },
        { lastMeeting: null, nextMeeting: d(-5) },
      ],
      now,
    );
    expect(r.total).toBe(5);
    expect(r.withUpcoming).toBe(2);
    expect(Object.fromEntries(r.buckets.map((b) => [b.key, b.count]))).toEqual({
      "30": 2,
      "90": 1,
      "180": 0,
      "365": 0,
      older: 1,
      never: 1,
    });
    expect(r.buckets.reduce((s, b) => s + b.share, 0)).toBeCloseTo(1, 12);
  });
});
