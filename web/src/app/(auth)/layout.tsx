import Link from "next/link";
import { ArrowLeft, MapPinned, QrCode, Users } from "lucide-react";
import { Logo } from "@/components/brand/logo";
import { ThemeIconButton } from "@/components/layout/theme-toggle";

const POINTS = [
  {
    icon: Users,
    text: "Keep every contact - phones, e-mails, notes and custom fields - in one tidy list.",
  },
  {
    icon: MapPinned,
    text: "Log where and when you met someone, then see it on a map or a calendar.",
  },
  { icon: QrCode, text: "Swap details in person by scanning each other's QR code." },
];

export default function AuthLayout({ children }: LayoutProps<"/">) {
  return (
    <div className="grid min-h-dvh bg-background lg:grid-cols-[minmax(0,1fr)_minmax(0,1.1fr)]">
      <aside className="relative hidden overflow-hidden border-r lg:flex lg:flex-col lg:justify-between lg:p-12">
        <div className="bg-dots absolute inset-0 opacity-70" aria-hidden="true" />
        <div
          className="absolute -top-40 -left-32 size-[520px] rounded-full opacity-60 blur-3xl"
          style={{
            background: "radial-gradient(closest-side, oklch(0.75 0.14 280 / 0.45), transparent)",
          }}
          aria-hidden="true"
        />
        <Link
          href="/"
          className="relative w-fit rounded-md"
          aria-label="4399 CRM - back to the project page"
        >
          <Logo />
        </Link>
        <div className="relative max-w-md">
          <p className="font-display text-[44px] leading-[1.05] tracking-tight">
            Remember the people, <em className="text-primary">and the moments</em> you met them.
          </p>
          <ul className="mt-8 space-y-4">
            {POINTS.map((p) => (
              <li key={p.text} className="flex gap-3 text-sm text-muted-foreground">
                <span className="flex size-8 shrink-0 items-center justify-center rounded-lg border bg-card text-accent-foreground shadow-(--shadow-soft)">
                  <p.icon className="size-4" aria-hidden="true" />
                </span>
                <span className="pt-1.5">{p.text}</span>
              </li>
            ))}
          </ul>
        </div>
        <p className="relative text-xs text-muted-foreground">
          COMP30022 IT Project · The University of Melbourne · 2021 S2 · revived 2026
        </p>
      </aside>
      <div className="flex min-h-dvh flex-col">
        <header className="flex h-16 items-center justify-between px-5 sm:px-8">
          <Link
            href="/"
            className="inline-flex items-center gap-1.5 rounded-md text-sm text-muted-foreground hover:text-foreground"
          >
            <ArrowLeft className="size-4" aria-hidden="true" /> Project page
          </Link>
          <ThemeIconButton />
        </header>
        <main
          id="main"
          className="flex flex-1 items-start justify-center px-5 pt-4 pb-16 sm:items-center sm:px-8"
        >
          <div className="w-full max-w-[420px]">{children}</div>
        </main>
      </div>
    </div>
  );
}
