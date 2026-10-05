import type { Metadata } from "next";
import Link from "next/link";
import { ArrowRight, ChartColumn, NotebookPen } from "lucide-react";
import { Button } from "@/components/ui/button";
import { PageHeader } from "@/components/layout/page-header";
import { EmptyState } from "@/components/common/empty-state";
import { WeeklyChart, formatWeek } from "@/components/insights/weekly-chart";
import { WeekdayHourHeatmap } from "@/components/insights/heatmap";
import { RecencyBars } from "@/components/insights/recency-bars";
import { listContacts } from "@/server/contacts";
import { listRecords } from "@/server/records";
import { requireUser } from "@/server/session";
import {
  WEEKDAYS,
  WEEKLY_RESAMPLES,
  WEEKLY_SEED,
  WEEKLY_WINDOW,
  contactsByRecency,
  overallWeeklyRate,
  weekdayHourHeatmap,
  weeklyBand,
  weeklyMeetingCounts,
} from "@/lib/analytics";
import { requestNow } from "@/lib/time";

export const metadata: Metadata = { title: "Insights" };

const f1 = (n: number) => n.toFixed(1);

export default async function InsightsPage() {
  const user = await requireUser();
  const [contacts, records] = await Promise.all([listContacts(user.id), listRecords(user.id)]);
  const now = new Date(requestNow());
  const weeks = weeklyMeetingCounts(records, now);
  const band = weeklyBand(weeks);
  const rate = overallWeeklyRate(weeks);
  const past = records.filter((r) => r.dateTime.getTime() <= now.getTime());
  const heat = weekdayHourHeatmap(records);
  const recency = contactsByRecency(contacts, now);
  // Last met more than 90 days ago (buckets 91-180, 181-365 and over a year).
  const stale = recency.buckets
    .filter((b) => b.key === "180" || b.key === "365" || b.key === "older")
    .reduce((n, b) => n + b.count, 0);

  return (
    <div className="animate-fade-up space-y-6">
      <PageHeader
        title="Insights"
        description="How often you meet people, when, and who you have not seen in a while. Computed from your own meetings, in Melbourne time."
        actions={
          <Button asChild variant="outline">
            <Link href="/methods#insights">
              How these are calculated <ArrowRight />
            </Link>
          </Button>
        }
      />

      {records.length === 0 ? (
        <EmptyState
          icon={ChartColumn}
          title="Nothing to analyse yet"
          description="Log a few meetings and this page shows how often and when you meet people."
          action={
            <Button asChild>
              <Link href="/records/new">
                <NotebookPen /> Log a meeting
              </Link>
            </Button>
          }
        />
      ) : (
        <>
          <section aria-label="Summary" className="grid gap-3 sm:grid-cols-3">
            <Tile
              label="Meetings per week"
              value={rate ? f1(rate.estimate) : "-"}
              note={
                rate
                  ? `95% CI ${f1(rate.lower)}-${f1(rate.upper)} · n = ${rate.n} complete weeks`
                  : "Needs one complete week"
              }
            />
            <Tile
              label="Meetings so far"
              value={String(past.length)}
              note={`plus ${records.length - past.length} planned`}
            />
            <Tile
              label="Last met over 90 days ago"
              value={String(stale)}
              note={`of ${recency.total} contacts; ${recency.buckets.find((b) => b.key === "never")?.count ?? 0} never met`}
            />
          </section>

          <Card
            id="weekly"
            title="Meetings per week"
            description={`Columns are complete Monday-Sunday weeks (the current week is left out). The line is the average of the last ${WEEKLY_WINDOW} weeks; the band is its 95% percentile bootstrap interval.`}
          >
            {weeks.length >= 2 ? (
              <WeeklyChart points={band} window={WEEKLY_WINDOW} />
            ) : (
              <p className="text-sm text-muted-foreground">
                Needs at least two complete weeks of meetings.
              </p>
            )}
            <MethodNote>
              Bootstrap: {WEEKLY_RESAMPLES.toLocaleString("en-AU")} resamples of the {WEEKLY_WINDOW}{" "}
              weeks in each window, seed {WEEKLY_SEED}. It treats those weeks as exchangeable (no
              trend, no week-to-week correlation), so the band describes variability, it is not a
              forecast; with only {WEEKLY_WINDOW} weeks a percentile interval is also somewhat too
              narrow.
            </MethodNote>
            <DataTable
              caption="Meetings per week"
              head={["Week of", "Meetings", `${WEEKLY_WINDOW}-wk average`, "95% interval"]}
              rows={band.map((p) => [
                formatWeek(p.weekStart),
                String(p.count),
                p.band ? f1(p.band.estimate) : "-",
                p.band ? `${f1(p.band.lower)}-${f1(p.band.upper)}` : "-",
              ])}
            />
          </Card>

          <div className="grid gap-6 lg:grid-cols-[minmax(0,1.3fr)_minmax(0,1fr)]">
            <Card
              id="when"
              title="When you meet"
              description={`All ${heat.total} meetings (past and planned) by weekday and starting hour.`}
            >
              <WeekdayHourHeatmap data={heat} />
              <DataTable
                caption="Meetings by weekday"
                head={["Weekday", "Meetings", "Busiest hour"]}
                rows={WEEKDAYS.map((d, i) => {
                  const row = heat.cells[i];
                  const total = row.reduce((a, b) => a + b, 0);
                  const peak = row.indexOf(Math.max(...row));
                  return [d, String(total), total ? `${peak}:00` : "-"];
                })}
              />
            </Card>
            <Card
              id="recency"
              title="Contacts by time since you last met"
              description={`${recency.total} contacts; ${recency.withUpcoming} have a meeting planned.`}
            >
              <RecencyBars buckets={recency.buckets} />
              <MethodNote>
                No confidence intervals here on purpose: this is every contact in your address book
                (a census), not a sample, so there is no sampling uncertainty to show.
              </MethodNote>
            </Card>
          </div>
        </>
      )}
    </div>
  );
}

