import { Clock, HardDrive } from "lucide-react";
import { formatRelative } from "@/lib/time";

/** Small banners shown above page content in special demo modes. */
export function DemoNotices({
  ephemeral,
  guestExpiresAt,
}: {
  ephemeral: boolean;
  guestExpiresAt: Date | null;
}) {
  if (!ephemeral && !guestExpiresAt) return null;
  // A labelled <section> is a region landmark, so the banner is not orphaned
  // content outside the page landmarks (axe "region").
  return (
    <section aria-label="Demo notice" className="border-b bg-accent/50 text-accent-foreground">
      <div className="mx-auto flex max-w-6xl flex-wrap items-center gap-x-5 gap-y-1 px-4 py-2 text-xs sm:px-6 lg:px-10">
        {guestExpiresAt && (
          <span className="inline-flex items-center gap-1.5">
            <Clock className="size-3.5" aria-hidden="true" />
            Guest sandbox - your private copy of the demo data is deleted{" "}
            {formatRelative(guestExpiresAt)}.
          </span>
        )}
        {ephemeral && (
          <span className="inline-flex items-center gap-1.5">
            <HardDrive className="size-3.5" aria-hidden="true" />
            Demo storage resets periodically.
          </span>
        )}
      </div>
    </section>
  );
}
