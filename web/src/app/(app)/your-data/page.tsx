import type { Metadata } from "next";
import Link from "next/link";
import {
  Ban,
  Download,
  FileJson,
  FileSpreadsheet,
  History,
  ShieldCheck,
  Sparkles,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { PageHeader } from "@/components/layout/page-header";
import { DeleteAccountButton } from "@/components/privacy/delete-account";
import { requireUser } from "@/server/session";
import { isSharedDemo } from "@/server/users";
import { dataInventory } from "@/server/your-data";
import { DATA_INVENTORY, NOT_COLLECTED } from "@/lib/retention";
import { formatRelative } from "@/lib/time";

export const metadata: Metadata = { title: "Your data" };

const CSV_FILES = [
  { file: "contacts.csv", label: "Contacts" },
  { file: "meetings.csv", label: "Meetings" },
  { file: "activity.csv", label: "Activity log" },
  { file: "ai-log.csv", label: "AI log" },
] as const;

export default async function YourDataPage() {
  const user = await requireUser();
  const counts = await dataInventory(user.id);
  const shared = isSharedDemo(user);
  const guest = Boolean(user.expiresAt && !user.isDemo);

  return (
    <div className="mx-auto max-w-4xl animate-fade-up space-y-6">
      <PageHeader
        title="Your data"
        description="Everything 4399 CRM stores about your account: download it, see why it is kept and for how long, or delete it all."
      />

      <section aria-label="What is stored" className="grid grid-cols-2 gap-3 sm:grid-cols-4">
        <Count label="Contacts" value={counts.contacts} href="/contacts" />
        <Count label="Meetings" value={counts.meetings} href="/records" />
        <Count label="Activity entries" value={counts.activity} href="/activity" />
        <Count label="AI calls" value={counts.aiCalls} href="/ai-log" />
      </section>

      <Card
        icon={Download}
        title="Download everything"
        description="A complete copy in a machine-readable format. The password hash is left out; nothing else is."
      >
        <div className="flex flex-wrap gap-2">
          <Button asChild>
            <a href="/your-data/export/data.json" download>
              <FileJson /> All data (JSON)
            </a>
          </Button>
          {CSV_FILES.map((f) => (
            <Button key={f.file} asChild variant="outline">
              <a href={`/your-data/export/${f.file}`} download>
                <FileSpreadsheet /> {f.label} (CSV)
              </a>
            </Button>
          ))}
        </div>
        <p className="mt-3 text-xs text-muted-foreground">
          Each download is recorded in your{" "}
          <Link href="/activity?filter=account" className="underline underline-offset-2">
            activity log
          </Link>
          .
        </p>
      </Card>

      <Card
        icon={ShieldCheck}
        title="What is stored, why, and for how long"
        description="Data minimisation: the app keeps what the features need and nothing about how you use it beyond the activity log below."
      >
        <div
          className="-mx-1 overflow-x-auto px-1"
          tabIndex={0}
          role="region"
          aria-label="Data inventory"
        >
          <table className="w-full min-w-[560px] text-left text-sm">
            <thead className="text-xs text-muted-foreground">
              <tr className="border-b">
                <th scope="col" className="py-2 pr-4 font-medium">
                  What
                </th>
                <th scope="col" className="py-2 pr-4 font-medium">
                  Why
                </th>
                <th scope="col" className="py-2 font-medium">
                  Kept for
                </th>
              </tr>
            </thead>
            <tbody className="divide-y align-top">
              {DATA_INVENTORY.map((row) => (
                <tr key={row.what}>
                  <td className="py-2.5 pr-4 font-medium">{row.what}</td>
                  <td className="py-2.5 pr-4 text-muted-foreground">{row.why}</td>
                  <td className="py-2.5 text-muted-foreground">{row.kept}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        <h3 className="mt-5 flex items-center gap-1.5 text-sm font-semibold">
          <Ban className="size-4 text-muted-foreground" aria-hidden="true" /> Not collected
        </h3>
        <ul className="mt-2 space-y-1.5 text-sm text-muted-foreground">
          {NOT_COLLECTED.map((item) => (
            <li key={item} className="flex gap-2">
              <span
                className="mt-2 size-1.5 shrink-0 rounded-full bg-muted-foreground/50"
                aria-hidden="true"
              />
              {item}
            </li>
          ))}
        </ul>
        <div className="mt-5 flex flex-wrap gap-2">
          <Button asChild variant="outline" size="sm">
            <Link href="/activity">
              <History /> Activity log
            </Link>
          </Button>
          <Button asChild variant="outline" size="sm">
            <Link href="/ai-log">
              <Sparkles /> AI log
            </Link>
          </Button>
          <Button asChild variant="ghost" size="sm">
            <Link href="/methods#privacy">Privacy design notes</Link>
          </Button>
        </div>
      </Card>

      <section
        aria-labelledby="danger"
        className="rounded-2xl border border-destructive/30 bg-card p-5 shadow-(--shadow-soft) sm:p-6"
      >
        <h2 id="danger" className="text-base font-semibold tracking-tight text-destructive">
          Delete your account
        </h2>
        <p className="mt-1 mb-4 text-sm text-muted-foreground">
          A hard delete, not a deactivation: the account row and every contact, meeting, activity
          entry, AI-log entry, invitation and demo-inbox e-mail that belongs to it are removed from
          the database straight away. People who added you as a contact keep their own copy of your
          details, unlinked. One anonymous row (counts only, no user id) records that a deletion
          happened.
          {guest && user.expiresAt
            ? ` This guest sandbox would also be deleted automatically ${formatRelative(user.expiresAt)}.`
            : ""}
        </p>
        <DeleteAccountButton
          userName={user.userName}
          counts={{
            contacts: counts.contacts,
            meetings: counts.meetings,
            activity: counts.activity,
            aiCalls: counts.aiCalls,
          }}
          disabledReason={
            shared
              ? 'The shared demo accounts cannot be deleted. Start a guest sandbox (sign out, then "Try as guest") to try deletion end to end.'
              : undefined
          }
        />
      </section>
    </div>
  );
}

function Count({ label, value, href }: { label: string; value: number; href: string }) {
  return (
    <Link
      href={href}
      className="rounded-2xl border bg-card p-4 shadow-(--shadow-soft) transition-shadow hover:shadow-(--shadow-lifted)"
    >
      <p className="text-xs font-medium text-muted-foreground">{label}</p>
      <p className="tabular mt-1.5 text-2xl font-semibold tracking-tight">{value}</p>
    </Link>
  );
}

function Card({
  icon: Icon,
  title,
  description,
  children,
}: {
  icon: typeof Download;
  title: string;
  description: string;
  children: React.ReactNode;
}) {
  return (
    <section className="rounded-2xl border bg-card p-5 shadow-(--shadow-soft) sm:p-6">
      <h2 className="flex items-center gap-2 text-base font-semibold tracking-tight">
        <Icon className="size-4 text-primary" aria-hidden="true" /> {title}
      </h2>
      <p className="mt-1 mb-4 text-sm text-muted-foreground">{description}</p>
      {children}
    </section>
  );
}
