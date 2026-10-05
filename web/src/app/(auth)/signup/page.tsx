import type { Metadata } from "next";
import Link from "next/link";
import { redirect } from "next/navigation";
import { SignupForm } from "@/components/auth/signup-form";
import { DemoDataBanner } from "@/components/common/demo-data-banner";
import { getCurrentUser } from "@/server/session";

export const metadata: Metadata = { title: "Create an account" };

export default async function SignupPage() {
  if (await getCurrentUser()) redirect("/home");
  return (
    <div className="animate-fade-up">
      <h1 className="text-2xl font-semibold tracking-tight">Create your account</h1>
      <p className="text-muted-foreground mt-1 text-sm">
        Verify an e-mail address, pick a user name, and you&apos;re in.
      </p>
      <DemoDataBanner className="mt-5" />
      <div className="mt-6">
        <SignupForm />
      </div>
      <p className="text-muted-foreground mt-6 text-center text-sm">
        Already registered?{" "}
        <Link href="/login" className="text-primary font-medium hover:underline">
          Sign in
        </Link>
      </p>
    </div>
  );
}
