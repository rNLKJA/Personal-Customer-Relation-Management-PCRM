import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import {
  ArrowLeft,
  CalendarClock,
  Clock,
  Mail,
  MapPin,
  Pencil,
  Phone,
  Sparkles,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { PersonAvatar } from "@/components/common/person-avatar";
import { DeleteRecordButton } from "@/components/records/record-actions";
import { StaticPinMap } from "@/components/maps/static-pin-map";
import { getRecord } from "@/server/records";
import { listContactNames } from "@/server/contacts";
import { requireUser } from "@/server/session";
import { logActivity } from "@/server/activity";
import { MeetingAssistant } from "@/components/ai/meeting-assistant";
import { AiBadge } from "@/components/ai/ai-badge";
import { RemoveAiSummaryButton } from "@/components/ai/remove-ai-summary";
import { convert } from "@/lib/legacy/convert";
import { formatCoords, haversineKm, formatDistance, MELBOURNE_CBD } from "@/lib/geo";
import { APP_TIME_ZONE, formatDate, formatRelative, formatTime, requestNow } from "@/lib/time";

export async function generateMetadata({ params }: PageProps<"/records/[id]">): Promise<Metadata> {
  const user = await requireUser();
  const r = await getRecord(user.id, (await params).id);
  if (!r) return { title: "Meeting not found" };
  return { title: `Meeting with ${r.meetingPerson.firstName} ${r.meetingPerson.lastName}` };
}

export default async function RecordPage({ params }: PageProps<"/records/[id]">) {
  const user = await requireUser();
  const { id } = await params;
  const r = await getRecord(user.id, id);
  if (!r) notFound();
  const [addressBook] = await Promise.all([
    r.notes.trim() ? listContactNames(user.id) : Promise.resolve([]),
    logActivity(user.id, "view", "meeting", r.id),
  ]);
  const p = r.meetingPerson;
  const ai = r.aiSummary;
  const upcoming = r.dateTime.getTime() > requestNow();
  const hasPin = r.lat != null && r.lng != null;

  return (
    <div className="mx-auto max-w-3xl animate-fade-up">
      <Link
        href="/records"
        className="mb-4 inline-flex items-center gap-1.5 rounded-md text-sm text-muted-foreground hover:text-foreground"
      >
        <ArrowLeft className="size-4" aria-hidden="true" /> Meetings
      </Link>

      <article className="overflow-hidden rounded-3xl border bg-card shadow-(--shadow-soft)">
        <header className="p-5 sm:p-7">
          <div className="flex flex-wrap items-start justify-between gap-4">
            <div>
              <p
                className={
                  upcoming ? "text-sm font-medium text-primary" : "text-sm text-muted-foreground"
                }
              >
                {upcoming ? "Upcoming" : "Met"} {formatRelative(r.dateTime)}
              </p>
              <h1
                className="mt-1 text-2xl font-semibold tracking-tight"
                title={`2021 format: ${convert(r.dateTime, APP_TIME_ZONE)}`}
              >
                {formatDate(r.dateTime)}{" "}
                <span className="font-normal text-muted-foreground">
                  · {formatTime(r.dateTime)}
                </span>
              </h1>
            </div>
            <div className="flex gap-2">
              <Button asChild variant="outline">
                <Link href={`/records/${r.id}/edit`}>
                  <Pencil /> Edit
                </Link>
              </Button>
              <DeleteRecordButton id={r.id} />
            </div>
          </div>

          <div className="relative mt-6 flex items-center gap-3 rounded-2xl border bg-surface p-3 transition-colors hover:bg-muted">
            <PersonAvatar
              firstName={p.firstName}
              lastName={p.lastName}
              portrait={p.portrait}
              seed={p.id}
              size="lg"
            />
            <div className="min-w-0 flex-1">
              <Link
                href={`/contacts/${p.id}`}
                className="font-medium after:absolute after:inset-0 after:rounded-2xl"
              >
                {p.firstName} {p.lastName}
              </Link>
              <p className="truncate text-sm text-muted-foreground">{p.occupation}</p>
            </div>
            <div className="relative z-10 flex gap-1">
              {p.phones[0] && (
                <Button asChild size="icon" variant="ghost" aria-label={`Call ${p.firstName}`}>
                  <a href={`tel:${p.phones[0]}`}>
                    <Phone />
                  </a>
                </Button>
              )}
              {p.emails[0] && (
                <Button asChild size="icon" variant="ghost" aria-label={`E-mail ${p.firstName}`}>
                  <a href={`mailto:${p.emails[0]}`}>
                    <Mail />
                  </a>
                </Button>
              )}
            </div>
          </div>
        </header>

        <div className="space-y-6 border-t p-5 sm:p-7">
          <section aria-labelledby="where">
            <h2
              id="where"
              className="mb-2 flex items-center gap-1.5 text-xs font-medium tracking-wide text-muted-foreground uppercase"
            >
              <MapPin className="size-3.5" aria-hidden="true" /> Where
            </h2>
            <p className="text-sm">{r.location}</p>
            {hasPin ? (
              <>
                <p className="tabular mt-1 text-xs text-muted-foreground">
                  {formatCoords({ lat: r.lat!, lng: r.lng! }, 4)} ·{" "}
                  {formatDistance(haversineKm(MELBOURNE_CBD, { lat: r.lat!, lng: r.lng! }))} from
                  the CBD
                </p>
                <div className="mt-3">
                  <StaticPinMap
                    lat={r.lat!}
                    lng={r.lng!}
                    label={r.location}
                    firstName={p.firstName}
                    lastName={p.lastName}
                    seed={p.id}
                    upcoming={upcoming}
                  />
                </div>
              </>
            ) : (
              <p className="mt-1 text-xs text-muted-foreground">No map pin for this meeting.</p>
            )}
          </section>

          <section aria-labelledby="notes">
            <h2
              id="notes"
              className="mb-2 flex items-center gap-1.5 text-xs font-medium tracking-wide text-muted-foreground uppercase"
            >
              <Clock className="size-3.5" aria-hidden="true" /> Notes
            </h2>
            {r.notes ? (
              <p className="text-sm leading-relaxed whitespace-pre-line">{r.notes}</p>
            ) : (
              <p className="text-sm text-muted-foreground">No notes.</p>
            )}
          </section>

          {ai && (
            <section
              aria-labelledby="ai-summary-heading"
              className="rounded-2xl border bg-surface p-4"
            >
              <div className="flex flex-wrap items-center justify-between gap-2">
                <h2
                  id="ai-summary-heading"
                  className="flex items-center gap-1.5 text-xs font-medium tracking-wide text-muted-foreground uppercase"
                >
                  <Sparkles className="size-3.5" aria-hidden="true" /> AI-assisted summary
                </h2>
                <RemoveAiSummaryButton recordId={r.id} />
              </div>
              <AiBadge decision={ai.decision} className="mt-2" />
              <p className="mt-3 text-sm leading-relaxed">{ai.summary}</p>
              {ai.followUps.length > 0 && (
                <ul className="mt-3 space-y-1.5 text-sm">
                  {ai.followUps.map((f, i) => (
                    <li key={i} className="flex gap-2">
                      <span
                        className="mt-1.5 size-1.5 shrink-0 rounded-full bg-primary"
                        aria-hidden="true"
                      />
                      <span>
                        {f.action}
                        {f.due && <span className="text-muted-foreground"> · {f.due}</span>}
                      </span>
                    </li>
                  ))}
                </ul>
              )}
              <p className="mt-3 text-xs text-muted-foreground">
                {ai.model} · {ai.decision === "edited" ? "edited" : "accepted"}{" "}
                {formatRelative(ai.decidedAt)} ·{" "}
                <Link href="/ai-log" className="underline underline-offset-2 hover:text-foreground">
                  see the AI log
                </Link>
              </p>
            </section>
          )}

          <MeetingAssistant
            recordId={r.id}
            notes={r.notes}
            meetingDay={formatDate(r.dateTime)}
            knownNames={[p.firstName, p.lastName, user.firstName ?? "", user.lastName ?? ""]}
            addressBook={addressBook}
            hasAcceptedSummary={Boolean(ai)}
          />

          {r.customFields.length > 0 && (
            <section aria-labelledby="fields">
              <h2
                id="fields"
                className="mb-2 text-xs font-medium tracking-wide text-muted-foreground uppercase"
              >
                Custom fields
              </h2>
              <dl className="grid grid-cols-[auto_1fr] gap-x-4 gap-y-1.5 text-sm">
                {r.customFields.map((f, i) => (
                  <div key={i} className="contents">
                    <dt className="text-muted-foreground">{f.field}</dt>
                    <dd>{f.value}</dd>
                  </div>
                ))}
              </dl>
            </section>
          )}
        </div>
        <footer className="flex items-center gap-1.5 border-t bg-surface px-5 py-3 text-xs text-muted-foreground sm:px-7">
          <CalendarClock className="size-3.5" aria-hidden="true" /> Logged{" "}
          {formatRelative(r.createdAt)}
        </footer>
      </article>
    </div>
  );
}
