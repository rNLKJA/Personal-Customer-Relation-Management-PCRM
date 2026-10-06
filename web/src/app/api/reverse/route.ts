import { NextResponse, type NextRequest } from "next/server";
import { reverseGeocode } from "@/server/geocode";
import { getCurrentUser } from "@/server/session";
import { isValidLatLng } from "@/lib/geo";
import { createRateLimiter } from "@/lib/rate-limit";

const allow = createRateLimiter(40, 60_000);

/** Reverse geocoding for a dropped pin (Photon -> Nominatim -> nearest suburb). */
export async function GET(req: NextRequest) {
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ error: "Sign in to look up places" }, { status: 401 });
  if (!allow(user.id))
    return NextResponse.json({ error: "Too many lookups - slow down a little" }, { status: 429 });
  const point = {
    lat: Number(req.nextUrl.searchParams.get("lat")),
    lng: Number(req.nextUrl.searchParams.get("lng")),
  };
  if (!isValidLatLng(point))
    return NextResponse.json({ error: "Invalid coordinates" }, { status: 400 });
  return NextResponse.json(await reverseGeocode(point));
}
