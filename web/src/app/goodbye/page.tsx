import type { Metadata } from "next";
import Link from "next/link";
import { CheckCircle2 } from "lucide-react";
import { Logo } from "@/components/brand/logo";
import { Button } from "@/components/ui/button";
import { ClearAiKeys } from "@/components/ai/clear-ai-keys";

export const metadata: Metadata = { title: "Account deleted", robots: { index: false } };

export default function GoodbyePage() {
  return (
    <main
      id="main"
      className="flex min-h-dvh flex-col items-center justify-center bg-background px-5"
    >
      <Link href="/" className="mb-10 rounded-md" aria-label="4399 CRM home">
        <Logo />
      </Link>
      <ClearAiKeys />
      <div className="w-full max-w-md rounded-3xl border bg-card p-7 text-center shadow-(--shadow-soft)">
        <CheckCircle2 className="mx-auto size-10 text-success" aria-hidden="true" />
        <h1 className="mt-4 text-xl font-semibold tracking-tight">Your account has been deleted</h1>
        <p className="mt-2 text-sm text-muted-foreground">
          Your profile, contacts, meetings, activity log, AI log and demo-inbox e-mails were removed
          from the database. Only an anonymous count of what was deleted remains in the admin audit
          trail. Any AI key saved in this browser has been cleared as well.
        </p>
        <div className="mt-6 flex flex-wrap justify-center gap-2">
          <Button asChild>
            <Link href="/">Back to the home page</Link>
          </Button>
          <Button asChild variant="outline">
            <Link href="/methods#privacy">How deletion works</Link>
          </Button>
        </div>
      </div>
    </main>
  );
}
