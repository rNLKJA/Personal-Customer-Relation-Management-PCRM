import "server-only";
import { and, count, desc, eq } from "drizzle-orm";
import { getDb } from "@/db/client";
import { newId } from "@/db/ids";
import { aiAuditLog, records, type AcceptedAiSummary, type AiAuditEntry } from "@/db/schema";
import { auditEntryContainsSecret, type AiAuditInput, type AiDecisionInput } from "@/lib/ai/audit";
import { MEETING_ASSIST_FEATURE, meetingAssistOutputSchema } from "@/lib/ai/meeting-assist";
import { logActivity } from "./activity";

/**
 * Server side of the AI audit trail. The browser calls the provider with the
 * visitor's key, then posts what happened here - never the key. Entries are
 * written once; the only later change is the human decision on a pending
 * draft, which can be made exactly once.
 */

export type Result<T = object> = ({ ok: true } & T) | { ok: false; error: string };

async function ownsRecord(userId: string, recordId: string): Promise<boolean> {
  const row = await getDb()
    .select({ id: records.id })
    .from(records)
    .where(and(eq(records.id, recordId), eq(records.ownerId, userId)))
    .get();
  return Boolean(row);
}

export async function recordAiCall(
  userId: string,
  entry: AiAuditInput,
): Promise<Result<{ id: string }>> {
  if (auditEntryContainsSecret(entry)) {
    return {
      ok: false,
      error: "Refused: the entry contains something that looks like an API key.",
    };
  }
  if (entry.recordId && !(await ownsRecord(userId, entry.recordId))) {
    return { ok: false, error: "Meeting not found." };
  }
  const id = newId();
  await getDb()
    .insert(aiAuditLog)
    .values({
      id,
      userId,
      feature: entry.feature,
      provider: entry.provider,
      model: entry.model,
      servedModel: entry.servedModel,
      promptVersion: entry.promptVersion,
      recordId: entry.recordId,
      input: entry.input,
      redactionCounts: entry.redactionCounts,
      output: entry.output,
      error: entry.error,
      latencyMs: entry.latencyMs,
      inputTokens: entry.inputTokens,
      outputTokens: entry.outputTokens,
      decision: entry.error ? "not_applicable" : entry.decision,
      createdAt: new Date(),
    });
  await logActivity(userId, "ai-call", "ai", id, {
    feature: entry.feature,
    provider: entry.provider,
    model: entry.model,
    ok: !entry.error,
  });
  return { ok: true, id };
}

function parseAssistOutput(text: string | null) {
  if (!text) return null;
  try {
    const parsed = meetingAssistOutputSchema.safeParse(JSON.parse(text));
    return parsed.success ? parsed.data : null;
  } catch {
    return null;
  }
}

/**
 * Record the person's decision on a pending draft (once). Accepting or editing
 * a meeting-assistant draft stores the final text on the meeting, labelled as
 * AI-generated.
 *
 * Integrity: "accepted" always saves the model output already in the log -
 * any text the browser sends with it is ignored - so "accepted" can never
 * label words a person wrote as unmodified model output. An "edited" draft
 * that is identical to the model output is recorded as "accepted".
 */
