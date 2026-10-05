import { WEEKDAYS, type Heatmap } from "@/lib/analytics";
import { ChartTips } from "./chart-tips";

/**
 * Weekday x hour heatmap: one hue, more is darker (sequential), mixed into
 * the card surface; empty cells stay a recessive muted tint. 2px gaps.
 */

const hourLabel = (h: number) =>
  h === 0 ? "12am" : h < 12 ? `${h}am` : h === 12 ? "12pm" : `${h - 12}pm`;

function cellColor(v: number, max: number): string | undefined {
  if (v === 0 || max === 0) return undefined;
  const share = 35 + (65 * (v - 1)) / Math.max(1, max - 1); // 35% .. 100% of the hue
  return `color-mix(in oklch, var(--viz-1) ${Math.round(share)}%, var(--card))`;
}

export function WeekdayHourHeatmap({ data }: { data: Heatmap }) {
  const hours = Array.from(
    { length: data.hours[1] - data.hours[0] + 1 },
    (_, i) => data.hours[0] + i,
  );
  const legend = Array.from({ length: Math.min(data.max, 4) }, (_, i) =>
    data.max <= 4 ? i + 1 : Math.round(1 + (i * (data.max - 1)) / 3),
  );
  return (
    <ChartTips>
      <div
        className="grid gap-[2px]"
        style={{ gridTemplateColumns: `2.25rem repeat(${hours.length}, minmax(0, 1fr))` }}
        role="group"
        aria-label="Meetings by weekday and hour"
      >
        {WEEKDAYS.map((day, d) => (
          <div key={day} className="contents">
            <span className="self-center pr-1 text-[11px] text-muted-foreground">{day}</span>
            {hours.map((h) => {
              const v = data.cells[d][h];
              return (
                <div
                  key={h}
                  role="img"
                  aria-label={`${day} ${hourLabel(h)}: ${v} meeting${v === 1 ? "" : "s"}`}
                  data-tip={`${v} meeting${v === 1 ? "" : "s"}\n${day}, ${hourLabel(h)}-${hourLabel((h + 1) % 24)}`}
                  className="aspect-square min-h-3 rounded-[3px] bg-muted/70 transition-[filter] hover:brightness-110 dark:bg-muted/50"
                  style={{ backgroundColor: cellColor(v, data.max) }}
                />
              );
            })}
          </div>
        ))}
        <span />
        {hours.map((h) => (
          <span
            key={h}
            className="pt-1 text-center text-[10px] text-muted-foreground"
            aria-hidden="true"
          >
            {(h - hours[0]) % 3 === 0 ? hourLabel(h) : ""}
          </span>
        ))}
      </div>
      <div className="mt-3 flex items-center gap-2 text-xs text-muted-foreground">
        <span>Fewer</span>
        <span className="size-3 rounded-[3px] bg-muted/70 dark:bg-muted/50" aria-hidden="true" />
        {legend.map((v) => (
          <span
            key={v}
            className="size-3 rounded-[3px]"
            style={{ backgroundColor: cellColor(v, data.max) }}
            aria-hidden="true"
          />
        ))}
        <span>More</span>
        <span className="ml-auto">max {data.max} in one hour slot</span>
      </div>
    </ChartTips>
  );
}
