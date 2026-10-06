import "server-only";
import { and, desc, eq, isNull, or, sql } from "drizzle-orm";
import { getDb } from "@/db/client";
import { newId } from "@/db/ids";
import { emailOutbox, users, type OutboxEmail, type User } from "@/db/schema";
import { EMAIL_SUBJECTS, type EmailKind } from "@/lib/email-templates";

/**
 * "Demo inbox": instead of Gmail SMTP (nodemailer in the original), every e-mail
 * is stored in `email_outbox`. A message is visible to the account it was
 * addressed to (resolved when it is sent), to the user who triggered it (e.g.
 * the inviter of a fast-register e-mail), to the browser that requested it
 * (pre-login sign-up / reset codes), and to the admin in /admin/records.
 */

export async function sendEmail(opts: {
  to: string;
  kind: EmailKind;
  html: string;
  code?: string;
  actionPath?: string;
  recipientUserId?: string | null;
  triggeredByUserId?: string | null;
  browserKey?: string | null;
}): Promise<OutboxEmail> {
  const db = getDb();
  const recipient =
    opts.recipientUserId !== undefined
      ? opts.recipientUserId
      : ((
          await db
            .select({ id: users.id })
            .from(users)
            .where(
              sql`exists (select 1 from json_each(${users.emails}) where lower(value) = lower(${opts.to}))`,
            )
            .limit(1)
        )[0]?.id ?? null);
  const [row] = await db
    .insert(emailOutbox)
    .values({
      id: newId(),
      toEmail: opts.to,
      subject: EMAIL_SUBJECTS[opts.kind],
      kind: opts.kind,
      html: opts.html,
      code: opts.code ?? null,
      actionPath: opts.actionPath ?? null,
      recipientUserId: recipient,
      triggeredByUserId: opts.triggeredByUserId ?? null,
      browserKey: opts.browserKey ?? null,
      createdAt: new Date(),
    })
    .returning();
  return row;
}

function inboxFilter(user: User | null, browserKey: string | null) {
  const conds = [];
  if (user) {
    conds.push(eq(emailOutbox.recipientUserId, user.id));
    conds.push(eq(emailOutbox.triggeredByUserId, user.id));
  }
  if (browserKey) conds.push(eq(emailOutbox.browserKey, browserKey));
  return conds.length ? or(...conds) : undefined;
}

export async function listInbox(user: User | null, browserKey: string | null, limit = 50) {
  const where = inboxFilter(user, browserKey);
  if (!where) return [];
  return getDb()
    .select()
    .from(emailOutbox)
    .where(where)
    .orderBy(desc(emailOutbox.createdAt))
    .limit(limit);
}

export async function getInboxMessage(id: string, user: User | null, browserKey: string | null) {
  const where = inboxFilter(user, browserKey);
  if (!where) return null;
  const [row] = await getDb()
    .select()
    .from(emailOutbox)
    .where(and(eq(emailOutbox.id, id), where))
    .limit(1);
  return row ?? null;
}

export async function markRead(id: string, user: User | null, browserKey: string | null) {
  const msg = await getInboxMessage(id, user, browserKey);
  if (!msg || msg.readAt) return;
  await getDb().update(emailOutbox).set({ readAt: new Date() }).where(eq(emailOutbox.id, id));
}

export async function unreadCount(user: User | null, browserKey: string | null): Promise<number> {
  const where = inboxFilter(user, browserKey);
  if (!where) return 0;
  const [row] = await getDb()
    .select({ n: sql<number>`count(*)` })
    .from(emailOutbox)
    .where(and(where, isNull(emailOutbox.readAt)));
  return Number(row?.n ?? 0);
}
