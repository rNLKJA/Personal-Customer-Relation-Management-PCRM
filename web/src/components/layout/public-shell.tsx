import type { ReactNode } from "react";
import Link from "next/link";
import { Logo } from "@/components/brand/logo";
import { GithubIcon } from "@/components/brand/github-icon";
import { Button } from "@/components/ui/button";
import { ThemeIconButton } from "@/components/layout/theme-toggle";
import { SITE } from "@/lib/site";
import { cn } from "@/lib/utils";

export interface PublicNavLink {
  href: string;
  label: string;
  /** Smallest breakpoint at which the link shows (phones get the logo, theme and CTA). */
  from?: "sm" | "md";
}

/** Header and footer of the public pages that are not the landing page: /methods and /tour. */
export function PublicShell({
  navLabel,
  links,
  children,
}: {
  navLabel: string;
  links: PublicNavLink[];
  children: ReactNode;
}) {
  return (
    <div className="min-h-dvh bg-background">
      <a
        href="#main"
        className="sr-only z-50 rounded-md bg-primary px-3 py-2 text-primary-foreground focus:not-sr-only focus:fixed focus:top-3 focus:left-3"
      >
        Skip to content
      </a>
      <header className="sticky top-0 z-30 border-b bg-background/80 backdrop-blur-xl">
        <div className="mx-auto flex h-16 max-w-6xl items-center justify-between gap-3 px-5 sm:px-8">
          <Link href="/" className="rounded-md" aria-label="4399 CRM home">
            <Logo />
          </Link>
          <nav aria-label={navLabel} className="flex items-center gap-1 sm:gap-2">
            {links.map((l) => (
              <Link
                key={l.href}
                href={l.href}
                className={cn(
                  "hidden rounded-md px-3 py-2 text-sm text-muted-foreground hover:text-foreground",
                  l.from === "md" ? "md:inline" : "sm:inline",
                )}
              >
                {l.label}
              </Link>
            ))}
            <ThemeIconButton />
            <Button asChild size="sm">
              <Link href="/home">Open the app</Link>
            </Button>
          </nav>
        </div>
      </header>
      <main id="main">{children}</main>
      <footer className="border-t">
        <div className="mx-auto flex max-w-6xl flex-wrap items-center justify-between gap-3 px-5 py-6 text-xs text-muted-foreground sm:px-8">
          <span>
            {SITE.name} · {SITE.team} · {SITE.university}
          </span>
          <a href={SITE.repo} className="inline-flex items-center gap-1 hover:text-foreground">
            <GithubIcon className="size-3.5" /> Source and docs on GitHub
          </a>
        </div>
      </footer>
    </div>
  );
}
