import "server-only";
import { desc, getTableColumns, like, or, sql, type SQL } from "drizzle-orm";
import type { SQLiteColumn, SQLiteTable } from "drizzle-orm/sqlite-core";
import { getDb } from "@/db/client";
import { TABLES, type TableName } from "@/db/schema";
import { toCsv } from "@/lib/csv";

/**
 * Read-only "Records" admin: every table with counts, search, pagination and
 * CSV export. Secrets (password hashes) and bulky blobs are redacted.
 */

export const TABLE_NAMES = Object.keys(TABLES) as TableName[];

export const TABLE_DESCRIPTIONS: Record<TableName, string> = {
  users: "Accounts (Mongoose `User`). Includes guest sandboxes and pending invitees.",
  contacts: "Address-book entries (Mongoose `Contact`), owned by a user.",
  contact_links: "The user's `contactList` sub-documents: which contact, added when.",
  records: "Meeting records (Mongoose `Record`) with location and coordinates.",
  email_codes: "Live 6-digit e-mail verification / reset codes (Mongoose `EmailAuth`).",
  fast_register_codes: "Invite links for contacts without an account (Mongoose `EmailRegister`).",
  email_outbox: "Every e-mail the app would have sent through Gmail - the demo inbox.",
  activity_log:
    "Append-only access and change log (ids, field names and counts only). A row without user_id records a deleted account.",
  ai_audit_log:
    "Every bring-your-own-key AI call: the redacted text sent, the answer, model, latency, tokens and the human decision. Never the key.",
};

export function isTableName(name: string): name is TableName {
  return (TABLE_NAMES as string[]).includes(name);
}

interface ColumnInfo {
  key: string;
  name: string;
  column: SQLiteColumn;
}

function columnsOf(name: TableName): ColumnInfo[] {
  const cols = getTableColumns(TABLES[name] as SQLiteTable) as Record<string, SQLiteColumn>;
  return Object.entries(cols).map(([key, column]) => ({ key, name: column.name, column }));
}

export function columnNames(name: TableName): string[] {
  return columnsOf(name).map((c) => c.name);
}

function redact(table: TableName, column: string, value: unknown): unknown {
  if (value === null || value === undefined) return value;
  if (table === "users" && column === "password_hash") {
    const s = String(value);
    return s.startsWith("$2") ? `bcrypt hash (${s.length} chars)` : "(no password yet)";
  }
  if (column === "portrait") {
    return `image data URL (${Math.round(String(value).length / 1024)} KB)`;
  }
  if (table === "email_outbox" && column === "html") {
    return `HTML body (${String(value).length} chars)`;
  }
  return value;
}

function toDisplayRow(table: TableName, row: Record<string, unknown>): Record<string, unknown> {
  const out: Record<string, unknown> = {};
  for (const c of columnsOf(table)) out[c.name] = redact(table, c.name, row[c.key]);
  return out;
}

function searchWhere(table: TableName, q: string): SQL | undefined {
  const term = q.trim();
  if (!term) return undefined;
  const textCols = columnsOf(table).filter(
    (c) => c.column.columnType === "SQLiteText" || c.column.columnType === "SQLiteTextJson",
  );
  const conds = textCols
    .filter(
      (c) =>
        !(table === "users" && c.name === "password_hash") &&
        c.name !== "portrait" &&
        c.name !== "html",
    )
    .map((c) => like(c.column, `%${term}%`));
  return conds.length ? or(...conds) : undefined;
}

function orderColumn(table: TableName): SQLiteColumn | undefined {
  const cols = columnsOf(table);
  const preferred = ["created_at", "add_date", "add_since", "date_time"];
  for (const p of preferred) {
    const c = cols.find((x) => x.name === p);
    if (c) return c.column;
  }
  return undefined;
}

export async function tableCounts(): Promise<Record<TableName, number>> {
  const db = getDb();
  const entries = await Promise.all(
    TABLE_NAMES.map(async (name) => {
      const [row] = await db.select({ n: sql<number>`count(*)` }).from(TABLES[name] as SQLiteTable);
      return [name, Number(row?.n ?? 0)] as const;
    }),
  );
  return Object.fromEntries(entries) as Record<TableName, number>;
}

export async function browseTable(
  name: TableName,
  opts: { page: number; pageSize: number; q: string },
): Promise<{
  columns: string[];
  rows: Record<string, unknown>[];
  total: number;
  page: number;
  pages: number;
}> {
  const db = getDb();
  const table = TABLES[name] as SQLiteTable;
  const where = searchWhere(name, opts.q);
  const [countRow] = await db
    .select({ n: sql<number>`count(*)` })
    .from(table)
    .where(where);
  const total = Number(countRow?.n ?? 0);
  const pages = Math.max(1, Math.ceil(total / opts.pageSize));
  const page = Math.min(Math.max(1, opts.page), pages);
  const order = orderColumn(name);
  const base = db.select().from(table).where(where);
  const rows = await (order ? base.orderBy(desc(order)) : base)
    .limit(opts.pageSize)
    .offset((page - 1) * opts.pageSize);
  return {
    columns: columnNames(name),
    rows: (rows as Record<string, unknown>[]).map((r) => toDisplayRow(name, r)),
    total,
    page,
    pages,
  };
}

export async function exportTableCsv(name: TableName): Promise<string> {
  const table = TABLES[name] as SQLiteTable;
  const order = orderColumn(name);
  const base = getDb().select().from(table);
  const rows = (await (order ? base.orderBy(desc(order)) : base)) as Record<string, unknown>[];
  return toCsv(
    columnNames(name),
    rows.map((r) => toDisplayRow(name, r)),
  );
}
