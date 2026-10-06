import path from "node:path";
import { createClient, type Client } from "@libsql/client";
import { drizzle, type LibSQLDatabase } from "drizzle-orm/libsql";
import { migrate } from "drizzle-orm/libsql/migrator";
import * as schema from "./schema";

/** Framework-free database helpers (usable from tsx scripts, tests and Next.js). */

export type Db = LibSQLDatabase<typeof schema>;

export function createDb(url: string, authToken?: string): { db: Db; client: Client } {
  const client = createClient({ url, authToken });
  const db = drizzle(client, { schema });
  return { db, client };
}

export const MIGRATIONS_DIR = path.join(process.cwd(), "drizzle");

export async function runMigrations(db: Db, migrationsFolder = MIGRATIONS_DIR): Promise<void> {
  await migrate(db, { migrationsFolder });
}
