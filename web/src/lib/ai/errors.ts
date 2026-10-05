/** Typed, user-presentable failures of a provider call. */

export type AiErrorKind =
  | "no_key"
  | "invalid_key"
  | "permission"
  | "billing"
  | "rate_limited"
  | "overloaded"
  | "server"
  | "bad_request"
  | "model_not_found"
  | "network"
  | "refusal"
  | "truncated"
  | "bad_output"
  | "aborted";

const MESSAGES: Record<AiErrorKind, string> = {
  no_key: "Add your API key in AI settings first.",
  invalid_key: "The provider rejected the API key. Check it in AI settings.",
  permission: "This key is not allowed to use that model or endpoint.",
  billing: "The provider reports a billing or quota problem on this key.",
  rate_limited: "Rate limited by the provider. Wait a moment and try again.",
  overloaded: "The provider is temporarily overloaded. Try again shortly.",
  server: "The provider returned a server error. Try again shortly.",
  bad_request: "The provider rejected the request.",
  model_not_found: "That model id is not available to this key.",
  network:
    "Could not reach the provider (offline, blocked by a browser extension, or a CORS error).",
  refusal: "The model declined to answer this request.",
  truncated: "The answer was cut off before it finished.",
  bad_output: "The model's answer did not match the expected format.",
  aborted: "Cancelled.",
};

export class AiError extends Error {
  readonly kind: AiErrorKind;
  readonly status: number | null;
  readonly retryAfterS: number | null;
  /** Provider's own message, for the audit log (never contains the key). */
  readonly detail: string | null;

  constructor(
    kind: AiErrorKind,
    opts: { status?: number | null; retryAfterS?: number | null; detail?: string | null } = {},
  ) {
    super(MESSAGES[kind]);
    this.name = "AiError";
    this.kind = kind;
    this.status = opts.status ?? null;
    this.retryAfterS = opts.retryAfterS ?? null;
    this.detail = opts.detail ?? null;
  }

  /** Message for the UI, with the wait time when the provider gave one. */
  get userMessage(): string {
    if (this.kind === "rate_limited" && this.retryAfterS) {
      return `${this.message} (retry after ${this.retryAfterS}s)`;
    }
    if (this.kind === "bad_request" && this.detail) return `${this.message} ${this.detail}`;
    return this.message;
  }
}

/** Map an HTTP failure to an error kind (shared by both providers). */
export function errorFromStatus(
  status: number,
  body: unknown,
  retryAfter: string | null,
  provider: "anthropic" | "openai",
): AiError {
  const err = (body as { error?: { type?: string; code?: string; message?: string } } | null)
    ?.error;
  const detail = typeof err?.message === "string" ? err.message.slice(0, 300) : null;
  const retryAfterS = retryAfter && /^\d+(\.\d+)?$/.test(retryAfter) ? Number(retryAfter) : null;
  const opts = { status, retryAfterS, detail };
  if (status === 401) return new AiError("invalid_key", opts);
  if (status === 402) return new AiError("billing", opts);
  if (status === 403) return new AiError("permission", opts);
  if (status === 404) return new AiError("model_not_found", opts);
  if (status === 429) {
    // OpenAI uses 429 for exhausted credit as well as for rate limits.
    if (provider === "openai" && err?.code === "insufficient_quota") {
      return new AiError("billing", opts);
    }
    return new AiError("rate_limited", opts);
  }
  if (status === 529 || err?.type === "overloaded_error") return new AiError("overloaded", opts);
  if (status >= 500) return new AiError("server", opts);
  return new AiError("bad_request", opts);
}
