import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { beforeAll, describe, expect, it } from "vitest";
import { and, eq, isNull } from "drizzle-orm";
import { createDb, runMigrations } from "@/db/client-core";
import { purgeExpiredUsers, seedDatabase } from "@/db/populate";
import {
  activityLog,
  aiAuditLog,
  contacts,
  emailCodes,
  emailOutbox,
  records,
  users,
  type TableName,
} from "@/db/schema";
import { MEETING_ASSIST_PROMPT_VERSION } from "@/lib/ai/meeting-assist";
import type { AiAuditInput } from "@/lib/ai/audit";
import { redact } from "@/lib/redact/redact";

/**
 * Integration tests of the privacy features (activity log, AI audit log,
 * export and account deletion) against a temporary, migrated SQLite database.
 */

const file = path.join(fs.mkdtempSync(path.join(os.tmpdir(), "pcrm-privacy-")), "test.db");
process.env.DATABASE_URL = `file:${file}`;

const { db } = createDb(`file:${file}`);
const svc = {
  users: await import("./users"),
  contacts: await import("./contacts"),
  records: await import("./records"),
  activity: await import("./activity"),
  ai: await import("./ai-audit"),
  data: await import("./your-data"),
  admin: await import("./admin"),
};

beforeAll(async () => {
  await runMigrations(db);
  await seedDatabase(db, new Date("2026-10-05T00:00:00Z"));
}, 30_000);

function entry(overrides: Partial<AiAuditInput> = {}): AiAuditInput {
  return {
    feature: "meeting-note-assistant",
    provider: "anthropic",
    model: "claude-haiku-4-5",
    servedModel: "claude-haiku-4-5",
    promptVersion: MEETING_ASSIST_PROMPT_VERSION,
    recordId: null,
    input: "Meeting note:\n<<<\nCall [NAME].\n>>>",
    redactionCounts: { email: 0, phone: 0, address: 0, name: 1 },
    output: JSON.stringify({ summary: "Call them.", follow_ups: [] }),
    error: null,
    latencyMs: 900,
    inputTokens: 100,
    outputTokens: 20,
    decision: "pending",
    ...overrides,
  };
}

describe("seed data", () => {
  it("gives the latest past meeting a detail-rich (fictional) note to redact", async () => {
    const demo = (await svc.users.findUserByUserName("demo"))!;
    const list = await svc.records.listRecords(demo.id);
    const rich = list.find((r) => r.notes.includes("Wattlebird Lane"))!;
    expect(rich).toBeDefined();
    const knownNames = [rich.meetingPerson.firstName, rich.meetingPerson.lastName];
    const contactOnly = redact(rich.notes, { knownNames });
    expect(contactOnly.counts.email).toBe(1);
    expect(contactOnly.counts.phone).toBe(2);
    expect(contactOnly.counts.address).toBe(1);
    expect(contactOnly.text).not.toMatch(/@|0491|Wattlebird/);
    expect(contactOnly.text).toContain("Sam Patel"); // the DR-003 leak

    // DR-006: the meeting page also passes every full name in the address book.
    const addressBook = await svc.contacts.listContactNames(demo.id);
    expect(addressBook).toContain("Sam Patel");
    const r = redact(rich.notes, { knownNames, addressBook });
    expect(r.text).not.toContain("Sam Patel");
    expect(r.text).not.toMatch(/@|0491|Wattlebird/);
    expect(r.counts.name).toBe(contactOnly.counts.name + 1);
  });
});

