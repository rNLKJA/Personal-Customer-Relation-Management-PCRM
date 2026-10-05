"use client";

import { Monitor, Moon, Sun } from "lucide-react";
import { useTheme } from "next-themes";
import { useSyncExternalStore } from "react";
import { cn } from "@/lib/utils";

const OPTIONS = [
  { value: "light", label: "Light", icon: Sun },
  { value: "dark", label: "Dark", icon: Moon },
  { value: "system", label: "System", icon: Monitor },
] as const;

const subscribe = () => () => {};

/** Segmented light / dark / system switch. */
export function ThemeToggle({ className }: { className?: string }) {
  const { theme, setTheme } = useTheme();
  const mounted = useSyncExternalStore(subscribe, () => true, () => false);
  return (
    <div
      role="radiogroup"
      aria-label="Colour theme"
      className={cn("bg-muted inline-flex rounded-lg p-0.5", className)}
    >
      {OPTIONS.map((o) => {
        const active = mounted && theme === o.value;
        return (
          <button
            key={o.value}
            type="button"
            role="radio"
            aria-checked={active}
            aria-label={o.label}
            title={o.label}
            onClick={() => setTheme(o.value)}
            className={cn(
              "text-muted-foreground inline-flex h-7 w-8 items-center justify-center rounded-md transition-colors",
              active && "bg-card text-foreground shadow-(--shadow-soft)",
            )}
          >
            <o.icon className="size-3.5" />
          </button>
        );
      })}
    </div>
  );
}

/** Single icon button that flips between light and dark. */
export function ThemeIconButton({ className }: { className?: string }) {
  const { resolvedTheme, setTheme } = useTheme();
  const mounted = useSyncExternalStore(subscribe, () => true, () => false);
  const dark = mounted && resolvedTheme === "dark";
  return (
    <button
      type="button"
      onClick={() => setTheme(dark ? "light" : "dark")}
      aria-label={dark ? "Switch to light theme" : "Switch to dark theme"}
      className={cn(
        "text-muted-foreground hover:bg-muted hover:text-foreground inline-flex size-9 items-center justify-center rounded-lg transition-colors",
        className,
      )}
    >
      {dark ? <Sun className="size-4" /> : <Moon className="size-4" />}
    </button>
  );
}
