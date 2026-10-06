import { z } from "@/lib/zod";
import {
  DEFAULT_ANTHROPIC_MODEL,
  DEFAULT_OPENAI_MODEL,
  ANTHROPIC_MODELS,
  type AiProvider,
} from "./models";

/**
 * Bring-your-own-key settings, kept only in the visitor's browser:
 *
 * - preferences (provider, models, "remember" flag) in localStorage;
 * - API keys in sessionStorage by default (gone when the tab closes), or in
 *   localStorage when the visitor ticks "remember on this device".
 *
 * Nothing here is ever sent to this site's server. Pure functions over a
 * Storage-like interface so they can be unit-tested without a browser.
 */

export interface StorageLike {
  getItem(key: string): string | null;
  setItem(key: string, value: string): void;
  removeItem(key: string): void;
}

export interface AiSettings {
  provider: AiProvider;
  anthropicModel: string;
  openaiModel: string;
  keys: Record<AiProvider, string>;
  remember: boolean;
}

export const PREFS_STORAGE_KEY = "pcrm.ai.prefs";
export const KEYS_STORAGE_KEY = "pcrm.ai.keys";
export const SETTINGS_EVENT = "pcrm:ai-settings";

export const DEFAULT_SETTINGS: AiSettings = {
  provider: "anthropic",
  anthropicModel: DEFAULT_ANTHROPIC_MODEL,
  openaiModel: DEFAULT_OPENAI_MODEL,
  keys: { anthropic: "", openai: "" },
  remember: false,
};

const prefsSchema = z.object({
  provider: z.enum(["anthropic", "openai"]).catch("anthropic"),
  anthropicModel: z
    .string()
    .refine((m) => ANTHROPIC_MODELS.some((o) => o.id === m))
    .catch(DEFAULT_ANTHROPIC_MODEL),
  openaiModel: z
    .string()
    .trim()
    .regex(/^[A-Za-z0-9._:-]{1,80}$/)
    .catch(DEFAULT_OPENAI_MODEL),
  remember: z.boolean().catch(false),
});

const keysSchema = z.object({
  anthropic: z.string().max(400).catch(""),
  openai: z.string().max(400).catch(""),
});

function readJson(storage: StorageLike | null, key: string): unknown {
  if (!storage) return null;
  try {
    const raw = storage.getItem(key);
    return raw ? JSON.parse(raw) : null;
  } catch {
    return null;
  }
}

export function loadSettings(local: StorageLike | null, session: StorageLike | null): AiSettings {
  const prefs = prefsSchema.safeParse(readJson(local, PREFS_STORAGE_KEY) ?? {});
  const p = prefs.success ? prefs.data : prefsSchema.parse({});
  const keyStore = p.remember ? local : session;
  const keys = keysSchema.safeParse(readJson(keyStore, KEYS_STORAGE_KEY) ?? {});
  return { ...p, keys: keys.success ? keys.data : { ...DEFAULT_SETTINGS.keys } };
}

export function saveSettings(
  settings: AiSettings,
  local: StorageLike | null,
  session: StorageLike | null,
): void {
  const { keys, ...prefs } = settings;
  local?.setItem(PREFS_STORAGE_KEY, JSON.stringify(prefs));
  const cleaned = { anthropic: keys.anthropic.trim(), openai: keys.openai.trim() };
  const hasKey = Boolean(cleaned.anthropic || cleaned.openai);
  const [target, other] = settings.remember ? [local, session] : [session, local];
  if (hasKey) target?.setItem(KEYS_STORAGE_KEY, JSON.stringify(cleaned));
  else target?.removeItem(KEYS_STORAGE_KEY);
  other?.removeItem(KEYS_STORAGE_KEY);
}

/** "Forget key": remove every stored key from both storages (preferences stay). */
export function forgetKeys(local: StorageLike | null, session: StorageLike | null): void {
  local?.removeItem(KEYS_STORAGE_KEY);
  session?.removeItem(KEYS_STORAGE_KEY);
}

export function activeModel(s: AiSettings): string {
  return s.provider === "anthropic"
    ? s.anthropicModel
    : s.openaiModel.trim() || DEFAULT_OPENAI_MODEL;
}

export function activeKey(s: AiSettings): string {
  return s.keys[s.provider].trim();
}

/** "sk-ant-…9f3a" - enough to recognise a key without displaying it. */
export function maskKey(key: string): string {
  const k = key.trim();
  if (!k) return "";
  return `${k.slice(0, Math.min(7, Math.max(0, k.length - 8)))}…${k.slice(-4)}`;
}
