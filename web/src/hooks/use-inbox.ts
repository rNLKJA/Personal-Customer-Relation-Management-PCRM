"use client";

import useSWR from "swr";

export interface InboxMessage {
  id: string;
  to: string;
  subject: string;
  kind: "verification" | "password-reset" | "change-password" | "fast-register";
  html: string;
  code: string | null;
  actionPath: string | null;
  createdAt: string;
  read: boolean;
}

const fetcher = (url: string) =>
  fetch(url, { cache: "no-store" }).then((r) => {
    if (!r.ok) throw new Error("Could not load the demo inbox");
    return r.json() as Promise<{ messages: InboxMessage[] }>;
  });

/** Polls the demo inbox (the stand-in for Gmail) every few seconds. */
export function useInbox(refreshInterval = 4000) {
  const { data, error, isLoading, mutate } = useSWR("/api/inbox", fetcher, {
    refreshInterval,
    revalidateOnFocus: true,
  });
  return { messages: data?.messages ?? [], error, isLoading, mutate };
}
