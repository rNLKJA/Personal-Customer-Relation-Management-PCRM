import type { Metadata } from "next";
import Link from "next/link";
import { BookOpenText, FolderLock, History, Inbox, LogOut, QrCode, Sparkles } from "lucide-react";
import { Button } from "@/components/ui/button";
import { PageHeader } from "@/components/layout/page-header";
import { ThemeToggle } from "@/components/layout/theme-toggle";
import { SubmitButton } from "@/components/common/submit-button";
import { ProfileForm } from "@/components/profile/profile-form";
import { ChangePassword } from "@/components/profile/change-password";
import { AiSettingsDialog } from "@/components/ai/ai-settings-dialog";
import { SignOutForm } from "@/components/auth/sign-out-form";
import { requireUser } from "@/server/session";
import { isSharedDemo } from "@/server/users";
import { myQrCode } from "@/server/qr";
import { formatDate, formatRelative } from "@/lib/time";

export const metadata: Metadata = { title: "Profile" };

export default async function ProfilePage() {
  const user = await requireUser();
  const { svg } = await myQrCode(user.userName);
  const guest = Boolean(user.expiresAt && !user.isDemo);

  return (
    <div className="mx-auto max-w-4xl animate-fade-up">
      <PageHeader
        title="Profile"
        description={
          <>
            @{user.userName} · member since {formatDate(user.createdAt)}
            {guest && user.expiresAt
              ? ` · guest sandbox deleted ${formatRelative(user.expiresAt)}`
              : ""}
          </>
        }
      />
      <div className="grid grid-cols-1 gap-6 lg:grid-cols-[minmax(0,1fr)_300px]">
        <div className="min-w-0 space-y-6">
          <Card title="Personal information" description="What other people see when they add you.">
            <ProfileForm
              userName={user.userName}
              portrait={user.portrait}
              initial={{
                firstName: user.firstName ?? "",
                lastName: user.lastName ?? "",
                occupation: user.occupation ?? "",
                statusMessage: user.statusMessage ?? "",
                phones: user.phones.length ? user.phones : [""],
                emails: user.emails.length ? user.emails : [""],
              }}
            />
          </Card>
          <Card
            title="Password"
            description="Changing your password needs a code from your e-mail."
          >
            <ChangePassword
              disabledReason={
                isSharedDemo(user)
                  ? "The shared demo accounts keep their published password, so changing it is disabled here."
                  : undefined
              }
            />
          </Card>
        </div>
        <div className="space-y-6">
          <Card title="My QR code">
            <div
              className="mx-auto w-40 rounded-xl bg-white p-3"
              role="img"
              aria-label={`QR code for @${user.userName}`}
              dangerouslySetInnerHTML={{ __html: svg }}
            />
            <Button asChild variant="outline" size="sm" className="mt-4 w-full">
              <Link href="/contacts/add?tab=code">
                <QrCode /> Show full screen
              </Link>
            </Button>
          </Card>
          <Card title="Privacy & AI">
            <div className="space-y-2">
              <Button asChild variant="outline" className="w-full justify-start">
                <Link href="/your-data">
                  <FolderLock /> Your data: export or delete
                </Link>
              </Button>
              <Button asChild variant="outline" className="w-full justify-start">
                <Link href="/activity">
                  <History /> Activity log
                </Link>
              </Button>
              <Button asChild variant="outline" className="w-full justify-start">
                <Link href="/ai-log">
                  <Sparkles /> AI log
                </Link>
              </Button>
              <div className="flex items-center justify-between gap-2 pt-1">
                <AiSettingsDialog />
                <Button asChild variant="ghost" size="sm">
                  <Link href="/methods">
                    <BookOpenText /> Methods
                  </Link>
                </Button>
              </div>
            </div>
          </Card>
          <Card title="Appearance">
            <div className="flex items-center justify-between">
              <span className="text-sm text-muted-foreground">Theme</span>
              <ThemeToggle />
            </div>
          </Card>
          <Card title="Account">
            <div className="space-y-2">
              <Button asChild variant="outline" className="w-full justify-start">
                <Link href="/inbox">
                  <Inbox /> Demo inbox
                </Link>
              </Button>
              <SignOutForm>
                <SubmitButton
                  variant="ghost"
                  className="w-full justify-start text-destructive"
                  pendingLabel="Signing out…"
                >
                  <LogOut /> Sign out
                </SubmitButton>
              </SignOutForm>
            </div>
          </Card>
        </div>
      </div>
    </div>
  );
}

function Card({
  title,
  description,
  children,
}: {
  title: string;
  description?: string;
  children: React.ReactNode;
}) {
  return (
    <section className="rounded-2xl border bg-card p-5 shadow-(--shadow-soft) sm:p-6">
      <h2 className="text-base font-semibold tracking-tight">{title}</h2>
      {description && <p className="mt-0.5 text-sm text-muted-foreground">{description}</p>}
      <div className="mt-4">{children}</div>
    </section>
  );
}
