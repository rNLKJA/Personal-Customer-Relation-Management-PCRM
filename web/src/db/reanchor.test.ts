import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { beforeAll, describe, expect, it } from "vitest";
import { eq, sql } from "drizzle-orm";
import { createDb, runMigrations } from "./client-core";
import {
  DEMO_USER_ID,
  demoAnchorOf,
  demoLagDays,
  reanchorDemoAccount,
  seedDatabase,
} from "./populate";
import { contacts, records, users } from "./schema";

/** The shared demo account's dates follow the calendar instead of the snapshot date. */

const file = path.join(fs.mkdtempSync(path.join(os.tmpdir(), "pcrm-anchor-")), "test.db");
const { db } = createDb(`file:${file}`);
const ANCHOR = new Date("2026-10-05T00:00:00Z");
const DAY = 864e5;

async function demoDates() {
  const r = await db
    .select({ min: sql<number>`min(date_time)`, max: sql<number>`max(date_time)` })
    .from(records)
    .where(eq(records.ownerId, DEMO_USER_ID))
    .get();
  const c = await db
    .select({ max: sql<number>`max(add_date)` })
    .from(contacts)
    .where(eq(contacts.ownerId, DEMO_USER_ID))
    .get();
  const u = await db.select().from(users).where(eq(users.id, DEMO_USER_ID)).get();
  return { min: Number(r!.min), max: Number(r!.max), contactMax: Number(c!.max), user: u! };
}

beforeAll(async () => {
  await runMigrations(db);
  await seedDatabase(db, ANCHOR);
}, 30_000);

describe("reanchorDemoAccount", () => {
  it("derives the seed anchor from the demo user's creation date", async () => {
    const { user } = await demoDates();
    expect(demoAnchorOf(user.createdAt).toISOString()).toBe(ANCHOR.toISOString());
    expect(demoLagDays(user.createdAt, new Date("2026-10-05T23:00:00Z"))).toBe(0);
    expect(demoLagDays(user.createdAt, new Date("2026-10-20T01:00:00Z"))).toBe(15);
  });

  it("does nothing on the anchor day", async () => {
    expect(await reanchorDemoAccount(db, new Date("2026-10-05T12:00:00Z"))).toBe(0);
  });

  it("slides every demo date forward by whole days, once", async () => {
    const before = await demoDates();
    const now = new Date("2026-10-20T09:30:00Z");
    expect(await reanchorDemoAccount(db, now)).toBe(15);
    const after = await demoDates();
    expect(after.min - before.min).toBe(15 * DAY);
    expect(after.max - before.max).toBe(15 * DAY);
    expect(after.contactMax - before.contactMax).toBe(15 * DAY);
    expect(demoAnchorOf(after.user.createdAt).toISOString()).toBe("2026-10-20T00:00:00.000Z");
    // Idempotent for the rest of the day, including concurrent callers.
    const again = await Promise.all([reanchorDemoAccount(db, now), reanchorDemoAccount(db, now)]);
    expect(again).toEqual([0, 0]);
    expect((await demoDates()).max).toBe(after.max);
  });

  it("never moves the data backwards", async () => {
    expect(await reanchorDemoAccount(db, new Date("2026-10-01T00:00:00Z"))).toBe(0);
  });
});
