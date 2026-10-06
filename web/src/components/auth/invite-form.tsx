"use client";

import { useState, useTransition } from "react";
import { AlertCircle, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { confirmInviteAction } from "@/server/actions/auth";
import { passwordValidation } from "@/lib/legacy/registration";

/** Port of `fastRegister/fastRegister.jsx` (`/user/fastRegisterConfirm`). */
export function InviteForm({ id, code }: { id: string; code: string }) {
  const [userName, setUserName] = useState("");
  const [password, setPassword] = useState("");
  const [rePassword, setRePassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [pending, start] = useTransition();

  return (
    <form
      className="space-y-4"
      onSubmit={(e) => {
        e.preventDefault();
        const msg = passwordValidation(password, rePassword);
        if (msg) return setError(msg);
        setError(null);
        start(async () => {
          const res = await confirmInviteAction({
            id,
            fastRegisterCode: code,
            userName,
            password,
            re_password: rePassword,
          });
          if (res && !res.ok) setError(res.error);
        });
      }}
    >
      <div className="space-y-1.5">
        <Label htmlFor="userName">Choose a user name</Label>
        <Input
          id="userName"
          autoComplete="username"
          autoCapitalize="none"
          value={userName}
          onChange={(e) => setUserName(e.target.value)}
          required
        />
      </div>
      <div className="space-y-1.5">
        <Label htmlFor="password">Password</Label>
        <Input
          id="password"
          type="password"
          autoComplete="new-password"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          required
        />
      </div>
      <div className="space-y-1.5">
        <Label htmlFor="rePassword">Confirm password</Label>
        <Input
          id="rePassword"
          type="password"
          autoComplete="new-password"
          value={rePassword}
          onChange={(e) => setRePassword(e.target.value)}
          required
        />
      </div>
      {error && (
        <p role="alert" className="flex items-center gap-1.5 text-sm text-destructive">
          <AlertCircle className="size-4 shrink-0" aria-hidden="true" /> {error}
        </p>
      )}
      <Button type="submit" size="lg" className="w-full" disabled={pending}>
        {pending && <Loader2 className="animate-spin" aria-hidden="true" />} Activate my account
      </Button>
    </form>
  );
}
