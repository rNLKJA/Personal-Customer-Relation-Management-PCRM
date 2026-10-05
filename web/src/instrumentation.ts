/**
 * Runs once per server instance before it handles requests: bring the
 * database schema up to date (see `ensureSchema` in src/db/client.ts).
 */
export async function register() {
  if (process.env.NEXT_RUNTIME !== "nodejs") return;
  const { ensureSchema } = await import("./db/client");
  await ensureSchema();
}
