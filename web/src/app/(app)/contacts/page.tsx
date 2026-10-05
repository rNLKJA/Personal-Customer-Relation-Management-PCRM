import type { Metadata } from "next";
import Link from "next/link";
import { QrCode, UserPlus } from "lucide-react";
import { Button } from "@/components/ui/button";
import { PageHeader } from "@/components/layout/page-header";
import { ContactsBrowser } from "@/components/contacts/contacts-browser";
import { listContacts } from "@/server/contacts";
import { requireUser } from "@/server/session";

export const metadata: Metadata = { title: "Contacts" };

export default async function ContactsPage({ searchParams }: PageProps<"/contacts">) {
  const user = await requireUser();
  const sp = await searchParams;
  const contacts = await listContacts(user.id);
  return (
    <div className="animate-fade-up">
      <PageHeader
        title="Contacts"
        description="Everyone in your address book, with their details and how often you meet."
        actions={
          <>
            <Button asChild variant="outline">
              <Link href="/contacts/add?tab=scan">
                <QrCode /> <span className="hidden sm:inline">Add by</span> QR / user name
              </Link>
            </Button>
            <Button asChild>
              <Link href="/contacts/new">
                <UserPlus /> New contact
              </Link>
            </Button>
          </>
        }
      />
      <ContactsBrowser
        contacts={contacts.map((c) => ({
          id: c.id,
          firstName: c.firstName,
          lastName: c.lastName,
          occupation: c.occupation,
          note: c.note,
          phones: c.phones,
          emails: c.emails,
          portrait: c.portrait,
          addDate: c.addDate,
          linkedUserId: c.linkedUserId,
          linkedUserName: c.linkedUserName,
          meetingCount: c.meetingCount,
          nextMeeting: c.nextMeeting,
        }))}
        initialFilter={sp.filter === "linked" ? "linked" : "all"}
      />
    </div>
  );
}
