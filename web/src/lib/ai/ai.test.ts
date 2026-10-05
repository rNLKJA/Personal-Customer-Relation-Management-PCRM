import { describe, expect, it, vi } from "vitest";
import { aiAuditInputSchema, auditEntryContainsSecret, looksLikeSecret } from "./audit";
import { runMeetingAssist } from "./client";
import { AiError } from "./errors";
import { MEETING_ASSIST_PROMPT_VERSION, meetingAssistUserMessage } from "./meeting-assist";
import { ANTHROPIC_URL, OPENAI_URL } from "./providers";
import {
  DEFAULT_SETTINGS,
  KEYS_STORAGE_KEY,
  PREFS_STORAGE_KEY,
  forgetKeys,
  loadSettings,
  maskKey,
  saveSettings,
  type AiSettings,
  type StorageLike,
} from "./settings";

const ANTHROPIC_KEY = "sk-ant-api03-TESTKEYTESTKEYTESTKEY-abcd";
const OPENAI_KEY = "sk-proj-TESTKEYTESTKEYTESTKEY1234";

const anthropicSettings: AiSettings = {
  ...DEFAULT_SETTINGS,
  keys: { anthropic: ANTHROPIC_KEY, openai: "" },
};
const openaiSettings: AiSettings = {
  ...DEFAULT_SETTINGS,
  provider: "openai",
  openaiModel: "gpt-test-mini",
  keys: { anthropic: "", openai: OPENAI_KEY },
};

const GOOD = {
  summary: "Talked about [NAME]'s move to the data team.",
  follow_ups: [{ action: "Send the reading list", due: "by Friday" }],
};

function jsonResponse(status: number, body: unknown, headers: Record<string, string> = {}) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { "content-type": "application/json", ...headers },
  });
}

function anthropicOk(text: string, extra: Record<string, unknown> = {}) {
  return jsonResponse(200, {
    id: "msg_1",
    type: "message",
    role: "assistant",
    model: "claude-haiku-4-5-20251001",
    content: [{ type: "text", text }],
    stop_reason: "end_turn",
    usage: { input_tokens: 321, output_tokens: 45 },
    ...extra,
  });
}

function clock(...ticks: number[]) {
  let i = 0;
  return () => ticks[Math.min(i++, ticks.length - 1)];
}

const userMessage = meetingAssistUserMessage("Fri 2 Oct 2026", "Call [NAME] about the grant.");
const counts = { email: 0, phone: 0, address: 0, name: 1 };

async function assist(settings: AiSettings, fetchImpl: typeof fetch) {
  return runMeetingAssist({
    settings,
    feature: "meeting-note-assistant",
    userMessage,
    redactionCounts: counts,
    recordId: "rec_1",
    fetchImpl,
    now: clock(1000, 1850),
  });
}

