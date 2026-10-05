"use client";

import { useId, useRef, useState } from "react";
import useSWR from "swr";
import { Marker, type MapRef } from "react-map-gl/maplibre";
import { Crosshair, Loader2, MapPin, Search } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { BaseMap } from "./base-map";
import { useDebounced } from "@/hooks/use-debounced";
import { formatCoords, type GeocodeResult } from "@/lib/geo";
import { ORIGINAL_DEFAULT_CENTER } from "@/lib/legacy/location";
import { cn } from "@/lib/utils";

export interface LocationValue {
  location: string;
  lat: number | null;
  lng: number | null;
}

const fetcher = (url: string) =>
  fetch(url).then(async (r) => {
    if (!r.ok) throw new Error((await r.json().catch(() => null))?.error ?? "Search failed");
    return r.json() as Promise<{ results: GeocodeResult[]; fallback: boolean }>;
  });

/**
 * Meeting location picker - replaces `use-places-autocomplete` + Google Maps
 * in `AddRecord.js` / `record/map.js`: search places (Photon via our API),
 * click the map to drop a pin (reverse geocoded), or use the device location.
 */
export function LocationPicker({
  value,
  onChange,
}: {
  value: LocationValue;
  onChange: (v: LocationValue) => void;
}) {
  const mapRef = useRef<MapRef>(null);
  const listId = useId();
  const [query, setQuery] = useState("");
  const [open, setOpen] = useState(false);
  const [highlight, setHighlight] = useState(0);
  const [locating, setLocating] = useState(false);
  const [resolving, setResolving] = useState(false);
  const [geoError, setGeoError] = useState<string | null>(null);
  const debounced = useDebounced(query.trim(), 300);

  const center = value.lat != null && value.lng != null ? { lat: value.lat, lng: value.lng } : null;
  const { data, isLoading, error } = useSWR(
    debounced.length >= 2
      ? `/api/geocode?q=${encodeURIComponent(debounced)}${center ? `&lat=${center.lat}&lng=${center.lng}` : ""}`
      : null,
    fetcher,
    { keepPreviousData: true, revalidateOnFocus: false },
  );
  const results = debounced.length >= 2 ? (data?.results ?? []) : [];

  function choose(r: GeocodeResult) {
    onChange({ location: r.label, lat: r.lat, lng: r.lng });
    setQuery("");
    setOpen(false);
    mapRef.current?.flyTo({ center: [r.lng, r.lat], zoom: 15, duration: 700 });
  }

  async function dropPin(lat: number, lng: number) {
    onChange({ ...value, lat, lng });
    setResolving(true);
    try {
      const res = await fetch(`/api/reverse?lat=${lat}&lng=${lng}`);
      if (res.ok) {
        const { result } = (await res.json()) as { result: GeocodeResult };
        onChange({ location: result.label, lat, lng });
      } else {
        onChange({ location: value.location || formatCoords({ lat, lng }, 4), lat, lng });
      }
    } finally {
      setResolving(false);
    }
  }

  function useMyLocation() {
    setGeoError(null);
    if (!navigator.geolocation) {
      setGeoError("Location isn't available in this browser.");
      return;
    }
    setLocating(true);
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        setLocating(false);
        const { latitude, longitude } = pos.coords;
        mapRef.current?.flyTo({ center: [longitude, latitude], zoom: 15, duration: 700 });
        dropPin(latitude, longitude);
      },
      () => {
        setLocating(false);
        setGeoError("Couldn't get your location - search or tap the map instead.");
      },
      { enableHighAccuracy: true, timeout: 10_000 },
    );
  }

  return (
    <div className="space-y-3">
      <div className="relative">
        <Search
          className="pointer-events-none absolute top-1/2 left-3 size-4 -translate-y-1/2 text-muted-foreground"
          aria-hidden="true"
        />
        <Input
          role="combobox"
          aria-expanded={open && results.length > 0}
          aria-controls={listId}
          aria-autocomplete="list"
          aria-activedescendant={open && results[highlight] ? `${listId}-${highlight}` : undefined}
          aria-label="Search for a place"
          placeholder="Search a café, campus, address…"
          className="pr-10 pl-9"
          value={query}
          onChange={(e) => {
            setQuery(e.target.value);
            setHighlight(0);
            setOpen(true);
          }}
          onFocus={() => setOpen(true)}
          onBlur={() => setTimeout(() => setOpen(false), 150)}
          onKeyDown={(e) => {
            if (!results.length) return;
            if (e.key === "ArrowDown") {
              e.preventDefault();
              setHighlight((h) => (h + 1) % results.length);
            } else if (e.key === "ArrowUp") {
              e.preventDefault();
              setHighlight((h) => (h - 1 + results.length) % results.length);
            } else if (e.key === "Enter") {
              e.preventDefault();
              choose(results[highlight]);
            } else if (e.key === "Escape") {
              setOpen(false);
            }
          }}
        />
        {isLoading && (
          <Loader2
            className="absolute top-1/2 right-3 size-4 -translate-y-1/2 animate-spin text-muted-foreground"
            aria-hidden="true"
          />
        )}
        {open && debounced.length >= 2 && (
          <ul
            id={listId}
            role="listbox"
            className="absolute inset-x-0 top-full z-20 mt-1 max-h-72 overflow-y-auto rounded-xl border bg-popover p-1 shadow-(--shadow-lifted)"
          >
            {results.map((r, i) => (
              <li
                key={`${r.label}-${i}`}
                id={`${listId}-${i}`}
                role="option"
                aria-selected={i === highlight}
                onMouseDown={(e) => {
                  e.preventDefault();
                  choose(r);
                }}
                onMouseEnter={() => setHighlight(i)}
                className={cn(
                  "flex cursor-pointer items-start gap-2 rounded-lg px-2.5 py-2 text-sm",
                  i === highlight && "bg-accent",
                )}
              >
                <MapPin
                  className="mt-0.5 size-4 shrink-0 text-muted-foreground"
                  aria-hidden="true"
                />
                <span className="min-w-0">
                  <span className="block truncate font-medium">{r.name}</span>
                  <span className="block truncate text-xs text-muted-foreground">{r.label}</span>
                </span>
              </li>
            ))}
            {!isLoading && results.length === 0 && (
              <li className="px-2.5 py-2 text-sm text-muted-foreground">
                {error ? String(error.message) : "No places found."}
              </li>
            )}
            {data?.fallback && (
              <li className="border-t px-2.5 pt-2 pb-1 text-[11px] text-muted-foreground">
                Offline results from the bundled Melbourne gazetteer.
              </li>
            )}
          </ul>
        )}
      </div>

      <BaseMap
        ref={mapRef}
        ariaLabel="Pick the meeting location: click the map to drop a pin"
        className="h-64 rounded-2xl border sm:h-80"
        cursor="crosshair"
        initialViewState={{
          latitude: center?.lat ?? ORIGINAL_DEFAULT_CENTER.lat,
          longitude: center?.lng ?? ORIGINAL_DEFAULT_CENTER.lng,
          zoom: center ? 15 : 13,
        }}
        onClick={(e) => dropPin(e.lngLat.lat, e.lngLat.lng)}
      >
        {center && (
          <Marker
            latitude={center.lat}
            longitude={center.lng}
            anchor="bottom"
            draggable
            onDragEnd={(e) => dropPin(e.lngLat.lat, e.lngLat.lng)}
          >
            <MapPin
              className="size-9 fill-primary text-primary-foreground drop-shadow-md"
              strokeWidth={1.5}
              aria-hidden="true"
            />
          </Marker>
        )}
      </BaseMap>

      <div className="flex flex-wrap items-center justify-between gap-2 text-xs">
        <span className="text-muted-foreground" aria-live="polite">
          {resolving
            ? "Looking up the address…"
            : center
              ? `Pinned at ${formatCoords(center, 4)}`
              : "No pin yet - search, tap the map, or use your location."}
        </span>
        <Button
          type="button"
          variant="outline"
          size="sm"
          onClick={useMyLocation}
          disabled={locating}
        >
          {locating ? (
            <Loader2 className="animate-spin" aria-hidden="true" />
          ) : (
            <Crosshair aria-hidden="true" />
          )}{" "}
          Use my location
        </Button>
      </div>
      {geoError && (
        <p className="text-xs text-destructive" role="alert">
          {geoError}
        </p>
      )}
    </div>
  );
}
