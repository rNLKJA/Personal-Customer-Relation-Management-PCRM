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
    <div className="animate-fade-up mx-auto max-w-3xl">
      <Link href={`/records/${record.id}`} className="text-muted-foreground hover:text-foreground mb-4 inline-flex items-center gap-1.5 rounded-md text-sm">
        <ArrowLeft className="size-4" aria-hidden="true" /> Meeting
      </Link>
      <PageHeader title="Edit meeting" />
      <div className="bg-card rounded-2xl border p-5 shadow-(--shadow-soft) sm:p-6">
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
