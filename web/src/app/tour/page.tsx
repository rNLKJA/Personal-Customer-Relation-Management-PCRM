import type { Metadata } from "next";
import Link from "next/link";
import { ArrowRight, Contact, MapPinned, Sparkles, type LucideIcon } from "lucide-react";
import { Button } from "@/components/ui/button";
import { SubmitButton } from "@/components/common/submit-button";
import { WorkflowPlayer } from "@/components/tour/workflow-player";
import { ShotGallery, type GalleryShot } from "@/components/tour/shot-gallery";
import { guestLoginAction } from "@/server/actions/auth";
import { SITE } from "@/lib/site";
import {
  TOUR_SHOTS,
  TOUR_WORKFLOWS,
  formatClock,
  shotMedia,
  shotUrls,
  workflowMedia,
  workflowUrls,
} from "@/lib/tour";

export const metadata: Metadata = {
  title: "Tour",
  description:
    "Three short screen recordings of 4399 CRM (contacts and QR codes, logging a meeting on the map, and the optional AI assistant with a person in the loop) and screenshots of every key feature.",
};

const ICONS: Record<string, LucideIcon> = {
  "workflow-1-contacts": Contact,
  "workflow-2-meeting": MapPinned,
  "workflow-3-ai": Sparkles,
};

const recordedOn = (iso: string | null) =>
  iso
    ? new Intl.DateTimeFormat("en-AU", {
        day: "numeric",
        month: "long",
        year: "numeric",
        timeZone: "Australia/Melbourne",
      }).format(new Date(iso))
    : null;

