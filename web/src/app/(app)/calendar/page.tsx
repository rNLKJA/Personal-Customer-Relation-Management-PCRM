import type { Metadata } from "next";
import Link from "next/link";
import { CalendarPlus, ChevronLeft, ChevronRight } from "lucide-react";
import { Button } from "@/components/ui/button";
import { PageHeader } from "@/components/layout/page-header";
import { ViewSwitch } from "@/components/records/view-switch";
import { MeetingRow } from "@/components/records/meeting-row";
import { PersonAvatar } from "@/components/common/person-avatar";
import { listRecords } from "@/server/records";
import { requireUser } from "@/server/session";
import { groupByDay, monthGrid, monthKey, parseMonth, shiftMonth } from "@/lib/calendar";
import { APP_TIME_ZONE, dayKey, formatDate, formatTime } from "@/lib/time";
import { zonedParts } from "@/lib/legacy/convert";
import { cn } from "@/lib/utils";

export const metadata: Metadata = { title: "Calendar" };

/** "5:45 pm" -> "5:45p", "10:00 am" -> "10a" (fits the narrow day cells). */
function compactTime(d: Date): string {
  return formatTime(d)
    .replace(":00", "")
    .replace(/\s?([ap])m$/i, "$1");
}

const WEEKDAYS = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"];
const MONTH_NAMES = [
  "January",
  "February",
  "March",
  "April",
  "May",
  "June",
  "July",
  "August",
  "September",
  "October",
  "November",
  "December",
];

