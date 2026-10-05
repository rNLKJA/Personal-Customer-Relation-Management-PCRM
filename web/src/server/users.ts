import "server-only";
import { randomBytes } from "node:crypto";
import bcrypt from "bcryptjs";
import { and, asc, eq, gt, like, sql } from "drizzle-orm";
import { getDb } from "@/db/client";
import { deleteUsersCascade } from "@/db/cascade";
import { newId, secureRandom } from "@/db/ids";
import { hashPassword, populateAddressBook, purgeExpiredUsers } from "@/db/populate";
import { contacts, fastRegisterCodes, users, type User } from "@/db/schema";
import { DEMO_ACCOUNTS } from "@/db/demo-accounts";
import {
  autoCodeGenerator,
  FAST_REGISTER_CODE_LENGTH,
  FAST_REGISTER_CODE_TTL_MS,
  PENDING_ACCOUNT_TTL_MS,
} from "@/lib/legacy/codes";
import { MESSAGES } from "@/lib/legacy/registration";
import { USERNAME_MESSAGES, USERNAME_PATTERN } from "@/lib/legacy/validation";
import { sameLinkIdentity } from "@/lib/legacy/contact-identity";
import { fastRegisterEmailHtml, verificationEmailHtml } from "@/lib/email-templates";
import { issueEmailCode, verifyEmailCode } from "./codes";
import { sendEmail } from "./mail";

/**
 * Accounts, authentication and profile - ports of `controller/userController.js`,
 * `controller/profileController.js`, `config/emailAuth.js` and the Passport
 * `local-login` strategy.
 */

export type Result<T = object> = ({ ok: true } & T) | { ok: false; error: string };

/** Marker stored for invited (fast-register) accounts; never a valid bcrypt hash. */
const NO_PASSWORD = "NOPASSWORD";

export const GUEST_TTL_MS = 1000 * 60 * 60 * 24;

export async function findUserByUserName(userName: string): Promise<User | null> {
  const name = userName.trim();
  if (!name) return null;
  const row = await getDb().query.users.findFirst({
    where: sql`lower(${users.userName}) = lower(${name})`,
  });
  return row ?? null;
}

export async function getUserById(id: string): Promise<User | null> {
  return (await getDb().query.users.findFirst({ where: eq(users.id, id) })) ?? null;
}

/** Port of `checkUserDuplicate` (+ the revival's user-name format rule). */
export async function checkUserName(
  userName: string,
): Promise<{ status: boolean; message: string }> {
  const name = userName.trim();
  if (!name) return { status: false, message: USERNAME_MESSAGES.empty };
  if (!USERNAME_PATTERN.test(name)) {
    return {
      status: false,
      message:
        "Use 3-32 letters, numbers, dots, dashes or underscores (start with a letter or number).",
    };
  }
  const existing = await findUserByUserName(name);
  if (existing) return { status: false, message: USERNAME_MESSAGES.taken };
  return { status: true, message: USERNAME_MESSAGES.available };
}

// --- sign up (emailAuthSend -> emailCodeVerify -> register) ---------------------

export async function sendSignupCode(email: string, browserKey: string): Promise<Result> {
  const code = await issueEmailCode(email, "signup");
  await sendEmail({
    to: email.trim(),
    kind: "verification",
    html: verificationEmailHtml(code),
    code,
    recipientUserId: null,
    browserKey,
  });
  return { ok: true };
}

export async function register(input: {
  email: string;
  authCode: string;
  userName: string;
  password: string;
  re_password: string;
}): Promise<Result<{ user: User }>> {
  const verified = await verifyEmailCode(input.email, input.authCode, "signup");
  if (verified !== "ok") {
    return {
      ok: false,
      error:
        verified === "expired" ? "That code has expired - send a new one." : MESSAGES.wrongCode,
    };
  }
  if (input.password !== input.re_password) return { ok: false, error: MESSAGES.passwordsDiffer };
  const check = await checkUserName(input.userName);
  if (!check.status) {
    return {
      ok: false,
      error: check.message === USERNAME_MESSAGES.taken ? MESSAGES.userNameUsed : check.message,
    };
  }
  const [user] = await getDb()
    .insert(users)
    .values({
      id: newId(),
      userName: input.userName.trim(),
      passwordHash: await hashPassword(input.password),
      emails: [input.email.trim()],
      phones: [],
      status: "active",
      role: "user",
      createdAt: new Date(),
    })
    .returning();
  return { ok: true, user };
}

