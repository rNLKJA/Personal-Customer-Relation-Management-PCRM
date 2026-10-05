"use client";

import { useRef, useState, type ReactNode } from "react";
import { cn } from "@/lib/utils";

/**
 * Hover / focus tooltips for server-rendered charts. Any descendant with a
 * `data-tip` attribute ("value\nlabel\nmore") shows its text on pointer hover
 * or keyboard focus. Text is rendered as React text (never HTML). Tooltips
 * enhance, they never gate: every value is also in a table or a direct label.
 */
export function ChartTips({ children, className }: { children: ReactNode; className?: string }) {
  const ref = useRef<HTMLDivElement>(null);
  const [tip, setTip] = useState<{ x: number; y: number; lines: string[] } | null>(null);

  function show(target: EventTarget | null) {
    const root = ref.current;
    if (!root || !(target instanceof Element)) return;
    const el = target.closest("[data-tip]");
    if (!el || !root.contains(el)) {
      setTip(null);
      return;
    }
    const box = root.getBoundingClientRect();
    const r = el.getBoundingClientRect();
    const half = 90;
    const x = Math.min(Math.max(r.left + r.width / 2 - box.left, half), box.width - half);
    setTip({ x, y: r.top - box.top, lines: (el.getAttribute("data-tip") ?? "").split("\n") });
  }

  return (
    <div
      ref={ref}
      className={cn("relative", className)}
      onPointerOver={(e) => show(e.target)}
      onPointerLeave={() => setTip(null)}
      onFocus={(e) => show(e.target)}
      onBlur={() => setTip(null)}
    >
      {children}
      {tip && (
        <div
          aria-hidden="true"
          className="pointer-events-none absolute z-20 w-max max-w-[180px] -translate-x-1/2 -translate-y-full rounded-lg border bg-popover px-2.5 py-1.5 text-xs shadow-(--shadow-lifted)"
          style={{ left: tip.x, top: Math.max(0, tip.y - 6) }}
        >
          <p className="tabular font-semibold text-popover-foreground">{tip.lines[0]}</p>
          {tip.lines.slice(1).map((line, i) => (
            <p key={i} className="text-muted-foreground">
              {line}
            </p>
          ))}
        </div>
      )}
    </div>
  );
}
