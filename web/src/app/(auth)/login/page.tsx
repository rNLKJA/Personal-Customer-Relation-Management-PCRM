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
      <p className="mt-1 text-sm text-muted-foreground">Sign in to your 4399 CRM address book.</p>
      {sp.error === "demo-unavailable" && (
        <p role="alert" className="mt-4 text-sm text-destructive">
          The demo account is not available right now - try the guest sandbox instead.
        </p>
      )}
      <div className="mt-6">
        <DemoAccess />
      </div>
      <div className="my-6 flex items-center gap-3 text-xs text-muted-foreground">
        <span className="h-px flex-1 bg-border" /> or with your account{" "}
        <span className="h-px flex-1 bg-border" />
      </div>
      <LoginForm next={next} />
      <p className="mt-6 text-center text-sm text-muted-foreground">
        New here?{" "}
        <Link href="/signup" className="font-medium text-primary hover:underline">
          Create an account
        </Link>
      </p>
    </div>
  );
}
