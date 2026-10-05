import "server-only";
import { and, desc, eq, getTableColumns, gte, inArray, like, or, sql, type SQL } from "drizzle-orm";
import type { SQLiteColumn, SQLiteTable } from "drizzle-orm/sqlite-core";
import { getDb } from "@/db/client";
import { TABLES, activityLog, users, type TableName } from "@/db/schema";
import { toCsv } from "@/lib/csv";
import { activityCutoff } from "@/lib/retention";

/**
 * Read-only "Records" admin: every table with counts, search, pagination and
 * CSV export. The admin is a public one-click demo account, so it is treated
 * as untrusted (DR-005):
 *
 * - Secrets (password hashes, e-mail codes, invitation codes and links, the
 *   per-browser inbox key) are masked in every row and are never searchable.
 * - Personal details and free text (names, e-mails, phones, notes, locations,
 *   AI inputs and outputs) are shown only for rows that belong to a seeded
 *   showcase account (`is_demo`: the shared demo user, the admin and the
 *   directory people). Rows of guest sandboxes and registered visitors show
 *   ids, timestamps and counts only, and search does not look inside them.
 * - Activity entries past the retention period are not shown.
 */

export const TABLE_NAMES = Object.keys(TABLES) as TableName[];

export const TABLE_DESCRIPTIONS: Record<TableName, string> = {
  users: "Accounts (Mongoose `User`). Includes guest sandboxes and pending invitees.",
  contacts: "Address-book entries (Mongoose `Contact`), owned by a user.",
  contact_links: "The user's `contactList` sub-documents: which contact, added when.",
  records: "Meeting records (Mongoose `Record`) with location and coordinates.",
  email_codes:
    "6-digit e-mail verification / reset codes (Mongoose `EmailAuth`). Codes are masked.",
  fast_register_codes:
    "Invite links for contacts without an account (Mongoose `EmailRegister`). Codes are masked.",
  email_outbox:
    "Every e-mail the app would have sent through Gmail - the demo inbox. Codes and links are masked.",
  activity_log:
    "Append-only access and change log (ids, field names and counts only). A row without user_id records a deleted account.",
  ai_audit_log:
    "Every bring-your-own-key AI call: the redacted text sent, the answer, model, latency, tokens and the human decision. Never the key.",
};

/** Masked in every row and never matched by search. */
export const SECRET_COLUMNS: Partial<Record<TableName, readonly string[]>> = {
  users: ["password_hash"],
  email_codes: ["auth_code"],
  fast_register_codes: ["fast_register_code"],
  email_outbox: ["code", "action_path", "browser_key", "html"],
};

/** Personal details and free text: shown only on rows owned by a showcase account. */
export const PRIVATE_COLUMNS: Partial<Record<TableName, readonly string[]>> = {
  users: [
    "user_name",
    "first_name",
    "last_name",
    "occupation",
    "emails",
    "phones",
    "portrait",
    "status_message",
  ],
  contacts: [
    "first_name",
    "last_name",
    "occupation",
    "emails",
    "phones",
    "note",
    "custom_fields",
    "portrait",
  ],
  records: ["location", "notes", "lat", "lng", "custom_fields", "ai_summary"],
  email_codes: ["email"],
  email_outbox: ["to_email", "subject"],
  ai_audit_log: ["input", "output", "final_output"],
};

/** The column naming the account a row belongs to (null: no row is a showcase row). */
const OWNER_COLUMN: Record<TableName, string | null> = {
  users: "id",
  contacts: "owner_id",
  contact_links: "user_id",
  records: "owner_id",
  email_codes: null,
  fast_register_codes: "invited_by_user_id",
  email_outbox: "recipient_user_id",
  activity_log: "user_id",
  ai_audit_log: "user_id",
};

export const MASKED_PRIVATE = "hidden (visitor data)";

export type ColumnPolicy = "secret" | "private" | "shown";

/** How the admin view treats each column of a table (pinned by a test, so new columns get classified). */
export function columnPolicy(table: TableName): Record<string, ColumnPolicy> {
  return Object.fromEntries(
    columnNames(table).map((c) => [
      c,
      SECRET_COLUMNS[table]?.includes(c)
        ? "secret"
        : PRIVATE_COLUMNS[table]?.includes(c)
          ? "private"
          : "shown",
    ]),
  );
}

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

