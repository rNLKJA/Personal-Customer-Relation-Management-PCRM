"use client";

import { useRouter } from "next/navigation";
import { useTransition } from "react";
import { Loader2, Trash2 } from "lucide-react";
import { toast } from "sonner";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import { Button } from "@/components/ui/button";
import { deleteRecordAction } from "@/server/actions/records";

/** Port of the delete action in `recordDetail.js` ("(ｏ・_・)ノ Delete this record ?"). */
export function DeleteRecordButton({ id }: { id: string }) {
  const router = useRouter();
  const [pending, start] = useTransition();
  return (
    <AlertDialog>
      <AlertDialogTrigger asChild>
        <Button variant="destructive">
          <Trash2 /> Delete
        </Button>
      </AlertDialogTrigger>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>(ｏ・_・)ノ Delete this record?</AlertDialogTitle>
          <AlertDialogDescription>The meeting is removed from your list, map and calendar.</AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel>Keep</AlertDialogCancel>
          <AlertDialogAction
            variant="destructive"
            disabled={pending}
            onClick={(e) => {
              e.preventDefault();
              start(async () => {
                const res = await deleteRecordAction(id);
                if (!res.ok) {
                  toast.error(res.error);
                  return;
                }
                toast.success("Meeting deleted");
                router.push("/records");
                router.refresh();
              });
            }}
          >
            {pending && <Loader2 className="animate-spin" aria-hidden="true" />} Delete meeting
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}
