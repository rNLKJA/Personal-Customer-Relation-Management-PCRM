import type { Metadata } from "next";
import Link from "next/link";
import { ChevronLeft, ChevronRight, Database, Download, Search } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { PageHeader } from "@/components/layout/page-header";
import { getStorageMode } from "@/db/client";
import type { TableName } from "@/db/schema";
import {
  TABLE_DESCRIPTIONS,
  TABLE_NAMES,
  browseTable,
  isTableName,
  tableCounts,
} from "@/server/admin";
import { logActivity } from "@/server/activity";
import { requireAdmin } from "@/server/session";
import { cn } from "@/lib/utils";

export const metadata: Metadata = { title: "Records admin" };

const PAGE_SIZE = 20;
const STORAGE_LABEL = {
  remote: "Turso (libSQL) - persistent",
  file: "Local SQLite file",
  ephemeral: "Ephemeral copy of the seed database (/tmp)",
} as const;

function formatCell(value: unknown): string {
  if (value === null || value === undefined) return "";
  if (value instanceof Date) return value.toISOString().replace("T", " ").slice(0, 19);
  if (typeof value === "object") return JSON.stringify(value);
  return String(value);
}

export default async function AdminRecordsPage({ searchParams }: PageProps<"/admin/records">) {
  const admin = await requireAdmin();
  const sp = await searchParams;
  const table: TableName =
    typeof sp.table === "string" && isTableName(sp.table) ? sp.table : "users";
  const q = typeof sp.q === "string" ? sp.q.slice(0, 80) : "";
  const page = Math.max(1, Number(sp.page) || 1);
  const [counts, data] = await Promise.all([
    tableCounts(),
    browseTable(table, { page, pageSize: PAGE_SIZE, q }),
  ]);
  // Administrator reads are logged under the admin account (see DR-005).
  await logActivity(admin.id, "view", "admin", null, { table, q: q || null, page: data.page });
  const link = (params: { table?: string; page?: number; q?: string }) => {
    const s = new URLSearchParams();
    s.set("table", params.table ?? table);
    if ((params.q ?? q) && params.table === undefined) s.set("q", params.q ?? q);
    if (params.page && params.page > 1) s.set("page", String(params.page));
    return `/admin/records?${s.toString()}`;
  };

  return (
    <div className="animate-fade-up">
      <PageHeader
        eyebrow={
          <span className="inline-flex items-center gap-1.5">
            <Database className="size-3.5" aria-hidden="true" /> {STORAGE_LABEL[getStorageMode()]}
          </span>
        }
        title="Records"
        description="Every table, read-only. Codes, links and password hashes are always masked; names, contact details, notes and AI text are shown only for the seeded demo accounts, never for guests or visitors. Views and exports are logged."
        actions={
          <Button asChild variant="outline">
            <a href={`/admin/records/export/${table}`} download>
              <Download /> Export {table}.csv
            </a>
          </Button>
        }
      />

      <nav
        aria-label="Tables"
        className="-mx-1 mb-4 flex gap-1.5 overflow-x-auto px-1 pb-1 lg:flex-wrap lg:overflow-visible"
      >
        {TABLE_NAMES.map((name) => (
          <Link
            key={name}
            href={link({ table: name })}
            aria-current={name === table ? "page" : undefined}
            className={cn(
              "inline-flex shrink-0 items-center gap-2 rounded-full border px-3 py-1.5 text-sm font-medium transition-colors",
              name === table
                ? "border-primary/30 bg-accent text-accent-foreground"
                : "bg-card text-muted-foreground hover:text-foreground",
            )}
          >
            <span className="font-mono text-[13px]">{name}</span>
            <span className="tabular rounded-full bg-muted px-1.5 text-[11px] leading-5 text-muted-foreground">
              {counts[name]}
            </span>
          </Link>
        ))}
      </nav>

      <div className="rounded-2xl border bg-card shadow-(--shadow-soft)">
        <div className="flex flex-col gap-3 border-b p-4 sm:flex-row sm:items-center sm:justify-between">
          <p className="text-sm text-muted-foreground">{TABLE_DESCRIPTIONS[table]}</p>
          <form className="relative sm:w-72" action="/admin/records" role="search">
            <input type="hidden" name="table" value={table} />
            <Search
              className="pointer-events-none absolute top-1/2 left-3 size-4 -translate-y-1/2 text-muted-foreground"
              aria-hidden="true"
            />
            <Input
              name="q"
              defaultValue={q}
              placeholder={`Search ${table}`}
              aria-label={`Search ${table}`}
              className="pl-9"
            />
          </form>
        </div>
        <div
          className="overflow-x-auto outline-none focus-visible:ring-[3px] focus-visible:ring-ring/50 focus-visible:ring-inset"
          tabIndex={0}
          role="region"
          aria-label={`${table} rows (scroll sideways for more columns)`}
        >
          <table className="w-full text-left text-[13px]">
            <thead className="bg-surface text-muted-foreground">
              <tr>
                {data.columns.map((c) => (
                  <th
                    key={c}
                    scope="col"
                    className="px-3 py-2 font-mono text-xs font-medium whitespace-nowrap"
                  >
                    {c}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y">
              {data.rows.map((row, i) => (
                <tr key={i} className="hover:bg-muted/40">
                  {data.columns.map((c) => {
                    const text = formatCell(row[c]);
                    return (
                      <td
                        key={c}
                        className="max-w-72 truncate px-3 py-2 align-top whitespace-nowrap"
                        title={text}
                      >
                        {text === "" ? (
                          <span className="text-muted-foreground italic">null</span>
                        ) : (
                          text
                        )}
                      </td>
                    );
                  })}
                </tr>
              ))}
              {data.rows.length === 0 && (
                <tr>
                  <td
                    colSpan={data.columns.length}
                    className="px-3 py-10 text-center text-muted-foreground"
                  >
                    {q ? `No rows match "${q}".` : "This table is empty."}
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
        <div className="flex items-center justify-between border-t px-4 py-3 text-sm text-muted-foreground">
          <span className="tabular">
            {data.total} {data.total === 1 ? "row" : "rows"}
            {q && ` matching "${q}"`} · page {data.page} of {data.pages}
          </span>
          <div className="flex gap-1">
            <Button
              asChild
              variant="ghost"
              size="icon"
              aria-label="Previous page"
              aria-disabled={data.page <= 1}
              className={cn(data.page <= 1 && "pointer-events-none opacity-40")}
            >
              <Link href={link({ page: data.page - 1, q })}>
                <ChevronLeft />
              </Link>
            </Button>
            <Button
              asChild
              variant="ghost"
              size="icon"
              aria-label="Next page"
              aria-disabled={data.page >= data.pages}
              className={cn(data.page >= data.pages && "pointer-events-none opacity-40")}
            >
              <Link href={link({ page: data.page + 1, q })}>
                <ChevronRight />
              </Link>
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}
