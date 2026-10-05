import Link from "next/link";
import { MapPin } from "lucide-react";
import { PersonAvatar } from "@/components/common/person-avatar";
import { cleanLocation } from "@/lib/legacy/location";
import { zonedParts } from "@/lib/legacy/convert";
import { APP_TIME_ZONE, formatTime } from "@/lib/time";
import { cn } from "@/lib/utils";

const MONTHS = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];

export interface MeetingRowData {
  id: string;
  dateTime: Date;
  location: string;
  notes: string;
  meetingPerson: { id: string; firstName: string; lastName: string; portrait: string | null };
}

export function DateTile({ date, highlight }: { date: Date; highlight?: boolean }) {
  const p = zonedParts(date, APP_TIME_ZONE);
  return (
    <span
      className={cn(
        "flex size-12 shrink-0 flex-col items-center justify-center rounded-xl border leading-none",
        highlight ? "border-primary/30 bg-accent text-accent-foreground" : "bg-surface",
      )}
    >
      <span className="text-[10px] font-semibold tracking-wide uppercase opacity-70">{MONTHS[p.month - 1]}</span>
      <span className="mt-0.5 text-lg font-semibold tabular">{p.day}</span>
    </span>
  );
}

export function MeetingRow({
  record,
  upcoming,
  showNotes = true,
  hidePerson = false,
}: {
  record: MeetingRowData;
  upcoming?: boolean;
  showNotes?: boolean;
  /** On a contact's own page the person is implied; lead with the place instead. */
  hidePerson?: boolean;
}) {
  const person = record.meetingPerson;
  return (
    <Link
      href={`/records/${record.id}`}
      className="group hover:bg-muted/60 focus-visible:bg-muted/60 -mx-2 flex items-center gap-3.5 rounded-xl px-2 py-2.5 transition-colors"
    >
      <DateTile date={record.dateTime} highlight={upcoming} />
      <div className="min-w-0 flex-1">
        {hidePerson ? (
          <div className="flex items-center gap-2">
            <MapPin className="text-muted-foreground size-3.5 shrink-0" aria-hidden="true" />
            <span className="truncate text-sm font-medium">{cleanLocation(record.location).replace(/,\s*$/, "")}</span>
            <span className="text-muted-foreground ml-auto shrink-0 text-xs tabular">{formatTime(record.dateTime)}</span>
          </div>
        ) : (
          <>
            <div className="flex items-center gap-2">
              <PersonAvatar firstName={person.firstName} lastName={person.lastName} portrait={person.portrait} seed={person.id} size="xs" />
              <span className="truncate text-sm font-medium">
                {person.firstName} {person.lastName}
              </span>
              <span className="text-muted-foreground ml-auto shrink-0 text-xs tabular">{formatTime(record.dateTime)}</span>
            </div>
            <p className="text-muted-foreground mt-1 flex items-center gap-1 truncate text-xs">
              <MapPin className="size-3 shrink-0" aria-hidden="true" />
              <span className="truncate">{cleanLocation(record.location).replace(/,\s*$/, "")}</span>
            </p>
          </>
        )}
        {showNotes && record.notes && (
          <p className="text-muted-foreground/90 mt-0.5 line-clamp-1 text-xs">{record.notes}</p>
        )}
      </div>
    </Link>
  );
}