describe("AI audit log", () => {
  it("stores a call without any key, logs the activity, and records one decision", async () => {
    const guest = await svc.users.createGuest();
    const [meeting] = await svc.records.listRecords(guest.id);
    const logged = await svc.ai.recordAiCall(guest.id, entry({ recordId: meeting.id }));
    expect(logged.ok).toBe(true);
    if (!logged.ok) return;

    const [row] = await db.select().from(aiAuditLog).where(eq(aiAuditLog.id, logged.id));
    expect(row).toMatchObject({ decision: "pending", latencyMs: 900, recordId: meeting.id });
    const acts = await db.select().from(activityLog).where(eq(activityLog.userId, guest.id));
    expect(acts.map((a) => a.action)).toContain("ai-call");

    const final = JSON.stringify({
      summary: "Edited summary.",
      follow_ups: [{ action: "Send the slides", due: "by Friday" }],
    });
    expect(
      await svc.ai.decideAiCall(guest.id, {
        id: logged.id,
        decision: "edited",
        finalOutput: final,
      }),
    ).toEqual({ ok: true, recordId: meeting.id, decision: "edited" });
    const updated = await svc.records.getRecord(guest.id, meeting.id);
    expect(updated?.aiSummary).toMatchObject({
      summary: "Edited summary.",
      decision: "edited",
      auditId: logged.id,
      followUps: [{ action: "Send the slides", due: "by Friday" }],
    });
    // The decision can be made once only.
    expect(
      await svc.ai.decideAiCall(guest.id, {
        id: logged.id,
        decision: "rejected",
        finalOutput: null,
      }),
    ).toMatchObject({ ok: false });
    expect(await svc.ai.removeAiSummary(guest.id, meeting.id)).toBe(true);
    expect((await svc.records.getRecord(guest.id, meeting.id))?.aiSummary).toBeNull();
  });

  it('"accepted" saves the logged model output and ignores any text sent with it', async () => {
    const guest = await svc.users.createGuest();
    const [meeting] = await svc.records.listRecords(guest.id);
    const logged = await svc.ai.recordAiCall(
      guest.id,
      entry({
        recordId: meeting.id,
        output: JSON.stringify({ summary: "Model said A.", follow_ups: [] }),
      }),
    );
    if (!logged.ok) throw new Error(logged.error);
    const result = await svc.ai.decideAiCall(guest.id, {
      id: logged.id,
      decision: "accepted",
      finalOutput: JSON.stringify({ summary: "Human wrote B.", follow_ups: [] }),
    });
    expect(result).toEqual({ ok: true, recordId: meeting.id, decision: "accepted" });
    const [row] = await db.select().from(aiAuditLog).where(eq(aiAuditLog.id, logged.id));
    expect(row.decision).toBe("accepted");
    expect(JSON.parse(row.finalOutput!)).toEqual({ summary: "Model said A.", follow_ups: [] });
    const saved = await svc.records.getRecord(guest.id, meeting.id);
    expect(saved?.aiSummary).toMatchObject({ summary: "Model said A.", decision: "accepted" });
  });

  it('records an "edited" draft identical to the model output as "accepted"', async () => {
    const guest = await svc.users.createGuest();
    const [meeting] = await svc.records.listRecords(guest.id);
    const output = { summary: "Same text.", follow_ups: [{ action: "Call back", due: null }] };
    const logged = await svc.ai.recordAiCall(
      guest.id,
      entry({ recordId: meeting.id, output: JSON.stringify(output) }),
    );
    if (!logged.ok) throw new Error(logged.error);
    expect(
      await svc.ai.decideAiCall(guest.id, {
        id: logged.id,
        decision: "edited",
        finalOutput: JSON.stringify({ ...output, summary: "  Same text.  " }),
      }),
    ).toMatchObject({ ok: true, decision: "accepted" });
  });

  it("refuses to accept a logged answer that is not a valid draft", async () => {
    const guest = await svc.users.createGuest();
    const logged = await svc.ai.recordAiCall(guest.id, entry({ output: "not json" }));
    if (!logged.ok) throw new Error(logged.error);
    expect(
      await svc.ai.decideAiCall(guest.id, {
        id: logged.id,
        decision: "accepted",
        finalOutput: JSON.stringify({ summary: "Smuggled.", follow_ups: [] }),
      }),
    ).toMatchObject({ ok: false });
    const [row] = await db.select().from(aiAuditLog).where(eq(aiAuditLog.id, logged.id));
    expect(row.decision).toBe("pending");
  });

  it("rejects entries that look like they contain a key, or point at someone else's meeting", async () => {
    const a = await svc.users.createGuest();
    const b = await svc.users.createGuest();
    const [bMeeting] = await svc.records.listRecords(b.id);
    expect(
      await svc.ai.recordAiCall(a.id, entry({ input: "sk-ant-api03-abcdefghijklmnop" })),
    ).toMatchObject({ ok: false });
    expect(await svc.ai.recordAiCall(a.id, entry({ recordId: bMeeting.id }))).toEqual({
      ok: false,
      error: "Meeting not found.",
    });
  });

  it("marks failed calls as not needing a decision and keeps other users out", async () => {
    const a = await svc.users.createGuest();
    const failed = await svc.ai.recordAiCall(
      a.id,
      entry({ output: null, error: "invalid_key (HTTP 401)" }),
    );
    expect(failed.ok).toBe(true);
    if (!failed.ok) return;
    const [row] = await db.select().from(aiAuditLog).where(eq(aiAuditLog.id, failed.id));
    expect(row.decision).toBe("not_applicable");
    const stranger = await svc.users.createGuest();
    expect(
      await svc.ai.decideAiCall(stranger.id, {
        id: failed.id,
        decision: "rejected",
        finalOutput: null,
      }),
    ).toEqual({ ok: false, error: "AI log entry not found." });
    expect(svc.ai.aiLogStats([row]).failed).toBe(1);
  });
});

