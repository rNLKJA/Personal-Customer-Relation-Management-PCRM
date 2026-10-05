"use client";

import { useRouter } from "next/navigation";
import { useTransition } from "react";
import { Loader2, RefreshCw, Send, Trash2 } from "lucide-react";
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
import { deleteContactAction, inviteContactAction, syncContactAction } from "@/server/actions/contacts";
import { syncFieldLabels } from "@/lib/labels";

export function DeleteContactButton({ id, name, meetings }: { id: string; name: string; meetings: number }) {
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
          <AlertDialogTitle>Delete {name}?</AlertDialogTitle>
          <AlertDialogDescription>
            This removes the contact
            {meetings > 0 ? ` and the ${meetings} meeting${meetings === 1 ? "" : "s"} you logged with them` : ""}. It
            can&apos;t be undone.
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel>Keep</AlertDialogCancel>
          <AlertDialogAction
            variant="destructive"
            disabled={pending}
            onClick={(e) => {
              e.preventDefault();
              start(async () => {
                const res = await deleteContactAction(id);
                if (!res.ok) {
                  toast.error(res.error);
                  return;
                }
                toast.success(`${name} deleted`);
                router.push("/contacts");
                router.refresh();
              });
            }}
          >
            {pending && <Loader2 className="animate-spin" aria-hidden="true" />} Delete contact
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}

export function SyncButton({ id }: { id: string }) {
  const router = useRouter();
  const [pending, start] = useTransition();
  return (
    <Button
      size="sm"
      disabled={pending}
      onClick={() =>
        start(async () => {
          const res = await syncContactAction(id);
          if (!res.ok) {
            toast.error(res.error);
            return;
          }
          toast.success(
            res.changed.length
              ? `Updated ${syncFieldLabels(res.changed)}`
              : "Already up to date",
          );
          router.refresh();
        })
      }
    >
      {pending ? <Loader2 className="animate-spin" aria-hidden="true" /> : <RefreshCw aria-hidden="true" />} Sync now
    </Button>
  );
}

export function InviteButton({ id }: { id: string }) {
  const router = useRouter();
  const [pending, start] = useTransition();
  return (
    <Button
      size="sm"
      variant="outline"
      disabled={pending}
      onClick={() =>
        start(async () => {
          const res = await inviteContactAction(id);
          if (!res.ok) {
            toast.error(res.error);
            return;
          }
          toast.success(`Invitation sent to ${res.email}`, {
            description: "In this demo it lands in your demo inbox - open it to follow the sign-up link.",
            action: { label: "Open inbox", onClick: () => router.push("/inbox") },
          });
        })
      }
    >
      {pending ? <Loader2 className="animate-spin" aria-hidden="true" /> : <Send aria-hidden="true" />} Send invite
    </Button>
  );
}
