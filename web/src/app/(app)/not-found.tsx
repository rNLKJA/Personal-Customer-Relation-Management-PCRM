import Link from "next/link";
import { Compass } from "lucide-react";
import { Button } from "@/components/ui/button";
import { getStorageMode } from "@/db/client";

/**
 * In-app 404 for a missing contact or meeting. It renders inside the app shell,
 * which already provides the `<main>` landmark and the logo, so unlike the root
 * not-found page it adds neither.
 */
export default function AppNotFound() {
  const ephemeral = getStorageMode() === "ephemeral";
  return (
    <div className="flex min-h-[60dvh] animate-fade-up flex-col items-center justify-center px-2 text-center">
      <span className="flex size-14 items-center justify-center rounded-2xl bg-accent text-accent-foreground">
        <Compass className="size-6" aria-hidden="true" />
      </span>
      <h1 className="mt-5 text-2xl font-semibold tracking-tight">We couldn&apos;t find that</h1>
      <p className="mt-2 max-w-sm text-sm text-balance text-muted-foreground">
        It may have been deleted, or the link is from the 2021 app. (The original 404 page just said
        &ldquo;AHHHHHHHH&rdquo;.)
      </p>
      {ephemeral && (
        <p className="mt-2 max-w-sm text-sm text-balance text-muted-foreground">
          Demo storage resets periodically, so something added a while ago may already be gone.
        </p>
      )}
      <div className="mt-6 flex flex-wrap justify-center gap-2">
        <Button asChild>
          <Link href="/home">Go to your home</Link>
        </Button>
        <Button asChild variant="outline">
          <Link href="/contacts">Contacts</Link>
        </Button>
        <Button asChild variant="outline">
          <Link href="/records">Meetings</Link>
        </Button>
      </div>
    </div>
  );
}
