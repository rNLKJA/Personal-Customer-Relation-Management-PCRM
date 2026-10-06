/**
 * Providers and models offered in the "AI settings" dialog. The visitor brings
 * their own key; the site has no AI budget and never proxies the calls.
 */

export type AiProvider = "anthropic" | "openai";

export interface ModelOption {
  id: string;
  label: string;
  note: string;
}

export const ANTHROPIC_MODELS: ModelOption[] = [
  {
    id: "claude-haiku-4-5",
    label: "Claude Haiku 4.5",
    note: "Default - the cheapest Claude tier, plenty for a short note.",
  },
  {
    id: "claude-sonnet-5-5",
    label: "Claude Sonnet 5.5",
    note: "More capable and about twice the price per token.",
  },
];

export const DEFAULT_ANTHROPIC_MODEL = ANTHROPIC_MODELS[0].id;

/** Free text in the dialog: OpenAI model ids change often. */
export const DEFAULT_OPENAI_MODEL = "gpt-5-mini";

export const PROVIDER_LABELS: Record<AiProvider, string> = {
  anthropic: "Anthropic (Claude)",
  openai: "OpenAI",
};

/**
 * Per-model request tweaks. Claude Sonnet 5.5 thinks adaptively by default;
 * a short summary does not need deep thinking, so effort is lowered. Claude
 * Haiku 4.5 does not accept the effort parameter.
 */
export function anthropicEffort(model: string): "low" | null {
  return model.startsWith("claude-sonnet-5") || model.startsWith("claude-opus-5") ? "low" : null;
}

/** Output cap per call - a guard on the visitor's bill, far above what a summary needs. */
export const MAX_OUTPUT_TOKENS = 4096;
