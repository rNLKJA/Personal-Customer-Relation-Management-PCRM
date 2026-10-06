import bcrypt from "bcryptjs";
import { and, eq, inArray, lt, sql } from "drizzle-orm";
import { deleteUsersCascade } from "./cascade";
import type { Db } from "./client-core";
import { newId } from "./ids";
import { activityLog, contactLinks, contacts, emailOutbox, records, users } from "./schema";
import { DEMO_ACCOUNTS, DIRECTORY_USERS } from "./demo-accounts";
import { generateSampleData, type LinkableAccount } from "@/lib/sample-data";
import { PLACES } from "@/lib/places";
import { mulberry32, hashString } from "@/lib/random";
import { EMAIL_SUBJECTS, verificationEmailHtml } from "@/lib/email-templates";
import { activityCutoff } from "@/lib/retention";

/**
 * Data population shared by `pnpm db:seed` (deterministic demo database) and
 * the "Try as guest" sandbox. Deliberately free of `server-only` so it can run
 * under plain Node (tsx) as well as inside Next.js.
 */

export const BCRYPT_ROUNDS = 10; // same cost factor as the original bcrypt.hash(password, 10)

export function hashPassword(password: string): Promise<string> {
  return bcrypt.hash(password, BCRYPT_ROUNDS);
}

export function directoryAsLinkable(): LinkableAccount[] {
  return DIRECTORY_USERS.map((u) => ({
    userName: u.userName,
    firstName: u.firstName,
    lastName: u.lastName,
    occupation: u.occupation,
    emails: [...u.emails],
    phones: [...u.phones],
  }));
}

/**
 * Give `ownerId` a realistic address book: ~25 contacts (a few linked to the
 * directory accounts) and ~40 geo-tagged meetings around Melbourne.
 */
export async function populateAddressBook(
  db: Db,
  opts: {
    ownerId: string;
    seed: number;
    anchor: Date;
    contactCount?: number;
    recordCount?: number;
  },
): Promise<{ contacts: number; records: number }> {
  const rng = mulberry32(opts.seed);
  const linkable = directoryAsLinkable();
  const directory = await db
    .select({ id: users.id, userName: users.userName })
    .from(users)
    .where(
      inArray(
        users.userName,
        linkable.map((l) => l.userName),
      ),
    );
  const idByUserName = new Map(directory.map((d) => [d.userName, d.id]));

  const sample = generateSampleData({
    rng,
    anchor: opts.anchor,
    places: PLACES,
    linkable: linkable.filter((l) => idByUserName.has(l.userName)),
    contactCount: opts.contactCount,
    recordCount: opts.recordCount,
  });

  const contactIdByKey = new Map<string, string>();
  const contactRows = sample.contacts.map((c) => {
    const id = newId();
    contactIdByKey.set(c.key, id);
    return {
      id,
      ownerId: opts.ownerId,
      linkedUserId: c.linkedUserName ? (idByUserName.get(c.linkedUserName) ?? null) : null,
      firstName: c.firstName,
      lastName: c.lastName,
      occupation: c.occupation,
      emails: c.emails,
      phones: c.phones,
      note: c.note,
      status: c.status,
      customFields: c.customFields,
      portrait: null,
      addDate: c.addDate,
    };
  });
  const linkRows = contactRows.map((c) => ({
    id: newId(),
    userId: opts.ownerId,
    contactId: c.id,
    addSince: c.addDate,
  }));
  const recordRows = sample.records.map((r) => {
    const contactId = contactIdByKey.get(r.contactKey)!;
    const contact = contactRows.find((c) => c.id === contactId)!;
    return {
      id: newId(),
      ownerId: opts.ownerId,
      contactId,
      linkedUserId: contact.linkedUserId,
      dateTime: r.dateTime,
      location: r.location,
      notes: r.notes,
      lat: r.lat,
      lng: r.lng,
      customFields: r.customFields,
      createdAt: new Date(Math.min(r.dateTime.getTime(), opts.anchor.getTime())),
    };
  });

  // One longer, detail-rich note on the most recent past meeting, so the AI
  // meeting-note assistant has something to redact (every detail is fictional:
  // example.org, ACMA fiction-range numbers, an invented street).
  const lastPast = recordRows.filter((r) => r.dateTime.getTime() <= opts.anchor.getTime()).at(-1);
  if (lastPast) {
    const c = contactRows.find((x) => x.id === lastPast.contactId)!;
    lastPast.notes = richMeetingNote(c.firstName, c.lastName, lastPast.location.split(",")[0]);
  }

  // SQLite caps bound parameters per statement; insert in modest chunks.
  for (const chunk of chunks(contactRows, 50)) await db.insert(contacts).values(chunk);
  for (const chunk of chunks(linkRows, 100)) await db.insert(contactLinks).values(chunk);
  for (const chunk of chunks(recordRows, 50)) await db.insert(records).values(chunk);
  return { contacts: contactRows.length, records: recordRows.length };
}