// --- login (passport local-login) -------------------------------------------------

export async function authenticate(userName: string, password: string): Promise<User | null> {
  const user = await findUserByUserName(userName);
  if (!user || user.status !== "active" || user.passwordHash === NO_PASSWORD) return null;
  if (user.expiresAt && user.expiresAt.getTime() < Date.now()) return null;
  const ok = await bcrypt.compare(password, user.passwordHash);
  return ok ? user : null;
}

// --- password reset (sendResetCode -> codeValidation -> resetPassword) ------------

export function maskEmail(email: string): string {
  const [local, domain] = email.split("@");
  if (!domain) return email;
  const visible = local.slice(0, Math.min(2, local.length));
  return `${visible}${"•".repeat(Math.max(1, local.length - visible.length))}@${domain}`;
}

export async function sendResetCode(
  userName: string,
  browserKey: string | null,
): Promise<Result<{ email: string; delivered: boolean }>> {
  const user = await findUserByUserName(userName);
  if (!user || user.status !== "active") return { ok: false, error: MESSAGES.resetUnknownUser };
  if (user.isDemo) {
    return { ok: false, error: "Password reset is disabled for the shared demo accounts." };
  }
  const email = user.emails[0];
  if (!email) return { ok: false, error: "This account has no e-mail address to send a code to." };
  const code = await issueEmailCode(email, "reset");
  await sendEmail({
    to: email,
    kind: "password-reset",
    html: verificationEmailHtml(code),
    code,
    recipientUserId: user.id,
    browserKey,
  });
  return { ok: true, email: maskEmail(email), delivered: browserKey !== null };
}

export async function verifyResetCode(
  userName: string,
  code: string,
): Promise<Result<{ userId: string }>> {
  const user = await findUserByUserName(userName);
  if (!user || !user.emails[0]) return { ok: false, error: MESSAGES.resetUnknownUser };
  const result = await verifyEmailCode(user.emails[0], code, "reset");
  if (result !== "ok") {
    return {
      ok: false,
      error: result === "expired" ? "That code has expired - send a new one." : MESSAGES.wrongCode,
    };
  }
  return { ok: true, userId: user.id };
}

export async function setNewPassword(
  userId: string,
  password: string,
  rePassword: string,
): Promise<Result> {
  if (password !== rePassword) return { ok: false, error: MESSAGES.passwordsDiffer };
  const user = await getUserById(userId);
  if (!user) return { ok: false, error: MESSAGES.resetUnknownUser };
  if (user.isDemo)
    return { ok: false, error: "Passwords of the shared demo accounts cannot be changed." };
  // The original compared bcrypt hashes with ===, which never matched; the
  // intended "new password must differ" rule is enforced with bcrypt.compare.
  if (user.passwordHash !== NO_PASSWORD && (await bcrypt.compare(password, user.passwordHash))) {
    return { ok: false, error: MESSAGES.samePassword };
  }
  await getDb()
    .update(users)
    .set({ passwordHash: await hashPassword(password) })
    .where(eq(users.id, userId));
  return { ok: true };
}

// --- change password while signed in (emailCodeVerify -> updatePassword) ----------

export async function sendChangePasswordCode(user: User): Promise<Result<{ email: string }>> {
  if (user.isDemo) {
    return { ok: false, error: "Passwords of the shared demo accounts cannot be changed." };
  }
  const email = user.emails[0];
  if (!email) return { ok: false, error: "Add an e-mail address to your profile first." };
  const code = await issueEmailCode(email, "change-password");
  await sendEmail({
    to: email,
    kind: "change-password",
    html: verificationEmailHtml(code),
    code,
    recipientUserId: user.id,
    triggeredByUserId: user.id,
  });
  return { ok: true, email: maskEmail(email) };
}

