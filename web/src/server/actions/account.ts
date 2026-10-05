"use server";

import { redirect } from "next/navigation";
import { getCurrentUser, destroySession } from "../session";
import { deleteAccount } from "../your-data";
import { SESSION_EXPIRED, type ActionResult } from "./types";

/** Hard-delete the signed-in account (typed user name as confirmation). */
export async function deleteAccountAction(confirmUserName: string): Promise<ActionResult> {
  const user = await getCurrentUser();
  if (!user) return SESSION_EXPIRED;
  const result = await deleteAccount(user, String(confirmUserName ?? ""));
  if (!result.ok) return result;
  await destroySession();
  redirect("/goodbye");
}
