"use client";

import { useEffect } from "react";
import { forgetKeys, SETTINGS_EVENT } from "@/lib/ai/settings";

/** Remove any stored AI keys from this browser (after sign-out or account deletion). */
export function clearStoredAiKeys() {
  try {
    forgetKeys(window.localStorage, window.sessionStorage);
    window.dispatchEvent(new Event(SETTINGS_EVENT));
  } catch {
    // storage unavailable - nothing stored
  }
}

export function ClearAiKeys() {
  useEffect(() => {
    clearStoredAiKeys();
  }, []);
  return null;
}