export default async function CalendarPage({ searchParams }: PageProps<"/calendar">) {
  const user = await requireUser();
  const sp = await searchParams;
  const now = new Date();
  const todayKey = dayKey(now);
  const todayParts = zonedParts(now, APP_TIME_ZONE);
  const month = parseMonth(typeof sp.month === "string" ? sp.month : null, {
    year: todayParts.year,
    month: todayParts.month,
  });
  const selectedKey =
    typeof sp.day === "string" && /^\d{4}-\d{2}-\d{2}$/.test(sp.day)
      ? sp.day
      : todayKey.startsWith(monthKey(month))
        ? todayKey
        : `${monthKey(month)}-01`;

  const records = await listRecords(user.id);
  const byDay = groupByDay(
    [...records].sort((a, b) => a.dateTime.getTime() - b.dateTime.getTime()),
    (r) => dayKey(r.dateTime),
  );
  const weeks = monthGrid(month);
  const selected = byDay.get(selectedKey) ?? [];
  const monthTotal = records.filter((r) => dayKey(r.dateTime).startsWith(monthKey(month))).length;
  const href = (m: string, d?: string) => `/calendar?month=${m}${d ? `&day=${d}` : ""}`;
  const selectedDate = new Date(`${selectedKey}T12:00:00Z`);

  return (
    <div className="animate-fade-up">
      <PageHeader
        title="Calendar"
        description="Your meetings by day."
        actions={
          <Button asChild>
            <Link href={`/records/new?date=${selectedKey}`}>
              <CalendarPlus /> Plan a meeting
            </Link>
          </Button>
        }
      />
      <div className="mb-5">
        <ViewSwitch current="/calendar" />
      </div>

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-[minmax(0,1fr)_340px]">
        <section
          className="rounded-2xl border bg-card p-3 shadow-(--shadow-soft) sm:p-5"
          aria-labelledby="month-title"
        >
          <div className="mb-4 flex items-center justify-between gap-2 px-1">
            <div>
              <h2 id="month-title" className="text-lg font-semibold tracking-tight">
                {MONTH_NAMES[month.month - 1]} {month.year}
              </h2>
              <p className="text-xs text-muted-foreground">
                {monthTotal} {monthTotal === 1 ? "meeting" : "meetings"}
              </p>
            </div>
            <div className="flex items-center gap-1">
              <Button asChild variant="ghost" size="icon" aria-label="Previous month">
                <Link href={href(monthKey(shiftMonth(month, -1)))}>
                  <ChevronLeft />
                </Link>
              </Button>
              <Button asChild variant="outline" size="sm">
                <Link
                  href={href(
                    monthKey({ year: todayParts.year, month: todayParts.month }),
                    todayKey,
                  )}
                >
                  Today
                </Link>
              </Button>
              <Button asChild variant="ghost" size="icon" aria-label="Next month">
                <Link href={href(monthKey(shiftMonth(month, 1)))}>
                  <ChevronRight />
                </Link>
              </Button>
            </div>
          </div>

          <div className="grid grid-cols-7 gap-px overflow-hidden rounded-xl border bg-border">
            <div className="contents" aria-hidden="true">
              {WEEKDAYS.map((d) => (
                <div
                  key={d}
                  className="bg-surface py-2 text-center text-[11px] font-semibold tracking-wide text-muted-foreground uppercase"
                >
                  {d}
                </div>
              ))}
            </div>
            {weeks.map((week) => (
              <div key={week[0].key} className="contents">
                {week.map((cell) => {
                  const items = byDay.get(cell.key) ?? [];
                  const isToday = cell.key === todayKey;
                  const isSelected = cell.key === selectedKey;
                  return (
                    <Link
                      key={cell.key}
                      aria-current={isSelected ? "date" : undefined}
                      aria-label={`${cell.key}${items.length ? `, ${items.length} meeting${items.length > 1 ? "s" : ""}` : ""}`}
                      href={href(monthKey(month), cell.key)}
                      scroll={false}
                      className={cn(
                        "relative flex min-h-16 flex-col gap-1 bg-card p-1.5 transition-colors hover:bg-muted/70 sm:min-h-24 sm:p-2",
                        !cell.inMonth && "bg-surface text-muted-foreground/60",
                        isSelected &&
                          "z-[1] bg-accent/70 ring-2 ring-primary/40 ring-inset hover:bg-accent",
                      )}
                    >
                      <span
                        className={cn(
                          "tabular flex size-6 items-center justify-center rounded-full text-xs font-medium",
                          isToday && "bg-primary text-primary-foreground",
                        )}
                      >
                        {cell.day}
                      </span>
                      {items.length > 0 && (
                        <>
                          <span className="flex gap-0.5 sm:hidden" aria-hidden="true">
                            {items.slice(0, 3).map((r) => (
                              <span
                                key={r.id}
                                className={cn(
                                  "size-1.5 rounded-full",
                                  r.dateTime > now ? "bg-primary" : "bg-muted-foreground/50",
                                )}
                              />
                            ))}
                          </span>
                          <span className="hidden flex-col gap-0.5 sm:flex" aria-hidden="true">
                            {items.slice(0, 2).map((r) => (
                              <span
                                key={r.id}
                                className={cn(
                                  "truncate rounded-md px-1 py-0.5 text-[11px] leading-tight",
                                  r.dateTime > now
                                    ? "bg-primary/12 text-accent-foreground"
                                    : "bg-muted text-muted-foreground",
                                )}
                              >
                                <span className="tabular font-medium">
                                  {compactTime(r.dateTime)}
                                </span>{" "}
                                {r.meetingPerson.firstName}
                              </span>
                            ))}
                            {items.length > 2 && (
                              <span className="px-1.5 text-[11px] text-muted-foreground">
                                +{items.length - 2} more
                              </span>
                            )}
                          </span>
                        </>
                      )}
                    </Link>
                  );
                })}
              </div>
            ))}
          </div>
        </section>

        <section
          className="h-fit rounded-2xl border bg-card p-5 shadow-(--shadow-soft)"
          aria-labelledby="day-title"
          aria-live="polite"
        >
          <h2 id="day-title" className="text-sm font-semibold tracking-tight">
            {formatDate(selectedDate)}
          </h2>
          {selected.length ? (
            <>
              <div className="mt-3 flex -space-x-2" aria-hidden="true">
                {selected.slice(0, 5).map((r) => (
                  <PersonAvatar
                    key={r.id}
                    firstName={r.meetingPerson.firstName}
                    lastName={r.meetingPerson.lastName}
                    portrait={r.meetingPerson.portrait}
                    seed={r.meetingPerson.id}
                    size="sm"
                    className="ring-2 ring-card"
                  />
                ))}
              </div>
              <div className="mt-2">
                {selected.map((r) => (
                  <MeetingRow key={r.id} record={r} upcoming={r.dateTime > now} />
                ))}
              </div>
            </>
          ) : (
            <div className="mt-3">
              <p className="text-sm text-muted-foreground">No meetings on this day.</p>
              <Button asChild size="sm" variant="outline" className="mt-3">
                <Link href={`/records/new?date=${selectedKey}`}>
                  <CalendarPlus /> Plan one
                </Link>
              </Button>
            </div>
          )}
        </section>
      </div>
    </div>
  );
}
