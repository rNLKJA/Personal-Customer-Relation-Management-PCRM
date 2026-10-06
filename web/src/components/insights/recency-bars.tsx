import type { RecencyBucket } from "@/lib/analytics";
import { ChartTips } from "./chart-tips";

/** Contacts by time since the last meeting: horizontal bars, value at the tip. */
export function RecencyBars({ buckets }: { buckets: RecencyBucket[] }) {
  const max = Math.max(1, ...buckets.map((b) => b.count));
  return (
    <ChartTips>
      <ul className="space-y-2.5">
        {buckets.map((b) => {
          const pct = Math.round(b.share * 100);
          return (
            <li
              key={b.key}
              className="grid grid-cols-[6.5rem_minmax(0,1fr)] items-center gap-3 text-sm"
            >
              <span className="text-muted-foreground">{b.label}</span>
              <div
                tabIndex={0}
                role="img"
                aria-label={`${b.label}: ${b.count} contacts (${pct}%)`}
                data-tip={`${b.count} contact${b.count === 1 ? "" : "s"} (${pct}%)\n${b.key === "never" ? "No meeting logged yet" : `Last met: ${b.label.toLowerCase()} ago`}`}
                className="flex items-center gap-2 rounded-md outline-none focus-visible:ring-[3px] focus-visible:ring-ring/50"
              >
                <div
                  className={
                    b.key === "never"
                      ? "h-5 min-w-[3px] rounded-r-[4px] bg-muted-foreground/35"
                      : "h-5 min-w-[3px] rounded-r-[4px] bg-viz-1"
                  }
                  style={{ width: `${(b.count / max) * 82}%` }}
                />
                <span className="tabular shrink-0 text-xs text-muted-foreground">
                  <span className="font-medium text-foreground">{b.count}</span> · {pct}%
                </span>
              </div>
            </li>
          );
        })}
      </ul>
    </ChartTips>
  );
}
