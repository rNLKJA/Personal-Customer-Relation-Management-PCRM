import "server-only";
import { and, desc, eq } from "drizzle-orm";
import { getDb } from "@/db/client";
import { newId } from "@/db/ids";
import { contacts, records, type MeetingRecord } from "@/db/schema";
import {
  normaliseRecordRequest,
  QUERY_FAILED,
  type RecordRequestBody,
} from "@/lib/legacy/record-input";

/**
 * Port of `controller/recordController.js` (createRecord, showAllRecords,
 * editRecord, deleteOneRecord). Records are scoped to their owner.
 */

export interface MeetingPerson {
  id: string;
  firstName: string;
  lastName: string;
  occupation: string;
  phones: string[];
  emails: string[];
  portrait: string | null;
}

export type RecordWithPerson = MeetingRecord & { meetingPerson: MeetingPerson };

const personColumns = {
  id: contacts.id,
  firstName: contacts.firstName,
  lastName: contacts.lastName,
  occupation: contacts.occupation,
  phones: contacts.phones,
  emails: contacts.emails,
  portrait: contacts.portrait,
};

/** `showAllRecords` with `populate("meetingPerson")`. */
export async function listRecords(
  ownerId: string,
  opts: { contactId?: string } = {},
): Promise<RecordWithPerson[]> {
  const where = opts.contactId
    ? and(eq(records.ownerId, ownerId), eq(records.contactId, opts.contactId))
    : eq(records.ownerId, ownerId);
  const rows = await getDb()
    .select({ record: records, person: personColumns })
    .from(records)
    .innerJoin(contacts, eq(contacts.id, records.contactId))
    .where(where)
    .orderBy(desc(records.dateTime));
  return rows.map((r) => ({ ...r.record, meetingPerson: r.person }));
}

export async function getRecord(ownerId: string, id: string): Promise<RecordWithPerson | null> {
  const [row] = await getDb()
    .select({ record: records, person: personColumns })
    .from(records)
    .innerJoin(contacts, eq(contacts.id, records.contactId))
    .where(and(eq(records.id, id), eq(records.ownerId, ownerId)))
    .limit(1);
  return row ? { ...row.record, meetingPerson: row.person } : null;
}

export type SaveRecordResult = { ok: true; record: MeetingRecord } | { ok: false; error: string };

async function ownedContact(ownerId: string, contactId: string) {
  return getDb().query.contacts.findFirst({
    where: and(eq(contacts.id, contactId), eq(contacts.ownerId, ownerId)),
  });
}

/** `createRecord` */
export async function createRecord(ownerId: string, body: RecordRequestBody): Promise<SaveRecordResult> {
  const parsed = normaliseRecordRequest(body, { editing: false });
  if (!parsed.ok) return { ok: false, error: parsed.error };
  const person = await ownedContact(ownerId, parsed.value.contactId);
  if (!person) return { ok: false, error: QUERY_FAILED };
  const v = parsed.value;
  const [record] = await getDb()
    .insert(records)
    .values({
      id: newId(),
      ownerId,
      contactId: v.contactId,
      linkedUserId: person.linkedUserId,
      dateTime: v.dateTime,
      location: v.location,
      notes: v.notes,
      lat: v.lat,
      lng: v.lng,
      customFields: v.customFields,
      createdAt: new Date(),
    })
    .returning();
  return { ok: true, record };
}

/** `editRecord` */
export async function editRecord(ownerId: string, body: RecordRequestBody): Promise<SaveRecordResult> {
  const parsed = normaliseRecordRequest(body, { editing: true });
  if (!parsed.ok) return { ok: false, error: parsed.error };
  const v = parsed.value;
  const person = await ownedContact(ownerId, v.contactId);
  if (!person) return { ok: false, error: QUERY_FAILED };
  const [record] = await getDb()
    .update(records)
    .set({
      contactId: v.contactId,
      linkedUserId: person.linkedUserId,
      dateTime: v.dateTime,
      location: v.location,
      notes: v.notes,
      lat: v.lat,
      lng: v.lng,
      customFields: v.customFields,
    })
    .where(and(eq(records.id, v.id!), eq(records.ownerId, ownerId)))
    .returning();
  if (!record) return { ok: false, error: QUERY_FAILED };
  return { ok: true, record };
}

/** `deleteOneRecord` */
export async function deleteRecord(ownerId: string, id: string): Promise<boolean> {
  const deleted = await getDb()
    .delete(records)
    .where(and(eq(records.id, id), eq(records.ownerId, ownerId)))
    .returning({ id: records.id });
  return deleted.length > 0;
}
