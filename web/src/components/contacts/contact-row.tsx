import Link from "next/link";
import { BadgeCheck } from "lucide-react";
import { PersonAvatar } from "@/components/common/person-avatar";
import { cn } from "@/lib/utils";

export interface ContactRowData {
  id: string;
  firstName: string;
  lastName: string;
  occupation: string;
  portrait: string | null;
  linkedUserId: string | null;
}

export function ContactRow({
  contact,
  meta,
  className,
}: {
  contact: ContactRowData;
  meta?: React.ReactNode;
  className?: string;
}) {
  return (
    <Link
      href={`/contacts/${contact.id}`}
      className={cn(
        "group -mx-2 flex items-center gap-3 rounded-xl px-2 py-2 transition-colors hover:bg-muted/60 focus-visible:bg-muted/60",
        className,
      )}
    >
      <PersonAvatar
        firstName={contact.firstName}
        lastName={contact.lastName}
        portrait={contact.portrait}
        seed={contact.id}
      />
      <div className="min-w-0 flex-1">
        <p className="flex items-center gap-1.5 truncate text-sm font-medium">
          <span className="truncate">
            {contact.firstName} {contact.lastName}
          </span>
          {contact.linkedUserId && (
            <BadgeCheck
              className="size-3.5 shrink-0 text-primary"
              aria-label="Has a 4399 CRM account"
            />
          )}
        </p>
        <p className="truncate text-xs text-muted-foreground">{contact.occupation}</p>
      </div>
      {meta && <div className="shrink-0 text-right text-xs text-muted-foreground">{meta}</div>}
    </Link>
  );
}