function ownerColumn(table: TableName): ColumnInfo | undefined {
  const owner = OWNER_COLUMN[table];
  return owner ? columnsOf(table).find((c) => c.name === owner) : undefined;
}

/** Ids of the seeded showcase accounts (demo user, admin, directory people). */
async function showcaseIds(): Promise<Set<string>> {
  const rows = await getDb().select({ id: users.id }).from(users).where(eq(users.isDemo, true));
  return new Set(rows.map((r) => r.id));
}

function maskSecret(column: string, value: string): string {
  if (column === "password_hash") {
    return value.startsWith("$2") ? `bcrypt hash (${value.length} chars)` : "(no password yet)";
  }
  if (column === "html") return `HTML body (${value.length} chars)`;
  return `hidden (secret, ${value.length} chars)`;
}

function maskValue(table: TableName, column: string, value: unknown, showcase: boolean): unknown {
  if (value === null || value === undefined) return value;
  if (SECRET_COLUMNS[table]?.includes(column)) return maskSecret(column, String(value));
  if (!showcase && PRIVATE_COLUMNS[table]?.includes(column)) return MASKED_PRIVATE;
  if (column === "portrait") {
    return `image data URL (${Math.round(String(value).length / 1024)} KB)`;
  }
  return value;
}

function toDisplayRow(
  table: TableName,
  row: Record<string, unknown>,
  showcase: Set<string>,
): Record<string, unknown> {
  const owner = ownerColumn(table);
  const ownerId = owner ? row[owner.key] : null;
  const isShowcase = typeof ownerId === "string" && showcase.has(ownerId);
  const out: Record<string, unknown> = {};
  for (const c of columnsOf(table)) out[c.name] = maskValue(table, c.name, row[c.key], isShowcase);
  return out;
}

/** Retention: activity entries older than the retention period are never shown. */
function baseWhere(table: TableName): SQL | undefined {
  return table === "activity_log" ? gte(activityLog.createdAt, activityCutoff()) : undefined;
}

/**
 * Search the text columns. Secret columns are never searched; private columns
 * only on showcase rows, so a search cannot reveal what a visitor wrote.
 */
function searchWhere(table: TableName, q: string, showcase: Set<string>): SQL | undefined {
  const term = q.trim();
  if (!term) return undefined;
  const secret = SECRET_COLUMNS[table] ?? [];
  const priv = PRIVATE_COLUMNS[table] ?? [];
  const textCols = columnsOf(table).filter(
    (c) =>
      (c.column.columnType === "SQLiteText" || c.column.columnType === "SQLiteTextJson") &&
      !secret.includes(c.name) &&
      c.name !== "portrait",
  );
  const pattern = `%${term}%`;
  const open = textCols.filter((c) => !priv.includes(c.name)).map((c) => like(c.column, pattern));
  const owner = ownerColumn(table);
  const hidden = textCols.filter((c) => priv.includes(c.name)).map((c) => like(c.column, pattern));
  const conds = [...open];
  if (owner && hidden.length && showcase.size) {
    conds.push(and(inArray(owner.column, [...showcase]), or(...hidden))!);
  }
  return conds.length ? or(...conds) : sql`0`;
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
      const [row] = await db
        .select({ n: sql<number>`count(*)` })
        .from(TABLES[name] as SQLiteTable)
        .where(baseWhere(name));
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
  const showcase = await showcaseIds();
  const where = and(baseWhere(name), searchWhere(name, opts.q, showcase));
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
    rows: (rows as Record<string, unknown>[]).map((r) => toDisplayRow(name, r, showcase)),
    total,
    page,
    pages,
  };
}

export async function exportTableCsv(name: TableName): Promise<{ csv: string; rows: number }> {
  const table = TABLES[name] as SQLiteTable;
  const showcase = await showcaseIds();
  const order = orderColumn(name);
  const base = getDb().select().from(table).where(baseWhere(name));
  const rows = (await (order ? base.orderBy(desc(order)) : base)) as Record<string, unknown>[];
  return {
    csv: toCsv(
      columnNames(name),
      rows.map((r) => toDisplayRow(name, r, showcase)),
    ),
    rows: rows.length,
  };
}
