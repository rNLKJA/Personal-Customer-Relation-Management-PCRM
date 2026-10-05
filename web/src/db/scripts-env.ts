import fs from "node:fs";
import path from "node:path";

/** Resolve the target database for CLI scripts (db:migrate / db:seed). */
export function scriptTarget(): { url: string; authToken?: string; label: string } {
  const url = process.env.DATABASE_URL?.trim();
  if (url) {
    return {
      url,
      authToken: process.env.DATABASE_AUTH_TOKEN?.trim() || undefined,
      label: url.replace(/\/\/[^@]*@/, "//***@"),
    };
  }
  const file = path.join(process.cwd(), "data", "app.db");
  fs.mkdirSync(path.dirname(file), { recursive: true });
  return { url: `file:${file}`, label: "data/app.db" };
}
