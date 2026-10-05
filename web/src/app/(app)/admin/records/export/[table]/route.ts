import { NextResponse } from "next/server";
import { exportTableCsv, isTableName } from "@/server/admin";
import { getCurrentUser } from "@/server/session";

/** CSV export of one table (admin only; secrets redacted). */
export async function GET(_req: Request, ctx: RouteContext<"/admin/records/export/[table]">) {
  const user = await getCurrentUser();
  if (!user || user.role !== "admin") return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  const { table } = await ctx.params;
  if (!isTableName(table)) return NextResponse.json({ error: "Unknown table" }, { status: 404 });
  const csv = await exportTableCsv(table);
  const stamp = new Date().toISOString().slice(0, 10);
  return new NextResponse(csv, {
    headers: {
      "Content-Type": "text/csv; charset=utf-8",
      "Content-Disposition": `attachment; filename="4399crm-${table}-${stamp}.csv"`,
      "Cache-Control": "no-store",
    },
  });
}
