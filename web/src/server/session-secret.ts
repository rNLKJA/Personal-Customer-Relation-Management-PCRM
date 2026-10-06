import "server-only";

/**
 * Resolves the HS256 key used to sign session, reset and "known account"
 * cookies.
 *
 * - `SESSION_SECRET` (32+ characters) always wins.
 * - On Vercel it is required: Next.js bundles server code into several module
 *   instances (pages, Server Actions and Route Handlers, and one per function),
 *   so a random per-module fallback would make cookies signed by one bundle
 *   fail to verify in another. Failing loudly is better than half-working auth.
 * - Anywhere else (`pnpm dev`, a local `pnpm build && pnpm start`) a fixed,
 *   clearly insecure development key is used so every bundle agrees. It is
 *   never used on a deployment.
 */

export const DEV_SESSION_SECRET = "dev-only-insecure-session-secret-change-me-please";
export const MIN_SECRET_LENGTH = 32;

type Global = typeof globalThis & { __pcrmSessionSecretWarned?: boolean };

export class MissingSessionSecretError extends Error {
  constructor() {
    super(
      "[pcrm] SESSION_SECRET is missing or shorter than 32 characters. Set it in the Vercel " +
        "project settings (e.g. `openssl rand -base64 32`) and redeploy.",
    );
    this.name = "MissingSessionSecretError";
  }
}

export function resolveSessionSecret(env: NodeJS.ProcessEnv = process.env): string {
  const secret = env.SESSION_SECRET?.trim();
  if (secret && secret.length >= MIN_SECRET_LENGTH) return secret;
  if (env.VERCEL) throw new MissingSessionSecretError();
  const g = globalThis as Global;
  if (env.NODE_ENV === "production" && !g.__pcrmSessionSecretWarned) {
    g.__pcrmSessionSecretWarned = true;
    console.warn(
      "[pcrm] SESSION_SECRET is not set; using the insecure development key. " +
        "Fine for a local `pnpm start`, never for a deployment.",
    );
  }
  return DEV_SESSION_SECRET;
}

export function sessionKey(env: NodeJS.ProcessEnv = process.env): Uint8Array {
  return new TextEncoder().encode(resolveSessionSecret(env));
}
