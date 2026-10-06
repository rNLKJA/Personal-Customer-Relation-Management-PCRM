import Link from "next/link";
import { CalendarDays, ChartColumn, List, Map as MapIcon } from "lucide-react";
import { cn } from "@/lib/utils";

const VIEWS = [
  { href: "/records", label: "List", icon: List },
  { href: "/calendar", label: "Calendar", icon: CalendarDays },
  { href: "/map", label: "Map", icon: MapIcon },
  { href: "/insights", label: "Insights", icon: ChartColumn },
] as const;

export function ViewSwitch({ current }: { current: (typeof VIEWS)[number]["href"] }) {
  return (
    <nav
      aria-label="Meeting views"
      className="inline-flex max-w-full overflow-x-auto rounded-lg bg-muted p-0.5"
    >
      {VIEWS.map((v) => (
        <Link
          key={v.href}
          href={v.href}
          aria-current={current === v.href ? "page" : undefined}
          className={cn(
            "inline-flex h-8 shrink-0 items-center gap-1 rounded-md px-2 text-sm font-medium text-muted-foreground transition-colors sm:gap-1.5 sm:px-3",
            current === v.href
              ? "bg-card text-foreground shadow-(--shadow-soft)"
              : "hover:text-foreground",
          )}
        >
          <v.icon className="size-4" aria-hidden="true" /> {v.label}
        </Link>
      ))}
    </nav>
  );
}