function Tile({ label, value, note }: { label: string; value: string; note: string }) {
  return (
    <div className="rounded-2xl border bg-card p-4 shadow-(--shadow-soft)">
      <p className="text-xs font-medium text-muted-foreground">{label}</p>
      <p className="mt-2 text-3xl font-semibold tracking-tight">{value}</p>
      <p className="mt-1 text-xs text-muted-foreground">{note}</p>
    </div>
  );
}

function Card({
  id,
  title,
  description,
  children,
}: {
  id: string;
  title: string;
  description: string;
  children: React.ReactNode;
}) {
  return (
    <section
      aria-labelledby={`${id}-title`}
      className="min-w-0 rounded-2xl border bg-card p-5 shadow-(--shadow-soft) sm:p-6"
    >
      <h2 id={`${id}-title`} className="text-base font-semibold tracking-tight">
        {title}
      </h2>
      <p className="mt-1 mb-5 text-sm text-muted-foreground">{description}</p>
      {children}
    </section>
  );
}

function MethodNote({ children }: { children: React.ReactNode }) {
  return <p className="mt-4 text-xs leading-relaxed text-muted-foreground">{children}</p>;
}

function DataTable({ caption, head, rows }: { caption: string; head: string[]; rows: string[][] }) {
  return (
    <details className="mt-4 text-sm">
      <summary className="cursor-pointer text-xs font-medium text-muted-foreground hover:text-foreground">
        Show the numbers as a table
      </summary>
      <div
        className="mt-2 max-h-72 overflow-auto rounded-lg border"
        tabIndex={0}
        role="region"
        aria-label={caption}
      >
        <table className="w-full text-left text-xs">
          <caption className="sr-only">{caption}</caption>
          <thead className="sticky top-0 bg-surface text-muted-foreground">
            <tr>
              {head.map((h) => (
                <th key={h} scope="col" className="px-3 py-1.5 font-medium">
                  {h}
                </th>
              ))}
            </tr>
          </thead>
          <tbody className="tabular divide-y">
            {rows.map((r, i) => (
              <tr key={i}>
                {r.map((c, j) => (
                  <td key={j} className="px-3 py-1.5">
                    {c}
                  </td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </details>
  );
}
