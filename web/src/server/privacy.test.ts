import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { beforeAll, describe, expect, it } from "vitest";
import { and, eq, isNull } from "drizzle-orm";
import { createDb, runMigrations } from "@/db/client-core";
import { purgeExpiredUsers, seedDatabase } from "@/db/populate";
import { activityLog, aiAuditLog, contacts, emailOutbox, records, users } from "@/db/schema";
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
    const r = redact(rich.notes, {
      knownNames: [rich.meetingPerson.firstName, rich.meetingPerson.lastName],
    });
    expect(r.counts.email).toBe(1);
    expect(r.counts.phone).toBe(2);
    expect(r.counts.address).toBe(1);
    expect(r.text).not.toMatch(/@|0491|Wattlebird/);
    expect(r.text).toContain("Sam Patel"); // third-party names are not detected
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
    ).toEqual({ ok: true, recordId: meeting.id });
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
