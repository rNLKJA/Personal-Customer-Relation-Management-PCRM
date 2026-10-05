"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { codeSchema, firstIssue, passwordSchema, portraitSchema, profileSchema, type ProfileValues } from "@/lib/schemas";
import { getBrowserKey, getCurrentUser } from "../session";
import { changePassword, sendChangePasswordCode, setUserPortrait, updateProfile } from "../users";
import { markRead } from "../mail";
import { SESSION_EXPIRED, type ActionResult } from "./types";

export async function updateProfileAction(values: ProfileValues): Promise<ActionResult> {
  const user = await getCurrentUser();
  if (!user) return SESSION_EXPIRED;
  const parsed = profileSchema.safeParse(values);
  if (!parsed.success) return { ok: false, error: firstIssue(parsed.error) };
  await updateProfile(user.id, parsed.data);
  revalidatePath("/profile");
  revalidatePath("/home");
  return { ok: true };
}

export async function setPortraitAction(dataUrl: string | null): Promise<ActionResult> {
  const user = await getCurrentUser();
  if (!user) return SESSION_EXPIRED;
  const parsed = portraitSchema.safeParse(dataUrl);
  if (!parsed.success) return { ok: false, error: firstIssue(parsed.error) };
  await setUserPortrait(user.id, parsed.data ?? null);
  revalidatePath("/profile");
  return { ok: true };
}

export async function sendChangePasswordCodeAction(): Promise<ActionResult<{ email: string }>> {
  const user = await getCurrentUser();
  if (!user) return SESSION_EXPIRED;
  return sendChangePasswordCode(user);
}

const changeSchema = z.object({
  authCode: codeSchema,
  newPassword1: passwordSchema,
  newPassword2: z.string(),
});

export async function changePasswordAction(input: z.input<typeof changeSchema>): Promise<ActionResult> {
  const user = await getCurrentUser();
  if (!user) return SESSION_EXPIRED;
  const parsed = changeSchema.safeParse(input);
  if (!parsed.success) return { ok: false, error: firstIssue(parsed.error) };
  return changePassword(user, parsed.data);
}

export async function markEmailReadAction(id: string): Promise<void> {
  const user = await getCurrentUser();
  const browserKey = await getBrowserKey(false);
  await markRead(id, user, browserKey);
}
