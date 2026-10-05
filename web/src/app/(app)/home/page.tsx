import type { Metadata } from "next";
import Link from "next/link";
import {
  ArrowRight,
  CalendarClock,
  CalendarDays,
  HeartHandshake,
  NotebookPen,
  QrCode,
  UserPlus,
  Users,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { EmptyState } from "@/components/common/empty-state";
import { MeetingRow } from "@/components/records/meeting-row";
import { ContactRow } from "@/components/contacts/contact-row";
import { listContacts } from "@/server/contacts";
import { listRecords } from "@/server/records";
import { displayName } from "@/server/users";
import { requireUser } from "@/server/session";
import { countThisMonth, greeting, reconnectCandidates, splitByNow } from "@/lib/insights";
import { formatDate, formatRelative } from "@/lib/time";

export const metadata: Metadata = { title: "Home" };

const WELCOME: Record<string, string> = {
  "1": "Your account is ready. Start by adding someone you met recently.",
  guest:
    "This is your private guest sandbox - a copy of the demo address book that only you can see.",
  invite: "Your account is active now! The person who invited you is already connected.",
};

export default async function HomePage({ searchParams }: PageProps<"/home">) {
  const user = await requireUser();
  const sp = await searchParams;
  const [contacts, records] = await Promise.all([listContacts(user.id), listRecords(user.id)]);
  const now = new Date();
  const { upcoming, past } = splitByNow(records, now);
  const reconnect = reconnectCandidates(contacts, now).slice(0, 4);
  const welcome = typeof sp.welcome === "string" ? WELCOME[sp.welcome] : undefined;

  const stats = [
    { label: "Contacts", value: contacts.length, icon: Users, href: "/contacts" },
    {
      label: "Meetings this month",
      value: countThisMonth(records, now),
      icon: CalendarDays,
      href: "/calendar",
    },
    { label: "Upcoming", value: upcoming.length, icon: CalendarClock, href: "/records" },
    {
      label: "On 4399 CRM",
      value: contacts.filter((c) => c.linkedUserId).length,
      icon: HeartHandshake,
      href: "/contacts?filter=linked",
    },
  ];

  return (
    <div className="animate-fade-up space-y-8">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <p className="text-sm text-muted-foreground">{formatDate(now)}</p>
          <h1 className="mt-1 text-2xl font-semibold tracking-tight sm:text-3xl">
            {greeting(now)}, {user.firstName || displayName(user)}.
          </h1>
          <p className="mt-1 text-sm text-muted-foreground">Enjoy your day!</p>
        </div>
        <div className="flex flex-wrap gap-2">
          <Button asChild variant="outline">
            <Link href="/contacts/add?tab=scan">
              <QrCode /> Scan a code
            </Link>
          </Button>
          <Button asChild variant="outline">
            <Link href="/contacts/new">
              <UserPlus /> New contact
            </Link>
          </Button>
          <Button asChild>
            <Link href="/records/new">
              <NotebookPen /> Log a meeting
            </Link>
          </Button>
        </div>
      </div>

      {welcome && (
        <div className="rounded-2xl border border-primary/20 bg-accent/60 px-4 py-3 text-sm text-accent-foreground">
          {welcome}
        </div>
      )}

      <section aria-label="Overview" className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        {stats.map((s) => (
          <Link
            key={s.label}
            href={s.href}
            className="group rounded-2xl border bg-card p-4 shadow-(--shadow-soft) transition-shadow hover:shadow-(--shadow-lifted)"
          >
            <div className="flex items-center justify-between text-xs font-medium text-muted-foreground">
              {s.label}
              <s.icon
                className="size-4 transition-colors group-hover:text-primary"
                aria-hidden="true"
              />
            </div>
            <p className="tabular mt-2 text-3xl font-semibold tracking-tight">{s.value}</p>
          </Link>
        ))}
      </section>

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-[minmax(0,1.25fr)_minmax(0,1fr)]">
        <section
          className="rounded-2xl border bg-card p-5 shadow-(--shadow-soft)"
          aria-labelledby="up-next"
        >
          <SectionHead id="up-next" title="Up next" href="/calendar" linkLabel="Calendar" />
          {upcoming.length ? (
            <div className="mt-2">
              {upcoming.slice(0, 4).map((r) => (
                <MeetingRow key={r.id} record={r} upcoming />
              ))}
            </div>
          ) : (
            <EmptyState
              className="mt-3 py-8"
              icon={CalendarClock}
              title="Nothing planned"
              description="Meetings you schedule in the future show up here."
              action={
                <Button asChild size="sm">
                  <Link href="/records/new">Plan a meeting</Link>
                </Button>
              }
            />
          )}
          <SectionHead title="Recently" href="/records" linkLabel="All meetings" className="mt-6" />
          {past.length ? (
            <div className="mt-2">
              {past.slice(0, 4).map((r) => (
                <MeetingRow key={r.id} record={r} />
              ))}
            </div>
          ) : (
            <p className="mt-3 text-sm text-muted-foreground">No meetings logged yet.</p>
          )}
        </section>

        <div className="min-w-0 space-y-6">
          <section
            className="rounded-2xl border bg-card p-5 shadow-(--shadow-soft)"
            aria-labelledby="reconnect"
          >
            <SectionHead id="reconnect" title="Time to reconnect" />
            <p className="mt-1 text-xs text-muted-foreground">
              No meeting in the last 45 days and nothing planned.
            </p>
            {reconnect.length ? (
              <div className="mt-2">
                {reconnect.map((c) => (
                  <ContactRow
                    key={c.id}
                    contact={c}
                    meta={c.lastMeeting ? `met ${formatRelative(c.lastMeeting, now)}` : "never met"}
                  />
                ))}
              </div>
            ) : (
              <p className="mt-3 text-sm text-muted-foreground">
                You&apos;re keeping in touch with everyone. Nice.
              </p>
            )}
          </section>
          <section
            className="rounded-2xl border bg-card p-5 shadow-(--shadow-soft)"
            aria-labelledby="new-contacts"
          >
            <SectionHead
              id="new-contacts"
              title="Recently added"
              href="/contacts"
              linkLabel="Contacts"
            />
            {contacts.length ? (
              <div className="mt-2">
                {contacts.slice(0, 4).map((c) => (
                  <ContactRow key={c.id} contact={c} meta={formatRelative(c.addDate, now)} />
                ))}
              </div>
            ) : (
              <EmptyState
                className="mt-3 py-8"
                icon={Users}
                title="Your address book is empty"
                description="Add someone by hand, by user name, or by scanning their QR code."
                action={
                  <Button asChild size="sm">
                    <Link href="/contacts/new">Add a contact</Link>
                  </Button>
                }
              />
            )}
          </section>
        </div>
      </div>
    </div>
  );
}

function SectionHead({
  id,
  title,
  href,
  linkLabel,
  className,
}: {
  id?: string;
  title: string;
  href?: string;
  linkLabel?: string;
  className?: string;
}) {
  return (
    <div className={`flex items-center justify-between ${className ?? ""}`}>
      <h2 id={id} className="text-sm font-semibold tracking-tight">
        {title}
      </h2>
      {href && (
        <Link
          href={href}
          className="inline-flex items-center gap-1 text-xs font-medium text-muted-foreground hover:text-primary"
        >
          {linkLabel} <ArrowRight className="size-3" aria-hidden="true" />
        </Link>
      )}
    </div>
  );
}
