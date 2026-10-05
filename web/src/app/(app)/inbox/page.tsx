import type { Metadata } from "next";
import { PageHeader } from "@/components/layout/page-header";
import { InboxView } from "@/components/inbox/inbox-view";

export const metadata: Metadata = { title: "Demo inbox" };

export default function InboxPage() {
  return (
    <div className="animate-fade-up">
      <PageHeader
        title="Demo inbox"
        description="The 2021 app e-mailed codes and invitations through Gmail. Here nothing leaves the site - every e-mail lands in this inbox instead."
      />
      <InboxView />
    </div>
  );
}
