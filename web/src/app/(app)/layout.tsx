import { AppShell } from "@/components/layout/app-shell";
import { DemoNotices } from "@/components/layout/notices";
import { getStorageMode } from "@/db/client";
import { unreadCount } from "@/server/mail";
import { getBrowserKey, requireUser } from "@/server/session";

export default async function AppLayout({ children }: LayoutProps<"/">) {
  const user = await requireUser();
  const unread = await unreadCount(user, await getBrowserKey(false));
  return (
    <AppShell
      user={{
        userName: user.userName,
        firstName: user.firstName,
        lastName: user.lastName,
        portrait: user.portrait,
        role: user.role,
      }}
      unread={unread}
      notice={
        <DemoNotices
          ephemeral={getStorageMode() === "ephemeral"}
          guestExpiresAt={user.expiresAt && !user.isDemo ? user.expiresAt : null}
        />
      }
    >
      {children}
    </AppShell>
  );
}
