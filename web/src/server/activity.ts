import "server-only";
import { and, count, desc, eq, gt, gte, inArray } from "drizzle-orm";
import { getDb } from "@/db/client";
import { ACTIVITY_RETENTION_DAYS, activityCutoff } from "@/lib/retention";
import { newId } from "@/db/ids";
import { purgeOldActivityEntries } from "@/db/populate";
import {
  activityLog,
  contacts,
  records,
  type ActivityAction,
  type ActivityEntity,
  type ActivityEntry,
} from "@/db/schema";

/**
 * Append-only activity log. There is deliberately no update function and the
 * only deletes are the retention rule below and account deletion
 * (deleteUsersCascade). Entries store ids, field names and counts - never the
 * contact's details or note text (data minimisation).
 */

export { ACTIVITY_RETENTION_DAYS };

/** Repeat views of the same record by the same person within this window are logged once. */
export const VIEW_DEDUPE_MS = 60_000;

type Detail = ActivityEntry["detail"];

export async function logActivity(
  userId: string | null,
  action: ActivityAction,
  entityType: ActivityEntity,
  entityId: string | null = null,
  detail: Detail = {},
): Promise<void> {
  try {
    if (action === "view" && userId && entityId) {
      const recent = await getDb()
        .select({ id: activityLog.id })
        .from(activityLog)
        .where(
          and(
            eq(activityLog.userId, userId),
            eq(activityLog.action, "view"),
            eq(activityLog.entityType, entityType),
            eq(activityLog.entityId, entityId),
            gt(activityLog.createdAt, new Date(Date.now() - VIEW_DEDUPE_MS)),
          ),
        )
        .get();
      if (recent) return;
    }
    await getDb()
      .insert(activityLog)
      .values({ id: newId(), userId, action, entityType, entityId, detail, createdAt: new Date() });
  } catch (err) {
    // Never break the user's action because the log write failed; surface it in server logs.
    console.error("[pcrm] activity log write failed", { action, entityType }, err);
  }
}

/**
 * Delete entries older than the retention period (all users). Runs at server
 * start (instrumentation), on every guest sign-up and when /activity is opened;
 * every reader also filters by the cutoff, so an entry past retention is never
 * shown or exported even before it is purged.
 */
export async function purgeOldActivity(now = new Date()): Promise<void> {
  await purgeOldActivityEntries(getDb(), now);
}

function withinRetention() {
  return gte(activityLog.createdAt, activityCutoff());
}

export interface ActivityItem extends ActivityEntry {
  /** Human label for the entity at read time, or null if it no longer exists. */
  label: string | null;
  href: string | null;
}

export const ACTIVITY_FILTERS = ["all", "contact", "meeting", "account", "ai"] as const;
export type ActivityFilter = (typeof ACTIVITY_FILTERS)[number];

export async function listActivity(
  userId: string,
  opts: { page: number; pageSize: number; filter: ActivityFilter },
): Promise<{ items: ActivityItem[]; total: number; page: number; pages: number }> {
  const db = getDb();
  const mine = and(eq(activityLog.userId, userId), withinRetention());
  const where =
    opts.filter === "all"
      ? mine
      : opts.filter === "account"
        ? and(mine, inArray(activityLog.entityType, ["account", "data", "admin"]))
        : and(mine, eq(activityLog.entityType, opts.filter));
  const [{ n }] = await db.select({ n: count() }).from(activityLog).where(where);
  const total = Number(n);
  const pages = Math.max(1, Math.ceil(total / opts.pageSize));
  const page = Math.min(Math.max(1, opts.page), pages);
  const rows = await db
    .select()
    .from(activityLog)
    .where(where)
    .orderBy(desc(activityLog.createdAt))
    .limit(opts.pageSize)
    .offset((page - 1) * opts.pageSize);

  // Resolve labels from the live tables (owned by this user only).
  const contactIds = rows
    .filter((r) => r.entityType === "contact" && r.entityId)
    .map((r) => r.entityId!);
  const recordIds = rows
    .filter((r) => r.entityType === "meeting" && r.entityId)
    .map((r) => r.entityId!);
  const contactNames = new Map(
    contactIds.length
      ? (
          await db
            .select({ id: contacts.id, first: contacts.firstName, last: contacts.lastName })
            .from(contacts)
            .where(and(eq(contacts.ownerId, userId), inArray(contacts.id, contactIds)))
        ).map((c) => [c.id, `${c.first} ${c.last}`])
      : [],
  );
  const meetingNames = new Map(
    recordIds.length
      ? (
          await db
            .select({ id: records.id, first: contacts.firstName, last: contacts.lastName })
            .from(records)
            .innerJoin(contacts, eq(contacts.id, records.contactId))
            .where(and(eq(records.ownerId, userId), inArray(records.id, recordIds)))
        ).map((r) => [r.id, `Meeting with ${r.first} ${r.last}`])
      : [],
  );

  const items = rows.map((r): ActivityItem => {
    if (r.entityType === "contact" && r.entityId) {
      const label = contactNames.get(r.entityId) ?? null;
      return { ...r, label, href: label ? `/contacts/${r.entityId}` : null };
    }
    if (r.entityType === "meeting" && r.entityId) {
      const label = meetingNames.get(r.entityId) ?? null;
      return { ...r, label, href: label ? `/records/${r.entityId}` : null };
    }
    if (r.entityType === "ai") return { ...r, label: "AI call", href: "/ai-log" };
    if (r.entityType === "admin" && typeof r.detail.table === "string") {
      return {
        ...r,
        label: r.detail.table,
        href: `/admin/records?table=${encodeURIComponent(r.detail.table)}`,
      };
    }
    return { ...r, label: null, href: null };
  });
  return { items, total, page, pages };
}

export async function allActivity(userId: string): Promise<ActivityEntry[]> {
  return getDb()
    .select()
    .from(activityLog)
    .where(and(eq(activityLog.userId, userId), withinRetention()))
    .orderBy(desc(activityLog.createdAt));
}
