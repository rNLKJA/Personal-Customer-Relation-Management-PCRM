"use client";

import { useCallback, useSyncExternalStore } from "react";
import {
  DEFAULT_SETTINGS,
  KEYS_STORAGE_KEY,
  PREFS_STORAGE_KEY,
  SETTINGS_EVENT,
  activeKey,
  forgetKeys,
  loadSettings,
  saveSettings,
  type AiSettings,
  type StorageLike,
} from "@/lib/ai/settings";

/**
 * Bring-your-own-key settings from this browser's storage (never the server).
 * Re-renders when the settings change in this tab or another one.
 */

function storage(kind: "local" | "session"): StorageLike | null {
  try {
    return kind === "local" ? window.localStorage : window.sessionStorage;
  } catch {
    return null; // storage disabled (e.g. some private modes)
  }
}

function subscribe(onChange: () => void) {
  window.addEventListener(SETTINGS_EVENT, onChange);
  window.addEventListener("storage", onChange);
  return () => {
    window.removeEventListener(SETTINGS_EVENT, onChange);
    window.removeEventListener("storage", onChange);
  };
}

let cache: { raw: string; value: AiSettings } | null = null;

function snapshot(): AiSettings {
  const local = storage("local");
  const session = storage("session");
  const raw = [
    local?.getItem(PREFS_STORAGE_KEY),
    local?.getItem(KEYS_STORAGE_KEY),
    session?.getItem(KEYS_STORAGE_KEY),
  ].join("\u0000");
  if (!cache || cache.raw !== raw) cache = { raw, value: loadSettings(local, session) };
  return cache.value;
}

const serverSnapshot = () => DEFAULT_SETTINGS;

export function useAiSettings() {
  const settings = useSyncExternalStore(subscribe, snapshot, serverSnapshot);
  const save = useCallback((next: AiSettings) => {
    saveSettings(next, storage("local"), storage("session"));
    window.dispatchEvent(new Event(SETTINGS_EVENT));
  }, []);
  const forget = useCallback(() => {
    forgetKeys(storage("local"), storage("session"));
    window.dispatchEvent(new Event(SETTINGS_EVENT));
  }, []);
  return { settings, save, forget, hasKey: Boolean(activeKey(settings)) };
}
