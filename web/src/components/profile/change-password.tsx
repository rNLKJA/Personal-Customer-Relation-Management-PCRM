"use client";

import { useState, useTransition } from "react";
import { AlertCircle, CheckCircle2, Loader2, Mail } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { InlineInbox } from "@/components/inbox/inline-inbox";
import { changePasswordAction, sendChangePasswordCodeAction } from "@/server/actions/profile";
import { passwordValidation } from "@/lib/legacy/registration";

/** Port of `person/UpdatePassword.js` (e-mail code + `/user/changePassword`). */
export function ChangePassword({ disabledReason }: { disabledReason?: string }) {
  const [sentAt, setSentAt] = useState<number | null>(null);
  const [email, setEmail] = useState("");
  const [code, setCode] = useState("");
  const [p1, setP1] = useState("");
  const [p2, setP2] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [done, setDone] = useState(false);
  const [pending, start] = useTransition();

  if (disabledReason) return <p className="text-muted-foreground text-sm">{disabledReason}</p>;
  if (done) {
    return (
      <p className="text-success flex items-center gap-2 text-sm" role="status">
        <CheckCircle2 className="size-4" aria-hidden="true" /> Password changed.
      </p>
    );
  }

  return (
    <div className="space-y-4">
      {!sentAt ? (
        <div>
          <p className="text-muted-foreground mb-3 text-sm">We&apos;ll e-mail a 6-digit code to your first address to confirm it&apos;s you.</p>
          <Button
            variant="outline"
            disabled={pending}
            onClick={() =>
              start(async () => {
                setError(null);
                const res = await sendChangePasswordCodeAction();
                if (!res.ok) return setError(res.error);
                setEmail(res.email);
                setSentAt(Date.now());
              })
            }
          >
            {pending ? <Loader2 className="animate-spin" aria-hidden="true" /> : <Mail aria-hidden="true" />} Send code
          </Button>
        </div>
      ) : (
        <form
          className="space-y-4"
          onSubmit={(e) => {
            e.preventDefault();
            const msg = passwordValidation(p1, p2);
            if (msg) return setError(msg);
            setError(null);
            start(async () => {
              const res = await changePasswordAction({ authCode: code, newPassword1: p1, newPassword2: p2 });
              if (!res.ok) return setError(res.error);
              setDone(true);
            });
          }}
        >
          <p className="text-sm">
            Code sent to <strong className="font-medium">{email}</strong>.
          </p>
          <InlineInbox kind="change-password" since={sentAt} onUseCode={setCode} />
          <div className="space-y-1.5">
            <Label htmlFor="cp-code">Code</Label>
            <Input id="cp-code" inputMode="numeric" maxLength={6} className="font-mono tracking-[0.3em]" value={code} onChange={(e) => setCode(e.target.value.replace(/\D/g, ""))} />
          </div>
          <div className="grid gap-4 sm:grid-cols-2">
            <div className="space-y-1.5">
              <Label htmlFor="cp-1">New password</Label>
              <Input id="cp-1" type="password" autoComplete="new-password" value={p1} onChange={(e) => setP1(e.target.value)} />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="cp-2">Confirm new password</Label>
              <Input id="cp-2" type="password" autoComplete="new-password" value={p2} onChange={(e) => setP2(e.target.value)} />
            </div>
          </div>
          <Button type="submit" disabled={pending || code.length !== 6}>
            {pending && <Loader2 className="animate-spin" aria-hidden="true" />} Change password
          </Button>
        </form>
      )}
      {error && (
        <p role="alert" className="text-destructive flex items-center gap-1.5 text-sm">
          <AlertCircle className="size-4 shrink-0" aria-hidden="true" /> {error}
        </p>
      )}
    </div>
  );
}
