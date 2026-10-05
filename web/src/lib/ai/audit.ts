import { z } from "@/lib/zod";
import { FOLLOW_UP_EVAL_FEATURE, MEETING_ASSIST_FEATURE } from "./meeting-assist";

/**
 * Shape of one AI audit-log entry as posted by the browser to the server
 * action (`logAiCallAction`). It deliberately has no field for the API key,
 * and the server refuses any entry in which a string looks like one.
 */

export const AI_FEATURES = [MEETING_ASSIST_FEATURE, FOLLOW_UP_EVAL_FEATURE] as const;
export type AiFeature = (typeof AI_FEATURES)[number];

export const AI_DECISIONS = [
  "pending",
  "accepted",
  "edited",
  "rejected",
  "not_applicable",
] as const;
export type AiDecision = (typeof AI_DECISIONS)[number];

const count = z.number().int().min(0).max(10_000);

export const aiAuditInputSchema = z
  .object({
    feature: z.enum(AI_FEATURES),
    provider: z.enum(["anthropic", "openai"]),
    model: z.string().trim().min(1).max(100),
    servedModel: z.string().trim().max(100).nullable(),
    promptVersion: z.string().max(60),
    recordId: z.string().max(40).nullable(),
    /** The exact (redacted) user message that was sent. */
    input: z.string().max(12_000),
    redactionCounts: z.object({ email: count, phone: count, address: count, name: count }),
    /** The model's answer as returned (JSON text), or null on failure. */
    output: z.string().max(20_000).nullable(),
    error: z.string().max(500).nullable(),
    latencyMs: z.number().int().min(0).max(600_000),
    inputTokens: z.number().int().min(0).nullable(),
    outputTokens: z.number().int().min(0).nullable(),
    /** Evaluation runs are scored automatically; assistant drafts await a person. */
    decision: z.enum(["pending", "not_applicable"]),
  })
  .strict();
export type AiAuditInput = z.infer<typeof aiAuditInputSchema>;

export const aiDecisionSchema = z
  .object({
    id: z.string().min(1).max(40),
    decision: z.enum(["accepted", "edited", "rejected"]),
    /** Final text kept by the person (accepted or edited), JSON. */
    finalOutput: z.string().max(20_000).nullable(),
  })
  .strict();
export type AiDecisionInput = z.infer<typeof aiDecisionSchema>;

/**
 * Patterns of provider API keys. Used as a tripwire on the server: an audit
 * entry that contains one is rejected rather than stored.
 */
const SECRET_PATTERNS = [/sk-ant-[A-Za-z0-9_-]{8,}/, /\bsk-(?:proj-)?[A-Za-z0-9_-]{16,}/];

export function looksLikeSecret(value: string): boolean {
  return SECRET_PATTERNS.some((re) => re.test(value));
}

export function auditEntryContainsSecret(entry: Record<string, unknown>): boolean {
  return Object.values(entry).some((v) =>
    typeof v === "string"
      ? looksLikeSecret(v)
      : v && typeof v === "object"
        ? auditEntryContainsSecret(v as Record<string, unknown>)
        : false,
  );
}