export async function decideAiCall(
  userId: string,
  input: AiDecisionInput,
): Promise<Result<{ recordId: string | null; decision: AiDecisionInput["decision"] }>> {
  const db = getDb();
  const entry = await db
    .select()
    .from(aiAuditLog)
    .where(and(eq(aiAuditLog.id, input.id), eq(aiAuditLog.userId, userId)))
    .get();
  if (!entry) return { ok: false, error: "AI log entry not found." };
  if (entry.decision !== "pending") return { ok: false, error: "A decision was already recorded." };

  let decision = input.decision;
  let summary: AcceptedAiSummary | null = null;
  let finalOutput: string | null = null;
  if (decision !== "rejected") {
    const original = parseAssistOutput(entry.output);
    let kept = original;
    if (decision === "accepted") {
      if (!original) return { ok: false, error: "The logged answer cannot be saved as it is." };
    } else {
      if (!input.finalOutput) return { ok: false, error: "Nothing to save." };
      let parsedJson: unknown;
      try {
        parsedJson = JSON.parse(input.finalOutput);
      } catch {
        return { ok: false, error: "The edited draft is not valid." };
      }
      const parsed = meetingAssistOutputSchema.safeParse(parsedJson);
      if (!parsed.success) return { ok: false, error: "The summary cannot be empty." };
      kept = parsed.data;
      if (original && JSON.stringify(original) === JSON.stringify(kept)) decision = "accepted";
    }
    finalOutput = JSON.stringify(kept);
    summary = {
      summary: kept!.summary,
      followUps: kept!.follow_ups,
      auditId: entry.id,
      provider: entry.provider,
      model: entry.servedModel ?? entry.model,
      decision,
      decidedAt: Date.now(),
    };
  }

  const claimed = await db
    .update(aiAuditLog)
    .set({ decision, finalOutput, decidedAt: new Date() })
    .where(and(eq(aiAuditLog.id, entry.id), eq(aiAuditLog.decision, "pending")))
    .returning({ id: aiAuditLog.id });
  if (claimed.length === 0) return { ok: false, error: "A decision was already recorded." };

  if (summary && entry.feature === MEETING_ASSIST_FEATURE && entry.recordId) {
    await db
      .update(records)
      .set({ aiSummary: summary })
      .where(and(eq(records.id, entry.recordId), eq(records.ownerId, userId)));
  }
  await logActivity(userId, "ai-decision", "ai", entry.id, { decision });
  if (summary && entry.recordId) {
    await logActivity(userId, "update", "meeting", entry.recordId, {
      fields: ["ai_summary"],
      via: decision,
    });
  }
  return { ok: true, recordId: entry.recordId, decision };
}

/** Remove an accepted AI summary from a meeting (the audit entry stays). */
export async function removeAiSummary(userId: string, recordId: string): Promise<boolean> {
  const updated = await getDb()
    .update(records)
    .set({ aiSummary: null })
    .where(and(eq(records.id, recordId), eq(records.ownerId, userId)))
    .returning({ id: records.id });
  if (updated.length) {
    await logActivity(userId, "update", "meeting", recordId, {
      fields: ["ai_summary"],
      via: "removed",
    });
  }
  return updated.length > 0;
}

export async function listAiCalls(
  userId: string,
  opts: { page: number; pageSize: number },
): Promise<{ items: AiAuditEntry[]; total: number; page: number; pages: number }> {
  const db = getDb();
  const [{ n }] = await db
    .select({ n: count() })
    .from(aiAuditLog)
    .where(eq(aiAuditLog.userId, userId));
  const total = Number(n);
  const pages = Math.max(1, Math.ceil(total / opts.pageSize));
  const page = Math.min(Math.max(1, opts.page), pages);
  const items = await db
    .select()
    .from(aiAuditLog)
    .where(eq(aiAuditLog.userId, userId))
    .orderBy(desc(aiAuditLog.createdAt))
    .limit(opts.pageSize)
    .offset((page - 1) * opts.pageSize);
  return { items, total, page, pages };
}

export async function allAiCalls(userId: string): Promise<AiAuditEntry[]> {
  return getDb()
    .select()
    .from(aiAuditLog)
    .where(eq(aiAuditLog.userId, userId))
    .orderBy(desc(aiAuditLog.createdAt));
}

export interface AiLogStats {
  calls: number;
  failed: number;
  decided: { accepted: number; edited: number; rejected: number; pending: number };
  medianLatencyMs: number | null;
}

export function aiLogStats(entries: readonly AiAuditEntry[]): AiLogStats {
  const decided = { accepted: 0, edited: 0, rejected: 0, pending: 0 };
  for (const e of entries) {
    if (e.decision in decided) decided[e.decision as keyof typeof decided]++;
  }
  const ok = entries
    .filter((e) => !e.error)
    .map((e) => e.latencyMs)
    .sort((a, b) => a - b);
  const mid = Math.floor(ok.length / 2);
  return {
    calls: entries.length,
    failed: entries.filter((e) => e.error).length,
    decided,
    medianLatencyMs: ok.length ? (ok.length % 2 ? ok[mid] : (ok[mid - 1] + ok[mid]) / 2) : null,
  };
}
