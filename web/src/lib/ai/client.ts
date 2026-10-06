import type { RedactionCategory } from "../redact/redact";
import type { AiAuditInput, AiFeature } from "./audit";
import { AiError } from "./errors";
import {
  MEETING_ASSIST_JSON_SCHEMA,
  MEETING_ASSIST_PROMPT_VERSION,
  MEETING_ASSIST_SYSTEM,
  meetingAssistOutputSchema,
  type MeetingAssistOutput,
} from "./meeting-assist";
import { callProvider } from "./providers";
import { activeKey, activeModel, type AiSettings } from "./settings";

/**
 * One meeting-note assistant call: provider request, JSON parsing, schema
 * validation, timing - and the audit-log entry describing it (without the key).
 */

export type AssistResult =
  | { ok: true; output: MeetingAssistOutput; raw: string; audit: AiAuditInput }
  | { ok: false; error: AiError; audit: AiAuditInput };

export interface AssistRequest {
  settings: AiSettings;
  feature: AiFeature;
  /** The exact user message (already redacted). */
  userMessage: string;
  redactionCounts: Record<RedactionCategory, number>;
  recordId: string | null;
  signal?: AbortSignal;
  fetchImpl?: typeof fetch;
  /** Injectable clock for tests. */
  now?: () => number;
}

export async function runMeetingAssist(req: AssistRequest): Promise<AssistResult> {
  const now = req.now ?? (() => performance.now());
  const model = activeModel(req.settings);
  const base = {
    feature: req.feature,
    provider: req.settings.provider,
    model,
    promptVersion: MEETING_ASSIST_PROMPT_VERSION,
    recordId: req.recordId,
    input: req.userMessage,
    redactionCounts: req.redactionCounts,
    decision: req.feature === "follow-up-eval" ? "not_applicable" : "pending",
  } as const;

  const started = now();
  const fail = (error: AiError, extra: Partial<AiAuditInput> = {}): AssistResult => ({
    ok: false,
    error,
    audit: {
      ...base,
      servedModel: null,
      output: null,
      error:
        `${error.kind}${error.status ? ` (HTTP ${error.status})` : ""}${error.detail ? `: ${error.detail}` : ""}`.slice(
          0,
          500,
        ),
      latencyMs: Math.round(now() - started),
      inputTokens: null,
      outputTokens: null,
      ...extra,
    },
  });

  const apiKey = activeKey(req.settings);
  if (!apiKey) return fail(new AiError("no_key"));

  let response;
  try {
    response = await callProvider({
      provider: req.settings.provider,
      apiKey,
      model,
      system: MEETING_ASSIST_SYSTEM,
      user: req.userMessage,
      schemaName: "meeting_assist",
      jsonSchema: MEETING_ASSIST_JSON_SCHEMA as unknown as Record<string, unknown>,
      signal: req.signal,
      fetchImpl: req.fetchImpl,
    });
  } catch (err) {
    return fail(err instanceof AiError ? err : new AiError("network"));
  }

  const latencyMs = Math.round(now() - started);
  const usage = {
    servedModel: response.servedModel,
    inputTokens: response.inputTokens,
    outputTokens: response.outputTokens,
    latencyMs,
  };
  let json: unknown;
  try {
    json = JSON.parse(response.text);
  } catch {
    return fail(new AiError("bad_output", { detail: "not JSON" }), {
      ...usage,
      output: response.text.slice(0, 20_000),
    });
  }
  const parsed = meetingAssistOutputSchema.safeParse(json);
  if (!parsed.success) {
    return fail(new AiError("bad_output", { detail: parsed.error.issues[0]?.message ?? null }), {
      ...usage,
      output: response.text.slice(0, 20_000),
    });
  }
  return {
    ok: true,
    output: parsed.data,
    raw: response.text,
    audit: { ...base, ...usage, output: response.text.slice(0, 20_000), error: null },
  };
}