export default function TourPage() {
  const workflows = TOUR_WORKFLOWS.map((w) => ({ ...w, media: workflowMedia(w.slug) }));
  const total = workflows.reduce((s, w) => s + w.media.duration, 0);
  const recorded = recordedOn(
    workflows.map((w) => w.media.recordedAt).find((d): d is string => Boolean(d)) ?? null,
  );
  const shots: GalleryShot[] = [...TOUR_SHOTS]
    .sort((a, b) => Number(Boolean(a.mobile)) - Number(Boolean(b.mobile)))
    .map((s) => ({
      ...s,
      mobile: Boolean(s.mobile),
      ...shotUrls(s.file),
      ...shotMedia(s.file),
    }));

  return (
    <div className="mx-auto max-w-6xl px-5 pt-10 pb-20 sm:px-8 lg:pt-14">
      <header className="max-w-3xl animate-fade-up">
        <p className="text-sm font-medium text-primary">Guided tour</p>
        <h1 className="mt-2 text-3xl font-semibold tracking-tight text-balance sm:text-4xl">
          See 4399 CRM in three short walkthroughs
        </h1>
        <p className="mt-4 text-muted-foreground">
          Screen recordings of the live site ({formatClock(total)} in total, no sound, captions on
          screen): adding people, logging a meeting on the map, and the optional AI assistant with a
          person deciding what is kept. Below them, screenshots of every key feature. Prefer to try
          it yourself? A guest sandbox takes one click.
        </p>
        <div className="mt-6 flex flex-wrap items-center gap-3">
          <form action={guestLoginAction}>
            <SubmitButton pendingLabel="Preparing your sandbox…">
              <Sparkles aria-hidden="true" /> Try it as a guest
            </SubmitButton>
          </form>
          <Button asChild variant="outline">
            <Link href="/methods">
              How it works <ArrowRight aria-hidden="true" />
            </Link>
          </Button>
        </div>
      </header>

      <nav aria-label="On this page" className="mt-10">
        <ol className="grid gap-3 sm:grid-cols-3">
          {workflows.map((w, i) => {
            const Icon = ICONS[w.slug] ?? Sparkles;
            return (
              <li key={w.slug}>
                <a
                  href={`#${w.slug}`}
                  className="flex h-full items-start gap-3 rounded-2xl border bg-card p-4 shadow-(--shadow-soft) transition-shadow hover:shadow-(--shadow-lifted)"
                >
                  <span className="flex size-9 shrink-0 items-center justify-center rounded-xl bg-accent text-accent-foreground">
                    <Icon className="size-4.5" aria-hidden="true" />
                  </span>
                  <span className="min-w-0">
                    <span className="tabular block text-xs text-muted-foreground">
                      Workflow {i + 1} · {formatClock(w.media.duration)}
                    </span>
                    <span className="block font-semibold tracking-tight">{w.title}</span>
                  </span>
                </a>
              </li>
            );
          })}
        </ol>
      </nav>

      <div className="mt-14 space-y-16">
        {workflows.map((w, i) => (
          <section
            key={w.slug}
            id={w.slug}
            aria-labelledby={`${w.slug}-title`}
            className="scroll-mt-24"
          >
            <p className="tabular text-sm font-medium text-primary">Workflow {i + 1}</p>
            <h2
              id={`${w.slug}-title`}
              className="mt-1 text-2xl font-semibold tracking-tight text-balance"
            >
              {w.title}
            </h2>
            <p className="mt-2 max-w-3xl text-muted-foreground">{w.summary}</p>
            <div className="mt-6">
              <WorkflowPlayer
                title={w.title}
                steps={w.steps}
                times={w.media.steps}
                duration={w.media.duration}
                width={w.media.width}
                height={w.media.height}
                mp4Bytes={w.media.mp4Bytes}
                {...workflowUrls(w.slug)}
              />
            </div>
          </section>
        ))}
      </div>

      <section id="screenshots" aria-labelledby="screenshots-title" className="mt-20 scroll-mt-24">
        <p className="text-sm font-medium text-primary">Screenshots</p>
        <h2 id="screenshots-title" className="mt-1 text-2xl font-semibold tracking-tight">
          Every key feature
        </h2>
        <p className="mt-2 max-w-3xl text-muted-foreground">
          Desktop at 1440 × 900 (light and dark), phones at 390 × 844. Select a screenshot to see it
          full size; the arrow keys move between them.
        </p>
        <div className="mt-8">
          <ShotGallery shots={shots} />
        </div>
      </section>

      <section
        id="how-recorded"
        aria-labelledby="how-recorded-title"
        className="mt-20 rounded-3xl border bg-surface/60 p-6 sm:p-8"
      >
        <h2 id="how-recorded-title" className="text-lg font-semibold tracking-tight">
          How these were made
        </h2>
        <ul className="mt-3 max-w-3xl list-disc space-y-2 pl-5 text-sm leading-relaxed text-muted-foreground">
          <li>
            A Playwright script drives Google Chrome through each journey on the live site
            {recorded ? <> (last recorded on {recorded})</> : null}. The same script is an
            end-to-end test: it fails if a step does not work. Captions and the cursor highlight are
            added by the script; long network waits are trimmed.
          </li>
          <li>
            The workflows run in a fresh guest sandbox, so the people and meetings are the generated
            sample data; Lena Park and the meeting with Ava Chen are added during the recording. The
            screenshots use the shared demo account and change nothing.
          </li>
          <li>
            <strong className="font-medium text-foreground">
              The AI response in workflow 3 is mocked for illustration.
            </strong>{" "}
            The request to the provider is intercepted inside the test browser and answered with a
            fixed reply that says it is mocked, and the &ldquo;key&rdquo; typed is a placeholder, so
            no model was called and no key was used. The redaction preview, the labels, the decision
            buttons and the AI log are the real app.
          </li>
          <li>
            Reproduce it with <code className="font-mono text-[13px]">pnpm showcase</code> in{" "}
            <code className="font-mono text-[13px]">web/</code> (see the{" "}
            <a href={`${SITE.repo}#showcase`} className="font-medium text-primary hover:underline">
              README
            </a>
            ).
          </li>
        </ul>
      </section>
    </div>
  );
}