describe("activity log", () => {
  it("labels live entities and shows deleted ones as gone", async () => {
    const guest = await svc.users.createGuest();
    const [c1, c2] = await svc.contacts.listContacts(guest.id);
    await svc.activity.logActivity(guest.id, "view", "contact", c1.id);
    await svc.activity.logActivity(guest.id, "view", "contact", c2.id);
    await svc.contacts.deleteContact(guest.id, c2.id);
    const page = await svc.activity.listActivity(guest.id, {
      page: 1,
      pageSize: 10,
      filter: "contact",
    });
    const byId = new Map(page.items.map((i) => [i.entityId, i]));
    expect(byId.get(c1.id)?.label).toBe(`${c1.firstName} ${c1.lastName}`);
    expect(byId.get(c1.id)?.href).toBe(`/contacts/${c1.id}`);
    expect(byId.get(c2.id)?.label).toBeNull();
  });

  it("logs a repeat view of the same record within a minute only once", async () => {
    const guest = await svc.users.createGuest();
    const [c] = await svc.contacts.listContacts(guest.id);
    await svc.activity.logActivity(guest.id, "view", "contact", c.id);
    await svc.activity.logActivity(guest.id, "view", "contact", c.id);
    await svc.activity.logActivity(guest.id, "update", "contact", c.id);
    await svc.activity.logActivity(guest.id, "update", "contact", c.id);
    const rows = await db.select().from(activityLog).where(eq(activityLog.userId, guest.id));
    expect(rows.filter((r) => r.action === "view")).toHaveLength(1);
    expect(rows.filter((r) => r.action === "update")).toHaveLength(2);
  });

  it("drops entries past the retention period", async () => {
    const guest = await svc.users.createGuest();
    await db.insert(activityLog).values({
      id: "old_entry",
      userId: guest.id,
      action: "view",
      entityType: "contact",
      entityId: null,
      detail: {},
      createdAt: new Date(Date.now() - 200 * 864e5),
    });
    await purgeExpiredUsers(db);
    expect(await db.select().from(activityLog).where(eq(activityLog.id, "old_entry"))).toHaveLength(
      0,
    );
  });
});

