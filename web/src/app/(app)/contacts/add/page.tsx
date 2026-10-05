import type { Metadata } from "next";
import Link from "next/link";
import { ArrowLeft } from "lucide-react";
import { PageHeader } from "@/components/layout/page-header";
import { AddContactHub } from "@/components/contacts/add-contact-hub";
import { requireUser } from "@/server/session";
import { myQrCode } from "@/server/qr";
import { parseQrPayload } from "@/lib/qr";

export const metadata: Metadata = { title: "Add a contact" };

export default async function AddContactPage({ searchParams }: PageProps<"/contacts/add">) {
  const user = await requireUser();
  const sp = await searchParams;
  const prefill = typeof sp.u === "string" ? parseQrPayload(sp.u) : null;
  const tab = sp.tab === "username" || sp.tab === "code" ? sp.tab : prefill ? "username" : "scan";
  const { svg, link } = await myQrCode(user.userName);
  return (
    <div className="mx-auto max-w-2xl animate-fade-up">
      <Link
        href="/contacts"
        className="mb-4 inline-flex items-center gap-1.5 rounded-md text-sm text-muted-foreground hover:text-foreground"
      >
        <ArrowLeft className="size-4" aria-hidden="true" /> Contacts
      </Link>
      <PageHeader
        title="Add a contact"
        description="Meet someone who uses 4399 CRM? Swap codes - their details are copied in and stay linked."
      />
      <AddContactHub
        initialTab={tab}
        prefillUserName={
          prefill && prefill.toLowerCase() !== user.userName.toLowerCase() ? prefill : null
        }
        myUserName={user.userName}
        qrSvg={svg}
        qrLink={link}
      />
    </div>
  );
}
