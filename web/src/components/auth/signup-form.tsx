"use client";

import { useEffect, useState, useTransition } from "react";
import { AlertCircle, Check, Loader2, Mail, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { InlineInbox } from "@/components/inbox/inline-inbox";
import { checkUserNameAction, registerAction, sendSignupCodeAction } from "@/server/actions/auth";
import { passwordValidation } from "@/lib/legacy/registration";
import { EMAIL_PATTERN } from "@/lib/legacy/validation";
import { cn } from "@/lib/utils";

type NameState = { status: "idle" | "checking" } | { status: "ok" | "bad"; message: string };

/**
 * Port of the 2021 sign-up flow: request an e-mail verification code
 * (`/user/sendEmailcode`), then submit it with the user name and password
 * (`/user/signup` behind `emailCodeVerify`). Codes arrive in the demo inbox.
 */
export function SignupForm() {
  const [email, setEmail] = useState("");
  const [codeSentAt, setCodeSentAt] = useState<number | null>(null);
  const [authCode, setAuthCode] = useState("");
  const [userName, setUserName] = useState("");
  const [password, setPassword] = useState("");
  const [rePassword, setRePassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [nameState, setNameState] = useState<NameState>({ status: "idle" });
  const [sending, startSending] = useTransition();
  const [submitting, startSubmitting] = useTransition();

  // Live user-name availability (port of /user/checkUserName).
  useEffect(() => {
    const name = userName.trim();
    if (!name) return;
    const t = setTimeout(async () => {
      setNameState({ status: "checking" });
      const res = await checkUserNameAction(name);
      setNameState({ status: res.status ? "ok" : "bad", message: res.message });
    }, 350);
    return () => clearTimeout(t);
  }, [userName]);

  function sendCode() {
    setError(null);
    if (!EMAIL_PATTERN.test(email.trim())) {
      setError("Invalid email format");
      return;
    }
    startSending(async () => {
      const res = await sendSignupCodeAction(email.trim());
      if (!res.ok) setError(res.error);
      else setCodeSentAt(Date.now());
    });
  }

  function submit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    const pwError = passwordValidation(password, rePassword);
    if (pwError) {
      setError(pwError);
      return;
    }
    startSubmitting(async () => {
      const res = await registerAction({ email, authCode, userName, password, re_password: rePassword });
      if (res && !res.ok) setError(res.error);
    });
  }

  const step2 = codeSentAt !== null;

  return (
    <div className="space-y-5">
      <ol className="text-muted-foreground flex items-center gap-2 text-xs font-medium" aria-label="Steps">
        <StepPill n={1} active={!step2} done={step2} label="Verify e-mail" />
        <span className="bg-border h-px w-6" aria-hidden="true" />
        <StepPill n={2} active={step2} done={false} label="Choose a user name" />
      </ol>

      <div className="space-y-1.5">
        <Label htmlFor="email">E-mail</Label>
        <div className="flex gap-2">
          <Input
            id="email"
            type="email"
            inputMode="email"
            autoComplete="email"
            placeholder="you@example.com"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter") {
                e.preventDefault();
                sendCode();
              }
            }}
          />
          <Button type="button" variant={step2 ? "outline" : "default"} onClick={sendCode} disabled={sending} className="h-10 shrink-0">
            {sending ? <Loader2 className="animate-spin" aria-hidden="true" /> : <Mail aria-hidden="true" />}
            {step2 ? "Resend" : "Send code"}
          </Button>
        </div>
        <p className="text-muted-foreground text-xs">We send a 6-digit code, valid for 5 minutes.</p>
      </div>

      <InlineInbox kind="verification" since={codeSentAt} onUseCode={setAuthCode} />

      <form onSubmit={submit} className={cn("space-y-4 transition-opacity", !step2 && "pointer-events-none opacity-50")}>
        <fieldset disabled={!step2} className="space-y-4">
          <div className="space-y-1.5">
            <Label htmlFor="authCode">Verification code</Label>
            <Input
              id="authCode"
              inputMode="numeric"
              autoComplete="one-time-code"
              maxLength={6}
              placeholder="000000"
              className="font-mono tracking-[0.3em]"
              value={authCode}
              onChange={(e) => setAuthCode(e.target.value.replace(/\D/g, ""))}
            />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="userName">User name</Label>
            <Input
              id="userName"
              autoComplete="username"
              autoCapitalize="none"
              value={userName}
              onChange={(e) => {
                setUserName(e.target.value);
                if (!e.target.value.trim()) setNameState({ status: "idle" });
              }}
              aria-describedby="userName-status"
            />
            <p id="userName-status" className="flex min-h-4 items-center gap-1 text-xs" aria-live="polite">
              {nameState.status === "checking" && <span className="text-muted-foreground">Checking…</span>}
              {nameState.status === "ok" && (
                <span className="text-success inline-flex items-center gap-1">
                  <Check className="size-3.5" aria-hidden="true" /> {nameState.message}
                </span>
              )}
              {nameState.status === "bad" && (
                <span className="text-destructive inline-flex items-center gap-1">
                  <X className="size-3.5" aria-hidden="true" /> {nameState.message}
                </span>
              )}
            </p>
          </div>
          <div className="grid gap-4 sm:grid-cols-2">
            <div className="space-y-1.5">
              <Label htmlFor="password">Password</Label>
              <Input id="password" type="password" autoComplete="new-password" value={password} onChange={(e) => setPassword(e.target.value)} />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="rePassword">Confirm password</Label>
              <Input id="rePassword" type="password" autoComplete="new-password" value={rePassword} onChange={(e) => setRePassword(e.target.value)} />
            </div>
          </div>
          <p className="text-muted-foreground -mt-2 text-xs">At least 8 characters, with a letter and a digit.</p>
          {error && (
            <p role="alert" className="text-destructive flex items-center gap-1.5 text-sm">
              <AlertCircle className="size-4 shrink-0" aria-hidden="true" /> {error}
            </p>
          )}
          <Button type="submit" size="lg" className="w-full" disabled={submitting || nameState.status === "bad"}>
            {submitting && <Loader2 className="animate-spin" aria-hidden="true" />} Create account
          </Button>
        </fieldset>
      </form>
      {!step2 && error && (
        <p role="alert" className="text-destructive flex items-center gap-1.5 text-sm">
          <AlertCircle className="size-4 shrink-0" aria-hidden="true" /> {error}
        </p>
      )}
    </div>
  );
}

function StepPill({ n, label, active, done }: { n: number; label: string; active: boolean; done: boolean }) {
  return (
    <li className={cn("flex items-center gap-1.5", active && "text-foreground")} aria-current={active ? "step" : undefined}>
      <span
        className={cn(
          "flex size-5 items-center justify-center rounded-full border text-[11px]",
          active && "border-primary bg-primary text-primary-foreground",
          done && "border-success bg-success text-white",
        )}
      >
        {done ? <Check className="size-3" aria-hidden="true" /> : n}
      </span>
      {label}
    </li>
  );
}
