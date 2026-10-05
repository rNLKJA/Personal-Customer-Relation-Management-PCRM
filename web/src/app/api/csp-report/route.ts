import { NextResponse } from "next/server";
import { createRateLimiter } from "@/lib/rate-limit";

/**
 * Receives Content-Security-Policy violation reports (the policy is
 * report-only; see next.config.ts) and writes one line per report to the
 * server log: the directive and the blocked origin only. The page URL is not
 * logged, because its query string can hold a search the visitor typed.
 */

const allow = createRateLimiter(60, 60_000);

function origin(uri: unknown): string {
  if (typeof uri !== "string") return "?";
  try {
    return new URL(uri).origin;
  } catch {
    return uri.slice(0, 40); // "inline", "eval", "data", "blob"
  }
}

export async function POST(req: Request) {
  if (!allow("csp")) return new NextResponse(null, { status: 204 });
  const text = (await req.text()).slice(0, 8_000);
  try {
    const body = JSON.parse(text) as { "csp-report"?: Record<string, unknown> };
    const r = body["csp-report"] ?? {};
    console.warn(
      "[pcrm] CSP report-only violation",
      String(r["effective-directive"] ?? r["violated-directive"] ?? "?").slice(0, 60),
      origin(r["blocked-uri"]),
    );
  } catch {
    // Not a CSP report; ignore it.
  }
  return new NextResponse(null, { status: 204 });
}
