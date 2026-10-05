import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import {
  ArrowLeft,
  BadgeCheck,
  CalendarPlus,
  Mail,
  NotebookPen,
  Pencil,
  Phone,
  RefreshCw,
  UserRoundPlus,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { PersonAvatar } from "@/components/common/person-avatar";
import { EmptyState } from "@/components/common/empty-state";
import { MeetingRow } from "@/components/records/meeting-row";
import { DeleteContactButton, InviteButton, SyncButton } from "@/components/contacts/contact-actions";
import { getContact } from "@/server/contacts";
import { listRecords } from "@/server/records";
import { requireUser } from "@/server/session";
import { convert } from "@/lib/legacy/convert";
import { syncFieldLabels } from "@/lib/labels";
import { APP_TIME_ZONE, requestNow } from "@/lib/time";

export async function generateMetadata({ params }: PageProps<"/contacts/[id]">): Promise<Metadata> {
  const user = await requireUser();
  const found = await getContact(user.id, (await params).id);
  return { title: found ? `${found.contact.firstName} ${found.contact.lastName}` : "Contact" };
}

export default async function ContactPage({ params }: PageProps<"/contacts/[id]">) {
  const user = await requireUser();
  const { id } = await params;
  const found = await getContact(user.id, id);
  if (!found) notFound();
  const { contact: c, linked, pendingSync } = found;
  const meetings = await listRecords(user.id, { contactId: c.id });
  const now = requestNow();
  const name = `${c.firstName} ${c.lastName}`;
  const syncKeys = Object.keys(pendingSync);

  return (
    <div className="animate-fade-up mx-auto max-w-4xl">
      <Link href="/contacts" className="text-muted-foreground hover:text-foreground mb-4 inline-flex items-center gap-1.5 rounded-md text-sm">
        <ArrowLeft className="size-4" aria-hidden="true" /> Contacts
      </Link>

      <section className="bg-card rounded-3xl border p-5 shadow-(--shadow-soft) sm:p-7">
        <div className="flex flex-col gap-5 sm:flex-row sm:items-center">
          <PersonAvatar firstName={c.firstName} lastName={c.lastName} portrait={c.portrait} seed={c.id} size="xl" />
          <div className="min-w-0 flex-1">
            <h1 className="flex items-center gap-2 text-2xl font-semibold tracking-tight">
              {name}
              {linked && <BadgeCheck className="text-primary size-5" aria-label="Has a 4399 CRM account" />}
            </h1>
            <p className="text-muted-foreground">{c.occupation}</p>
            <p className="text-muted-foreground mt-1 text-xs">
              {linked ? (
                <>
                  On 4399 CRM as <span className="text-primary font-medium">@{linked.userName}</span> ·{" "}
                </>
              ) : null}
              Added <time dateTime={c.addDate.toISOString()}>{convert(c.addDate, APP_TIME_ZONE)}</time>
            </p>
          </div>
          <div className="flex flex-wrap gap-2">
            <Button asChild>
              <Link href={`/records/new?contact=${c.id}`}>
                <CalendarPlus /> Log meeting
              </Link>
            </Button>
            <Button asChild variant="outline">
              <Link href={`/contacts/${c.id}/edit`}>
                <Pencil /> Edit
              </Link>
            </Button>
            <DeleteContactButton id={c.id} name={name} meetings={meetings.length} />
          </div>
        </div>

        {linked && syncKeys.length > 0 && (
          <div className="border-primary/20 bg-accent/50 mt-5 flex flex-wrap items-center gap-3 rounded-2xl border px-4 py-3">
            <RefreshCw className="text-primary size-4 shrink-0" aria-hidden="true" />
            <p className="min-w-0 flex-1 text-sm">
              <strong className="font-medium">@{linked.userName}</strong> has newer details on their profile:{" "}
              {syncFieldLabels(syncKeys)}.
            </p>
            <SyncButton id={c.id} />
          </div>
        )}
        {!linked && (
          <div className="bg-muted/60 mt-5 flex flex-wrap items-center gap-3 rounded-2xl px-4 py-3">
            <UserRoundPlus className="text-muted-foreground size-4 shrink-0" aria-hidden="true" />
            <p className="text-muted-foreground min-w-0 flex-1 text-sm">
              {c.emails[0] ? (
                <>
                  {c.firstName} isn&apos;t on 4399 CRM yet. Invite them - they get a sign-up link valid for 15
                  minutes, and their account is linked to this contact.
                </>
              ) : (
                <>Add an e-mail address to invite {c.firstName} to 4399 CRM.</>
              )}
            </p>
            {c.emails[0] && <InviteButton id={c.id} />}
          </div>
        )}
      </section>

      <div className="mt-6 grid gap-6 lg:grid-cols-[1fr_1.2fr]">
        <section className="bg-card space-y-5 rounded-2xl border p-5 shadow-(--shadow-soft)" aria-label="Details">
          <Detail label="Phone">
            {c.phones.length ? (
              <ul className="space-y-1">
                {c.phones.map((p) => (
                  <li key={p}>
                    <a href={`tel:${p}`} className="hover:text-primary inline-flex items-center gap-2 text-sm tabular">
                      <Phone className="text-muted-foreground size-3.5" aria-hidden="true" /> {p}
                    </a>
                  </li>
                ))}
              </ul>
            ) : (
              <Empty />
            )}
          </Detail>
          <Detail label="E-mail">
            {c.emails.length ? (
              <ul className="space-y-1">
                {c.emails.map((m) => (
                  <li key={m}>
                    <a href={`mailto:${m}`} className="hover:text-primary inline-flex items-center gap-2 text-sm break-all">
                      <Mail className="text-muted-foreground size-3.5 shrink-0" aria-hidden="true" /> {m}
                    </a>
                  </li>
                ))}
              </ul>
            ) : (
              <Empty />
            )}
          </Detail>
          <Detail label="Notes">
            {c.note ? <p className="text-sm whitespace-pre-line">{c.note}</p> : <Empty />}
          </Detail>
          {c.customFields.length > 0 && (
            <Detail label="Custom fields">
              <dl className="grid grid-cols-[auto_1fr] gap-x-4 gap-y-1.5 text-sm">
                {c.customFields.map((f, i) => (
                  <div key={i} className="contents">
                    <dt className="text-muted-foreground">{f.field}</dt>
                    <dd>{f.value}</dd>
                  </div>
                ))}
              </dl>
            </Detail>
          )}
        </section>

        <section className="bg-card rounded-2xl border p-5 shadow-(--shadow-soft)" aria-labelledby="meetings-heading">
          <div className="flex items-center justify-between">
            <h2 id="meetings-heading" className="text-sm font-semibold tracking-tight">
              Meetings <span className="text-muted-foreground font-normal">· {meetings.length}</span>
            </h2>
          </div>
          {meetings.length ? (
            <div className="mt-2">
              {meetings.map((r) => (
                <MeetingRow key={r.id} record={r} upcoming={r.dateTime.getTime() > now} />
              ))}
            </div>
          ) : (
            <EmptyState
              className="mt-3 py-8"
              icon={NotebookPen}
              title={`No meetings with ${c.firstName} yet`}
              description="Log where and when you met - it will show up on your map and calendar."
              action={
                <Button asChild size="sm">
                  <Link href={`/records/new?contact=${c.id}`}>Log the first one</Link>
                </Button>
              }
            />
          )}
        </section>
      </div>
    </div>
  );
}

function Detail({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div>
      <h2 className="text-muted-foreground mb-1.5 text-xs font-medium tracking-wide uppercase">{label}</h2>
      {children}
    </div>
  );
}

function Empty() {
  return <p className="text-muted-foreground text-sm">-</p>;
}
