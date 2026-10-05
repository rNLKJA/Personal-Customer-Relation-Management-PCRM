"use server";

import { headers } from "next/headers";
import { redirect } from "next/navigation";
import { createRateLimiter } from "@/lib/rate-limit";
import { z } from "zod";
import { DEMO_ACCOUNTS } from "@/db/demo-accounts";
import { codeSchema, emailSchema, firstIssue, passwordSchema, userNameSchema } from "@/lib/schemas";
import {
  authenticate,
  checkUserName,
  confirmFastRegister,
  createGuest,
  findUserByUserName,
  register,
  sendResetCode,
  sendSignupCode,
  setNewPassword,
  verifyResetCode,
} from "../users";
import {
  clearResetTicket,
  consumeResetTicket,
  createSession,
  destroySession,
  getBrowserKey,
  isKnownAccount,
  issueResetTicket,
} from "../session";
import type { ActionResult } from "./types";

// Abuse guards for the public demo (per server instance, per client IP).
const allowGuest = createRateLimiter(6, 10 * 60_000);
const allowCodes = createRateLimiter(10, 10 * 60_000);

async function clientKey(): Promise<string> {
  const h = await headers();
  return h.get("x-forwarded-for")?.split(",")[0]?.trim() || h.get("x-real-ip") || "local";
}

function safeNext(next: unknown): string {
  return typeof next === "string" && next.startsWith("/") && !next.startsWith("//")
    ? next
    : "/home";
}

export async function loginAction(
  _prev: ActionResult | null,
  formData: FormData,
): Promise<ActionResult> {
  const userName = String(formData.get("userName") ?? "");
  const password = String(formData.get("password") ?? "");
  if (!userName.trim() || !password)
    return { ok: false, error: "Enter your user name and password." };
  const user = await authenticate(userName, password);
  if (!user) return { ok: false, error: "Incorrect user name or password." };
  await createSession(user);
  redirect(safeNext(formData.get("next")));
}

export async function demoLoginAction(formData: FormData): Promise<void> {
  const which = formData.get("account") === "admin" ? DEMO_ACCOUNTS.admin : DEMO_ACCOUNTS.demo;
  const user = await authenticate(which.userName, which.password);
  if (!user) redirect("/login?error=demo-unavailable");
  await createSession(user);
  redirect(which === DEMO_ACCOUNTS.admin ? "/admin/records" : "/home");
}

export async function guestLoginAction(): Promise<void> {
  if (!allowGuest(await clientKey())) redirect("/login?error=slow-down");
  const user = await createGuest();
  await createSession(user);
  redirect("/home?welcome=guest");
}

export async function logoutAction(): Promise<void> {
  await destroySession();
  redirect("/");
}

export async function checkUserNameAction(userName: string) {
  return checkUserName(userName);
}

export async function sendSignupCodeAction(email: string): Promise<ActionResult> {
  const parsed = emailSchema.safeParse(email);
  if (!parsed.success) return { ok: false, error: firstIssue(parsed.error) };
  const browserKey = (await getBrowserKey(true))!;
  if (!allowCodes(await clientKey()))
    return { ok: false, error: "Too many codes requested - wait a few minutes." };
  return sendSignupCode(parsed.data, browserKey);
}

const registerSchema = z.object({
  email: emailSchema,
  authCode: codeSchema,
  userName: userNameSchema,
  password: passwordSchema,
  re_password: z.string(),
});

export async function registerAction(input: z.input<typeof registerSchema>): Promise<ActionResult> {
  const parsed = registerSchema.safeParse(input);
  if (!parsed.success) return { ok: false, error: firstIssue(parsed.error) };
  const result = await register(parsed.data);
  if (!result.ok) return result;
  await createSession(result.user);
  redirect("/home?welcome=1");
}

export async function sendResetCodeAction(
  userName: string,
): Promise<ActionResult<{ email: string; delivered: boolean }>> {
  if (!userName.trim()) return { ok: false, error: "Enter your user name." };
  if (!allowCodes(await clientKey()))
    return { ok: false, error: "Too many codes requested - wait a few minutes." };
  const browserKey = (await getBrowserKey(true))!;
  const user = await findUserByUserName(userName);
  // Only browsers that have signed in to this account before see the code in
  // their demo inbox (see isKnownAccount).
  const known = user ? await isKnownAccount(user.id) : false;
  return sendResetCode(userName, known ? browserKey : null);
}

export async function verifyResetCodeAction(userName: string, code: string): Promise<ActionResult> {
  const parsed = codeSchema.safeParse(code);
  if (!parsed.success) return { ok: false, error: firstIssue(parsed.error) };
  const result = await verifyResetCode(userName, parsed.data);
  if (!result.ok) return result;
  await issueResetTicket(result.userId);
  return { ok: true };
}

export async function resetPasswordAction(
  password: string,
  rePassword: string,
): Promise<ActionResult> {
  const parsed = passwordSchema.safeParse(password);
  if (!parsed.success) return { ok: false, error: firstIssue(parsed.error) };
  const userId = await consumeResetTicket();
  if (!userId) return { ok: false, error: "Your reset session expired - request a new code." };
  const result = await setNewPassword(userId, parsed.data, rePassword);
  if (!result.ok) return result;
  await clearResetTicket();
  return { ok: true };
}

const inviteSchema = z.object({
  id: z.string().min(1),
  fastRegisterCode: z.string().regex(/^\d{10}$/),
  userName: userNameSchema,
  password: passwordSchema,
  re_password: z.string(),
});

export async function confirmInviteAction(
  input: z.input<typeof inviteSchema>,
): Promise<ActionResult> {
  const parsed = inviteSchema.safeParse(input);
  if (!parsed.success) return { ok: false, error: firstIssue(parsed.error) };
  const result = await confirmFastRegister(parsed.data);
  if (!result.ok) return result;
  const user = await authenticate(parsed.data.userName, parsed.data.password);
  if (user) {
    await createSession(user);
    redirect("/home?welcome=invite");
  }
  redirect("/login");
}
