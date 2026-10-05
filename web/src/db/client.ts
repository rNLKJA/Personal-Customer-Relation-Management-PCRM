import fs from "node:fs";
import path from "node:path";
import type { Client } from "@libsql/client";
import { createDb, type Db } from "./client-core";

/**
 * Database connection (libSQL). Resolution order:
 *
 * 1. `DATABASE_URL` (+ `DATABASE_AUTH_TOKEN`) - e.g. a Turso database in
 *    production, or any `file:` URL.
 * 2. On Vercel without those variables: copy the bundled `data/seed.db` to
 *    `/tmp/app.db` on cold start and use it. Writable but ephemeral - the UI
 *    shows a "demo storage resets periodically" notice in this mode.
 * 3. Locally: `file:./data/app.db` (created from `data/seed.db` if missing;
 *    `pnpm db:reset` rebuilds it from migrations + seed).
 */

export type { Db };
export type StorageMode = "remote" | "file" | "ephemeral";

interface Resolved {
  url: string;
  authToken?: string;
  mode: StorageMode;
}

export const DATA_DIR = path.join(process.cwd(), "data");
export const SEED_DB_PATH = path.join(DATA_DIR, "seed.db");
export const LOCAL_DB_PATH = path.join(DATA_DIR, "app.db");

function copyIfMissing(from: string, to: string) {
  if (fs.existsSync(to) || !fs.existsSync(from)) return;
  fs.mkdirSync(path.dirname(to), { recursive: true });
  fs.copyFileSync(from, to);
}

export function resolveDatabase(env: NodeJS.ProcessEnv = process.env): Resolved {
  const url = env.DATABASE_URL?.trim();
  if (url) {
    return {
      url,
      authToken: env.DATABASE_AUTH_TOKEN?.trim() || undefined,
      mode: url.startsWith("file:") ? "file" : "remote",
    };
  }
  if (env.VERCEL) {
    const tmp = path.join("/tmp", "app.db");
    copyIfMissing(SEED_DB_PATH, tmp);
    return { url: `file:${tmp}`, mode: "ephemeral" };
  }
  copyIfMissing(SEED_DB_PATH, LOCAL_DB_PATH);
  return { url: `file:${LOCAL_DB_PATH}`, mode: "file" };
}

type Global = typeof globalThis & {
  __pcrmDb?: { db: Db; client: Client; mode: StorageMode };
};

function instance() {
  const g = globalThis as Global;
  if (!g.__pcrmDb) {
    const resolved = resolveDatabase();
    const { db, client } = createDb(resolved.url, resolved.authToken);
    g.__pcrmDb = { db, client, mode: resolved.mode };
  }
  return g.__pcrmDb;
}

/** Lazily-initialised shared Drizzle instance. */
export function getDb(): Db {
  return instance().db;
}

export function getStorageMode(): StorageMode {
  return instance().mode;
}
