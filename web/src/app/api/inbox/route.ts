import { NextResponse, type NextRequest } from "next/server";
import { listInbox, unreadCount } from "@/server/mail";
import { getBrowserKey, getCurrentUser } from "@/server/session";

export const dynamic = "force-dynamic";

/**
 * Demo inbox feed, polled by the client (SWR). Returns the e-mails visible to
 * the signed-in user and/or this browser (pre-login sign-up / reset codes).
 */
export async function GET(req: NextRequest) {
  const user = await getCurrentUser();
  const browserKey = await getBrowserKey(false);
  if (req.nextUrl.searchParams.get("count")) {
    return NextResponse.json({ unread: await unreadCount(user, browserKey) });
  }
  const messages = await listInbox(user, browserKey, 50);
  return NextResponse.json(
    {
      messages: messages.map((m) => ({
        id: m.id,
        to: m.toEmail,
        subject: m.subject,
        kind: m.kind,
        html: m.html,
        code: m.code,
        actionPath: m.actionPath,
        createdAt: m.createdAt.toISOString(),
        read: m.readAt !== null,
      })),
    },
    { headers: { "Cache-Control": "no-store" } },
  );
}
