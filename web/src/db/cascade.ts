import { and, inArray, isNull, or } from "drizzle-orm";
import type { Db } from "./client-core";
import {
  activityLog,
  aiAuditLog,
  contactLinks,
  contacts,
  emailCodes,
  emailOutbox,
  fastRegisterCodes,
  records,
  users,
} from "./schema";

/**
 * Explicit cascades. SQLite only enforces foreign keys when
 * `PRAGMA foreign_keys=ON` is set per connection, which pooled libSQL
 * connections do not guarantee, so deletes are spelled out (the original
 * Express controllers also removed dependent documents by hand).
 */

function contactsCascadeStatements(db: Db, contactIds: string[]) {
  return [
    db.delete(records).where(inArray(records.contactId, contactIds)),
    db.delete(contactLinks).where(inArray(contactLinks.contactId, contactIds)),
    db
      .update(fastRegisterCodes)
      .set({ contactId: null })
      .where(inArray(fastRegisterCodes.contactId, contactIds)),
    db.delete(contacts).where(inArray(contacts.id, contactIds)),
  ] as const;
}

export async function deleteContactsCascade(db: Db, contactIds: string[]) {
  if (contactIds.length === 0) return;
  await db.batch(contactsCascadeStatements(db, contactIds));
}

/**
 * Hard-delete accounts and everything that belongs to them: contacts,
 * meetings (with any accepted AI summaries), links, invitations, demo-inbox
 * e-mails, pending e-mail codes, the activity log and the AI audit log.
 * Other people's contacts that were linked to the account are kept but
 * unlinked (they are the other person's data). Everything runs in ONE libSQL
 * batch, which is a transaction: either all of it is deleted or none of it.
 */
export async function deleteUsersCascade(db: Db, userIds: string[]) {
  if (userIds.length === 0) return;
  const addresses = (
    await db.select({ emails: users.emails }).from(users).where(inArray(users.id, userIds))
  ).flatMap((u) => u.emails);
  const owned = (
    await db.select({ id: contacts.id }).from(contacts).where(inArray(contacts.ownerId, userIds))
  ).map((c) => c.id);
  await db.batch([
    db.update(contacts).set({ linkedUserId: null }).where(inArray(contacts.linkedUserId, userIds)),
    ...(owned.length ? contactsCascadeStatements(db, owned) : []),
    db.update(records).set({ linkedUserId: null }).where(inArray(records.linkedUserId, userIds)),
    db.delete(records).where(inArray(records.ownerId, userIds)),
    db.delete(contactLinks).where(inArray(contactLinks.userId, userIds)),
    db
      .delete(fastRegisterCodes)
      .where(
        or(
          inArray(fastRegisterCodes.registerAccountId, userIds),
          inArray(fastRegisterCodes.invitedByUserId, userIds),
        ),
      ),
    db.delete(emailOutbox).where(
      or(
        inArray(emailOutbox.recipientUserId, userIds),
        inArray(emailOutbox.triggeredByUserId, userIds),
        // e.g. the sign-up code sent before the account existed
        addresses.length
          ? and(isNull(emailOutbox.recipientUserId), inArray(emailOutbox.toEmail, addresses))
          : undefined,
      ),
    ),
    ...(addresses.length
      ? [db.delete(emailCodes).where(inArray(emailCodes.email, addresses))]
      : []),
    db.delete(activityLog).where(inArray(activityLog.userId, userIds)),
    db.delete(aiAuditLog).where(inArray(aiAuditLog.userId, userIds)),
    db.delete(users).where(inArray(users.id, userIds)),
  ]);
}
