import { inArray, or } from "drizzle-orm";
import type { Db } from "./client-core";
import { contactLinks, contacts, emailOutbox, fastRegisterCodes, records, users } from "./schema";

/**
 * Explicit cascades. SQLite only enforces foreign keys when
 * `PRAGMA foreign_keys=ON` is set per connection, which pooled libSQL
 * connections do not guarantee, so deletes are spelled out (the original
 * Express controllers also removed dependent documents by hand).
 */

export async function deleteContactsCascade(db: Db, contactIds: string[]) {
  if (contactIds.length === 0) return;
  await db.batch([
    db.delete(records).where(inArray(records.contactId, contactIds)),
    db.delete(contactLinks).where(inArray(contactLinks.contactId, contactIds)),
    db
      .update(fastRegisterCodes)
      .set({ contactId: null })
      .where(inArray(fastRegisterCodes.contactId, contactIds)),
    db.delete(contacts).where(inArray(contacts.id, contactIds)),
  ]);
}

export async function deleteUsersCascade(db: Db, userIds: string[]) {
  if (userIds.length === 0) return;
  const owned = await db
    .select({ id: contacts.id })
    .from(contacts)
    .where(inArray(contacts.ownerId, userIds));
  await deleteContactsCascade(
    db,
    owned.map((c) => c.id),
  );
  await db.batch([
    db.update(contacts).set({ linkedUserId: null }).where(inArray(contacts.linkedUserId, userIds)),
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
    db
      .delete(emailOutbox)
      .where(
        or(
          inArray(emailOutbox.recipientUserId, userIds),
          inArray(emailOutbox.triggeredByUserId, userIds),
        ),
      ),
    db.delete(users).where(inArray(users.id, userIds)),
  ]);
}
