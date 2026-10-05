import "server-only";
import { asc, count, eq, or } from "drizzle-orm";
import { getDb } from "@/db/client";
import { deleteUsersCascade } from "@/db/cascade";
import {
  activityLog,
  aiAuditLog,
  contactLinks,
  contacts,
  emailOutbox,
  records,
  type User,
} from "@/db/schema";
import { toCsv } from "@/lib/csv";
import { allActivity, logActivity } from "./activity";
import { allAiCalls } from "./ai-audit";
import { isSharedDemo } from "./users";

/**
 * "Your data": a complete export of everything stored about the signed-in
 * account, and hard deletion of the account with all of it.
 */

export const EXPORT_FORMAT = "4399crm-export/v1";

export const EXPORT_FILES = [
  "data.json",
  "contacts.csv",
  "meetings.csv",
  "activity.csv",
  "ai-log.csv",
  "ai-log.json",
] as const;
export type ExportFile = (typeof EXPORT_FILES)[number];

export function isExportFile(name: string): name is ExportFile {
  return (EXPORT_FILES as readonly string[]).includes(name);
}

function accountView(user: User) {
  // Everything except the password hash (a secret, and useless to the owner).
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  const { passwordHash, ...rest } = user;
  return rest;
}

export async function exportUserData(user: User) {
  const db = getDb();
  const [myContacts, myLinks, myMeetings, myInbox, activity, ai] = await Promise.all([
    db.select().from(contacts).where(eq(contacts.ownerId, user.id)).orderBy(asc(contacts.addDate)),
    db.select().from(contactLinks).where(eq(contactLinks.userId, user.id)),
    db.select().from(records).where(eq(records.ownerId, user.id)).orderBy(asc(records.dateTime)),
    db
      .select({
        id: emailOutbox.id,
        toEmail: emailOutbox.toEmail,
        subject: emailOutbox.subject,
        kind: emailOutbox.kind,
        createdAt: emailOutbox.createdAt,
        readAt: emailOutbox.readAt,
      })
      .from(emailOutbox)
      .where(
        or(eq(emailOutbox.recipientUserId, user.id), eq(emailOutbox.triggeredByUserId, user.id)),
      ),
    allActivity(user.id),
    allAiCalls(user.id),
  ]);
  return {
    format: EXPORT_FORMAT,
    exportedAt: new Date().toISOString(),
    notes: [
      "Everything 4399 CRM stores about this account. The password hash is omitted.",
      "Demo-inbox e-mails are listed without their HTML bodies; verification codes are omitted.",
      "AI audit entries contain exactly what was sent to the AI provider (after redaction) - never an API key.",
    ],
    account: accountView(user),
    contacts: myContacts,
    contactLinks: myLinks,
    meetings: myMeetings,
    demoInbox: myInbox,
    activityLog: activity,
    aiAuditLog: ai,
  };
}

export async function exportFile(
  user: User,
  file: ExportFile,
): Promise<{ body: string; type: string }> {
  const data = await exportUserData(user);
  if (file === "data.json") {
    return { body: JSON.stringify(data, null, 2), type: "application/json; charset=utf-8" };
  }
  if (file === "ai-log.json") {
    return {
      body: JSON.stringify(
        { format: EXPORT_FORMAT, exportedAt: data.exportedAt, aiAuditLog: data.aiAuditLog },
        null,
        2,
      ),
      type: "application/json; charset=utf-8",
    };
  }
  const csv = (columns: string[], rows: Record<string, unknown>[]) => ({
    body: toCsv(columns, rows),
    type: "text/csv; charset=utf-8",
  });
  if (file === "contacts.csv") {
    return csv(
      [
        "id",
        "firstName",
        "lastName",
        "occupation",
        "phones",
        "emails",
        "note",
        "customFields",
        "linkedUserId",
        "addDate",
      ],
      data.contacts,
    );
  }
  if (file === "meetings.csv") {
    return csv(
      [
        "id",
        "contactId",
        "dateTime",
        "location",
        "lat",
        "lng",
        "notes",
        "customFields",
        "aiSummary",
        "createdAt",
      ],
      data.meetings,
    );
  }
  if (file === "activity.csv") {
    return csv(["id", "createdAt", "action", "entityType", "entityId", "detail"], data.activityLog);
  }
  return csv(
    [
      "id",
      "createdAt",
      "feature",
      "provider",
      "model",
      "servedModel",
      "promptVersion",
      "recordId",
      "input",
      "redactionCounts",
      "output",
      "error",
      "latencyMs",
      "inputTokens",
      "outputTokens",
      "decision",
      "finalOutput",
      "decidedAt",
    ],
    data.aiAuditLog,
  );
}

export interface DataInventory {
  contacts: number;
  meetings: number;
  activity: number;
  aiCalls: number;
  inbox: number;
}

export async function dataInventory(userId: string): Promise<DataInventory> {
  const db = getDb();
  const n = async (q: Promise<{ n: number }[]>) => Number((await q)[0]?.n ?? 0);
  const [c, m, a, ai, inbox] = await Promise.all([
    n(db.select({ n: count() }).from(contacts).where(eq(contacts.ownerId, userId))),
    n(db.select({ n: count() }).from(records).where(eq(records.ownerId, userId))),
    n(db.select({ n: count() }).from(activityLog).where(eq(activityLog.userId, userId))),
    n(db.select({ n: count() }).from(aiAuditLog).where(eq(aiAuditLog.userId, userId))),
    n(
      db
        .select({ n: count() })
        .from(emailOutbox)
        .where(
          or(eq(emailOutbox.recipientUserId, userId), eq(emailOutbox.triggeredByUserId, userId)),
        ),
    ),
  ]);
  return { contacts: c, meetings: m, activity: a, aiCalls: ai, inbox };
}

export type DeleteAccountResult =
  { ok: true; removed: DataInventory } | { ok: false; error: string };

/**
 * Hard-delete the account and everything it owns (see deleteUsersCascade).
 * Afterwards a single anonymous row (no user id, counts only) records that a
 * deletion happened, so the admin audit trail is not silently shortened.
 */
export async function deleteAccount(
  user: User,
  confirmUserName: string,
): Promise<DeleteAccountResult> {
  if (isSharedDemo(user)) {
    return {
      ok: false,
      error: "The shared demo accounts cannot be deleted. Try it in a guest sandbox instead.",
    };
  }
  if (confirmUserName.trim().toLowerCase() !== user.userName.toLowerCase()) {
    return { ok: false, error: "Type your user name exactly to confirm." };
  }
  const removed = await dataInventory(user.id);
  await deleteUsersCascade(getDb(), [user.id]);
  await logActivity(null, "account-delete", "account", null, {
    contacts: removed.contacts,
    meetings: removed.meetings,
    activityEntries: removed.activity,
    aiCalls: removed.aiCalls,
    guest: Boolean(user.expiresAt),
  });
  return { ok: true, removed };
}
