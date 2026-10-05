"use client";

import Link from "next/link";
import { useEffect, useMemo, useRef, useState } from "react";
import { Marker, Popup, type MapRef } from "react-map-gl/maplibre";
import { CalendarRange, MapPinOff, NotebookPen } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { PersonAvatar } from "@/components/common/person-avatar";
import { BaseMap } from "./base-map";
import { MeetingPin } from "./meeting-pin";
import { cleanLocation, ORIGINAL_DEFAULT_CENTER } from "@/lib/legacy/location";
import { filterRecordsByDayRange } from "@/lib/legacy/search";
import { boundsOf, clusterPoints, overlapAtZoom, type PointCluster } from "@/lib/geo";
import { APP_TIME_ZONE, dayKey, formatDateTime, formatShortDate } from "@/lib/time";
import { cn } from "@/lib/utils";

export interface MapRecord {
  id: string;
  dateTime: Date;
  location: string;
  lat: number | null;
  lng: number | null;
  person: { id: string; firstName: string; lastName: string; portrait: string | null };
}

type Preset = "all" | "past30" | "past90" | "upcoming" | "custom";
const PRESETS: { value: Preset; label: string }[] = [
  { value: "all", label: "All" },
  { value: "upcoming", label: "Upcoming" },
  { value: "past30", label: "Last 30 days" },
  { value: "past90", label: "Last 90 days" },
  { value: "custom", label: "Custom" },
];

const DAY = 864e5;
/** Pins closer than this on screen are merged into a numbered cluster. */
const CLUSTER_RADIUS_PX = 48;
const MAX_ZOOM = 17;
const pointOf = (r: MapRecord) => ({ lat: r.lat!, lng: r.lng! });

/**
 * The records map from `map_acmp.js`: every meeting as a pin, an info window
 * with person / time / cleaned address, and the start-end date filter (now
 * with presets). Google Maps is replaced by MapLibre + OpenFreeMap.
 */
