import { z } from "@/lib/zod";
import { AiError, errorFromStatus } from "./errors";
import { anthropicEffort, MAX_OUTPUT_TOKENS, type AiProvider } from "./models";

/**
 * Browser-to-provider adapters (plain fetch, no SDK, no proxy). The visitor's
 * key goes straight from their browser to the provider; it is never sent to
 * this site's server. Both adapters ask for a JSON-schema-constrained answer
 * (structured outputs) and return the raw JSON text plus usage.
 */

export const ANTHROPIC_URL = "https://api.anthropic.com/v1/messages";
export const OPENAI_URL = "https://api.openai.com/v1/chat/completions";

export interface ProviderRequest {
  provider: AiProvider;
  apiKey: string;
  model: string;
  system: string;
  user: string;
  schemaName: string;
  jsonSchema: Record<string, unknown>;
  signal?: AbortSignal;
  fetchImpl?: typeof fetch;
}

export interface ProviderResponse {
  /** The model's JSON answer as text (validated by the caller). */
  text: string;
  /** Model id reported by the provider (may be a dated snapshot). */
  servedModel: string | null;
  inputTokens: number | null;
  outputTokens: number | null;
  stopReason: string | null;
}

const anthropicResponse = z.object({
  model: z.string().optional(),
  stop_reason: z.string().nullable().optional(),
  content: z.array(z.object({ type: z.string(), text: z.string().optional() }).passthrough()),
  usage: z
    .object({ input_tokens: z.number().optional(), output_tokens: z.number().optional() })
    .passthrough()
    .optional(),
});

const openaiResponse = z.object({
  model: z.string().optional(),
  choices: z
    .array(
      z.object({
        finish_reason: z.string().nullable().optional(),
        message: z.object({
          content: z.string().nullable().optional(),
          refusal: z.string().nullable().optional(),
        }),
      }),
    )
    .min(1),
  usage: z
    .object({ prompt_tokens: z.number().optional(), completion_tokens: z.number().optional() })
    .passthrough()
    .optional(),
});

async function post(
  url: string,
  headers: Record<string, string>,
  body: unknown,
  provider: AiProvider,
  fetchImpl: typeof fetch,
  signal?: AbortSignal,
): Promise<unknown> {
  let res: Response;
  try {
    res = await fetchImpl(url, {
      method: "POST",
      headers: { "content-type": "application/json", ...headers },
      body: JSON.stringify(body),
      signal,
      // Never send this site's cookies to a third party.
      credentials: "omit",
      referrerPolicy: "no-referrer",
    });
  } catch (err) {
    if ((err as { name?: string })?.name === "AbortError") throw new AiError("aborted");
    // fetch rejects with a TypeError for offline, DNS, CORS and blocked requests.
    throw new AiError("network", { detail: err instanceof Error ? err.message : null });
  }
  let json: unknown = null;
  try {
    json = await res.json();
  } catch {
    json = null;
  }
  if (!res.ok) throw errorFromStatus(res.status, json, res.headers.get("retry-after"), provider);
  return json;
}

export async function callAnthropic(req: ProviderRequest): Promise<ProviderResponse> {
  const effort = anthropicEffort(req.model);
  const body = {
    model: req.model,
    max_tokens: MAX_OUTPUT_TOKENS,
    system: req.system,
    messages: [{ role: "user", content: req.user }],
    output_config: {
      format: { type: "json_schema", schema: req.jsonSchema },
      ...(effort ? { effort } : {}),
    },
  };
  const json = await post(
    ANTHROPIC_URL,
    {
      "x-api-key": req.apiKey,
      "anthropic-version": "2023-06-01",
      // Required for CORS: the key belongs to the visitor and stays in their browser.
      "anthropic-dangerous-direct-browser-access": "true",
    },
    body,
    "anthropic",
    req.fetchImpl ?? fetch,
    req.signal,
  );
  const parsed = anthropicResponse.safeParse(json);
  if (!parsed.success) throw new AiError("bad_output", { detail: "unexpected response shape" });
  const r = parsed.data;
  if (r.stop_reason === "refusal") throw new AiError("refusal");
  if (r.stop_reason === "max_tokens") throw new AiError("truncated");
  const text = r.content
    .filter((b) => b.type === "text" && typeof b.text === "string")
    .map((b) => b.text)
    .join("");
  return {
    text,
    servedModel: r.model ?? null,
    inputTokens: r.usage?.input_tokens ?? null,
    outputTokens: r.usage?.output_tokens ?? null,
    stopReason: r.stop_reason ?? null,
  };
}

export async function callOpenAI(req: ProviderRequest): Promise<ProviderResponse> {
  const body = {
    model: req.model,
    messages: [
      { role: "system", content: req.system },
      { role: "user", content: req.user },
    ],
    response_format: {
      type: "json_schema",
      json_schema: { name: req.schemaName, strict: true, schema: req.jsonSchema },
    },
    max_completion_tokens: MAX_OUTPUT_TOKENS,
  };
  const json = await post(
    OPENAI_URL,
    { authorization: `Bearer ${req.apiKey}` },
    body,
    "openai",
    req.fetchImpl ?? fetch,
    req.signal,
  );
  const parsed = openaiResponse.safeParse(json);
  if (!parsed.success) throw new AiError("bad_output", { detail: "unexpected response shape" });
  const r = parsed.data;
  const choice = r.choices[0];
  if (choice.message.refusal) throw new AiError("refusal", { detail: choice.message.refusal });
  if (choice.finish_reason === "length") throw new AiError("truncated");
  return {
    text: choice.message.content ?? "",
    servedModel: r.model ?? null,
    inputTokens: r.usage?.prompt_tokens ?? null,
    outputTokens: r.usage?.completion_tokens ?? null,
    stopReason: choice.finish_reason ?? null,
  };
}

export function callProvider(req: ProviderRequest): Promise<ProviderResponse> {
  return req.provider === "anthropic" ? callAnthropic(req) : callOpenAI(req);
}
