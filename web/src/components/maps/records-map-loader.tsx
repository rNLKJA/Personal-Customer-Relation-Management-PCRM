"use client";

import dynamic from "next/dynamic";
import { Skeleton } from "@/components/ui/skeleton";
import type { MapRecord } from "./records-map";

/** MapLibre needs `window`; load the map on the client only, with a skeleton. */
const RecordsMap = dynamic(() => import("./records-map").then((m) => m.RecordsMap), {
  ssr: false,
  loading: () => (
    <div className="grid gap-4 lg:h-[calc(100dvh-11rem)] lg:grid-cols-[320px_1fr]">
      <Skeleton className="order-2 h-64 rounded-2xl lg:order-1 lg:h-full" />
      <Skeleton className="order-1 h-[52dvh] rounded-2xl lg:order-2 lg:h-full" />
    </div>
  ),
});

export function RecordsMapLoader(props: { records: MapRecord[]; now: number }) {
  return <RecordsMap {...props} />;
}
