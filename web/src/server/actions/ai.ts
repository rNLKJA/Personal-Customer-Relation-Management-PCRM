"use server";

import { revalidatePath } from "next/cache";
import {
  aiAuditInputSchema,
  aiDecisionSchema,
  type AiAuditInput,
  type AiDecisionInput,
} from "@/lib/ai/audit";
import { firstIssue } from "@/lib/schemas";
import { getCurrentUser } from "../session";
import { decideAiCall, recordAiCall, removeAiSummary } from "../ai-audit";
import { SESSION_EXPIRED, type ActionResult } from "./types";

/**
 * Audit-log endpoints for the bring-your-own-key AI features. The browser
 * calls these AFTER talking to the provider directly; the payload schema has
 * no field for an API key and unknown fields are rejected.
 */

export async function logAiCallAction(entry: AiAuditInput): Promise<ActionResult<{ id: string }>> {
  const user = await getCurrentUser();
  if (!user) return SESSION_EXPIRED;
  const parsed = aiAuditInputSchema.safeParse(entry);
  if (!parsed.success) return { ok: false, error: firstIssue(parsed.error) };
  const result = await recordAiCall(user.id, parsed.data);
  if (result.ok) revalidatePath("/ai-log");
  return result;
}

export async function decideAiCallAction(input: AiDecisionInput): Promise<ActionResult> {
  const user = await getCurrentUser();
  if (!user) return SESSION_EXPIRED;
  const parsed = aiDecisionSchema.safeParse(input);
  if (!parsed.success) return { ok: false, error: firstIssue(parsed.error) };
  const result = await decideAiCall(user.id, parsed.data);
  if (!result.ok) return result;
  revalidatePath("/ai-log");
  if (result.recordId) revalidatePath(`/records/${result.recordId}`);
  return { ok: true };
}

export async function removeAiSummaryAction(recordId: string): Promise<ActionResult> {
  const user = await getCurrentUser();
  if (!user) return SESSION_EXPIRED;
  const ok = await removeAiSummary(user.id, recordId);
  if (!ok) return { ok: false, error: "Meeting not found." };
  revalidatePath(`/records/${recordId}`);
  return { ok: true };
}