export function RecordsMap({ records, now }: { records: MapRecord[]; now: number }) {
  const mapRef = useRef<MapRef>(null);
  const [preset, setPreset] = useState<Preset>("all");
  const [start, setStart] = useState(dayKey(now - 30 * DAY));
  const [end, setEnd] = useState(dayKey(now));
  const [selected, setSelected] = useState<string | null>(null);
  const [group, setGroup] = useState<PointCluster<MapRecord> | null>(null);
  const [zoom, setZoom] = useState<number | null>(null);

  const located = useMemo(() => records.filter((r) => r.lat != null && r.lng != null), [records]);
  const filtered = useMemo(() => {
    switch (preset) {
      case "all":
        return located;
      case "upcoming":
        return located.filter((r) => r.dateTime.getTime() > now);
      case "past30":
        return filterRecordsByDayRange(located, now - 30 * DAY, now, APP_TIME_ZONE);
      case "past90":
        return filterRecordsByDayRange(located, now - 90 * DAY, now, APP_TIME_ZONE);
      case "custom":
        return start && end
          ? filterRecordsByDayRange(
              located,
              `${start}T00:00:00Z`,
              `${end}T00:00:00Z`,
              APP_TIME_ZONE,
            )
          : located;
    }
  }, [located, preset, start, end, now]);

  const bounds = useMemo(
    () => boundsOf(filtered.map((r) => ({ lat: r.lat!, lng: r.lng! }))),
    [filtered],
  );

  useEffect(() => {
    if (!bounds || !mapRef.current) return;
    mapRef.current.fitBounds(bounds, { padding: 60, maxZoom: 14, duration: 600 });
  }, [bounds]);

  // Re-cluster on half-zoom steps only (cheap, and pins don't jitter mid-zoom).
  const clusters = useMemo(
    () => clusterPoints(filtered, pointOf, Math.round((zoom ?? 12) * 2) / 2, CLUSTER_RADIUS_PX),
    [filtered, zoom],
  );

  const openCluster = (c: PointCluster<MapRecord>) => {
    const map = mapRef.current;
    if (!map) return;
    const points = c.items.map(pointOf);
    if (map.getZoom() >= MAX_ZOOM - 0.5 || overlapAtZoom(points, MAX_ZOOM, CLUSTER_RADIUS_PX)) {
      // Same place (or already fully zoomed in): list the meetings instead.
      setSelected(null);
      setGroup(c);
      return;
    }
    setGroup(null);
    map.fitBounds(boundsOf(points)!, { padding: 80, maxZoom: MAX_ZOOM, duration: 600 });
  };

  const active = filtered.find((r) => r.id === selected) ?? null;
  const activeGroup = group
    ? { ...group, items: group.items.filter((r) => filtered.some((f) => f.id === r.id)) }
    : null;
  const missing = records.length - located.length;

  return (
    <div className="grid grid-cols-1 gap-4 lg:h-[calc(100dvh-11rem)] lg:grid-cols-[320px_minmax(0,1fr)]">
      <div className="order-2 flex min-h-0 flex-col gap-3 lg:order-1">
        <div className="rounded-2xl border bg-card p-3 shadow-(--shadow-soft)">
          <p className="mb-2 flex items-center gap-1.5 text-xs font-medium text-muted-foreground">
            <CalendarRange className="size-3.5" aria-hidden="true" /> Show meetings
          </p>
          <div className="flex flex-wrap gap-1.5" role="group" aria-label="Date range">
            {PRESETS.map((p) => (
              <button
                key={p.value}
                type="button"
                aria-pressed={preset === p.value}
                onClick={() => setPreset(p.value)}
                className={cn(
                  "rounded-full border px-2.5 py-1 text-xs font-medium transition-colors",
                  preset === p.value
                    ? "border-primary/30 bg-accent text-accent-foreground"
                    : "text-muted-foreground hover:text-foreground",
                )}
              >
                {p.label}
              </button>
            ))}
          </div>
          {preset === "custom" && (
            <div className="mt-3 grid grid-cols-2 gap-2">
              <div className="space-y-1">
                <Label htmlFor="map-start" className="text-xs">
                  From
                </Label>
                <Input
                  id="map-start"
                  type="date"
                  value={start}
                  max={end}
                  onChange={(e) => setStart(e.target.value)}
                />
              </div>
              <div className="space-y-1">
                <Label htmlFor="map-end" className="text-xs">
                  To
                </Label>
                <Input
                  id="map-end"
                  type="date"
                  value={end}
                  min={start}
                  onChange={(e) => setEnd(e.target.value)}
                />
              </div>
            </div>
          )}
        </div>
        <div className="flex min-h-0 flex-1 flex-col rounded-2xl border bg-card shadow-(--shadow-soft)">
          <p className="border-b px-4 py-2.5 text-xs text-muted-foreground" aria-live="polite">
            {filtered.length} {filtered.length === 1 ? "meeting" : "meetings"} on the map
            {missing > 0 && ` · ${missing} without a pin`}
          </p>
          {filtered.length ? (
            <ul className="max-h-72 overflow-y-auto p-2 lg:max-h-none lg:flex-1">
              {[...filtered]
                .sort((a, b) => b.dateTime.getTime() - a.dateTime.getTime())
                .map((r) => (
                  <li key={r.id}>
                    <button
                      type="button"
                      onClick={() => {
                        setGroup(null);
                        setSelected(r.id);
                        mapRef.current?.flyTo({
                          center: [r.lng!, r.lat!],
                          zoom: 15,
                          duration: 700,
                        });
                      }}
                      className={cn(
                        "flex w-full items-center gap-3 rounded-xl px-2 py-2 text-left transition-colors hover:bg-muted",
                        selected === r.id && "bg-accent",
                      )}
                    >
                      <PersonAvatar
                        firstName={r.person.firstName}
                        lastName={r.person.lastName}
                        portrait={r.person.portrait}
                        seed={r.person.id}
                        size="sm"
                      />
                      <span className="min-w-0 flex-1">
                        <span className="block truncate text-sm font-medium">
                          {r.person.firstName} {r.person.lastName}
                        </span>
                        <span className="block truncate text-xs text-muted-foreground">
                          {cleanLocation(r.location)}
                        </span>
                      </span>
                      <span
                        className={cn(
                          "tabular shrink-0 text-xs",
                          r.dateTime.getTime() > now
                            ? "font-medium text-primary"
                            : "text-muted-foreground",
                        )}
                      >
                        {formatShortDate(r.dateTime)}
                      </span>
                    </button>
                  </li>
                ))}
            </ul>
          ) : (
            <div className="flex flex-1 flex-col items-center justify-center gap-2 p-8 text-center text-sm text-muted-foreground">
              <MapPinOff className="size-6 opacity-60" aria-hidden="true" />
              No meetings in this range.
              <Button asChild size="sm" variant="outline" className="mt-2">
                <Link href="/records/new">
                  <NotebookPen /> Log a meeting
                </Link>
              </Button>
            </div>
          )}
        </div>
      </div>

      <BaseMap
        ref={mapRef}
        ariaLabel="Map of your meetings"
        className="order-1 h-[52dvh] rounded-2xl border shadow-(--shadow-soft) lg:order-2 lg:h-full"
        initialViewState={
          bounds
            ? { bounds, fitBoundsOptions: { padding: 60, maxZoom: 14 } }
            : {
                latitude: ORIGINAL_DEFAULT_CENTER.lat,
                longitude: ORIGINAL_DEFAULT_CENTER.lng,
                zoom: 12,
              }
        }
        onClick={() => {
          setSelected(null);
          setGroup(null);
        }}
        onLoad={() => {
          const map = mapRef.current?.getMap();
          if (!map) return;
          setZoom(map.getZoom());
          map.on("zoomend", () => setZoom(map.getZoom()));
        }}
      >
        {clusters.map((c) => {
          if (c.items.length === 1) {
            const r = c.items[0];
            return (
              <Marker
                key={r.id}
                latitude={r.lat!}
                longitude={r.lng!}
                anchor="bottom"
                onClick={(e) => {
                  e.originalEvent.stopPropagation();
                  setGroup(null);
                  setSelected(r.id);
                }}
              >
                <button
                  type="button"
                  aria-label={`${r.person.firstName} ${r.person.lastName}, ${formatShortDate(r.dateTime)}`}
                  className="rounded-full"
                >
                  <MeetingPin
                    firstName={r.person.firstName}
                    lastName={r.person.lastName}
                    seed={r.person.id}
                    portrait={r.person.portrait}
                    active={selected === r.id}
                    upcoming={r.dateTime.getTime() > now}
                  />
                </button>
              </Marker>
            );
          }
          const upcoming = c.items.some((r) => r.dateTime.getTime() > now);
          return (
            <Marker
              key={c.items.map((r) => r.id).join("|")}
              latitude={c.lat}
              longitude={c.lng}
              anchor="center"
              onClick={(e) => {
                e.originalEvent.stopPropagation();
                openCluster(c);
              }}
            >
              <button
                type="button"
                aria-label={`${c.items.length} meetings here - show them`}
                className={cn(
                  "tabular flex size-10 items-center justify-center rounded-full border-2 border-white text-sm font-semibold shadow-(--shadow-lifted) ring-4 transition-transform hover:scale-110",
                  upcoming
                    ? "bg-primary text-primary-foreground ring-primary/25"
                    : "bg-foreground text-background ring-foreground/15",
                )}
              >
                {c.items.length}
              </button>
            </Marker>
          );
        })}
        {activeGroup && activeGroup.items.length > 0 && (
          <Popup
            latitude={activeGroup.lat}
            longitude={activeGroup.lng}
            anchor="top"
            offset={22}
            onClose={() => setGroup(null)}
            closeOnClick={false}
            maxWidth="300px"
          >
            <div className="w-72 p-2">
              <p className="px-2 pt-1.5 pb-1 text-xs font-medium text-muted-foreground">
                {activeGroup.items.length} meetings at{" "}
                {cleanLocation(activeGroup.items[0].location).split(",")[0]}
              </p>
              <ul className="max-h-64 overflow-y-auto">
                {[...activeGroup.items]
                  .sort((a, b) => b.dateTime.getTime() - a.dateTime.getTime())
                  .map((r) => (
                    <li key={r.id}>
                      <Link
                        href={`/records/${r.id}`}
                        className="flex items-center gap-2.5 rounded-lg px-2 py-1.5 hover:bg-muted"
                      >
                        <PersonAvatar
                          firstName={r.person.firstName}
                          lastName={r.person.lastName}
                          portrait={r.person.portrait}
                          seed={r.person.id}
                          size="sm"
                        />
                        <span className="min-w-0 flex-1">
                          <span className="block truncate text-sm font-medium">
                            {r.person.firstName} {r.person.lastName}
                          </span>
                          <span className="tabular block text-xs text-muted-foreground">
                            {formatDateTime(r.dateTime)}
                          </span>
                        </span>
                      </Link>
                    </li>
                  ))}
              </ul>
            </div>
          </Popup>
        )}
        {active && (
          <Popup
            latitude={active.lat!}
            longitude={active.lng!}
            anchor="top"
            offset={12}
            onClose={() => setSelected(null)}
            closeOnClick={false}
            maxWidth="280px"
          >
            <div className="w-64 p-3.5">
              <div className="flex items-center gap-2.5">
                <PersonAvatar
                  firstName={active.person.firstName}
                  lastName={active.person.lastName}
                  portrait={active.person.portrait}
                  seed={active.person.id}
                  size="sm"
                />
                <div className="min-w-0">
                  <p className="truncate text-sm font-semibold">
                    {active.person.firstName} {active.person.lastName}
                  </p>
                  <p className="tabular text-xs text-muted-foreground">
                    {formatDateTime(active.dateTime)}
                  </p>
                </div>
              </div>
              <p className="mt-2 text-xs leading-relaxed text-muted-foreground">
                {cleanLocation(active.location)}
              </p>
              <Link
                href={`/records/${active.id}`}
                className="mt-2 inline-block text-xs font-medium text-primary hover:underline"
              >
                Open meeting →
              </Link>
            </div>
          </Popup>
        )}
      </BaseMap>
    </div>
  );
}
