import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { beforeAll, describe, expect, it } from "vitest";
import { eq } from "drizzle-orm";
import { createDb, runMigrations } from "@/db/client-core";
import { seedDatabase } from "@/db/populate";
import { contacts, emailOutbox, records, users } from "@/db/schema";
import { DEMO_ACCOUNTS } from "@/db/demo-accounts";

/**
 * Integration tests of the ported controllers (server layer) against a
 * temporary, migrated and seeded SQLite database.
 */

const file = path.join(fs.mkdtempSync(path.join(os.tmpdir(), "pcrm-test-")), "test.db");
process.env.DATABASE_URL = `file:${file}`;

const { db } = createDb(`file:${file}`);
const svc = {
  contacts: await import("./contacts"),
  records: await import("./records"),
  users: await import("./users"),
  admin: await import("./admin"),
};

beforeAll(async () => {
  await runMigrations(db);
  await seedDatabase(db, new Date("2026-10-05T00:00:00Z"));
}, 30_000);

const demo = async () => (await svc.users.findUserByUserName("demo"))!;

describe("accounts", () => {
  it("logs in with the published demo credentials (case-insensitive user name)", async () => {
    expect(await svc.users.authenticate("DEMO", DEMO_ACCOUNTS.demo.password)).not.toBeNull();
    expect(await svc.users.authenticate("demo", "wrong-password1")).toBeNull();
  });

  it("checks user names like checkUserDuplicate", async () => {
    expect(await svc.users.checkUserName("")).toEqual({
      status: false,
      message: "userName is empty",
    });
    expect(await svc.users.checkUserName("Ava.Chen")).toEqual({
      status: false,
      message: "userName has been taken by someone else",
    });
    expect(await svc.users.checkUserName("brand-new")).toEqual({
      status: true,
      message: "userName is able to use",
    });
  });

  it("registers only with the e-mailed code (sendEmailcode -> signup)", async () => {
    await svc.users.sendSignupCode("new.person@example.com", "b".repeat(32));
    const [mail] = await db
      .select()
      .from(emailOutbox)
      .where(eq(emailOutbox.toEmail, "new.person@example.com"));
    expect(mail.code).toMatch(/^\d{6}$/);
    expect(mail.subject).toBe("Vertify Your Email with Code");
    const wrong = mail.code === "000000" ? "111111" : "000000";
    const base = {
      email: "new.person@example.com",
      userName: "new.person",
      password: "passw0rd",
      re_password: "passw0rd",
    };
    expect(await svc.users.register({ ...base, authCode: wrong })).toEqual({
      ok: false,
      error: "Wrong Code, please try again",
    });
    const ok = await svc.users.register({ ...base, authCode: mail.code! });
    expect(ok.ok).toBe(true);
    // codes are single-use
    expect(
      (await svc.users.register({ ...base, userName: "other", authCode: mail.code! })).ok,
    ).toBe(false);
  });

  it("refuses password resets for the shared demo accounts", async () => {
    expect(await svc.users.sendResetCode("demo", null)).toMatchObject({ ok: false });
    expect(await svc.users.sendResetCode("nobody-here", null)).toEqual({
      ok: false,
      error: "User doesn't exist",
    });
  });
});

describe("contacts (contactController)", () => {
  it("lists the demo address book with meeting stats", async () => {
    const list = await svc.contacts.listContacts((await demo()).id);
    expect(list).toHaveLength(25);
    expect(list.reduce((n, c) => n + c.meetingCount, 0)).toBe(40);
  });

  it("rejects duplicates and links contacts that match a registered account", async () => {
    const owner = (await svc.users.findUserByUserName("admin"))!; // empty address book
    const ava = {
      firstName: "Ava",
      lastName: "Chen",
      occupation: "anything",
      phones: ["0491570006"],
      emails: ["ava.chen@example.com"],
      note: "",
      customFields: [],
    };
    const first = await svc.contacts.createContact(owner.id, { ...ava, firstName: "Avery" });
    expect(first).toMatchObject({ status: true, linked: false });
    const linked = await svc.contacts.createContact(owner.id, ava);
    expect(linked.status && linked.linked).toBe(true);
    expect(linked.status && linked.contact.status).toBe(false); // the original set status: false here
    expect(linked.status && linked.contact.occupation).toBe("UX researcher"); // copied from the account
    const dup = await svc.contacts.createContact(owner.id, { ...ava, occupation: "UX researcher" });
    expect(dup).toMatchObject({ status: false, msg: "dupcontact/createProblem" });
  });

  it("adds by user name (QR) once, and reports unknown users", async () => {
    const owner = await svc.users.createGuest();
    const before = (await svc.contacts.listContacts(owner.id)).length;
    // the guest sandbox already links the directory users; a brand-new account is not linked yet
    await db.insert(users).values({
      id: "usr_zoe",
      userName: "zoe.k",
      passwordHash: "x",
      firstName: "Zoe",
      lastName: "Kim",
      occupation: "Chef",
      emails: ["zoe.k@example.com"],
      phones: ["0491579000"],
    });
    const added = await svc.contacts.createContactByUserName(owner, "zoe.k");
    expect(added.status).toBe(true);
    expect((await svc.contacts.listContacts(owner.id)).length).toBe(before + 1);
    expect(await svc.contacts.createContactByUserName(owner, "zoe.k")).toMatchObject({
      status: false,
      msg: "You already add this contact!",
    });
    expect(await svc.contacts.createContactByUserName(owner, "ghost")).toEqual({
      status: false,
      msg: "Cannot find user!",
    });
    expect(await svc.contacts.createContactByUserName(owner, owner.userName)).toMatchObject({
      status: false,
    });
  });

  it("syncs a stale linked contact from the account (synchronizationContactInfo)", async () => {
    const me = await demo();
    const [mia] = await db.select().from(contacts).where(eq(contacts.linkedUserId, "dir_miarossi"));
    expect(mia.ownerId).toBe(me.id);
    const result = await svc.contacts.syncContact(me.id, mia.id);
    expect(result.ok && result.changed.sort()).toEqual(["occupation", "phones"]);
    const again = await svc.contacts.syncContact(me.id, mia.id);
    expect(again.ok && again.changed).toEqual([]);
  });

  it("scopes every query to the owner", async () => {
    const stranger = await svc.users.createGuest();
    const [someone] = await db
      .select()
      .from(contacts)
      .where(eq(contacts.ownerId, (await demo()).id))
      .limit(1);
    expect(await svc.contacts.getContact(stranger.id, someone.id)).toBeNull();
    expect(await svc.contacts.deleteContact(stranger.id, someone.id)).toBe(false);
  });

  it("deletes a contact together with its meetings (deleteOneContact)", async () => {
    const owner = await svc.users.createGuest();
    const list = await svc.contacts.listContacts(owner.id);
    const target = list.find((c) => c.meetingCount > 0)!;
    expect(await svc.contacts.deleteContact(owner.id, target.id)).toBe(true);
    expect(await db.select().from(records).where(eq(records.contactId, target.id))).toHaveLength(0);
  });
});

