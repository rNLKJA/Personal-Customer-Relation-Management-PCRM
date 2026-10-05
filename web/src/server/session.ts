import "server-only";
import { randomBytes } from "node:crypto";
import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { eq } from "drizzle-orm";
import { SignJWT, jwtVerify, type JWTPayload } from "jose";
import { getDb } from "@/db/client";
import { DEMO_USER_ID, demoLagDays, reanchorDemoAccount } from "@/db/populate";
import { users, type User } from "@/db/schema";
import { sessionKey } from "./session-secret";

/**
 * Sessions are signed JWTs in an httpOnly cookie (jose, HS256). This replaces
 * the original Passport JWT that the React client kept in localStorage.
 */

const SESSION_COOKIE = "pcrm_session";
const RESET_COOKIE = "pcrm_reset";
const BROWSER_COOKIE = "pcrm_browser";
const KNOWN_COOKIE = "pcrm_known";
const KNOWN_TTL_S = 60 * 60 * 24 * 90;
const SESSION_TTL_S = 60 * 60 * 24 * 7;
const RESET_TTL_S = 60 * 10;

function secretKey(): Uint8Array {
  return sessionKey();
}

const secure = () => process.env.NODE_ENV === "production";

interface SessionPayload extends JWTPayload {
  sub: string;
  role: "user" | "admin";
}

export async function createSession(user: Pick<User, "id" | "role">) {
  const token = await new SignJWT({ role: user.role })
    .setProtectedHeader({ alg: "HS256" })
    .setSubject(user.id)
    .setIssuedAt()
    .setExpirationTime(`${SESSION_TTL_S}s`)
    .sign(secretKey());
  const jar = await cookies();
  jar.set(SESSION_COOKIE, token, {
    httpOnly: true,
    sameSite: "lax",
    secure: secure(),
    path: "/",
    maxAge: SESSION_TTL_S,
  });
  await rememberAccountOnBrowser(user.id);
}

// --- accounts known to this browser -------------------------------------------
// There is no real mailbox in the demo, so a password-reset code is only shown
// in the demo inbox of a browser that has signed in to that account before
// (otherwise anyone could reset anyone's password by reading the demo inbox).

async function readKnownAccounts(): Promise<string[]> {
  const token = (await cookies()).get(KNOWN_COOKIE)?.value;
  if (!token) return [];
  try {
    const { payload } = await jwtVerify(token, secretKey(), { algorithms: ["HS256"] });
    return Array.isArray(payload.ids)
      ? payload.ids.filter((x): x is string => typeof x === "string")
      : [];
  } catch {
    return [];
  }
}

async function rememberAccountOnBrowser(userId: string) {
  const ids = [userId, ...(await readKnownAccounts()).filter((id) => id !== userId)].slice(0, 8);
  const token = await new SignJWT({ ids })
    .setProtectedHeader({ alg: "HS256" })
    .setIssuedAt()
    .setExpirationTime(`${KNOWN_TTL_S}s`)
    .sign(secretKey());
  (await cookies()).set(KNOWN_COOKIE, token, {
    httpOnly: true,
    sameSite: "lax",
    secure: secure(),
    path: "/",
    maxAge: KNOWN_TTL_S,
  });
}

export async function isKnownAccount(userId: string): Promise<boolean> {
  return (await readKnownAccounts()).includes(userId);
}

export async function destroySession() {
  const jar = await cookies();
  jar.delete(SESSION_COOKIE);
}

async function readSession(): Promise<SessionPayload | null> {
  const token = (await cookies()).get(SESSION_COOKIE)?.value;
  if (!token) return null;
  try {
    const { payload } = await jwtVerify<SessionPayload>(token, secretKey(), {
      algorithms: ["HS256"],
    });
    return payload.sub ? payload : null;
  } catch {
    return null;
  }
}

/** The signed-in, active user (re-read from the database on every request). */
export async function getCurrentUser(): Promise<User | null> {
  const session = await readSession();
  if (!session) return null;
  const user = await getDb().query.users.findFirst({ where: eq(users.id, session.sub) });
  if (!user || user.status !== "active") return null;
  if (user.expiresAt && user.expiresAt.getTime() < Date.now()) return null;
  if (user.id === DEMO_USER_ID && demoLagDays(user.createdAt) > 0) {
    // Slide the shared demo account's dates to today (at most once a day).
    try {
      const days = await reanchorDemoAccount(getDb());
      if (days > 0) return { ...user, createdAt: new Date(user.createdAt.getTime() + days * 864e5) };
    } catch (err) {
      console.error("[pcrm] could not re-anchor the demo account", err);
    }
  }
  return user;
}

export async function requireUser(): Promise<User> {
  const user = await getCurrentUser();
  if (!user) redirect("/login");
  return user;
}

export async function requireAdmin(): Promise<User> {
  const user = await getCurrentUser();
  if (!user) redirect("/login?next=/admin/records");
  if (user.role !== "admin") redirect("/home");
  return user;
}

// --- password reset ticket ---------------------------------------------------
// The original reset endpoint trusted a constant `codeVerified: "4399CRMVerified"`
// sent by the client. The revival issues a short-lived signed ticket instead,
// only after the e-mailed code has been verified on the server.

export async function issueResetTicket(userId: string) {
  const token = await new SignJWT({ purpose: "reset" })
    .setProtectedHeader({ alg: "HS256" })
    .setSubject(userId)
    .setIssuedAt()
    .setExpirationTime(`${RESET_TTL_S}s`)
    .sign(secretKey());
  (await cookies()).set(RESET_COOKIE, token, {
    httpOnly: true,
    sameSite: "strict",
    secure: secure(),
    path: "/",
    maxAge: RESET_TTL_S,
  });
}

export async function consumeResetTicket(): Promise<string | null> {
  const jar = await cookies();
  const token = jar.get(RESET_COOKIE)?.value;
  if (!token) return null;
  try {
    const { payload } = await jwtVerify(token, secretKey(), { algorithms: ["HS256"] });
    if (payload.purpose !== "reset" || !payload.sub) return null;
    return payload.sub;
  } catch {
    return null;
  }
}

export async function clearResetTicket() {
  (await cookies()).delete(RESET_COOKIE);
}

// --- per-browser demo inbox key -----------------------------------------------

/** Read (or, inside a Server Action, create) the random key identifying this browser's demo inbox. */
export async function getBrowserKey(create: boolean): Promise<string | null> {
  const jar = await cookies();
  const existing = jar.get(BROWSER_COOKIE)?.value;
  if (existing && /^[a-f0-9]{32}$/.test(existing)) return existing;
  if (!create) return null;
  const key = randomBytes(16).toString("hex");
  jar.set(BROWSER_COOKIE, key, {
    httpOnly: true,
    sameSite: "lax",
    secure: secure(),
    path: "/",
    maxAge: 60 * 60 * 24 * 30,
  });
  return key;
}
