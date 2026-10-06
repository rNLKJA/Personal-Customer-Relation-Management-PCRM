"use client";

import { useEffect } from "react";
import { RotateCcw, TriangleAlert } from "lucide-react";
import { Button } from "@/components/ui/button";

export default function ErrorPage({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    console.error(error);
  }, [error]);
  return (
    <main
      id="main"
      className="flex min-h-[60dvh] flex-col items-center justify-center px-6 text-center"
    >
      <span className="flex size-14 items-center justify-center rounded-2xl bg-destructive/10 text-destructive">
        <TriangleAlert className="size-6" aria-hidden="true" />
      </span>
      <h1 className="mt-5 text-xl font-semibold tracking-tight">Something went wrong</h1>
      <p className="mt-2 max-w-sm text-sm text-muted-foreground">
        The page hit an unexpected error. Try again - if it keeps happening, the demo database may
        be resetting.
      </p>
      {error.digest && (
        <p className="mt-2 font-mono text-xs text-muted-foreground">ref {error.digest}</p>
      )}
      <Button className="mt-6" onClick={reset}>
        <RotateCcw /> Try again
      </Button>
    </main>
  );
}