export async function changePassword(
  user: User,
  input: { authCode: string; newPassword1: string; newPassword2: string },
): Promise<Result> {
  const email = user.emails[0];
  if (!email) return { ok: false, error: "Add an e-mail address to your profile first." };
  const verified = await verifyEmailCode(email, input.authCode, "change-password");
  if (verified !== "ok") {
    return {
      ok: false,
      error:
        verified === "expired" ? "That code has expired - send a new one." : MESSAGES.wrongCode,
    };
  }
  return setNewPassword(user.id, input.newPassword1, input.newPassword2);
}

// --- profile (profileController.editProfile / showProfile / uploadPhoto) -----------

export async function updateProfile(
  userId: string,
  input: {
    firstName: string;
    lastName: string;
    occupation: string;
    statusMessage: string;
    phones: string[];
    emails: string[];
  },
): Promise<User> {
  const [row] = await getDb()
    .update(users)
    .set({
      firstName: input.firstName,
      lastName: input.lastName,
      occupation: input.occupation,
      statusMessage: input.statusMessage,
      phones: input.phones,
      emails: input.emails,
    })
    .where(eq(users.id, userId))
    .returning();
  return row;
}

export async function setUserPortrait(userId: string, portrait: string | null): Promise<void> {
  await getDb().update(users).set({ portrait }).where(eq(users.id, userId));
}

// --- fast register / invite (emailFastRegister -> emailRegisterCodeSend ->
//     emailRegisterVerify -> emailFastRegisterConfirm -> linkToAccount) -----------

export async function prepareFastRegister(
  inviter: User,
  contactId: string,
  origin: string,
): Promise<Result<{ msg: string; email: string }>> {
  const db = getDb();
  const contact = await db.query.contacts.findFirst({
    where: and(eq(contacts.id, contactId), eq(contacts.ownerId, inviter.id)),
  });
  if (!contact) return { ok: false, error: "Contact not found." };
  if (contact.linkedUserId) return { ok: false, error: "This contact already has an account." };
  const email = contact.emails[0];
  if (!email)
    return { ok: false, error: "Unable to invite this user, need set email for contact." };

  await purgeExpiredUsers(db);
  const now = Date.now();
  const pendingId = newId();
  await db.insert(users).values({
    id: pendingId,
    // The original used `new Date().toISOString()` as a placeholder user name.
    userName: `pending-${new Date(now).toISOString()}-${randomBytes(3).toString("hex")}`,
    passwordHash: NO_PASSWORD,
    firstName: contact.firstName,
    lastName: contact.lastName,
    occupation: contact.occupation,
    emails: contact.emails,
    phones: contact.phones,
    status: "pending",
    role: "user",
    expiresAt: new Date(now + PENDING_ACCOUNT_TTL_MS),
    createdAt: new Date(now),
  });

  const code = autoCodeGenerator(FAST_REGISTER_CODE_LENGTH, secureRandom);
  await db.insert(fastRegisterCodes).values({
    id: newId(),
    registerAccountId: pendingId,
    fastRegisterCode: code,
    invitedByUserId: inviter.id,
    contactId: contact.id,
    createdAt: new Date(now),
    expiresAt: new Date(now + FAST_REGISTER_CODE_TTL_MS),
  });

  const actionPath = `/invite/${pendingId}/${code}`;
  await sendEmail({
    to: email,
    kind: "fast-register",
    html: fastRegisterEmailHtml({
      inviterName: displayName(inviter),
      inviteeName: contact.firstName,
      link: new URL(actionPath, origin).toString(),
    }),
    actionPath,
    recipientUserId: null,
    triggeredByUserId: inviter.id,
  });
  return { ok: true, msg: "Email Code send", email };
}

export async function getInvite(pendingId: string, code: string) {
  const db = getDb();
  const row = await db.query.fastRegisterCodes.findFirst({
    where: and(
      eq(fastRegisterCodes.registerAccountId, pendingId),
      eq(fastRegisterCodes.fastRegisterCode, code),
      gt(fastRegisterCodes.expiresAt, new Date()),
    ),
  });
  if (!row) return null;
  const account = await getUserById(pendingId);
  if (!account || account.status !== "pending") return null;
  const inviter = row.invitedByUserId ? await getUserById(row.invitedByUserId) : null;
  return { code: row, account, inviter };
}

