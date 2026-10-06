import "server-only";
import { and, desc, eq, sql } from "drizzle-orm";
import { getDb } from "@/db/client";
import { newId } from "@/db/ids";
import { deleteContactsCascade } from "@/db/cascade";
import { contactLinks, contacts, records, users, type Contact, type User } from "@/db/schema";
import { sameIdentity, sameLinkIdentity, syncUpdates } from "@/lib/legacy/contact-identity";
import type { CustomField } from "@/lib/legacy/validation";
import { findUserByUserName } from "./users";

/**
 * Port of `controller/contactController.js`. Every query is scoped to the
 * signed-in owner (the original trusted any contact `_id` sent by the client).
 */

export interface ContactInput {
  firstName: string;
  lastName: string;
  occupation: string;
  phones: string[];
  emails: string[];
  note: string;
  customFields: CustomField[];
  portrait?: string | null;
}

export type ContactListItem = Contact & {
  meetingCount: number;
  lastMeeting: Date | null;
  nextMeeting: Date | null;
  linkedUserName: string | null;
};

/**
 * Full names in the owner's address book ("First Last"), for the redactor's
 * address-book rule before an AI call (DR-006). Owner-scoped like every query.
 */
export async function listContactNames(ownerId: string): Promise<string[]> {
  const rows = await getDb()
    .select({ first: contacts.firstName, last: contacts.lastName })
    .from(contacts)
    .where(eq(contacts.ownerId, ownerId));
  return [...new Set(rows.map((r) => `${r.first} ${r.last}`.trim()))];
}

/** `showAllContact` - the owner's contact list, with meeting stats for the UI. */
export async function listContacts(ownerId: string): Promise<ContactListItem[]> {
  const db = getDb();
  const now = Date.now();
  const rows = await db
    .select({
      contact: contacts,
      linkedUserName: users.userName,
      meetingCount: sql<number>`(select count(*) from ${records} r where r.contact_id = ${contacts.id})`,
      lastMeeting: sql<
        number | null
      >`(select max(r.date_time) from ${records} r where r.contact_id = ${contacts.id} and r.date_time <= ${now})`,
      nextMeeting: sql<
        number | null
      >`(select min(r.date_time) from ${records} r where r.contact_id = ${contacts.id} and r.date_time > ${now})`,
    })
    .from(contacts)
    .leftJoin(users, eq(users.id, contacts.linkedUserId))
    .where(eq(contacts.ownerId, ownerId))
    .orderBy(desc(contacts.addDate));
  return rows.map((r) => ({
    ...r.contact,
    linkedUserName: r.linkedUserName ?? null,
    meetingCount: Number(r.meetingCount),
    lastMeeting: r.lastMeeting ? new Date(Number(r.lastMeeting)) : null,
    nextMeeting: r.nextMeeting ? new Date(Number(r.nextMeeting)) : null,
  }));
}

/** `showOneContact` (+ the linked account, used by "Sync"). */
export async function getContact(ownerId: string, id: string) {
  const db = getDb();
  const contact = await db.query.contacts.findFirst({
    where: and(eq(contacts.id, id), eq(contacts.ownerId, ownerId)),
  });
  if (!contact) return null;
  const linked = contact.linkedUserId
    ? ((await db.query.users.findFirst({ where: eq(users.id, contact.linkedUserId) })) ?? null)
    : null;
  const pendingSync = linked ? syncUpdates(contact, linked) : {};
  return { contact, linked, pendingSync };
}

async function findAccountWithIdentity(
  input: Pick<ContactInput, "firstName" | "lastName" | "phones" | "emails">,
) {
  const candidates = await getDb()
    .select()
    .from(users)
    .where(
      and(
        eq(users.firstName, input.firstName),
        eq(users.lastName, input.lastName),
        eq(users.status, "active"),
      ),
    );
  return candidates.find((u) => sameIdentity(u, input)) ?? null;
}

async function findDuplicate(
  ownerId: string,
  identity: Pick<ContactInput, "firstName" | "lastName" | "phones" | "emails">,
) {
  const candidates = await getDb()
    .select()
    .from(contacts)
    .where(
      and(
        eq(contacts.ownerId, ownerId),
        eq(contacts.firstName, identity.firstName),
        eq(contacts.lastName, identity.lastName),
      ),
    );
  return candidates.find((c) => sameIdentity(c, identity)) ?? null;
}

async function insertContact(ownerId: string, values: Omit<Contact, "id" | "ownerId" | "addDate">) {
  const db = getDb();
  const now = new Date();
  const id = newId();
  const [row] = await db
    .insert(contacts)
    .values({ ...values, id, ownerId, addDate: now })
    .returning();
  // ContactList sub-document: { contact, addSince }
  await db
    .insert(contactLinks)
    .values({ id: newId(), userId: ownerId, contactId: id, addSince: now });
  return row;
}

export type CreateContactResult =
  | { status: true; contact: Contact; linked: boolean }
  | { status: false; msg: string; contactId?: string };

/**
 * `createContactOneStep` / `createContactDocumentationOneStep`:
 *  - duplicate (same names + phone list + e-mail list) -> rejected;
 *  - matches a registered account -> the contact is created from the
 *    account's details and linked to it (`status: false`);
 *  - otherwise created from the form (`status: true`).
 */
