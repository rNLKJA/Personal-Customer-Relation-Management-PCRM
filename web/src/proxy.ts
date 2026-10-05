import { NextResponse, type NextRequest } from "next/server";

/**
 * Optimistic auth redirect: visitors without a session cookie who open an app
 * page (e.g. by scanning a contact QR code) are sent to /login with a `next`
 * parameter. The real check (signature, expiry, account state) happens in the
 * (app) layout via `requireUser()`.
 */
export function proxy(request: NextRequest) {
  if (request.cookies.has("pcrm_session")) return NextResponse.next();
  const url = request.nextUrl.clone();
  const next = request.nextUrl.pathname + request.nextUrl.search;
  url.pathname = "/login";
  url.search = "";
  url.searchParams.set("next", next);
  return NextResponse.redirect(url);
}

export const config = {
  matcher: [
    "/home/:path*",
    "/contacts/:path*",
    "/records/:path*",
    "/map/:path*",
    "/calendar/:path*",
    "/profile/:path*",
    "/inbox/:path*",
    "/admin/:path*",
  ],
};