/** Fictional, detail-rich meeting note (see populateAddressBook). */
export function richMeetingNote(first: string, last: string, place: string): string {
  const handle = `${first}.${last}`.toLowerCase().replace(/[^a-z.]/g, "");
  return [
    `Long catch-up with ${first} at ${place}.`,
    `${first} is moving to the data team next month and asked me to send the reading list on causal inference by Friday.`,
    `New work e-mail: ${handle}@example.org, mobile 0491 570 159 (the old 0491 570 006 no longer works).`,
    `I'm dropping the book off at 14 Wattlebird Lane, Northcote VIC 3070 on Saturday.`,
    `Also: intro ${first} to Sam Patel about the open-data project, and book a coffee in three weeks.`,
  ].join(" ");
}

function chunks<T>(list: T[], size: number): T[][] {
  const out: T[][] = [];
  for (let i = 0; i < list.length; i += size) out.push(list.slice(i, i + size));
  return out;
}

/** Start of the given day (UTC) - the seed anchor, so a re-seed on the same day is identical. */
export function startOfUtcDay(d: Date = new Date()): Date {
  return new Date(Date.UTC(d.getUTCFullYear(), d.getUTCMonth(), d.getUTCDate()));
}

/** Id of the shared, one-click "Demo user" account. */
export const DEMO_USER_ID = "usr_demo";
/** The seed creates the demo user exactly this many days before its anchor date. */
export const DEMO_ACCOUNT_AGE_DAYS = 365;
const DAY_MS = 864e5;

/** Seed an empty, migrated database with the demo accounts and their data. */
export async function seedDatabase(db: Db, anchor: Date = startOfUtcDay()): Promise<void> {
  const created = (daysAgo: number) => new Date(anchor.getTime() - daysAgo * 864e5);

  // Directory accounts (people you can add by user name / QR code). Their
  // passwords are random: they are not meant to be signed into.
  for (const [i, u] of DIRECTORY_USERS.entries()) {
    await db.insert(users).values({
      id: `dir_${u.userName.replace(/[^a-z]/g, "")}`,
      userName: u.userName,
      passwordHash: await hashPassword(
        `locked-${hashString(u.userName + anchor.toISOString())}-${i}x`,
      ),
      firstName: u.firstName,
      lastName: u.lastName,
      occupation: u.occupation,
      emails: [...u.emails],
      phones: [...u.phones],
      statusMessage: u.statusMessage,
      status: "active",
      role: "user",
      isDemo: true,
      createdAt: created(400 - i * 20),
    });
  }

  const demoId = DEMO_USER_ID;
  await db.insert(users).values({
    id: demoId,
    userName: DEMO_ACCOUNTS.demo.userName,
    passwordHash: await hashPassword(DEMO_ACCOUNTS.demo.password),
    firstName: "Jordan",
    lastName: "Lee",
    occupation: "Product manager",
    emails: ["jordan.lee@example.com"],
    phones: ["0491579999"],
    statusMessage: "Collecting good conversations",
    status: "active",
    role: "user",
    isDemo: true,
    createdAt: created(DEMO_ACCOUNT_AGE_DAYS),
  });

  await db.insert(users).values({
    id: "usr_admin",
    userName: DEMO_ACCOUNTS.admin.userName,
    passwordHash: await hashPassword(DEMO_ACCOUNTS.admin.password),
    firstName: "Demo",
    lastName: "Admin",
    occupation: "Site administrator",
    emails: ["admin@example.com"],
    phones: [],
    statusMessage: null,
    status: "active",
    role: "admin",
    isDemo: true,
    createdAt: created(365),
  });

  await populateAddressBook(db, { ownerId: demoId, seed: 4399, anchor });

  // A historical verification e-mail so the demo inbox is not empty.
  await db.insert(emailOutbox).values({
    id: newId(),
    toEmail: "jordan.lee@example.com",
    subject: EMAIL_SUBJECTS.verification,
    kind: "verification",
    html: verificationEmailHtml("438921"),
    code: "438921",
    recipientUserId: demoId,
    createdAt: created(365),
    readAt: created(365),
  });
}

