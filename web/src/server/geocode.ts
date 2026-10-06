import "server-only";
import {
  formatCoords,
  MELBOURNE_CBD,
  nearestPlace,
  searchPlaces,
  type GeocodeResult,
  type LatLng,
} from "@/lib/geo";
import { PLACES } from "@/lib/places";
import {
  nominatimLabel,
  photonToResults,
  type NominatimReverse,
  type PhotonFeature,
} from "@/lib/photon";

/**
 * Server-side geocoding (replaces the Google Places / Geocoding APIs):
 * Photon first (free, no key), Nominatim as a polite fallback for reverse
 * geocoding, and the bundled Melbourne gazetteer when both are unreachable.
 * Responses are cached in memory and via Next's fetch cache.
 */

const USER_AGENT =
  "4399-CRM-revival/1.0 (+https://github.com/rNLKJA/Personal-Customer-Relation-Management-PCRM)";
const TIMEOUT_MS = 4500;
/** After a Photon timeout/error, skip it for a minute (simple circuit breaker). */
const PHOTON_COOLDOWN_MS = 60_000;
let photonDownUntil = 0;
const photonAvailable = () => Date.now() >= photonDownUntil;
const markPhotonDown = () => {
  photonDownUntil = Date.now() + PHOTON_COOLDOWN_MS;
};
const CACHE_LIMIT = 500;
const cache = new Map<string, GeocodeResult[]>();

function remember(key: string, value: GeocodeResult[]) {
  if (cache.size >= CACHE_LIMIT) cache.delete(cache.keys().next().value as string);
  cache.set(key, value);
  return value;
}

async function getJson<T>(url: string): Promise<T> {
  const res = await fetch(url, {
    headers: { "User-Agent": USER_AGENT, Accept: "application/json" },
    signal: AbortSignal.timeout(TIMEOUT_MS),
    next: { revalidate: 60 * 60 * 24 },
  });
  if (!res.ok) throw new Error(`HTTP ${res.status} from ${new URL(url).host}`);
  return (await res.json()) as T;
}

function localSearch(q: string, bias: LatLng): GeocodeResult[] {
  return searchPlaces(PLACES, q, 6, bias).map((p) => ({
    lat: p.lat,
    lng: p.lng,
    name: p.name,
    label: p.label,
    source: "local" as const,
  }));
}

export async function geocodeSearch(
  q: string,
  bias: LatLng = MELBOURNE_CBD,
): Promise<{ results: GeocodeResult[]; fallback: boolean }> {
  const query = q.trim().slice(0, 120);
  if (query.length < 2) return { results: [], fallback: false };
  const key = `s:${query.toLowerCase()}:${bias.lat.toFixed(2)},${bias.lng.toFixed(2)}`;
  const hit = cache.get(key);
  if (hit) return { results: hit, fallback: false };
  if (!photonAvailable()) return { results: localSearch(query, bias), fallback: true };
  try {
    const url = new URL("https://photon.komoot.io/api/");
    url.searchParams.set("q", query);
    url.searchParams.set("limit", "6");
    url.searchParams.set("lang", "en");
    url.searchParams.set("lat", String(bias.lat));
    url.searchParams.set("lon", String(bias.lng));
    const data = await getJson<{ features: PhotonFeature[] }>(url.toString());
    return { results: remember(key, photonToResults(data.features ?? [])), fallback: false };
  } catch {
    markPhotonDown();
    return { results: localSearch(query, bias), fallback: true };
  }
}

export async function reverseGeocode(
  point: LatLng,
): Promise<{ result: GeocodeResult; fallback: boolean }> {
  const key = `r:${point.lat.toFixed(5)},${point.lng.toFixed(5)}`;
  const hit = cache.get(key);
  if (hit?.[0]) return { result: hit[0], fallback: false };
  if (photonAvailable())
    try {
      const url = new URL("https://photon.komoot.io/reverse");
      url.searchParams.set("lat", String(point.lat));
      url.searchParams.set("lon", String(point.lng));
      url.searchParams.set("lang", "en");
      const data = await getJson<{ features: PhotonFeature[] }>(url.toString());
      const [first] = photonToResults(data.features ?? []);
      if (first) return { result: remember(key, [{ ...first, ...point }])[0], fallback: false };
    } catch {
      markPhotonDown(); // fall through to Nominatim
    }
  try {
    const url = new URL("https://nominatim.openstreetmap.org/reverse");
    url.searchParams.set("format", "jsonv2");
    url.searchParams.set("lat", String(point.lat));
    url.searchParams.set("lon", String(point.lng));
    url.searchParams.set("zoom", "18");
    url.searchParams.set("addressdetails", "1");
    const data = await getJson<NominatimReverse>(url.toString());
    const formatted = nominatimLabel(data);
    if (formatted) {
      const result: GeocodeResult = { ...point, ...formatted, source: "nominatim" };
      return { result: remember(key, [result])[0], fallback: false };
    }
  } catch {
    // fall through to the local gazetteer
  }
  const near = nearestPlace(PLACES, point, ["suburb"]);
  const label = near && near.km < 25 ? `Near ${near.place.label}` : formatCoords(point, 4);
  return {
    result: { ...point, name: near?.place.name ?? "Dropped pin", label, source: "local" },
    fallback: true,
  };
}