describe("Anthropic adapter (mocked fetch)", () => {
  it("sends a browser-direct structured-output request and parses the answer", async () => {
    const fetchImpl = vi.fn(async () => anthropicOk(JSON.stringify(GOOD)));
    const result = await assist(anthropicSettings, fetchImpl as unknown as typeof fetch);

    expect(fetchImpl).toHaveBeenCalledTimes(1);
    const [url, init] = fetchImpl.mock.calls[0] as unknown as [string, RequestInit];
    expect(url).toBe(ANTHROPIC_URL);
    const headers = init.headers as Record<string, string>;
    expect(headers["x-api-key"]).toBe(ANTHROPIC_KEY);
    expect(headers["anthropic-dangerous-direct-browser-access"]).toBe("true");
    expect(headers["anthropic-version"]).toBe("2023-06-01");
    expect(init.credentials).toBe("omit");
    const body = JSON.parse(String(init.body));
    expect(body.model).toBe("claude-haiku-4-5");
    expect(body.messages).toEqual([{ role: "user", content: userMessage }]);
    expect(body.output_config.format.type).toBe("json_schema");
    expect(body.output_config.effort).toBeUndefined(); // Haiku 4.5 rejects effort
    expect(String(init.body)).not.toContain(ANTHROPIC_KEY);

    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.output.follow_ups[0]).toEqual({
      action: "Send the reading list",
      due: "by Friday",
    });
    expect(result.audit).toMatchObject({
      provider: "anthropic",
      model: "claude-haiku-4-5",
      servedModel: "claude-haiku-4-5-20251001",
      latencyMs: 850,
      inputTokens: 321,
      outputTokens: 45,
      decision: "pending",
      promptVersion: MEETING_ASSIST_PROMPT_VERSION,
      recordId: "rec_1",
      input: userMessage,
      error: null,
    });
  });

  it("lowers effort on Sonnet 5.5 and ignores thinking blocks", async () => {
    const fetchImpl = vi.fn(async () =>
      jsonResponse(200, {
        model: "claude-sonnet-5-5",
        content: [
          { type: "thinking", thinking: "", signature: "x" },
          { type: "text", text: JSON.stringify(GOOD) },
        ],
        stop_reason: "end_turn",
        usage: { input_tokens: 1, output_tokens: 2 },
      }),
    );
    const result = await assist(
      { ...anthropicSettings, anthropicModel: "claude-sonnet-5-5" },
      fetchImpl as unknown as typeof fetch,
    );
    const body = JSON.parse(
      String((fetchImpl.mock.calls[0] as unknown as [string, RequestInit])[1].body),
    );
    expect(body.output_config.effort).toBe("low");
    expect(result.ok).toBe(true);
  });

  it.each([
    [
      401,
      { type: "error", error: { type: "authentication_error", message: "invalid x-api-key" } },
      {},
      "invalid_key",
    ],
    [403, { type: "error", error: { type: "permission_error", message: "no" } }, {}, "permission"],
    [
      404,
      { type: "error", error: { type: "not_found_error", message: "model" } },
      {},
      "model_not_found",
    ],
    [
      429,
      { type: "error", error: { type: "rate_limit_error", message: "slow" } },
      { "retry-after": "12" },
      "rate_limited",
    ],
    [
      529,
      { type: "error", error: { type: "overloaded_error", message: "busy" } },
      {},
      "overloaded",
    ],
    [500, { type: "error", error: { type: "api_error", message: "oops" } }, {}, "server"],
    [
      400,
      { type: "error", error: { type: "invalid_request_error", message: "bad" } },
      {},
      "bad_request",
    ],
  ] as const)("maps HTTP %i to %s", async (status, body, headers, kind) => {
    const fetchImpl = vi.fn(async () => jsonResponse(status, body, headers));
    const result = await assist(anthropicSettings, fetchImpl as unknown as typeof fetch);
    expect(result.ok).toBe(false);
    if (result.ok) return;
    expect(result.error.kind).toBe(kind);
    expect(result.audit.error).toContain(kind);
    expect(result.audit.output).toBeNull();
    if (kind === "rate_limited") {
      expect(result.error.retryAfterS).toBe(12);
      expect(result.error.userMessage).toContain("12s");
    }
  });

  it("reports CORS / offline failures as network errors", async () => {
    const fetchImpl = vi.fn(async () => {
      throw new TypeError("Failed to fetch");
    });
    const result = await assist(anthropicSettings, fetchImpl as unknown as typeof fetch);
    expect(!result.ok && result.error.kind).toBe("network");
  });

  it("treats refusals, truncation and malformed JSON as failures, keeping the raw output", async () => {
    const refusal = await assist(anthropicSettings, (async () =>
      anthropicOk("", { stop_reason: "refusal" })) as unknown as typeof fetch);
    expect(!refusal.ok && refusal.error.kind).toBe("refusal");
    const truncated = await assist(anthropicSettings, (async () =>
      anthropicOk('{"summary": "x', { stop_reason: "max_tokens" })) as unknown as typeof fetch);
    expect(!truncated.ok && truncated.error.kind).toBe("truncated");
    const notJson = await assist(anthropicSettings, (async () =>
      anthropicOk("Sure! Here is a summary.")) as unknown as typeof fetch);
    expect(!notJson.ok && notJson.error.kind).toBe("bad_output");
    expect(!notJson.ok && notJson.audit.output).toBe("Sure! Here is a summary.");
    const wrongShape = await assist(anthropicSettings, (async () =>
      anthropicOk(JSON.stringify({ summary: "", follow_ups: [] }))) as unknown as typeof fetch);
    expect(!wrongShape.ok && wrongShape.error.kind).toBe("bad_output");
  });

  it("does not call the provider without a key", async () => {
    const fetchImpl = vi.fn();
    const result = await assist(DEFAULT_SETTINGS, fetchImpl as unknown as typeof fetch);
    expect(fetchImpl).not.toHaveBeenCalled();
    expect(!result.ok && result.error.kind).toBe("no_key");
  });
});

