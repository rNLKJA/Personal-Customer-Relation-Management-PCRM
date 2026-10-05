"use client";

import useSWR from "swr";

const fetcher = (url: string) => fetch(url, { cache: "no-store" }).then((r) => r.json());

/** Unread demo-inbox messages, polled so new codes/invites show up live. */
export function useUnreadCount(initial: number) {
  const { data } = useSWR<{ unread: number }>("/api/inbox?count=1", fetcher, {
    refreshInterval: 8000,
    fallbackData: { unread: initial },
    revalidateOnFocus: true,
  });
  return data?.unread ?? initial;
}
