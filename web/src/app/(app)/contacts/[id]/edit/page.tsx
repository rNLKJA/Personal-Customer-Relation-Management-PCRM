import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowLeft } from "lucide-react";
import { PageHeader } from "@/components/layout/page-header";
import { ContactForm } from "@/components/contacts/contact-form";
import { getContact } from "@/server/contacts";
import { requireUser } from "@/server/session";

export const metadata: Metadata = { title: "Edit contact" };

export default async function EditContactPage({ params }: PageProps<"/contacts/[id]/edit">) {
  const user = await requireUser();
  const { id } = await params;
  const found = await getContact(user.id, id);
  if (!found) notFound();
  const c = found.contact;
  return (
    <div className="animate-fade-up mx-auto max-w-2xl">
      <Link href={`/contacts/${c.id}`} className="text-muted-foreground hover:text-foreground mb-4 inline-flex items-center gap-1.5 rounded-md text-sm">
        <ArrowLeft className="size-4" aria-hidden="true" /> {c.firstName} {c.lastName}
      </Link>
      <PageHeader title="Edit contact" />
      <div className="bg-card rounded-2xl border p-5 shadow-(--shadow-soft) sm:p-6">
        <ContactForm
          id={c.id}
          initial={{
            firstName: c.firstName,
            lastName: c.lastName,
            occupation: c.occupation,
            phones: c.phones.length ? c.phones : [""],
            emails: c.emails.length ? c.emails : [""],
            note: c.note,
            customFields: c.customFields,
            portrait: c.portrait,
          }}
        />
      </div>
    </div>
  );
}
