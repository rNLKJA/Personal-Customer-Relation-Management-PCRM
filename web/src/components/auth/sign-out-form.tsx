"use client";

import type { ReactNode } from "react";
import { logoutAction } from "@/server/actions/auth";
import { clearStoredAiKeys } from "@/components/ai/clear-ai-keys";

/** Sign-out form that also forgets any AI keys saved in this browser. */
export function SignOutForm({ children, className }: { children: ReactNode; className?: string }) {
  return (
    <form action={logoutAction} onSubmit={() => clearStoredAiKeys()} className={className}>
      {children}
    </form>
  );
}
