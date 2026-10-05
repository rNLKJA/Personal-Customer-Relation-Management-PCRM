import Link from "next/link";
import { Logo } from "@/components/brand/logo";
import { GithubIcon } from "@/components/brand/github-icon";
import { Button } from "@/components/ui/button";
import { ThemeIconButton } from "@/components/layout/theme-toggle";
import { SITE } from "@/lib/site";

/** Public documentation shell for /methods, the decision records and the model card. */
export default function MethodsLayout({ children }: LayoutProps<"/methods">) {
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
          <nav aria-label="Documentation" className="flex items-center gap-1 sm:gap-2">
            <Link
              href="/methods"
              className="hidden rounded-md px-3 py-2 text-sm text-muted-foreground hover:text-foreground sm:inline"
            >
              Methods
            </Link>
            <Link
              href="/methods#decisions"
              className="hidden rounded-md px-3 py-2 text-sm text-muted-foreground hover:text-foreground md:inline"
            >
              Decisions
            </Link>
            <Link
              href="/methods/model-card"
              className="hidden rounded-md px-3 py-2 text-sm text-muted-foreground hover:text-foreground md:inline"
            >
              Model card
            </Link>
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
