/**
 * Local, dependency-free geo helpers. The original app delegated everything to
 * Google Maps; the revival computes distances locally and keeps a bundled
 * gazetteer (see scripts/build_geodata.py) as an offline fallback for search and
 * reverse geocoding.
 */

export interface LatLng {
  lat: number;
  lng: number;
}

export interface Place extends LatLng {
  name: string;
  label: string;
  kind: string;
}

export interface GeocodeResult extends LatLng {
  label: string;
  name: string;
  source: "photon" | "nominatim" | "local" | "coordinates";
}

export const MELBOURNE_CBD: LatLng = { lat: -37.8136, lng: 144.9631 };

const EARTH_RADIUS_KM = 6371.0088;
const toRad = (deg: number) => (deg * Math.PI) / 180;

/** Great-circle distance in kilometres (haversine formula). */
export function haversineKm(a: LatLng, b: LatLng): number {
  const dLat = toRad(b.lat - a.lat);
  const dLng = toRad(b.lng - a.lng);
  const h =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(toRad(a.lat)) * Math.cos(toRad(b.lat)) * Math.sin(dLng / 2) ** 2;
  return 2 * EARTH_RADIUS_KM * Math.asin(Math.min(1, Math.sqrt(h)));
}

export function formatDistance(km: number): string {
  if (!Number.isFinite(km)) return "";
  if (km < 1) return `${Math.round(km * 1000)} m`;
  if (km < 10) return `${km.toFixed(1)} km`;
  return `${Math.round(km)} km`;
}

export function isValidLatLng(p: Partial<LatLng> | null | undefined): p is LatLng {
  return (
    !!p &&
    typeof p.lat === "number" &&
    typeof p.lng === "number" &&
    Number.isFinite(p.lat) &&
    Number.isFinite(p.lng) &&
    Math.abs(p.lat) <= 90 &&
    Math.abs(p.lng) <= 180
  );
}

export function formatCoords(p: LatLng, digits = 5): string {
  const ns = p.lat < 0 ? "S" : "N";
  const ew = p.lng < 0 ? "W" : "E";
  return `${Math.abs(p.lat).toFixed(digits)}°${ns}, ${Math.abs(p.lng).toFixed(digits)}°${ew}`;
}

/** Nearest gazetteer entry, optionally restricted to some kinds (e.g. suburbs). */
export function nearestPlace(
  places: readonly Place[],
  point: LatLng,
  kinds?: readonly string[],
): { place: Place; km: number } | null {
  let best: { place: Place; km: number } | null = null;
  for (const place of places) {
    if (kinds && !kinds.includes(place.kind)) continue;
    const km = haversineKm(point, place);
    if (!best || km < best.km) best = { place, km };
  }
  return best;
}