describe("OpenAI adapter (mocked fetch)", () => {
  it("sends a strict json_schema request with a bearer token", async () => {
    const fetchImpl = vi.fn(async () =>
      jsonResponse(200, {
        model: "gpt-test-mini-2026",
        choices: [
          {
            finish_reason: "stop",
            message: { role: "assistant", content: JSON.stringify(GOOD), refusal: null },
          },
        ],
        usage: { prompt_tokens: 210, completion_tokens: 30 },
      }),
    );
    const result = await assist(openaiSettings, fetchImpl as unknown as typeof fetch);
    const [url, init] = fetchImpl.mock.calls[0] as unknown as [string, RequestInit];
    expect(url).toBe(OPENAI_URL);
    expect((init.headers as Record<string, string>).authorization).toBe(`Bearer ${OPENAI_KEY}`);
    const body = JSON.parse(String(init.body));
    expect(body.model).toBe("gpt-test-mini");
    expect(body.response_format.json_schema.strict).toBe(true);
    expect(body.messages[0].role).toBe("system");
    expect(String(init.body)).not.toContain(OPENAI_KEY);
    expect(result.ok && result.audit).toMatchObject({
      provider: "openai",
      servedModel: "gpt-test-mini-2026",
      inputTokens: 210,
      outputTokens: 30,
    });
  });

  it("maps exhausted quota to a billing error and refusals to refusal", async () => {
    const quota = await assist(openaiSettings, (async () =>
      jsonResponse(429, {
        error: { code: "insufficient_quota", message: "quota" },
      })) as unknown as typeof fetch);
    expect(!quota.ok && quota.error.kind).toBe("billing");
    const refused = await assist(openaiSettings, (async () =>
      jsonResponse(200, {
        choices: [{ finish_reason: "stop", message: { content: null, refusal: "I can't help" } }],
      })) as unknown as typeof fetch);
    expect(!refused.ok && refused.error.kind).toBe("refusal");
  });
});

describe("audit payload", () => {
  it("never carries the key and validates against the server schema", async () => {
    for (const [settings, key] of [
      [anthropicSettings, ANTHROPIC_KEY],
      [openaiSettings, OPENAI_KEY],
    ] as const) {
      const ok = await assist(settings, (async () =>
        settings.provider === "anthropic"
          ? anthropicOk(JSON.stringify(GOOD))
          : jsonResponse(200, {
              choices: [{ finish_reason: "stop", message: { content: JSON.stringify(GOOD) } }],
            })) as unknown as typeof fetch);
      const failed = await assist(settings, (async () =>
        jsonResponse(401, {})) as unknown as typeof fetch);
      for (const r of [ok, failed]) {
        expect(JSON.stringify(r.audit)).not.toContain(key);
        expect(aiAuditInputSchema.safeParse(r.audit).success).toBe(true);
        expect(auditEntryContainsSecret(r.audit)).toBe(false);
      }
    }
  });

  it("flags anything that looks like a provider key", () => {
    expect(looksLikeSecret(ANTHROPIC_KEY)).toBe(true);
    expect(looksLikeSecret(`my key is ${OPENAI_KEY}`)).toBe(true);
    expect(looksLikeSecret("Ask about the sk-8 skateboard")).toBe(false);
    expect(auditEntryContainsSecret({ nested: { input: ANTHROPIC_KEY } })).toBe(true);
  });

  it("rejects unknown fields such as an apiKey", () => {
    const entry = {
      feature: "meeting-note-assistant",
      provider: "anthropic",
      model: "claude-haiku-4-5",
      servedModel: null,
      promptVersion: MEETING_ASSIST_PROMPT_VERSION,
      recordId: null,
      input: "x",
      redactionCounts: counts,
      output: null,
      error: null,
      latencyMs: 1,
      inputTokens: null,
      outputTokens: null,
      decision: "pending",
    };
    expect(aiAuditInputSchema.safeParse(entry).success).toBe(true);
    expect(aiAuditInputSchema.safeParse({ ...entry, apiKey: "x" }).success).toBe(false);
  });
});

