import Link from "next/link";
import { CalendarDays, List, Map as MapIcon } from "lucide-react";
import { cn } from "@/lib/utils";

const VIEWS = [
  { href: "/records", label: "List", icon: List },
  { href: "/calendar", label: "Calendar", icon: CalendarDays },
  { href: "/map", label: "Map", icon: MapIcon },
] as const;

export function ViewSwitch({ current }: { current: (typeof VIEWS)[number]["href"] }) {
  return (
    <nav aria-label="Meeting views" className="inline-flex rounded-lg bg-muted p-0.5">
      {VIEWS.map((v) => (
        <Link
          key={v.href}
          href={v.href}
          aria-current={current === v.href ? "page" : undefined}
          className={cn(
            "inline-flex h-8 items-center gap-1.5 rounded-md px-3 text-sm font-medium text-muted-foreground transition-colors",
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
