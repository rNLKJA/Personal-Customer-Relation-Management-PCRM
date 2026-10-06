import type { Metadata } from "next";
import Link from "next/link";
import { LinkIcon } from "lucide-react";
import { InviteForm } from "@/components/auth/invite-form";
import { DemoDataBanner } from "@/components/common/demo-data-banner";
import { Button } from "@/components/ui/button";
import { displayName, getInvite } from "@/server/users";

export const metadata: Metadata = { title: "Accept invitation" };

export default async function InvitePage({ params }: PageProps<"/invite/[id]/[code]">) {
  const { id, code } = await params;
  const invite = await getInvite(id, code);
  if (!invite) {
    return (
      <div className="animate-fade-up text-center">
        <span className="mx-auto flex size-12 items-center justify-center rounded-2xl bg-muted">
          <LinkIcon className="size-5 text-muted-foreground" aria-hidden="true" />
        </span>
        <h1 className="mt-4 text-xl font-semibold tracking-tight">This invitation has expired</h1>
        <p className="mt-2 text-sm text-muted-foreground">
          Invite links are valid for 15 minutes, like in the original app. Ask for a new one, or
          create an account yourself.
        </p>
        <Button asChild className="mt-6">
          <Link href="/signup">Create an account</Link>
        </Button>
      </div>
    );
  }
  return (
    <div className="animate-fade-up">
      <p className="text-sm font-medium text-primary">
        {invite.inviter ? `${displayName(invite.inviter)} invited you` : "You're invited"}
      </p>
      <h1 className="mt-1 text-2xl font-semibold tracking-tight">
        Hi {invite.account.firstName}! Welcome to 4399 CRM
      </h1>
      <p className="mt-1 text-sm text-muted-foreground">
        Please complete the form for registration. Your details ({invite.account.emails[0]}) are
        already filled in from your contact card.
      </p>
      <DemoDataBanner className="mt-5" />
      <div className="mt-6">
        <InviteForm id={id} code={code} />
      </div>
    </div>
  );
}
