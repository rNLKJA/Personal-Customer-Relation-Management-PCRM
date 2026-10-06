import { describe, expect, it } from "vitest";
import { dayKey, formatRelative, fromZonedInputValue, toZonedInputValue } from "./time";
import { countThisMonth, greeting, reconnectCandidates, splitByNow } from "./insights";

describe("Melbourne time helpers", () => {
  it("round-trips datetime-local values across DST", () => {
    for (const v of [
      "2026-01-15T09:30",
      "2026-07-15T18:45",
      "2026-10-04T03:30",
      "2026-04-05T02:30",
    ]) {
      const d = fromZonedInputValue(v)!;
      expect(toZonedInputValue(d)).toBe(v);
    }
    expect(fromZonedInputValue("2026-01-15T09:30")!.toISOString()).toBe("2026-01-14T22:30:00.000Z"); // AEDT +11
    expect(fromZonedInputValue("2026-07-15T09:30")!.toISOString()).toBe("2026-07-14T23:30:00.000Z"); // AEST +10
    expect(fromZonedInputValue("garbage")).toBeNull();
  });
  it("computes the Melbourne day", () => {
    expect(dayKey("2021-11-05T18:19:00.000Z")).toBe("2021-11-06");
  });
  it("formats relative times", () => {
    const now = new Date("2026-10-05T00:00:00Z");
    expect(formatRelative(new Date("2026-10-02T00:00:00Z"), now)).toBe("3 days ago");
    expect(formatRelative(new Date("2026-10-05T02:00:00Z"), now)).toBe("in 2 hours");
  });
});

describe("dashboard insights", () => {
  const now = new Date("2026-10-05T01:00:00Z"); // 12:00 Melbourne
  it("greets by Melbourne hour", () => {
    expect(greeting(now)).toBe("Good afternoon");
    expect(greeting(new Date("2026-10-04T20:00:00Z"))).toBe("Good morning");
  });
  it("splits and counts meetings", () => {
    const records = [
      { dateTime: new Date("2026-10-06T00:00:00Z") },
      { dateTime: new Date("2026-10-01T00:00:00Z") },
      { dateTime: new Date("2026-09-20T00:00:00Z") },
    ];
    const { upcoming, past } = splitByNow(records, now);
    expect(upcoming).toHaveLength(1);
    expect(past.map((r) => r.dateTime.toISOString().slice(0, 10))).toEqual([
      "2026-10-01",
      "2026-09-20",
    ]);
    expect(countThisMonth(records, now)).toBe(2);
  });
  it("suggests contacts to reconnect with", () => {
    const day = 864e5;
    const list = [
      {
        id: "a",
        lastMeeting: new Date(now.getTime() - 100 * day),
        nextMeeting: null,
        addDate: new Date(now.getTime() - 300 * day),
      },
      {
        id: "b",
        lastMeeting: new Date(now.getTime() - 10 * day),
        nextMeeting: null,
        addDate: new Date(now.getTime() - 300 * day),
      },
      {
        id: "c",
        lastMeeting: null,
        nextMeeting: null,
        addDate: new Date(now.getTime() - 50 * day),
      },
      {
        id: "d",
        lastMeeting: new Date(now.getTime() - 200 * day),
        nextMeeting: new Date(now.getTime() + day),
        addDate: now,
      },
    ];
    expect(reconnectCandidates(list, now).map((c) => c.id)).toEqual(["a", "c"]);
  });
});
