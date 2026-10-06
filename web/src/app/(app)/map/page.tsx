import type { Metadata } from "next";
import { PageHeader } from "@/components/layout/page-header";
import { RecordsMapLoader } from "@/components/maps/records-map-loader";
import { listRecords } from "@/server/records";
import { requireUser } from "@/server/session";
import { requestNow } from "@/lib/time";

export const metadata: Metadata = { title: "Map" };

export default async function MapPage() {
  const user = await requireUser();
  const records = await listRecords(user.id);
  return (
    <div className="animate-fade-up">
      <PageHeader
        title="Map"
        description="Where you've met people. Tap a pin for the details."
        className="mb-4"
      />
      <RecordsMapLoader
        now={requestNow()}
        records={records.map((r) => ({
          id: r.id,
          dateTime: r.dateTime,
          location: r.location,
          lat: r.lat,
          lng: r.lng,
          person: {
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
