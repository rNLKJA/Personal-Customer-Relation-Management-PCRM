# /// script
# requires-python = ">=3.11"
# dependencies = ["shapely>=2.0"]
# ///
"""Build the small, free/offline geodata artefacts used by the revived PCRM app.

The original 2021 app used Google Maps (Places autocomplete, Geocoding API and
map tiles) with an API key that has since been removed. The revival uses free,
key-less services (OpenFreeMap tiles + Photon geocoding) at runtime, and this
script produces the *local fallbacks* that are bundled with the app:

1. ``web/public/data/basemap.geojson`` – a tiny offline basemap: Australian
   state outlines (Natural Earth 1:10m, public domain) heavily simplified, plus a
   more detailed Victoria outline clipped to Greater Melbourne / Port Phillip.
   The map renders this when OpenFreeMap tiles cannot be loaded.
2. ``web/src/lib/data/melbourne-places.json`` – a small gazetteer of Melbourne
   suburbs and landmarks with coordinates looked up once via Photon
   (https://photon.komoot.io, data © OpenStreetMap contributors, ODbL). It is
   used for offline place search, the "nearest suburb" reverse-geocode fallback
   and to place the synthetic seed meetings.

Run from the repository root:

    uv run scripts/build_geodata.py            # both artefacts
    uv run scripts/build_geodata.py --basemap  # only the basemap
    uv run scripts/build_geodata.py --places   # only the gazetteer

Downloads are cached in ``scripts/.cache`` (git-ignored).
"""

from __future__ import annotations

import argparse
import json
import math
import time
import urllib.parse
import urllib.request
from pathlib import Path

from shapely.geometry import box, mapping, shape
from shapely.ops import unary_union

ROOT = Path(__file__).resolve().parent.parent
CACHE = ROOT / "scripts" / ".cache"
BASEMAP_OUT = ROOT / "web" / "public" / "data" / "basemap.geojson"
PLACES_OUT = ROOT / "web" / "src" / "lib" / "data" / "melbourne-places.json"

NE_ADMIN1 = (
    "https://raw.githubusercontent.com/nvkelso/natural-earth-vector/master/"
    "geojson/ne_10m_admin_1_states_provinces.geojson"
)
PHOTON = "https://photon.komoot.io/api/"
USER_AGENT = "pcrm-revival-geodata/1.0 (+https://github.com/rNLKJA/Personal-Customer-Relation-Management-PCRM)"

MELBOURNE = (-37.8136, 144.9631)  # lat, lng (CBD)
# Greater Melbourne + Port Phillip + Mornington / Bellarine peninsulas
MELBOURNE_BBOX = (144.25, -38.55, 145.75, -37.35)  # minx, miny, maxx, maxy


_last_request = 0.0


def fetch(url: str, cache_name: str | None = None) -> bytes:
    global _last_request
    if cache_name:
        cached = CACHE / cache_name
        if cached.exists():
            return cached.read_bytes()
    # Be polite to the free public APIs: at most one request per ~1.1 s.
    wait = 1.1 - (time.monotonic() - _last_request)
    if wait > 0:
        time.sleep(wait)
    _last_request = time.monotonic()
    req = urllib.request.Request(url, headers={"User-Agent": USER_AGENT})
    with urllib.request.urlopen(req, timeout=120) as resp:
        data = resp.read()
    if cache_name:
        CACHE.mkdir(parents=True, exist_ok=True)
        (CACHE / cache_name).write_bytes(data)
    return data


def round_coords(geom: dict, ndigits: int) -> dict:
    def _r(c):
        if isinstance(c[0], (int, float)):
            return [round(c[0], ndigits), round(c[1], ndigits)]
        return [_r(x) for x in c]

    return {"type": geom["type"], "coordinates": _r(geom["coordinates"])}


def build_basemap() -> None:
    raw = json.loads(fetch(NE_ADMIN1, "ne_10m_admin_1_states_provinces.geojson"))
    features = []
    victoria = None
    for f in raw["features"]:
        p = f["properties"]
        if p.get("adm0_a3") != "AUS":
            continue
        geom = shape(f["geometry"])
        name = p.get("name") or p.get("name_en")
        if name == "Victoria":
            victoria = geom
        simple = geom.simplify(0.03, preserve_topology=True)
        if simple.is_empty or simple.area < 0.01:
            continue
        features.append(
            {
                "type": "Feature",
                "properties": {"kind": "state", "name": name},
                "geometry": round_coords(mapping(simple), 3),
            }
        )

    if victoria is None:
        raise SystemExit("Victoria not found in Natural Earth admin-1 data")

    detail = victoria.intersection(box(*MELBOURNE_BBOX)).simplify(0.0015, preserve_topology=True)
    detail = unary_union([detail])
    features.append(
        {
            "type": "Feature",
            "properties": {"kind": "detail", "name": "Greater Melbourne"},
            "geometry": round_coords(mapping(detail), 4),
        }
    )

    out = {
        "type": "FeatureCollection",
        "attribution": "Natural Earth (public domain) - simplified by scripts/build_geodata.py",
        "features": features,
    }
    BASEMAP_OUT.parent.mkdir(parents=True, exist_ok=True)
    BASEMAP_OUT.write_text(json.dumps(out, separators=(",", ":")))
    print(f"wrote {BASEMAP_OUT.relative_to(ROOT)} ({BASEMAP_OUT.stat().st_size / 1024:.1f} KiB, {len(features)} features)")


