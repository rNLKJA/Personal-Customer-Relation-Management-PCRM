import type { Metadata } from "next";
import Link from "next/link";
import { ArrowLeft, QrCode } from "lucide-react";
import { PageHeader } from "@/components/layout/page-header";
import { ContactForm } from "@/components/contacts/contact-form";
import { DemoDataBanner } from "@/components/common/demo-data-banner";

export const metadata: Metadata = { title: "New contact" };

export default function NewContactPage() {
  return (
    <div className="animate-fade-up mx-auto max-w-2xl">
      <Link href="/contacts" className="text-muted-foreground hover:text-foreground mb-4 inline-flex items-center gap-1.5 rounded-md text-sm">
        <ArrowLeft className="size-4" aria-hidden="true" /> Contacts
      </Link>
      <PageHeader
        title="New contact"
        description={
          <>
            If they already use 4399 CRM, it&apos;s quicker to{" "}
            <Link href="/contacts/add?tab=scan" className="text-primary inline-flex items-center gap-1 font-medium hover:underline">
              <QrCode className="size-3.5" aria-hidden="true" /> scan their code
            </Link>
            .
          </>
        }
      />
      <DemoDataBanner className="mb-6" />
      <div className="bg-card rounded-2xl border p-5 shadow-(--shadow-soft) sm:p-6">
        <ContactForm />
      </div>
    </div>
  );
}
