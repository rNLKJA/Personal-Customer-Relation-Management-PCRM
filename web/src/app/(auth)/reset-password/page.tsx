import type { Metadata } from "next";
import Link from "next/link";
import { ResetForm } from "@/components/auth/reset-form";

export const metadata: Metadata = { title: "Reset password" };

export default function ResetPasswordPage() {
  return (
    <div className="animate-fade-up">
      <h1 className="text-2xl font-semibold tracking-tight">Reset your password</h1>
      <p className="text-muted-foreground mt-1 mb-6 text-sm">
        We&apos;ll e-mail a code to the first address on your account.
      </p>
      <ResetForm />
      <p className="text-muted-foreground mt-6 text-center text-sm">
        Remembered it?{" "}
        <Link href="/login" className="text-primary font-medium hover:underline">
          Back to sign in
        </Link>
      </p>
    </div>
  );
}