export async function confirmFastRegister(input: {
  id: string;
  fastRegisterCode: string;
  userName: string;
  password: string;
  re_password: string;
}): Promise<Result<{ message: string }>> {
  const invite = await getInvite(input.id, input.fastRegisterCode);
  if (!invite) return { ok: false, error: MESSAGES.fastRegisterAuthFail };
  if (input.password !== input.re_password) return { ok: false, error: MESSAGES.passwordsDiffer };
  const check = await checkUserName(input.userName);
  if (!check.status) {
    return {
      ok: false,
      error: check.message === USERNAME_MESSAGES.taken ? MESSAGES.userNameUsed : check.message,
    };
  }
  const db = getDb();
  const [account] = await db
    .update(users)
    .set({
      userName: input.userName.trim(),
      passwordHash: await hashPassword(input.password),
      status: "active",
      expiresAt: null,
    })
    .where(eq(users.id, input.id))
    .returning();
  await db.delete(fastRegisterCodes).where(eq(fastRegisterCodes.registerAccountId, input.id));

  // linkToAccount: connect the inviting contact (and identical contacts) to the new account.
  if (invite.code.contactId) {
    await db
      .update(contacts)
      .set({ linkedUserId: account.id })
      .where(eq(contacts.id, invite.code.contactId));
  }
  const candidates = await db
    .select()
    .from(contacts)
    .where(
      and(
        eq(contacts.firstName, account.firstName ?? ""),
        eq(contacts.lastName, account.lastName ?? ""),
      ),
    );
  for (const c of candidates) {
    if (!c.linkedUserId && sameLinkIdentity(c, account)) {
      await db.update(contacts).set({ linkedUserId: account.id }).where(eq(contacts.id, c.id));
    }
  }
  return { ok: true, message: MESSAGES.fastRegisterActive };
}

// --- guest sandbox ----------------------------------------------------------------

/** Upper bound on simultaneous guest sandboxes; the oldest are recycled first. */
const MAX_GUESTS = 300;

export async function createGuest(): Promise<User> {
  const db = getDb();
  await purgeExpiredUsers(db);
  const guests = await db
    .select({ id: users.id })
    .from(users)
    .where(and(eq(users.isDemo, false), like(users.userName, "guest-%")))
    .orderBy(asc(users.createdAt));
  if (guests.length >= MAX_GUESTS) {
    await deleteUsersCascade(
      db,
      guests.slice(0, guests.length - MAX_GUESTS + 1).map((g) => g.id),
    );
  }
  const now = new Date();
  const suffix = randomBytes(3).toString("hex");
  const id = newId();
  const [user] = await db
    .insert(users)
    .values({
      id,
      userName: `guest-${suffix}`,
      passwordHash: await hashPassword(randomBytes(18).toString("base64url")),
      firstName: "Guest",
      lastName: "Visitor",
      occupation: "Exploring 4399 CRM",
      emails: [`guest-${suffix}@example.com`],
      phones: [],
      statusMessage: "Just looking around",
      status: "active",
      role: "user",
      expiresAt: new Date(now.getTime() + GUEST_TTL_MS),
      createdAt: now,
    })
    .returning();
  await populateAddressBook(db, {
    ownerId: id,
    seed: Math.floor(secureRandom() * 2 ** 31),
    anchor: now,
  });
  return user;
}

export function displayName(u: Pick<User, "firstName" | "lastName" | "userName">): string {
  const name = [u.firstName, u.lastName].filter(Boolean).join(" ").trim();
  return name || u.userName;
}

export function isSharedDemo(u: Pick<User, "userName" | "isDemo">): boolean {
  return (
    u.isDemo &&
    (u.userName === DEMO_ACCOUNTS.demo.userName || u.userName === DEMO_ACCOUNTS.admin.userName)
  );
}