/** The date the shared demo account's data is currently anchored to. */
export function demoAnchorOf(demoCreatedAt: Date): Date {
  return new Date(demoCreatedAt.getTime() + DEMO_ACCOUNT_AGE_DAYS * DAY_MS);
}

/** Whole days the shared demo account's data lags behind `now` (0 when current). */
export function demoLagDays(demoCreatedAt: Date, now: Date = new Date()): number {
  const lag = startOfUtcDay(now).getTime() - startOfUtcDay(demoAnchorOf(demoCreatedAt)).getTime();
  return Math.max(0, Math.round(lag / DAY_MS));
}

/**
 * Keep the shared demo account current: the snapshot (and a Turso database
 * seeded once) is anchored to a fixed date, so its "Up next" meetings would
 * drift into the past. Slide every date of the demo user's address book
 * forward by whole days so the anchor is today. The demo user's `created_at`
 * doubles as the anchor and as an optimistic lock, so concurrent requests
 * shift the data only once. Returns the number of days shifted.
 */
export async function reanchorDemoAccount(db: Db, now: Date = new Date()): Promise<number> {
  const demo = await db
    .select({ createdAt: users.createdAt })
    .from(users)
    .where(eq(users.id, DEMO_USER_ID))
    .get();
  if (!demo) return 0;
  const days = demoLagDays(demo.createdAt, now);
  if (days < 1) return 0;
  const delta = days * DAY_MS;
  return db.transaction(async (tx) => {
    const claimed = await tx
      .update(users)
      .set({ createdAt: new Date(demo.createdAt.getTime() + delta) })
      .where(and(eq(users.id, DEMO_USER_ID), eq(users.createdAt, demo.createdAt)))
      .returning({ id: users.id });
    if (claimed.length === 0) return 0; // another request already shifted it
    await tx
      .update(records)
      .set({
        dateTime: sql`${records.dateTime} + ${delta}`,
        createdAt: sql`${records.createdAt} + ${delta}`,
      })
      .where(eq(records.ownerId, DEMO_USER_ID));
    await tx
      .update(contacts)
      .set({ addDate: sql`${contacts.addDate} + ${delta}` })
      .where(eq(contacts.ownerId, DEMO_USER_ID));
    await tx
      .update(contactLinks)
      .set({ addSince: sql`${contactLinks.addSince} + ${delta}` })
      .where(eq(contactLinks.userId, DEMO_USER_ID));
    await tx
      .update(emailOutbox)
      .set({
        createdAt: sql`${emailOutbox.createdAt} + ${delta}`,
        readAt: sql`${emailOutbox.readAt} + ${delta}`,
      })
      .where(eq(emailOutbox.recipientUserId, DEMO_USER_ID));
    return days;
  });
}

/** Activity-log retention (see src/lib/retention.ts): delete entries past the cutoff. */
export async function purgeOldActivityEntries(db: Db, now = new Date()): Promise<void> {
  await db.delete(activityLog).where(lt(activityLog.createdAt, activityCutoff(now.getTime())));
}

/** Delete expired guest sandboxes and never-confirmed invitee accounts. */
export async function purgeExpiredUsers(db: Db, now = new Date()): Promise<number> {
  const all = await db
    .select({ id: users.id, expiresAt: users.expiresAt })
    .from(users)
    .where(eq(users.isDemo, false));
  const expired = all
    .filter((u) => u.expiresAt && u.expiresAt.getTime() < now.getTime())
    .map((u) => u.id);
  await deleteUsersCascade(db, expired);
  await purgeOldActivityEntries(db, now);
  return expired.length;
}