describe("fast register invitation", () => {
  it("creates a pending account, e-mails a link and links the contact on confirm", async () => {
    const inviter = await svc.users.createGuest();
    const contact = (await svc.contacts.listContacts(inviter.id)).find(
      (c) => !c.linkedUserId && c.emails[0],
    )!;
    const prepared = await svc.users.prepareFastRegister(
      inviter,
      contact.id,
      "http://localhost:3110",
    );
    expect(prepared).toMatchObject({ ok: true, msg: "Email Code send" });
    const [mail] = await db
      .select()
      .from(emailOutbox)
      .where(eq(emailOutbox.triggeredByUserId, inviter.id));
    expect(mail.kind).toBe("fast-register");
    const [, , id, code] = mail.actionPath!.split("/");
    expect(code).toMatch(/^\d{10}$/);
    expect(await svc.users.authenticate(contact.firstName, "anything")).toBeNull();

    const bad = await svc.users.confirmFastRegister({
      id,
      fastRegisterCode: "0000000000",
      userName: "invitee",
      password: "passw0rd",
      re_password: "passw0rd",
    });
    expect(bad).toEqual({ ok: false, error: "auth fail!" });
    const ok = await svc.users.confirmFastRegister({
      id,
      fastRegisterCode: code,
      userName: "invitee",
      password: "passw0rd",
      re_password: "passw0rd",
    });
    expect(ok).toEqual({ ok: true, message: "your account is active now!" });
    expect(await svc.users.authenticate("invitee", "passw0rd")).not.toBeNull();
    const after = await svc.contacts.getContact(inviter.id, contact.id);
    expect(after?.linked?.userName).toBe("invitee");
  });
});

describe("records (recordController)", () => {
  it("creates, edits and deletes a meeting for an owned contact only", async () => {
    const owner = await svc.users.createGuest();
    const [c] = await svc.contacts.listContacts(owner.id);
    const created = await svc.records.createRecord(owner.id, {
      contact_id: c.id,
      location: "University of Melbourne",
      dateTime: "2021-10-01T10:28:10.018Z",
      geoCoords: { lat: -37.7982, lng: 144.961 },
      notes: "account",
    });
    expect(created.ok && created.record.dateTime.toISOString()).toBe("2021-10-01T10:28:10.018Z");
    if (!created.ok) return;
    const edited = await svc.records.editRecord(owner.id, {
      _id: created.record.id,
      contact_id: c.id,
      location: "State Library Victoria",
      geoCoords: null,
    });
    expect(edited.ok && [edited.record.location, edited.record.lat]).toEqual([
      "State Library Victoria",
      null,
    ]);

    const other = await svc.users.createGuest();
    expect(await svc.records.createRecord(other.id, { contact_id: c.id, location: "x" })).toEqual({
      ok: false,
      error: "Database query failed",
    });
    expect(await svc.records.deleteRecord(other.id, created.record.id)).toBe(false);
    expect(await svc.records.deleteRecord(owner.id, created.record.id)).toBe(true);
  });
});

describe("admin records", () => {
  it("counts tables and redacts secrets", async () => {
    const counts = await svc.admin.tableCounts();
    expect(counts.users).toBeGreaterThan(5);
    const page = await svc.admin.browseTable("users", { page: 1, pageSize: 5, q: "demo" });
    expect(page.rows.length).toBeGreaterThan(0);
    for (const row of page.rows) expect(String(row.password_hash)).not.toMatch(/^\$2/);
    const csv = await svc.admin.exportTableCsv("contacts");
    expect(csv.split("\r\n")[0]).toContain("first_name");
  });
});
