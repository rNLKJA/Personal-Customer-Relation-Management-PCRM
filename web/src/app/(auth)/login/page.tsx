import type { Metadata } from "next";
import Link from "next/link";
import { redirect } from "next/navigation";
import { DemoAccess } from "@/components/auth/demo-access";
import { LoginForm } from "@/components/auth/login-form";
import { getCurrentUser } from "@/server/session";

export const metadata: Metadata = { title: "Sign in" };

export default async function LoginPage({ searchParams }: PageProps<"/login">) {
  const sp = await searchParams;
  const next = typeof sp.next === "string" ? sp.next : undefined;
  if (await getCurrentUser()) redirect(next && next.startsWith("/") ? next : "/home");
  return (
    <div className="animate-fade-up">
      <h1 className="text-2xl font-semibold tracking-tight">Welcome back</h1>
      <p className="text-muted-foreground mt-1 text-sm">Sign in to your 4399 CRM address book.</p>
      {sp.error === "demo-unavailable" && (
        <p role="alert" className="text-destructive mt-4 text-sm">
          The demo account is not available right now - try the guest sandbox instead.
        </p>
      )}
      <div className="mt-6">
        <DemoAccess />
      </div>
      <div className="text-muted-foreground my-6 flex items-center gap-3 text-xs">
        <span className="bg-border h-px flex-1" /> or with your account <span className="bg-border h-px flex-1" />
      </div>
      <LoginForm next={next} />
      <p className="text-muted-foreground mt-6 text-center text-sm">
        New here?{" "}
        <Link href="/signup" className="text-primary font-medium hover:underline">
          Create an account
        </Link>
      </p>
    </div>
  );
}
