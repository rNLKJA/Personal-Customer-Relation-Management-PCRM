import type { Metadata } from "next";
import Link from "next/link";
import { NotebookPen } from "lucide-react";
import { Button } from "@/components/ui/button";
import { PageHeader } from "@/components/layout/page-header";
import { RecordsBrowser } from "@/components/records/records-browser";
import { ViewSwitch } from "@/components/records/view-switch";
import { listRecords } from "@/server/records";
import { requireUser } from "@/server/session";
import { requestNow } from "@/lib/time";

export const metadata: Metadata = { title: "Meetings" };

export default async function RecordsPage() {
  const user = await requireUser();
  const records = await listRecords(user.id);
  return (
    <div className="animate-fade-up">
      <PageHeader
        title="Meetings"
        description="Every meeting record - who, where and when."
        actions={
          <Button asChild>
            <Link href="/records/new">
              <NotebookPen /> Log a meeting
            </Link>
          </Button>
        }
      />
      <div className="mb-5">
        <ViewSwitch current="/records" />
      </div>
      <RecordsBrowser
        now={requestNow()}
        records={records.map((r) => ({
          id: r.id,
          dateTime: r.dateTime,
          location: r.location,
          notes: r.notes,
          meetingPerson: {
            id: r.meetingPerson.id,
            firstName: r.meetingPerson.firstName,
            lastName: r.meetingPerson.lastName,
            portrait: r.meetingPerson.portrait,
          },
        }))}
      />
    </div>
  );
}
