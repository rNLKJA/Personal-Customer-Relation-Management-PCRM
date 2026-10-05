import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowLeft } from "lucide-react";
import { PageHeader } from "@/components/layout/page-header";
import { RecordForm } from "@/components/records/record-form";
import { contactOptions } from "@/server/contacts";
import { getRecord } from "@/server/records";
import { requireUser } from "@/server/session";
import { toZonedInputValue } from "@/lib/time";

export const metadata: Metadata = { title: "Edit meeting" };

export default async function EditRecordPage({ params }: PageProps<"/records/[id]/edit">) {
  const user = await requireUser();
  const { id } = await params;
  const [record, contacts] = await Promise.all([getRecord(user.id, id), contactOptions(user.id)]);
  if (!record) notFound();
  return (
    <div className="mx-auto max-w-3xl animate-fade-up">
      <Link
        href={`/records/${record.id}`}
        className="mb-4 inline-flex items-center gap-1.5 rounded-md text-sm text-muted-foreground hover:text-foreground"
      >
        <ArrowLeft className="size-4" aria-hidden="true" /> Meeting
      </Link>
      <PageHeader title="Edit meeting" />
      <div className="rounded-2xl border bg-card p-5 shadow-(--shadow-soft) sm:p-6">
        <RecordForm
          id={record.id}
          contacts={contacts}
          initial={{
            contactId: record.contactId,
            dateTime: toZonedInputValue(record.dateTime),
            location: record.location,
            lat: record.lat,
            lng: record.lng,
            notes: record.notes,
            customFields: record.customFields,
          }}
        />
      </div>
    </div>
  );
}
