import { NextResponse, type NextRequest } from "next/server";
import { geocodeSearch } from "@/server/geocode";
import { getCurrentUser } from "@/server/session";
import { MELBOURNE_CBD, isValidLatLng } from "@/lib/geo";
import { createRateLimiter } from "@/lib/rate-limit";

const allow = createRateLimiter(40, 60_000);

/** Place autocomplete for the meeting location picker (Photon, with local fallback). */
export async function GET(req: NextRequest) {
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ error: "Sign in to search places" }, { status: 401 });
  if (!allow(user.id))
    return NextResponse.json({ error: "Too many searches - slow down a little" }, { status: 429 });
  const sp = req.nextUrl.searchParams;
  const q = sp.get("q") ?? "";
  const bias = { lat: Number(sp.get("lat")), lng: Number(sp.get("lng")) };
  const { results, fallback } = await geocodeSearch(q, isValidLatLng(bias) ? bias : MELBOURNE_CBD);
  return NextResponse.json({ results, fallback });
}
