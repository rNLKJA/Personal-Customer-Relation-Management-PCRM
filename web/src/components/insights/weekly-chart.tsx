import type { BandPoint } from "@/lib/analytics";
import { ChartTips } from "./chart-tips";

/**
 * Meetings per week (columns) with the trailing-window mean (line) and its
 * 95% percentile-bootstrap interval (band). HTML columns + an SVG overlay
 * stretched to the same box, so it stays legible at 375px.
 */

const weekFmt = new Intl.DateTimeFormat("en-AU", {
  timeZone: "UTC",
  day: "numeric",
  month: "short",
});
export const formatWeek = (key: string) => weekFmt.format(new Date(`${key}T00:00:00Z`));
const f1 = (n: number) => n.toFixed(1);

function niceMax(v: number): number {
  if (v <= 2) return 2;
  if (v <= 4) return 4;
  return Math.ceil(v / 2) * 2;
}

export function WeeklyChart({ points, window }: { points: BandPoint[]; window: number }) {
  const n = points.length;
  const yMax = niceMax(Math.max(...points.map((p) => Math.max(p.count, p.band?.upper ?? 0))));
  const step = yMax <= 4 ? 1 : 2;
  const ticks = Array.from({ length: yMax / step + 1 }, (_, i) => i * step);
  const x = (i: number) => ((i + 0.5) / n) * 100;
  const y = (v: number) => 100 - (v / yMax) * 100;
  const banded = points.map((p, i) => ({ p, i })).filter(({ p }) => p.band);
  const bandPath = banded.length
    ? [
        ...banded.map(({ p, i }) => `${x(i)},${y(p.band!.upper)}`),
        ...[...banded].reverse().map(({ p, i }) => `${x(i)},${y(p.band!.lower)}`),
      ].join(" ")
    : "";
  const line = banded.map(({ p, i }) => `${x(i)},${y(p.band!.estimate)}`).join(" ");
  const labelEvery = n > 20 ? 4 : n > 10 ? 2 : 1;

  return (
    <ChartTips>
      <div className="flex gap-2">
        {/* y axis */}
        <div
          className="relative w-5 shrink-0 text-right text-[11px] text-muted-foreground"
          aria-hidden="true"
        >
          <div className="relative h-52">
            {ticks.map((t) => (
              <span
                key={t}
                className="tabular absolute right-0 -translate-y-1/2"
                style={{ top: `${y(t)}%` }}
              >
                {t}
              </span>
            ))}
          </div>
        </div>
        <div className="min-w-0 flex-1">
          <div className="relative h-52" role="group" aria-label="Meetings per week">
            {ticks.map((t) => (
              <div
                key={t}
                className={
                  t === 0
                    ? "absolute inset-x-0 h-px bg-border"
                    : "absolute inset-x-0 h-px bg-border/60"
                }
                style={{ top: `${y(t)}%` }}
                aria-hidden="true"
              />
            ))}
            <div className="absolute inset-0 flex">
              {points.map((p) => (
                <div
                  key={p.weekStart}
                  tabIndex={0}
                  role="img"
                  aria-label={`Week of ${formatWeek(p.weekStart)}: ${p.count} meeting${p.count === 1 ? "" : "s"}${p.band ? `, ${window}-week average ${f1(p.band.estimate)} (95% interval ${f1(p.band.lower)} to ${f1(p.band.upper)})` : ""}`}
                  data-tip={[
                    `${p.count} meeting${p.count === 1 ? "" : "s"}`,
                    `Week of ${formatWeek(p.weekStart)}`,
                    p.band
                      ? `${window}-wk avg ${f1(p.band.estimate)} (95% ${f1(p.band.lower)}-${f1(p.band.upper)})`
                      : `${window}-wk average needs ${window} weeks`,
                  ].join("\n")}
                  className="group flex h-full min-w-0 flex-1 items-end justify-center px-px outline-none hover:bg-muted/50 focus-visible:bg-accent/60"
                >
                  <div
                    className="w-full max-w-6 rounded-t-[4px] bg-viz-1/30 transition-colors group-hover:bg-viz-1/45 group-focus-visible:bg-viz-1/45 dark:bg-viz-1/40 dark:group-hover:bg-viz-1/55"
                    style={{ height: `${(p.count / yMax) * 100}%` }}
                  />
                </div>
              ))}
            </div>
            <svg
              className="pointer-events-none absolute inset-0 h-full w-full overflow-visible"
              viewBox="0 0 100 100"
              preserveAspectRatio="none"
              aria-hidden="true"
            >
              {bandPath && (
                <polygon points={bandPath} className="fill-viz-1/15 dark:fill-viz-1/25" />
              )}
              {line && (
                <polyline
                  points={line}
                  fill="none"
                  className="stroke-viz-1"
                  strokeWidth={2}
                  strokeLinejoin="round"
                  strokeLinecap="round"
                  vectorEffect="non-scaling-stroke"
                />
              )}
            </svg>
          </div>
          <div className="relative mt-1.5 h-4 text-[11px] text-muted-foreground" aria-hidden="true">
            {points.map((p, i) =>
              i % labelEvery === 0 ? (
                <span
                  key={p.weekStart}
                  className="absolute -translate-x-1/2 whitespace-nowrap"
                  style={{ left: `${x(i)}%` }}
                >
                  {formatWeek(p.weekStart)}
                </span>
              ) : null,
            )}
          </div>
        </div>
      </div>
      <ul className="mt-4 flex flex-wrap gap-x-5 gap-y-1.5 text-xs text-muted-foreground">
        <li className="inline-flex items-center gap-1.5">
          <span
            className="h-3 w-2.5 rounded-t-[2px] bg-viz-1/30 dark:bg-viz-1/40"
            aria-hidden="true"
          />{" "}
          Meetings that week
        </li>
        <li className="inline-flex items-center gap-1.5">
          <span className="h-0.5 w-4 rounded-full bg-viz-1" aria-hidden="true" /> {window}-week
          average
        </li>
        <li className="inline-flex items-center gap-1.5">
          <span className="h-3 w-4 rounded-sm bg-viz-1/15 dark:bg-viz-1/25" aria-hidden="true" />{" "}
          95% bootstrap interval
        </li>
      </ul>
    </ChartTips>
  );
}