describe("public demo admin (DR-005)", () => {
  async function everythingTheAdminCanRead(
    tables: readonly TableName[] = svc.admin.TABLE_NAMES,
    q = "",
  ): Promise<string> {
    const parts: string[] = [];
    for (const t of tables) {
      const page = await svc.admin.browseTable(t, { page: 1, pageSize: 10_000, q });
      parts.push(JSON.stringify(page.rows));
      parts.push((await svc.admin.exportTableCsv(t)).csv);
    }
    return parts.join("\n");
  }

  it("classifies every column; only ids, states, counts and timestamps are always shown", () => {
    const shown = Object.fromEntries(
      svc.admin.TABLE_NAMES.map((t) => [
        t,
        Object.entries(svc.admin.columnPolicy(t))
          .filter(([, p]) => p === "shown")
          .map(([c]) => c),
      ]),
    );
    // A new column fails this test until someone decides whether it is safe to show.
    expect(shown).toEqual({
      users: ["id", "status", "role", "is_demo", "expires_at", "created_at"],
      contacts: ["id", "owner_id", "linked_user_id", "status", "add_date"],
      contact_links: ["id", "user_id", "contact_id", "add_since"],
      records: ["id", "owner_id", "contact_id", "linked_user_id", "date_time", "created_at"],
      email_codes: ["id", "purpose", "attempts", "created_at", "expires_at"],
      fast_register_codes: [
        "id",
        "register_account_id",
        "invited_by_user_id",
        "contact_id",
        "created_at",
        "expires_at",
      ],
      email_outbox: [
        "id",
        "kind",
        "recipient_user_id",
        "triggered_by_user_id",
        "created_at",
        "read_at",
      ],
      activity_log: ["id", "user_id", "action", "entity_type", "entity_id", "detail", "created_at"],
      ai_audit_log: [
        "id",
        "user_id",
        "feature",
        "provider",
        "model",
        "served_model",
        "prompt_version",
        "record_id",
        "redaction_counts",
        "error",
        "latency_ms",
        "input_tokens",
        "output_tokens",
        "decision",
        "decided_at",
        "created_at",
      ],
    });
  });

  it("never exposes a password-reset code, even one no browser was shown", async () => {
    const victim = await svc.users.createGuest();
    const sent = await svc.users.sendResetCode(victim.userName, null);
    expect(sent).toMatchObject({ ok: true, delivered: false });
    const [code] = await db
      .select()
      .from(emailCodes)
      .where(and(eq(emailCodes.email, victim.emails[0]), eq(emailCodes.purpose, "reset")));
    expect(code.authCode).toMatch(/^\d{6}$/);

    // Tables without free-form numbers (coordinates could contain any 6 digits by chance).
    const visible = await everythingTheAdminCanRead([
      "users",
      "email_codes",
      "email_outbox",
      "fast_register_codes",
      "activity_log",
    ]);
    expect(visible).not.toContain(code.authCode);
    // Search must not act as an oracle for the code either.
    for (const t of ["email_codes", "email_outbox"] as const) {
      const hit = await svc.admin.browseTable(t, { page: 1, pageSize: 50, q: code.authCode });
      expect(hit.total, t).toBe(0);
    }
    // The code itself still works for its owner.
    expect(await svc.users.verifyResetCode(victim.userName, code.authCode)).toMatchObject({
      ok: true,
    });
  });

  it("masks visitors' personal details and notes, but shows the seeded demo data", async () => {
    const guest = await svc.users.createGuest();
    const [meeting] = await svc.records.listRecords(guest.id);
    const secretNote = "Private note about Zanzibar Quokka-Smith";
    await db.update(records).set({ notes: secretNote }).where(eq(records.id, meeting.id));
    await svc.ai.recordAiCall(guest.id, entry({ input: "Meeting note: Zanzibar visitor text" }));

    const visible = await everythingTheAdminCanRead();
    expect(visible).not.toContain("Zanzibar");
    expect(visible).not.toContain(guest.emails[0]);
    expect(visible).not.toContain(guest.userName);
    expect(visible).toContain(svc.admin.MASKED_PRIVATE);
    expect(
      (await svc.admin.browseTable("records", { page: 1, pageSize: 10, q: "Zanzibar" })).total,
    ).toBe(0);

    // Ids and timestamps stay visible, so persistence can still be checked.
    const page = await svc.admin.browseTable("records", { page: 1, pageSize: 10_000, q: "" });
    const row = page.rows.find((r) => r.id === meeting.id)!;
    expect(row.notes).toBe(svc.admin.MASKED_PRIVATE);
    expect(row.owner_id).toBe(guest.id);

    // The shared demo account is public by design and stays readable.
    const demo = (await svc.users.findUserByUserName("demo"))!;
    const demoRows = await svc.admin.browseTable("users", { page: 1, pageSize: 50, q: "demo" });
    expect(demoRows.rows.find((r) => r.id === demo.id)?.user_name).toBe("demo");
  });
});