const normalise = (s: string) =>
  s
    .toLowerCase()
    .normalize("NFKD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-z0-9 ]+/g, " ")
    .trim();

/**
 * Tiny offline place search: every query token must prefix a token of the
 * place's name or label. Ranked by match quality, then distance to `bias`.
 */
export function searchPlaces(
  places: readonly Place[],
  query: string,
  limit = 5,
  bias: LatLng = MELBOURNE_CBD,
): Place[] {
  const q = normalise(query);
  if (!q) return [];
  const qTokens = q.split(/\s+/);
  const scored: { place: Place; score: number; km: number }[] = [];
  for (const place of places) {
    const name = normalise(place.name);
    const hay = `${name} ${normalise(place.label)}`;
    const tokens = hay.split(/\s+/);
    const all = qTokens.every((t) => tokens.some((tok) => tok.startsWith(t)));
    if (!all) continue;
    let score = 0;
    if (name === q) score += 100;
    else if (name.startsWith(q)) score += 50;
    if (place.kind === "suburb") score += 5;
    scored.push({ place, score, km: haversineKm(bias, place) });
  }
  scored.sort((a, b) => b.score - a.score || a.km - b.km);
  return scored.slice(0, limit).map((s) => s.place);
}

/** Bounding box [[minLng, minLat], [maxLng, maxLat]] for a set of points. */
export function boundsOf(points: readonly LatLng[]): [[number, number], [number, number]] | null {
  if (points.length === 0) return null;
  let minLat = Infinity,
    minLng = Infinity,
    maxLat = -Infinity,
    maxLng = -Infinity;
  for (const p of points) {
    minLat = Math.min(minLat, p.lat);
    maxLat = Math.max(maxLat, p.lat);
    minLng = Math.min(minLng, p.lng);
    maxLng = Math.max(maxLng, p.lng);
  }
  return [
    [minLng, minLat],
    [maxLng, maxLat],
  ];
}

/** Web Mercator "world pixel" coordinates at `zoom` (512 px tiles, as in MapLibre). */
export function projectToPixels(p: LatLng, zoom: number): { x: number; y: number } {
  const scale = 512 * 2 ** zoom;
  const lat = Math.max(-85.0511, Math.min(85.0511, p.lat));
  const sin = Math.sin(toRad(lat));
  return {
    x: ((p.lng + 180) / 360) * scale,
    y: (0.5 - Math.log((1 + sin) / (1 - sin)) / (4 * Math.PI)) * scale,
  };
}

export interface PointCluster<T> extends LatLng {
  items: T[];
}

/**
 * Screen-space clustering for map pins. A greedy pass puts each point into the
 * first cluster whose seed lies within `radiusPx` on screen at `zoom`; then
 * clusters whose centroids still sit within `radiusPx` of each other are merged
 * until none overlap. Positions are the members' centroid. Quadratic, which is
 * fine for an address book's worth of meetings.
 */
export function clusterPoints<T>(
  items: readonly T[],
  pointOf: (item: T) => LatLng,
  zoom: number,
  radiusPx = 40,
): PointCluster<T>[] {
  type Group = { x: number; y: number; items: T[]; px: { x: number; y: number }[] };
  const groups: Group[] = [];
  for (const item of items) {
    const p = projectToPixels(pointOf(item), zoom);
    const hit = groups.find((g) => Math.hypot(g.x - p.x, g.y - p.y) <= radiusPx);
    if (hit) {
      hit.items.push(item);
      hit.px.push(p);
    } else groups.push({ x: p.x, y: p.y, items: [item], px: [p] });
  }
  const centre = (g: Group) => {
    g.x = g.px.reduce((sum, p) => sum + p.x, 0) / g.px.length;
    g.y = g.px.reduce((sum, p) => sum + p.y, 0) / g.px.length;
  };
  groups.forEach(centre);
  for (let merged = true; merged;) {
    merged = false;
    outer: for (let i = 0; i < groups.length; i++) {
      for (let j = i + 1; j < groups.length; j++) {
        if (Math.hypot(groups[i].x - groups[j].x, groups[i].y - groups[j].y) <= radiusPx) {
          groups[i].items.push(...groups[j].items);
          groups[i].px.push(...groups[j].px);
          centre(groups[i]);
          groups.splice(j, 1);
          merged = true;
          break outer;
        }
      }
    }
  }
  return groups.map((g) => {
    const pts = g.items.map(pointOf);
    return {
      items: g.items,
      lat: pts.reduce((sum, p) => sum + p.lat, 0) / pts.length,
      lng: pts.reduce((sum, p) => sum + p.lng, 0) / pts.length,
    };
  });
}

/** True when every point would still overlap on screen at `zoom` (e.g. the same café). */
export function overlapAtZoom(points: readonly LatLng[], zoom: number, radiusPx = 40): boolean {
  const b = boundsOf(points);
  if (!b) return false;
  const a = projectToPixels({ lng: b[0][0], lat: b[0][1] }, zoom);
  const c = projectToPixels({ lng: b[1][0], lat: b[1][1] }, zoom);
  return Math.hypot(a.x - c.x, a.y - c.y) <= radiusPx;
}
