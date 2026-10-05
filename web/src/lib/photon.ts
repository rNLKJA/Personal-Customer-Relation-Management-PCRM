import type { GeocodeResult } from "./geo";

/**
 * Formatting of Photon (https://photon.komoot.io) GeoJSON features into the
 * one-line addresses stored in meeting records, e.g.
 * "State Library Victoria, 328 Swanston Street, Melbourne VIC 3000".
 */

export interface PhotonProperties {
  name?: string;
  housenumber?: string;
  street?: string;
  district?: string;
  locality?: string;
  suburb?: string;
  city?: string;
  county?: string;
  state?: string;
  postcode?: string;
  country?: string;
  countrycode?: string;
  osm_value?: string;
  type?: string;
}

export interface PhotonFeature {
  geometry: { type: "Point"; coordinates: [number, number] };
  properties: PhotonProperties;
}

const AU_STATES: Record<string, string> = {
  Victoria: "VIC",
  "New South Wales": "NSW",
  Queensland: "QLD",
  "South Australia": "SA",
  "Western Australia": "WA",
  Tasmania: "TAS",
  "Northern Territory": "NT",
  "Australian Capital Territory": "ACT",
};

export function photonLabel(p: PhotonProperties): { name: string; label: string } {
  const street = [p.housenumber, p.street].filter(Boolean).join(" ");
  const name = p.name || street || p.district || p.city || p.state || "Dropped pin";
  const locality =
    p.city === "Melbourne" && p.district ? p.district : p.suburb || p.district || p.city || p.locality || p.county;
  const isAu = (p.countrycode ?? "").toUpperCase() === "AU";
  const state = p.state ? (isAu ? (AU_STATES[p.state] ?? p.state) : p.state) : undefined;
  const parts: string[] = [name];
  if (street && !name.includes(street)) parts.push(street);
  const tail = [locality && locality !== name ? locality : null, state, p.postcode].filter(Boolean).join(" ");
  if (tail) parts.push(tail);
  if (!isAu && p.country && p.country !== name) parts.push(p.country);
  return { name, label: parts.join(", ") };
}

export function photonToResults(features: PhotonFeature[]): GeocodeResult[] {
  const seen = new Set<string>();
  const out: GeocodeResult[] = [];
  for (const f of features) {
    const [lng, lat] = f.geometry.coordinates;
    const { name, label } = photonLabel(f.properties);
    if (seen.has(label)) continue;
    seen.add(label);
    out.push({ lat, lng, name, label, source: "photon" });
  }
  return out;
}

/** Nominatim `jsonv2` reverse result with `addressdetails=1`. */
export interface NominatimReverse {
  name?: string;
  display_name?: string;
  address?: Record<string, string | undefined>;
}

/** Same one-line format for Nominatim's reverse geocoding fallback. */
export function nominatimLabel(r: NominatimReverse): { name: string; label: string } | null {
  if (!r.display_name) return null;
  const a = r.address ?? {};
  return photonLabel({
    name: r.name || undefined,
    housenumber: a.house_number,
    street: a.road ?? a.pedestrian ?? a.footway,
    district: a.suburb ?? a.neighbourhood ?? a.quarter,
    city: a.city ?? a.town ?? a.village ?? a.municipality,
    state: a.state,
    postcode: a.postcode,
    country: a.country,
    countrycode: a.country_code,
  });
}
