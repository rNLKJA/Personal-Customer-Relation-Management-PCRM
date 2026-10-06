"use client";

import { useState, useTransition } from "react";
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
import { Input } from "@/components/ui/input";
import { deleteAccountAction } from "@/server/actions/account";

/** Danger zone: hard-delete the account after typing the user name. */
export function DeleteAccountButton({
  userName,
  counts,
  disabledReason,
}: {
  userName: string;
  counts: { contacts: number; meetings: number; activity: number; aiCalls: number };
  disabledReason?: string;
}) {
  const [typed, setTyped] = useState("");
  const [pending, start] = useTransition();
  const matches = typed.trim().toLowerCase() === userName.toLowerCase();

  if (disabledReason) {
    return (
      <div className="space-y-2">
        <Button variant="destructive" disabled>
          <Trash2 /> Delete my account
        </Button>
        <p className="text-xs text-muted-foreground">{disabledReason}</p>
      </div>
    );
  }

  return (
    <AlertDialog onOpenChange={(open) => !open && setTyped("")}>
      <AlertDialogTrigger asChild>
        <Button variant="destructive">
          <Trash2 /> Delete my account
        </Button>
      </AlertDialogTrigger>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>Delete @{userName} and all its data?</AlertDialogTitle>
          <AlertDialogDescription>
            This permanently deletes your account, {counts.contacts} contacts, {counts.meetings}{" "}
            meetings, {counts.activity} activity-log entries, {counts.aiCalls} AI-log entries and
            your demo-inbox e-mails. It cannot be undone - download your data first if you want a
            copy.
          </AlertDialogDescription>
        </AlertDialogHeader>
        <div className="space-y-2">
          <label htmlFor="confirm-user" className="text-sm font-medium">
            Type <span className="font-mono">{userName}</span> to confirm
          </label>
          <Input
            id="confirm-user"
            value={typed}
            onChange={(e) => setTyped(e.target.value)}
            autoComplete="off"
            spellCheck={false}
          />
        </div>
        <AlertDialogFooter>
          <AlertDialogCancel>Keep my account</AlertDialogCancel>
          <AlertDialogAction
            variant="destructive"
            disabled={!matches || pending}
            onClick={(e) => {
              e.preventDefault();
              start(async () => {
                const res = await deleteAccountAction(typed);
                // On success the action redirects to /goodbye.
                if (res && !res.ok) toast.error(res.error);
              });
            }}
          >
            {pending && <Loader2 className="animate-spin" aria-hidden="true" />} Delete everything
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}
