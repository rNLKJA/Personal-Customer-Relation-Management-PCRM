import type { Metadata } from "next";
import Link from "next/link";
import { Compass } from "lucide-react";
import { Logo } from "@/components/brand/logo";
import { Button } from "@/components/ui/button";

export const metadata: Metadata = { title: "Page not found" };

export default function NotFound() {
  return (
    <main
      id="main"
      className="flex min-h-dvh flex-col items-center justify-center bg-background px-6 text-center"
    >
      <Link href="/" className="mb-10 rounded-md" aria-label="4399 CRM home">
        <Logo />
      </Link>
      <span className="flex size-14 items-center justify-center rounded-2xl bg-accent text-accent-foreground">
        <Compass className="size-6" aria-hidden="true" />
      </span>
      <h1 className="mt-5 text-2xl font-semibold tracking-tight">
        We couldn&apos;t find that page
      </h1>
      <p className="mt-2 max-w-sm text-sm text-muted-foreground">
        It may have been deleted, or the link is from the 2021 app. (The original 404 page just said
        &ldquo;AHHHHHHHH&rdquo;.)
      </p>
      <div className="mt-6 flex gap-2">
        <Button asChild>
          <Link href="/home">Go to your home</Link>
        </Button>
        <Button asChild variant="outline">
          <Link href="/">Project page</Link>
        </Button>
      </div>
    </main>
  );
}
