"use client";

import Link from "next/link";
import { useMemo, useState } from "react";
import { NotebookPen, Search, SearchX } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { EmptyState } from "@/components/common/empty-state";
import { MeetingRow, type MeetingRowData } from "./meeting-row";
import {
  LEGACY_PAGE_SIZE,
  RECORD_SEARCH_OPTIONS,
  RECORD_SORT_OPTIONS,
  searchRecords,
  sortRecords,
  type RecordSearchOption,
  type RecordSortOption,
} from "@/lib/legacy/search";
import { APP_TIME_ZONE, formatMonth } from "@/lib/time";

export type BrowserRecord = MeetingRowData & { meetingPerson: MeetingRowData["meetingPerson"] };

/**
 * Port of `Record.js`: client-side search (`searchRecords`), sort
 * (`sortRecord`) and the "More" button (9 per page). The default view groups
 * meetings into "Upcoming" and months.
 */
export function RecordsBrowser({ records, now }: { records: BrowserRecord[]; now: number }) {
  const [query, setQuery] = useState("");
  const [field, setField] = useState<RecordSearchOption>("all");
  const [sort, setSort] = useState<RecordSortOption>("newest");
  const [limit, setLimit] = useState(LEGACY_PAGE_SIZE * 2);

  const list = useMemo(() => {
    const found = query.trim()
      ? searchRecords(records, query.trim(), field, APP_TIME_ZONE)
      : records;
    return sortRecords(found, sort);
  }, [records, query, field, sort]);

  const grouped = sort === "newest";
  const shown = list.slice(0, limit);
  const groups = useMemo(() => {
    if (!grouped) return [{ title: null as string | null, items: shown }];
    const upcoming = shown.filter((r) => r.dateTime.getTime() > now).reverse();
    const past = shown.filter((r) => r.dateTime.getTime() <= now);
    const out: { title: string | null; items: BrowserRecord[] }[] = [];
    if (upcoming.length) out.push({ title: "Upcoming", items: upcoming });
    for (const r of past) {
      const title = formatMonth(r.dateTime);
      const last = out[out.length - 1];
      if (last && last.title === title) last.items.push(r);
      else out.push({ title, items: [r] });
    }
    return out;
  }, [grouped, shown, now]);

  if (records.length === 0) {
    return (
      <EmptyState
        icon={NotebookPen}
        title="No meetings yet"
        description="Log who you met, where and when. Meetings appear here, on the map and on your calendar."
        action={
          <Button asChild>
            <Link href="/records/new">
              <NotebookPen /> Log a meeting
            </Link>
          </Button>
        }
      />
    );
  }

  return (
    <div>
      <div className="flex flex-col gap-2 sm:flex-row sm:items-center">
        <div className="relative flex-1">
          <Search
            className="pointer-events-none absolute top-1/2 left-3 size-4 -translate-y-1/2 text-muted-foreground"
            aria-hidden="true"
          />
          <Input
            type="search"
            aria-label="Search meetings"
            placeholder="Search meetings"
            className="pl-9"
            value={query}
            onChange={(e) => {
              setQuery(e.target.value);
              setLimit(LEGACY_PAGE_SIZE * 2);
            }}
          />
        </div>
        <div className="grid grid-cols-2 gap-2 sm:flex">
          <Select value={field} onValueChange={(v) => setField(v as RecordSearchOption)}>
            <SelectTrigger className="h-10 sm:w-40" aria-label="Search in">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {RECORD_SEARCH_OPTIONS.map((o) => (
                <SelectItem key={o.value} value={o.value}>
                  {o.value === "all" ? "Search all fields" : `Search ${o.label.toLowerCase()}`}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          <Select value={sort} onValueChange={(v) => setSort(v as RecordSortOption)}>
            <SelectTrigger className="h-10 sm:w-40" aria-label="Sort by">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {RECORD_SORT_OPTIONS.map((o) => (
                <SelectItem key={o.value} value={o.value}>
                  Sort: {o.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      </div>
      <p className="mt-3 text-xs text-muted-foreground" aria-live="polite">
        {list.length === 0 ? "No matches" : `Showing ${shown.length} of ${list.length} meetings`}
      </p>

      {list.length === 0 ? (
        <EmptyState
          className="mt-4"
          icon={SearchX}
          title="No meetings match"
          description={`Nothing found for "${query}".`}
          action={
            <Button variant="outline" onClick={() => setQuery("")}>
              Clear search
            </Button>
          }
        />
      ) : (
        <div className="mt-3 space-y-5">
          {groups.map((g, i) => (
            <section
              key={`${g.title}-${i}`}
              className="rounded-2xl border bg-card px-4 py-2 shadow-(--shadow-soft)"
              aria-label={g.title ?? "Meetings"}
            >
              {g.title && (
                <h2 className="px-0 pt-2 pb-1 text-xs font-semibold tracking-wide text-muted-foreground uppercase">
                  {g.title}
                </h2>
              )}
              <div className="divide-y divide-border/60">
                {g.items.map((r) => (
                  <MeetingRow key={r.id} record={r} upcoming={r.dateTime.getTime() > now} />
                ))}
              </div>
            </section>
          ))}
        </div>
      )}

      {list.length > limit && (
        <div className="mt-5 flex justify-center">
          <Button variant="outline" onClick={() => setLimit((l) => l + LEGACY_PAGE_SIZE)}>
            More
          </Button>
        </div>
      )}
    </div>
  );
}
