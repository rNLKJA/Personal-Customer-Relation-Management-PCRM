import bcrypt from "bcryptjs";
import { eq, inArray } from "drizzle-orm";
import { deleteUsersCascade } from "./cascade";
import type { Db } from "./client-core";
import { newId } from "./ids";
import { contactLinks, contacts, emailOutbox, records, users } from "./schema";
import { DEMO_ACCOUNTS, DIRECTORY_USERS } from "./demo-accounts";
import { generateSampleData, type LinkableAccount } from "@/lib/sample-data";
import { PLACES } from "@/lib/places";
import { mulberry32, hashString } from "@/lib/random";
import { verificationEmailHtml } from "@/lib/email-templates";

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

  // SQLite caps bound parameters per statement; insert in modest chunks.
  for (const chunk of chunks(contactRows, 50)) await db.insert(contacts).values(chunk);
  for (const chunk of chunks(linkRows, 100)) await db.insert(contactLinks).values(chunk);
  for (const chunk of chunks(recordRows, 50)) await db.insert(records).values(chunk);
  return { contacts: contactRows.length, records: recordRows.length };
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

  const demoId = "usr_demo";
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
    createdAt: created(365),
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
    subject: "Vertify Your Email with Code",
    kind: "verification",
    html: verificationEmailHtml("438921"),
    code: "438921",
    recipientUserId: demoId,
    createdAt: created(365),
    readAt: created(365),
  });
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
  return expired.length;
}
