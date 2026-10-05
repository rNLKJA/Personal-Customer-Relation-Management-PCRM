import type { Metadata } from "next";
import Link from "next/link";
import { ArrowLeft } from "lucide-react";
import { PageHeader } from "@/components/layout/page-header";
import { RecordForm } from "@/components/records/record-form";
import { contactOptions } from "@/server/contacts";
import { requireUser } from "@/server/session";
import { toZonedInputValue } from "@/lib/time";

export const metadata: Metadata = { title: "Log a meeting" };

export default async function NewRecordPage({ searchParams }: PageProps<"/records/new">) {
  const user = await requireUser();
  const sp = await searchParams;
  const contacts = await contactOptions(user.id);
  const preset = typeof sp.contact === "string" && contacts.some((c) => c.id === sp.contact) ? sp.contact : "";
  const now = new Date();
  now.setSeconds(0, 0);
  const day = typeof sp.date === "string" && /^\d{4}-\d{2}-\d{2}$/.test(sp.date) ? sp.date : null;
  return (
    <div className="animate-fade-up mx-auto max-w-3xl">
      <Link href="/records" className="text-muted-foreground hover:text-foreground mb-4 inline-flex items-center gap-1.5 rounded-md text-sm">
        <ArrowLeft className="size-4" aria-hidden="true" /> Meetings
      </Link>
      <PageHeader title="Log a meeting" description="Record who you met, where and when - past or planned." />
      <div className="bg-card rounded-2xl border p-5 shadow-(--shadow-soft) sm:p-6">
        <RecordForm
          contacts={contacts}
          initial={{
            contactId: preset,
            dateTime: day ? `${day}T10:00` : toZonedInputValue(now),
            location: "",
            lat: null,
            lng: null,
            notes: "",
            customFields: [],
          }}
        />
      </div>
    </div>
  );
}
