"use client";

import Link from "next/link";
import { useMemo, useState } from "react";
import { BadgeCheck, CalendarClock, Phone, Search, SearchX, UserPlus, Users } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { PersonAvatar } from "@/components/common/person-avatar";
import { EmptyState } from "@/components/common/empty-state";
import {
  CONTACT_SEARCH_OPTIONS,
  CONTACT_SORT_OPTIONS,
  LEGACY_PAGE_SIZE,
  searchContacts,
  sortContacts,
  type ContactSearchOption,
  type ContactSortOption,
} from "@/lib/legacy/search";
import { APP_TIME_ZONE, formatShortDate } from "@/lib/time";
import { cn } from "@/lib/utils";

export interface BrowserContact {
  id: string;
  firstName: string;
  lastName: string;
  occupation: string;
  note: string;
  phones: string[];
  emails: string[];
  portrait: string | null;
  addDate: Date;
  linkedUserId: string | null;
  linkedUserName: string | null;
  meetingCount: number;
  nextMeeting: Date | null;
}

type Filter = "all" | "linked";

/**
 * Client-side search / sort / "More" paging, ported from `Contact.js`
 * (`searchContacts`, `sortContact`, 9 contacts per page).
 */
export function ContactsBrowser({ contacts, initialFilter }: { contacts: BrowserContact[]; initialFilter: Filter }) {
  const [query, setQuery] = useState("");
  const [field, setField] = useState<ContactSearchOption>("all");
  const [sort, setSort] = useState<ContactSortOption>("added");
  const [filter, setFilter] = useState<Filter>(initialFilter);
  const [limit, setLimit] = useState(LEGACY_PAGE_SIZE);

  const visible = useMemo(() => {
    const base = filter === "linked" ? contacts.filter((c) => c.linkedUserId) : contacts;
    const found = query.trim() ? searchContacts(base, query.trim(), field, APP_TIME_ZONE) : base;
    return sortContacts(found, sort);
  }, [contacts, filter, query, field, sort]);

  if (contacts.length === 0) {
    return (
      <EmptyState
        icon={Users}
        title="No contacts yet"
        description="Add the people you meet - by hand, by user name, or by scanning their 4399 CRM QR code."
        action={
          <>
            <Button asChild>
              <Link href="/contacts/new">
                <UserPlus /> New contact
              </Link>
            </Button>
            <Button asChild variant="outline">
              <Link href="/contacts/add?tab=scan">Scan a QR code</Link>
            </Button>
          </>
        }
      />
    );
  }

  return (
    <div>
      <div className="flex flex-col gap-2 sm:flex-row sm:items-center">
        <div className="relative flex-1">
          <Search className="text-muted-foreground pointer-events-none absolute top-1/2 left-3 size-4 -translate-y-1/2" aria-hidden="true" />
          <Input
            type="search"
            placeholder="Search contacts"
            aria-label="Search contacts"
            value={query}
            onChange={(e) => {
              setQuery(e.target.value);
              setLimit(LEGACY_PAGE_SIZE);
            }}
            className="pl-9"
          />
        </div>
        <div className="grid grid-cols-2 gap-2 sm:flex">
          <Select value={field} onValueChange={(v) => setField(v as ContactSearchOption)}>
            <SelectTrigger className="h-10 sm:w-40" aria-label="Search in">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {CONTACT_SEARCH_OPTIONS.map((o) => (
                <SelectItem key={o.value} value={o.value}>
                  {o.value === "all" ? "Search all fields" : `Search ${o.label.toLowerCase()}`}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          <Select value={sort} onValueChange={(v) => setSort(v as ContactSortOption)}>
            <SelectTrigger className="h-10 sm:w-44" aria-label="Sort by">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {CONTACT_SORT_OPTIONS.map((o) => (
                <SelectItem key={o.value} value={o.value}>
                  Sort: {o.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      </div>

      <div className="mt-3 flex items-center gap-2" role="group" aria-label="Filter contacts">
        {(
          [
            ["all", `All · ${contacts.length}`],
            ["linked", `On 4399 CRM · ${contacts.filter((c) => c.linkedUserId).length}`],
          ] as const
        ).map(([value, label]) => (
          <button
            key={value}
            type="button"
            aria-pressed={filter === value}
            onClick={() => {
              setFilter(value);
              setLimit(LEGACY_PAGE_SIZE);
            }}
            className={cn(
              "rounded-full border px-3 py-1 text-xs font-medium transition-colors",
              filter === value
                ? "border-primary/30 bg-accent text-accent-foreground"
                : "text-muted-foreground hover:text-foreground bg-card",
            )}
          >
            {label}
          </button>
        ))}
        <span className="text-muted-foreground ml-auto text-xs" aria-live="polite">
          {visible.length === 0 ? "No matches" : `Showing ${Math.min(limit, visible.length)} of ${visible.length}`}
        </span>
      </div>

      {visible.length === 0 ? (
        <EmptyState
          className="mt-4"
          icon={SearchX}
          title="No contacts match"
          description={`Nothing found for "${query}". Try another field or clear the search.`}
          action={
            <Button variant="outline" onClick={() => setQuery("")}>
              Clear search
            </Button>
          }
        />
      ) : (
        <ul className="mt-4 grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
          {visible.slice(0, limit).map((c) => (
            <li key={c.id}>
              <ContactCard contact={c} />
            </li>
          ))}
        </ul>
      )}

      {visible.length > limit && (
        <div className="mt-5 flex justify-center">
          <Button variant="outline" onClick={() => setLimit((l) => l + LEGACY_PAGE_SIZE)}>
            More
          </Button>
        </div>
      )}
    </div>
  );
}

function ContactCard({ contact: c }: { contact: BrowserContact }) {
  return (
    <Link
      href={`/contacts/${c.id}`}
      className="bg-card group flex h-full flex-col rounded-2xl border p-4 shadow-(--shadow-soft) transition-all hover:-translate-y-px hover:shadow-(--shadow-lifted)"
    >
      <div className="flex items-start gap-3">
        <PersonAvatar firstName={c.firstName} lastName={c.lastName} portrait={c.portrait} seed={c.id} size="lg" />
        <div className="min-w-0 flex-1 pt-0.5">
          <p className="flex items-center gap-1.5 font-medium">
            <span className="truncate">
              {c.firstName} {c.lastName}
            </span>
            {c.linkedUserId && <BadgeCheck className="text-primary size-4 shrink-0" aria-label="Has a 4399 CRM account" />}
          </p>
          <p className="text-muted-foreground truncate text-sm">{c.occupation}</p>
          {c.linkedUserName && <p className="text-primary/80 truncate text-xs">@{c.linkedUserName}</p>}
        </div>
      </div>
      <div className="text-muted-foreground mt-4 flex flex-wrap items-center gap-x-4 gap-y-1 border-t pt-3 text-xs">
        {c.phones[0] && (
          <span className="inline-flex items-center gap-1 tabular">
            <Phone className="size-3" aria-hidden="true" /> {c.phones[0]}
          </span>
        )}
        <span className="inline-flex items-center gap-1">
          {c.meetingCount} {c.meetingCount === 1 ? "meeting" : "meetings"}
        </span>
        {c.nextMeeting && (
          <span className="text-primary inline-flex items-center gap-1 font-medium">
            <CalendarClock className="size-3" aria-hidden="true" /> {formatShortDate(c.nextMeeting)}
          </span>
        )}
      </div>
    </Link>
  );
}