# --- gazetteer -------------------------------------------------------------

SUBURBS = [
    "Melbourne", "Carlton", "Fitzroy", "Collingwood", "Richmond", "South Yarra",
    "Prahran", "St Kilda", "Southbank", "Docklands", "Parkville", "Brunswick",
    "Northcote", "Coburg", "Preston", "Abbotsford", "Kew", "Hawthorn",
    "Camberwell", "Box Hill", "Doncaster", "Glen Waverley", "Clayton",
    "Caulfield", "Malvern", "Toorak", "Brighton", "Elwood", "Port Melbourne",
    "South Melbourne", "Albert Park", "Williamstown", "Footscray", "Yarraville",
    "Essendon", "Moonee Ponds", "Sunshine", "Flemington", "North Melbourne",
    "West Melbourne", "East Melbourne", "Thornbury", "Ivanhoe", "Heidelberg",
    "Bundoora", "Ringwood", "Dandenong", "Frankston", "Werribee", "Burwood",
    "Balwyn", "Oakleigh", "Cheltenham", "Sandringham", "Mentone",
]

# (query, display name, kind)
LANDMARKS = [
    ("University of Melbourne Parkville", "The University of Melbourne", "campus"),
    ("State Library Victoria", "State Library Victoria", "library"),
    ("Federation Square Melbourne", "Federation Square", "landmark"),
    ("Flinders Street Station", "Flinders Street Station", "station"),
    ("Southern Cross Station Melbourne", "Southern Cross Station", "station"),
    ("Queen Victoria Market", "Queen Victoria Market", "market"),
    ("Melbourne Museum Carlton", "Melbourne Museum", "museum"),
    ("Royal Botanic Gardens Melbourne", "Royal Botanic Gardens Victoria", "park"),
    ("Melbourne Cricket Ground", "Melbourne Cricket Ground", "stadium"),
    ("National Gallery of Victoria St Kilda Road", "NGV International", "museum"),
    ("Melbourne Central", "Melbourne Central", "shopping"),
    ("RMIT University Melbourne City campus", "RMIT University", "campus"),
    ("Monash University Clayton", "Monash University, Clayton", "campus"),
    ("Crown Melbourne Southbank", "Crown Melbourne", "venue"),
    ("Melbourne Zoo Parkville", "Melbourne Zoo", "park"),
    ("Carlton Gardens", "Carlton Gardens", "park"),
    ("Fitzroy Gardens East Melbourne", "Fitzroy Gardens", "park"),
    ("Docklands Library", "Library at The Dock", "library"),
    ("South Melbourne Market", "South Melbourne Market", "market"),
    ("Prahran Market", "Prahran Market", "market"),
    ("St Kilda Pier", "St Kilda Pier", "landmark"),
    ("Luna Park Melbourne", "Luna Park", "venue"),
    ("Melbourne Convention Exhibition Centre South Wharf", "Melbourne Convention & Exhibition Centre", "venue"),
    ("Arts Centre Melbourne", "Arts Centre Melbourne", "venue"),
    ("Hosier Lane Melbourne", "Hosier Lane", "landmark"),
    ("Degraves Street Melbourne 3000", "Degraves Street", "street"),
    ("Lygon Street Carlton", "Lygon Street", "street"),
    ("Brunswick Street Fitzroy", "Brunswick Street", "street"),
    ("Chapel Street South Yarra", "Chapel Street", "street"),
    ("Smith Street Collingwood", "Smith Street", "street"),
    ("Sydney Road Brunswick", "Sydney Road", "street"),
    ("Collingwood Children's Farm", "Collingwood Children's Farm", "park"),
    ("Abbotsford Convent", "Abbotsford Convent", "venue"),
    ("Williamstown Beach", "Williamstown Beach", "beach"),
    ("Brighton Beach Bathing Boxes", "Brighton Bathing Boxes", "beach"),
    ("Albert Park Lake", "Albert Park Lake", "park"),
    ("Melbourne Recital Centre", "Melbourne Recital Centre", "venue"),
    ("Box Hill Central", "Box Hill Central", "shopping"),
    ("Chadstone Shopping Centre", "Chadstone Shopping Centre", "shopping"),
    ("Docklands Marvel Stadium", "Marvel Stadium", "stadium"),
    ("Melbourne Airport Tullamarine", "Melbourne Airport", "transport"),
    ("Swinburne University Hawthorn", "Swinburne University, Hawthorn", "campus"),
    ("Deakin University Burwood", "Deakin University, Burwood", "campus"),
    ("La Trobe University Bundoora", "La Trobe University, Bundoora", "campus"),
    ("Victoria University Footscray Park", "Victoria University, Footscray Park", "campus"),
]


