"use client";

import Link from "next/link";
import { useState, useTransition } from "react";
import { AlertCircle, CheckCircle2, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { InlineInbox } from "@/components/inbox/inline-inbox";
import {
  resetPasswordAction,
  sendResetCodeAction,
  verifyResetCodeAction,
} from "@/server/actions/auth";
import { passwordValidation } from "@/lib/legacy/registration";

type Step = "user" | "code" | "password" | "done";

/**
 * Port of `restPassword/Reset.js`: user name -> code e-mailed to the account's
 * first address (`/user/sendResetCode`) -> verify (`/user/codeValidation`) ->
 * new password (`/user/resetPassword`).
 */
export function ResetForm() {
  const [step, setStep] = useState<Step>("user");
  const [userName, setUserName] = useState("");
  const [maskedEmail, setMaskedEmail] = useState("");
  const [delivered, setDelivered] = useState(true);
  const [sentAt, setSentAt] = useState<number | null>(null);
  const [code, setCode] = useState("");
  const [password, setPassword] = useState("");
  const [rePassword, setRePassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [pending, start] = useTransition();

  const run = (fn: () => Promise<void>) => {
    setError(null);
    start(fn);
  };

  if (step === "done") {
    return (
      <div className="rounded-xl border bg-card p-5 text-center shadow-(--shadow-soft)">
        <CheckCircle2 className="mx-auto size-8 text-success" aria-hidden="true" />
        <p className="mt-3 font-medium">Your password has been reset.</p>
        <Button asChild className="mt-4 w-full">
          <Link href="/login">Sign in</Link>
        </Button>
      </div>
    );
  }

  return (
    <div className="space-y-5">
      {step === "user" && (
        <form
          className="space-y-4"
          onSubmit={(e) => {
            e.preventDefault();
            run(async () => {
              const res = await sendResetCodeAction(userName);
              if (!res.ok) return setError(res.error);
              setMaskedEmail(res.email);
              setDelivered(res.delivered);
              setSentAt(Date.now());
              setStep("code");
            });
          }}
        >
          <div className="space-y-1.5">
            <Label htmlFor="userName">User name</Label>
            <Input
              id="userName"
              autoComplete="username"
              autoCapitalize="none"
              value={userName}
              onChange={(e) => setUserName(e.target.value)}
              required
            />
          </div>
          <Button type="submit" size="lg" className="w-full" disabled={pending || !userName.trim()}>
            {pending && <Loader2 className="animate-spin" aria-hidden="true" />} Send reset code
          </Button>
        </form>
      )}

      {step === "code" && (
        <form
          className="space-y-4"
          onSubmit={(e) => {
            e.preventDefault();
            run(async () => {
              const res = await verifyResetCodeAction(userName, code);
              if (!res.ok) return setError(res.error);
              setStep("password");
            });
          }}
        >
          <p className="text-sm">
            We sent a 6-digit code to <strong className="font-medium">{maskedEmail}</strong>.
          </p>
          {delivered ? (
            <InlineInbox kind="password-reset" since={sentAt} onUseCode={setCode} />
          ) : (
            <p className="rounded-xl bg-muted px-3.5 py-3 text-sm text-muted-foreground">
              In this demo, reset codes only appear in the demo inbox of a browser that has signed
              in to this account before - so nobody can take over someone else&apos;s account.
            </p>
          )}
          <div className="space-y-1.5">
            <Label htmlFor="code">Reset code</Label>
            <Input
              id="code"
              inputMode="numeric"
              autoComplete="one-time-code"
              maxLength={6}
              className="font-mono tracking-[0.3em]"
              value={code}
              onChange={(e) => setCode(e.target.value.replace(/\D/g, ""))}
            />
          </div>
          <Button
            type="submit"
            size="lg"
            className="w-full"
            disabled={pending || code.length !== 6}
          >
            {pending && <Loader2 className="animate-spin" aria-hidden="true" />} Verify code
          </Button>
          <button
            type="button"
            className="w-full text-sm text-muted-foreground hover:text-foreground"
            onClick={() => setStep("user")}
          >
            Use a different user name
          </button>
        </form>
      )}

      {step === "password" && (
        <form
          className="space-y-4"
          onSubmit={(e) => {
            e.preventDefault();
            const msg = passwordValidation(password, rePassword);
            if (msg) return setError(msg);
            run(async () => {
              const res = await resetPasswordAction(password, rePassword);
              if (!res.ok) return setError(res.error);
              setStep("done");
            });
          }}
        >
          <div className="space-y-1.5">
            <Label htmlFor="password">New password</Label>
            <Input
              id="password"
              type="password"
              autoComplete="new-password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
            />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="rePassword">Confirm new password</Label>
            <Input
              id="rePassword"
              type="password"
              autoComplete="new-password"
              value={rePassword}
              onChange={(e) => setRePassword(e.target.value)}
            />
          </div>
          <Button type="submit" size="lg" className="w-full" disabled={pending}>
            {pending && <Loader2 className="animate-spin" aria-hidden="true" />} Reset password
          </Button>
        </form>
      )}

      {error && (
        <p role="alert" className="flex items-center gap-1.5 text-sm text-destructive">
          <AlertCircle className="size-4 shrink-0" aria-hidden="true" /> {error}
        </p>
      )}
    </div>
  );
}
