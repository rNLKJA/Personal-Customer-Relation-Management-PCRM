"use client";

import { useRouter } from "next/navigation";
import { useTransition } from "react";
import { Loader2, X } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { removeAiSummaryAction } from "@/server/actions/ai";

export function RemoveAiSummaryButton({ recordId }: { recordId: string }) {
  const router = useRouter();
  const [pending, start] = useTransition();
  return (
    <Button
      size="sm"
      variant="ghost"
      disabled={pending}
      onClick={() =>
        start(async () => {
          const res = await removeAiSummaryAction(recordId);
          if (!res.ok) {
            toast.error(res.error);
            return;
          }
          toast.success("AI summary removed from this meeting");
          router.refresh();
        })
      }
    >
      {pending ? <Loader2 className="animate-spin" /> : <X />} Remove
    </Button>
  );
}