describe("activity retention", () => {
  it("never shows or exports entries past the retention period, even before the purge", async () => {
    const guest = await svc.users.createGuest();
    await db.insert(activityLog).values({
      id: "stale_entry",
      userId: guest.id,
      action: "view",
      entityType: "contact",
      entityId: null,
      detail: {},
      createdAt: new Date(Date.now() - 181 * 864e5),
    });
    const listed = await svc.activity.listActivity(guest.id, {
      page: 1,
      pageSize: 100,
      filter: "all",
    });
    expect(listed.items.map((i) => i.id)).not.toContain("stale_entry");
    expect((await svc.activity.allActivity(guest.id)).map((i) => i.id)).not.toContain(
      "stale_entry",
    );
    const admin = await svc.admin.browseTable("activity_log", { page: 1, pageSize: 10_000, q: "" });
    expect(admin.rows.map((r) => r.id)).not.toContain("stale_entry");
    await svc.activity.purgeOldActivity();
    expect(
      await db.select().from(activityLog).where(eq(activityLog.id, "stale_entry")),
    ).toHaveLength(0);
  });
});

describe("your data: export and deletion", () => {
  it("exports everything except the password hash", async () => {
    const guest = await svc.users.createGuest();
    const data = await svc.data.exportUserData(guest);
    expect(data.format).toBe("4399crm-export/v1");
    expect(JSON.stringify(data)).not.toContain(guest.passwordHash);
    expect("passwordHash" in data.account).toBe(false);
    expect(data.contacts.length).toBeGreaterThan(0);
    expect(data.meetings.length).toBeGreaterThan(0);
    const csv = await svc.data.exportFile(guest, "meetings.csv");
    expect(csv.body.split("\r\n")[0]).toBe(
      "id,contactId,dateTime,location,lat,lng,notes,customFields,aiSummary,createdAt",
    );
    expect(svc.data.isExportFile("../etc/passwd")).toBe(false);
  });

  it("refuses the shared demo accounts and a wrong confirmation", async () => {
    const demo = (await svc.users.findUserByUserName("demo"))!;
    expect(await svc.data.deleteAccount(demo, "demo")).toMatchObject({ ok: false });
    const guest = await svc.users.createGuest();
    expect(await svc.data.deleteAccount(guest, "someone-else")).toMatchObject({ ok: false });
  });

  it("hard-deletes the account with all its rows and leaves an anonymous tombstone", async () => {
    const guest = await svc.users.createGuest();
    await svc.ai.recordAiCall(guest.id, entry());
    await svc.activity.logActivity(guest.id, "export", "data", null, { file: "data.json" });
    await svc.users.sendChangePasswordCode(guest);
    const before = await svc.data.dataInventory(guest.id);
    expect(before.contacts).toBeGreaterThan(0);

    const result = await svc.data.deleteAccount(guest, guest.userName.toUpperCase());
    expect(result).toMatchObject({ ok: true, removed: before });

    const left = await Promise.all([
      db.select().from(users).where(eq(users.id, guest.id)),
      db.select().from(contacts).where(eq(contacts.ownerId, guest.id)),
      db.select().from(records).where(eq(records.ownerId, guest.id)),
      db.select().from(activityLog).where(eq(activityLog.userId, guest.id)),
      db.select().from(aiAuditLog).where(eq(aiAuditLog.userId, guest.id)),
      db.select().from(emailOutbox).where(eq(emailOutbox.recipientUserId, guest.id)),
      db.select().from(emailOutbox).where(eq(emailOutbox.toEmail, guest.emails[0])),
    ]);
    for (const rows of left) expect(rows).toHaveLength(0);

    const tombstones = await db
      .select()
      .from(activityLog)
      .where(and(isNull(activityLog.userId), eq(activityLog.action, "account-delete")));
    const mine = tombstones.find((t) => t.detail.contacts === before.contacts);
    expect(mine).toBeDefined();
    expect(JSON.stringify(mine)).not.toContain(guest.userName);
    expect(JSON.stringify(mine)).not.toContain(guest.id);
  });
});
