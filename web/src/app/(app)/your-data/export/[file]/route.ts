import { NextResponse } from "next/server";
import { getCurrentUser } from "@/server/session";
import { logActivity } from "@/server/activity";
import { exportFile, isExportFile } from "@/server/your-data";

/** Download everything stored about the signed-in account (JSON or one CSV per table). */
export async function GET(_req: Request, ctx: RouteContext<"/your-data/export/[file]">) {
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ error: "Sign in first" }, { status: 401 });
  const { file } = await ctx.params;
  if (!isExportFile(file)) return NextResponse.json({ error: "Unknown file" }, { status: 404 });
  const { body, type } = await exportFile(user, file);
  await logActivity(user.id, "export", "data", null, { file });
  const stamp = new Date().toISOString().slice(0, 10);
  return new NextResponse(body, {
    headers: {
      "Content-Type": type,
      "Content-Disposition": `attachment; filename="4399crm-${user.userName}-${stamp}-${file}"`,
      "Cache-Control": "no-store",
    },
  });
}
