import type { Metadata } from "next";
import Link from "next/link";
import { ChevronLeft, ChevronRight, Download, History } from "lucide-react";
import { Button } from "@/components/ui/button";
import { PageHeader } from "@/components/layout/page-header";
import { EmptyState } from "@/components/common/empty-state";
import {
  ACTIVITY_FILTERS,
  ACTIVITY_RETENTION_DAYS,
  listActivity,
  purgeOldActivity,
  type ActivityFilter,
  type ActivityItem,
} from "@/server/activity";
import { requireUser } from "@/server/session";
import { isSharedDemo } from "@/server/users";
import { formatDateTime, formatRelative } from "@/lib/time";
import { cn } from "@/lib/utils";

export const metadata: Metadata = { title: "Activity log" };

const PAGE_SIZE = 25;
const FILTER_LABELS: Record<ActivityFilter, string> = {
  all: "All",
  contact: "Contacts",
  meeting: "Meetings",
  account: "Account & data",
  ai: "AI",
};
const ACTION_LABELS: Record<ActivityItem["action"], string> = {
  view: "Viewed",
  create: "Created",
  update: "Changed",
  delete: "Deleted",
  export: "Exported",
  "ai-call": "AI call",
  "ai-decision": "AI decision",
  "account-delete": "Account deleted",
};
const ENTITY_LABELS: Record<ActivityItem["entityType"], string> = {
  contact: "contact",
  meeting: "meeting",
  account: "account",
  data: "data export",
  ai: "AI",
};

function detailText(item: ActivityItem): string {
  const parts: string[] = [];
  for (const [k, v] of Object.entries(item.detail)) {
    if (v === null || v === "") continue;
    const value = Array.isArray(v)
      ? v.join(", ")
      : typeof v === "boolean"
        ? v
          ? "yes"
          : "no"
        : String(v);
    parts.push(`${k}: ${value}`);
  }
  return parts.join(" · ");
}

export default async function ActivityPage({ searchParams }: PageProps<"/activity">) {
  const user = await requireUser();
  const sp = await searchParams;
  const filter: ActivityFilter = ACTIVITY_FILTERS.includes(sp.filter as ActivityFilter)
    ? (sp.filter as ActivityFilter)
    : "all";
  await purgeOldActivity();
  const data = await listActivity(user.id, {
    page: Math.max(1, Number(sp.page) || 1),
    pageSize: PAGE_SIZE,
    filter,
  });
  const href = (f: ActivityFilter, page = 1) =>
    `/activity?${new URLSearchParams({ ...(f !== "all" ? { filter: f } : {}), ...(page > 1 ? { page: String(page) } : {}) })}`;

  return (
    <div className="animate-fade-up">
      <PageHeader
        title="Activity log"
        description={`Every view, change, deletion, export and AI action on your records - append-only, kept for ${ACTIVITY_RETENTION_DAYS} days. It stores ids and field names, never the contents.`}
        actions={
          <Button asChild variant="outline">
            <a href="/your-data/export/activity.csv" download>
              <Download /> Export CSV
            </a>
          </Button>
        }
      />
      {isSharedDemo(user) && (
        <p className="mb-4 rounded-xl border bg-accent/50 px-4 py-2.5 text-sm text-accent-foreground">
          This is the shared demo account, so this log includes what other visitors did with it. A
          guest sandbox has a private log.
        </p>
      )}

      <nav
        aria-label="Filter activity"
        className="-mx-1 mb-4 flex gap-1.5 overflow-x-auto px-1 pb-1"
      >
        {ACTIVITY_FILTERS.map((f) => (
          <Link
            key={f}
            href={href(f)}
            aria-current={f === filter ? "page" : undefined}
            className={cn(
              "shrink-0 rounded-full border px-3 py-1.5 text-sm font-medium transition-colors",
              f === filter
                ? "border-primary/30 bg-accent text-accent-foreground"
                : "bg-card text-muted-foreground hover:text-foreground",
            )}
          >
            {FILTER_LABELS[f]}
          </Link>
        ))}
      </nav>

      {data.total === 0 ? (
        <EmptyState
          icon={History}
          title="No activity yet"
          description="Open a contact or a meeting, change something, or export your data - it shows up here."
        />
      ) : (
        <div className="rounded-2xl border bg-card shadow-(--shadow-soft)">
          <ol className="divide-y">
            {data.items.map((item) => (
              <li
                key={item.id}
                className="grid gap-1 px-4 py-3 sm:grid-cols-[150px_minmax(0,1fr)] sm:gap-4"
              >
                <time
                  dateTime={item.createdAt.toISOString()}
                  title={formatDateTime(item.createdAt)}
                  className="text-xs text-muted-foreground sm:pt-0.5"
                >
                  {formatRelative(item.createdAt)}
                </time>
                <div className="min-w-0 text-sm">
                  <span className="font-medium">{ACTION_LABELS[item.action]}</span>{" "}
                  {item.entityType !== "ai" && (
                    <span className="text-muted-foreground">{ENTITY_LABELS[item.entityType]} </span>
                  )}
                  {item.entityType === "ai" ? (
                    <Link
                      href="/ai-log"
                      className="text-xs font-medium text-primary hover:underline"
                    >
                      open the AI log
                    </Link>
                  ) : item.href && item.label ? (
                    <Link href={item.href} className="font-medium text-primary hover:underline">
                      {item.label}
                    </Link>
                  ) : item.entityType === "contact" || item.entityType === "meeting" ? (
                    <span className="text-muted-foreground italic">(since deleted)</span>
                  ) : null}
                  {detailText(item) && (
                    <p className="mt-0.5 truncate font-mono text-[11px] text-muted-foreground">
                      {detailText(item)}
                    </p>
                  )}
                </div>
              </li>
            ))}
          </ol>
          <div className="flex items-center justify-between border-t px-4 py-3 text-sm text-muted-foreground">
            <span className="tabular">
              {data.total} {data.total === 1 ? "entry" : "entries"} · page {data.page} of{" "}
              {data.pages}
            </span>
            <div className="flex gap-1">
              <Button
                asChild
                variant="ghost"
                size="icon"
                aria-label="Newer entries"
                aria-disabled={data.page <= 1}
                className={cn(data.page <= 1 && "pointer-events-none opacity-40")}
              >
                <Link href={href(filter, data.page - 1)}>
                  <ChevronLeft />
                </Link>
              </Button>
              <Button
                asChild
                variant="ghost"
                size="icon"
                aria-label="Older entries"
                aria-disabled={data.page >= data.pages}
                className={cn(data.page >= data.pages && "pointer-events-none opacity-40")}
              >
                <Link href={href(filter, data.page + 1)}>
                  <ChevronRight />
                </Link>
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