export async function createContact(
  ownerId: string,
  input: ContactInput,
): Promise<CreateContactResult> {
  const dup = await findDuplicate(ownerId, input);
  if (dup) return { status: false, msg: "dupcontact/createProblem", contactId: dup.id };
  const account = await findAccountWithIdentity(input);
  if (account && account.id !== ownerId) {
    const contact = await insertContact(ownerId, {
      linkedUserId: account.id,
      firstName: account.firstName ?? input.firstName,
      lastName: account.lastName ?? input.lastName,
      occupation: account.occupation ?? input.occupation,
      emails: account.emails,
      phones: account.phones,
      note: input.note,
      status: false,
      customFields: input.customFields,
      portrait: account.portrait ?? input.portrait ?? null,
    });
    return { status: true, contact, linked: true };
  }
  const contact = await insertContact(ownerId, {
    linkedUserId: null,
    firstName: input.firstName,
    lastName: input.lastName,
    occupation: input.occupation,
    emails: input.emails,
    phones: input.phones,
    note: input.note,
    status: true,
    customFields: input.customFields,
    portrait: input.portrait ?? null,
  });
  return { status: true, contact, linked: false };
}

/** `createContactbyUserName` - used by "Add by user name" and the QR scanner. */
export async function createContactByUserName(
  owner: User,
  userName: string,
): Promise<CreateContactResult> {
  const account = await findUserByUserName(userName);
  if (!account || account.status !== "active") return { status: false, msg: "Cannot find user!" };
  if (account.id === owner.id)
    return { status: false, msg: "That's you - share your code with someone else!" };
  const identity = {
    firstName: account.firstName ?? "",
    lastName: account.lastName ?? "",
    phones: account.phones,
    emails: account.emails,
  };
  const dup =
    (await findDuplicate(owner.id, identity)) ??
    (await getDb().query.contacts.findFirst({
      where: and(eq(contacts.ownerId, owner.id), eq(contacts.linkedUserId, account.id)),
    })) ??
    null;
  if (dup) return { status: false, msg: "You already add this contact!", contactId: dup.id };
  const contact = await insertContact(owner.id, {
    linkedUserId: account.id,
    firstName: account.firstName || account.userName,
    lastName: account.lastName ?? "",
    occupation: account.occupation ?? "",
    emails: account.emails,
    phones: account.phones,
    note: "",
    status: true,
    customFields: [],
    portrait: account.portrait,
  });
  return { status: true, contact, linked: true };
}

/** `updateContactInfo` (photo upload folded in). */
export async function updateContact(
  ownerId: string,
  id: string,
  input: ContactInput,
): Promise<Contact | null> {
  const patch: Partial<Contact> = {
    firstName: input.firstName,
    lastName: input.lastName,
    phones: input.phones,
    emails: input.emails,
    occupation: input.occupation,
    note: input.note,
    customFields: input.customFields,
  };
  if (input.portrait !== undefined) patch.portrait = input.portrait;
  const [row] = await getDb()
    .update(contacts)
    .set(patch)
    .where(and(eq(contacts.id, id), eq(contacts.ownerId, ownerId)))
    .returning();
  return row ?? null;
}

/** `deleteOneContact` - also removes the owner's meetings with this contact. */
export async function deleteContact(ownerId: string, id: string): Promise<boolean> {
  const db = getDb();
  const contact = await db.query.contacts.findFirst({
    where: and(eq(contacts.id, id), eq(contacts.ownerId, ownerId)),
  });
  if (!contact) return false;
  await deleteContactsCascade(db, [id]);
  return true;
}

/** `synchronizationContactInfo` - copy newer details from the linked account. */
export async function syncContact(
  ownerId: string,
  id: string,
): Promise<{ ok: true; contact: Contact; changed: string[] } | { ok: false; error: string }> {
  const found = await getContact(ownerId, id);
  if (!found) return { ok: false, error: "Contact not found." };
  if (!found.linked) return { ok: false, error: "no account linked to this contact" };
  const changed = Object.keys(found.pendingSync);
  if (changed.length === 0) return { ok: true, contact: found.contact, changed };
  const [row] = await getDb()
    .update(contacts)
    .set(found.pendingSync)
    .where(and(eq(contacts.id, id), eq(contacts.ownerId, ownerId)))
    .returning();
  return { ok: true, contact: row, changed };
}

/** `linkToAccount` - connect every contact identical to `contactId` to an account. */
export async function linkToAccount(contactId: string, accountId: string): Promise<number> {
  const db = getDb();
  const source = await db.query.contacts.findFirst({ where: eq(contacts.id, contactId) });
  if (!source) return 0;
  const candidates = await db
    .select()
    .from(contacts)
    .where(and(eq(contacts.firstName, source.firstName), eq(contacts.lastName, source.lastName)));
  let n = 0;
  for (const c of candidates) {
    if (sameLinkIdentity(c, source)) {
      await db.update(contacts).set({ linkedUserId: accountId }).where(eq(contacts.id, c.id));
      n++;
    }
  }
  return n;
}

/** Contacts for the meeting form's "who did you meet" picker. */
export async function contactOptions(ownerId: string) {
  return getDb()
    .select({
      id: contacts.id,
      firstName: contacts.firstName,
      lastName: contacts.lastName,
      occupation: contacts.occupation,
      portrait: contacts.portrait,
    })
    .from(contacts)
    .where(eq(contacts.ownerId, ownerId))
    .orderBy(contacts.firstName, contacts.lastName);
}
