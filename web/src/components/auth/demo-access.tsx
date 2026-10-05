import { KeyRound, Shield, Sparkles } from "lucide-react";
import { DEMO_ACCOUNTS } from "@/db/demo-accounts";
import { SubmitButton } from "@/components/common/submit-button";
import { demoLoginAction, guestLoginAction } from "@/server/actions/auth";

/** One-click demo access + the public demo credentials. */
export function DemoAccess() {
  return (
    <div className="space-y-3">
      <form action={guestLoginAction}>
        <SubmitButton variant="secondary" size="lg" className="w-full" pendingLabel="Preparing your sandbox…">
          <Sparkles aria-hidden="true" /> Try as guest
          <span className="text-muted-foreground ml-1 text-xs font-normal">private sandbox, 24 h</span>
        </SubmitButton>
      </form>
      <div className="grid grid-cols-2 gap-2">
        <form action={demoLoginAction}>
          <input type="hidden" name="account" value="demo" />
          <SubmitButton variant="outline" className="w-full" pendingLabel="Signing in…">
            <KeyRound aria-hidden="true" /> Demo user
          </SubmitButton>
        </form>
        <form action={demoLoginAction}>
          <input type="hidden" name="account" value="admin" />
          <SubmitButton variant="outline" className="w-full" pendingLabel="Signing in…">
            <Shield aria-hidden="true" /> Demo admin
          </SubmitButton>
        </form>
      </div>
      <details className="bg-muted/60 group rounded-xl px-3.5 py-2.5 text-xs">
        <summary className="text-muted-foreground cursor-pointer font-medium select-none">
          Demo credentials
        </summary>
        <dl className="mt-2 grid grid-cols-[auto_1fr] gap-x-3 gap-y-1">
          {Object.values(DEMO_ACCOUNTS).map((a) => (
            <div key={a.userName} className="contents">
              <dt className="text-muted-foreground">{a.label}</dt>
              <dd className="font-mono">
                {a.userName} / {a.password}
              </dd>
            </div>
          ))}
        </dl>
        <p className="text-muted-foreground mt-2">
          The demo user is shared with other visitors; &ldquo;Try as guest&rdquo; gives you a private copy.
        </p>
      </details>
    </div>
  );
}
