import { describe, expect, it } from "vitest";
import { daysInMonth, groupByDay, monthGrid, monthKey, parseMonth, shiftMonth } from "./calendar";

describe("calendar grid", () => {
  it("lays out October 2026 Monday-first", () => {
    const weeks = monthGrid({ year: 2026, month: 10 });
    expect(weeks).toHaveLength(5);
    expect(weeks[0][0].key).toBe("2026-09-28"); // Oct 1 2026 is a Thursday
    expect(weeks[0][3]).toMatchObject({ key: "2026-10-01", inMonth: true, weekday: 3 });
    expect(weeks.flat().filter((d) => d.inMonth)).toHaveLength(31);
  });
  it("handles leap years and month arithmetic", () => {
    expect(daysInMonth({ year: 2024, month: 2 })).toBe(29);
    expect(shiftMonth({ year: 2026, month: 1 }, -1)).toEqual({ year: 2025, month: 12 });
    expect(shiftMonth({ year: 2026, month: 12 }, 1)).toEqual({ year: 2027, month: 1 });
    expect(monthKey({ year: 2026, month: 3 })).toBe("2026-03");
  });
  it("parses the month query parameter defensively", () => {
    const fallback = { year: 2026, month: 10 };
    expect(parseMonth("2021-09", fallback)).toEqual({ year: 2021, month: 9 });
    expect(parseMonth("2021-13", fallback)).toBe(fallback);
    expect(parseMonth("nonsense", fallback)).toBe(fallback);
  });
  it("groups items by day", () => {
    const g = groupByDay(["2026-10-01", "2026-10-01", "2026-10-02"], (x) => x);
    expect(g.get("2026-10-01")).toHaveLength(2);
  });
});