class MemoryStorage implements StorageLike {
  map = new Map<string, string>();
  getItem(k: string) {
    return this.map.get(k) ?? null;
  }
  setItem(k: string, v: string) {
    this.map.set(k, v);
  }
  removeItem(k: string) {
    this.map.delete(k);
  }
}

describe("BYOK settings storage", () => {
  it("keeps keys in sessionStorage by default and preferences in localStorage", () => {
    const local = new MemoryStorage();
    const session = new MemoryStorage();
    saveSettings(anthropicSettings, local, session);
    expect(session.getItem(KEYS_STORAGE_KEY)).toContain(ANTHROPIC_KEY);
    expect(local.getItem(KEYS_STORAGE_KEY)).toBeNull();
    expect(local.getItem(PREFS_STORAGE_KEY)).not.toContain(ANTHROPIC_KEY);
    expect(loadSettings(local, session)).toEqual(anthropicSettings);
    // A new tab (fresh sessionStorage) has no key.
    expect(loadSettings(local, new MemoryStorage()).keys.anthropic).toBe("");
  });

  it("moves keys to localStorage only when 'remember' is ticked, and back", () => {
    const local = new MemoryStorage();
    const session = new MemoryStorage();
    saveSettings({ ...anthropicSettings, remember: true }, local, session);
    expect(local.getItem(KEYS_STORAGE_KEY)).toContain(ANTHROPIC_KEY);
    expect(session.getItem(KEYS_STORAGE_KEY)).toBeNull();
    expect(loadSettings(local, new MemoryStorage()).keys.anthropic).toBe(ANTHROPIC_KEY);
    saveSettings({ ...anthropicSettings, remember: false }, local, session);
    expect(local.getItem(KEYS_STORAGE_KEY)).toBeNull();
  });

  it("forgets keys everywhere but keeps preferences", () => {
    const local = new MemoryStorage();
    const session = new MemoryStorage();
    saveSettings({ ...openaiSettings, remember: true }, local, session);
    session.setItem(KEYS_STORAGE_KEY, JSON.stringify({ anthropic: "x", openai: "y" }));
    forgetKeys(local, session);
    const after = loadSettings(local, session);
    expect(after.keys).toEqual({ anthropic: "", openai: "" });
    expect(after.provider).toBe("openai");
  });

  it("falls back to safe defaults on corrupt or unexpected storage", () => {
    const local = new MemoryStorage();
    local.setItem(PREFS_STORAGE_KEY, "{not json");
    expect(loadSettings(local, null)).toEqual(DEFAULT_SETTINGS);
    local.setItem(
      PREFS_STORAGE_KEY,
      JSON.stringify({ provider: "evil", anthropicModel: "claude-unknown", openaiModel: "a b" }),
    );
    expect(loadSettings(local, null)).toEqual(DEFAULT_SETTINGS);
  });

  it("masks keys for display", () => {
    expect(maskKey(ANTHROPIC_KEY)).toBe("sk-ant-…abcd");
    expect(maskKey("")).toBe("");
    expect(maskKey("short")).toBe("…hort");
  });

  it("AiError exposes a friendly message", () => {
    expect(new AiError("invalid_key").userMessage).toMatch(/rejected the API key/);
  });
});