# Hand-written labels where OSM's address parts read oddly (coordinates still come from Photon).
LABEL_OVERRIDES = {
    "Melbourne Airport": "Melbourne Airport, Tullamarine VIC 3045",
    "St Kilda Pier": "St Kilda Pier, Pier Road, St Kilda VIC 3182",
}


def haversine_km(lat1: float, lng1: float, lat2: float, lng2: float) -> float:
    r = 6371.0088
    p1, p2 = math.radians(lat1), math.radians(lat2)
    dp, dl = p2 - p1, math.radians(lng2 - lng1)
    a = math.sin(dp / 2) ** 2 + math.cos(p1) * math.cos(p2) * math.sin(dl / 2) ** 2
    return 2 * r * math.asin(math.sqrt(a))


def photon(query: str, layer: str | None = None) -> list[dict]:
    params = {"q": query, "limit": "5", "lat": MELBOURNE[0], "lon": MELBOURNE[1], "lang": "en"}
    if layer:
        params["layer"] = layer
    url = PHOTON + "?" + urllib.parse.urlencode(params)
    key = "photon-" + "".join(ch if ch.isalnum() else "_" for ch in f"{query}-{layer}")[:120] + ".json"
    data = json.loads(fetch(url, key))
    return data.get("features", [])


def pick(features: list[dict], max_km: float = 60) -> dict | None:
    for f in features:
        p = f["properties"]
        lng, lat = f["geometry"]["coordinates"]
        if p.get("countrycode") != "AU":
            continue
        if p.get("state") not in ("Victoria", "VIC"):
            continue
        if haversine_km(lat, lng, *MELBOURNE) > max_km:
            continue
        return f
    return None


def address_line(p: dict, name: str) -> str:
    parts = [name]
    street = " ".join(x for x in [p.get("housenumber"), p.get("street")] if x)
    if street and street not in name:
        parts.append(street)
    locality = p.get("district") if p.get("city") == "Melbourne" and p.get("district") else p.get("city") or p.get("locality")
    tail = " ".join(x for x in [locality, "VIC", p.get("postcode")] if x)
    parts.append(tail)
    return ", ".join(parts)


def build_places() -> None:
    places = []
    for suburb in SUBURBS:
        feats = photon(f"{suburb} Victoria", layer=None)
        f = pick([x for x in feats if x["properties"].get("osm_value") in ("suburb", "city", "town", "neighbourhood", "quarter", "village")]) or pick(feats)
        if not f:
            print(f"  ! suburb not found: {suburb}")
            continue
        p = f["properties"]
        lng, lat = f["geometry"]["coordinates"]
        places.append(
            {
                "name": suburb,
                "label": " ".join(x for x in [suburb, "VIC", p.get("postcode")] if x),
                "kind": "suburb",
                "lat": round(lat, 5),
                "lng": round(lng, 5),
            }
        )
        print(f"  suburb   {suburb:<22} {lat:.4f},{lng:.4f}")
    for query, name, kind in LANDMARKS:
        feats = photon(query)
        f = pick(feats)
        if query.startswith("Degraves"):
            f = pick([x for x in feats if x["properties"].get("postcode") == "3000"]) or f
        if not f:
            print(f"  ! landmark not found: {query}")
            continue
        p = f["properties"]
        lng, lat = f["geometry"]["coordinates"]
        places.append(
            {
                "name": name,
                "label": LABEL_OVERRIDES.get(name) or address_line(p, name),
                "kind": kind,
                "lat": round(lat, 5),
                "lng": round(lng, 5),
            }
        )
        print(f"  {kind:<8} {name:<40} {lat:.4f},{lng:.4f}")

    out = {
        "attribution": "Coordinates from Photon (photon.komoot.io), data (c) OpenStreetMap contributors, ODbL 1.0",
        "generatedBy": "scripts/build_geodata.py",
        "places": places,
    }
    PLACES_OUT.parent.mkdir(parents=True, exist_ok=True)
    PLACES_OUT.write_text(json.dumps(out, indent=1, ensure_ascii=False) + "\n")
    print(f"wrote {PLACES_OUT.relative_to(ROOT)} ({len(places)} places)")


def main() -> None:
    ap = argparse.ArgumentParser(description=__doc__.split("\n\n")[0])
    ap.add_argument("--basemap", action="store_true")
    ap.add_argument("--places", action="store_true")
    args = ap.parse_args()
    both = not args.basemap and not args.places
    if args.basemap or both:
        build_basemap()
    if args.places or both:
        build_places()


if __name__ == "__main__":
    main()
