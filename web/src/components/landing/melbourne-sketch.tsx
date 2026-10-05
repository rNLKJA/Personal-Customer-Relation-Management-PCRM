import fs from "node:fs";
import path from "node:path";
import { PLACES } from "@/lib/places";

/**
 * A tiny server-rendered SVG "map" of Greater Melbourne (from the bundled
 * Natural Earth basemap) with meeting dots on landmarks from the gazetteer.
 * No tiles, no JavaScript - just a decorative illustration for the landing page.
 */

const BBOX = { minLng: 144.62, maxLng: 145.2, minLat: -38.02, maxLat: -37.68 };
const W = 560;
const H = Math.round(
  (W * (BBOX.maxLat - BBOX.minLat)) /
    ((BBOX.maxLng - BBOX.minLng) * Math.cos((37.8 * Math.PI) / 180)),
);

type Ring = [number, number][];

function project([lng, lat]: [number, number]): [number, number] {
  const x = ((lng - BBOX.minLng) / (BBOX.maxLng - BBOX.minLng)) * W;
  const y = ((BBOX.maxLat - lat) / (BBOX.maxLat - BBOX.minLat)) * H;
  return [Math.round(x * 10) / 10, Math.round(y * 10) / 10];
}

function landPath(): string {
  try {
    const file = path.join(process.cwd(), "public", "data", "basemap.geojson");
    const geo = JSON.parse(fs.readFileSync(file, "utf8")) as {
      features: {
        properties: { kind: string };
        geometry: { type: string; coordinates: unknown };
      }[];
    };
    const detail = geo.features.find((f) => f.properties.kind === "detail");
    if (!detail) return "";
    const polygons: Ring[][] =
      detail.geometry.type === "Polygon"
        ? [detail.geometry.coordinates as Ring[]]
        : (detail.geometry.coordinates as Ring[][]);
    return polygons
      .flatMap((poly) => poly)
      .map((ring) => "M" + ring.map((pt) => project(pt).join(",")).join("L") + "Z")
      .join("");
  } catch {
    return "";
  }
}

export function MelbourneSketch({ className }: { className?: string }) {
  const d = landPath();
  const dots = PLACES.filter(
    (p) =>
      p.kind !== "suburb" &&
      p.lng > BBOX.minLng &&
      p.lng < BBOX.maxLng &&
      p.lat > BBOX.minLat &&
      p.lat < BBOX.maxLat,
  );
  return (
    <svg
      viewBox={`0 0 ${W} ${H}`}
      className={className}
      role="img"
      aria-label="Sketch of Greater Melbourne with meeting places marked"
    >
      <defs>
        <pattern id="sketch-grid" width="16" height="16" patternUnits="userSpaceOnUse">
          <path d="M16 0H0V16" fill="none" stroke="currentColor" strokeOpacity="0.06" />
        </pattern>
      </defs>
      {/* water (Port Phillip Bay) behind, land on top */}
      <rect width={W} height={H} fill="color-mix(in oklch, var(--primary) 9%, var(--card))" />
      {d && (
        <path
          d={d}
          fill="var(--card)"
          stroke="color-mix(in oklch, var(--primary) 30%, var(--border))"
          strokeWidth="1.2"
          strokeLinejoin="round"
          fillRule="evenodd"
        />
      )}
      <rect width={W} height={H} fill="url(#sketch-grid)" />
      <text
        x={Math.round(W * 0.38)}
        y={H - 22}
        textAnchor="middle"
        fontSize="11"
        fill="currentColor"
        fillOpacity="0.4"
        fontFamily="var(--font-mono)"
      >
        Port Phillip Bay
      </text>
      {dots.map((p, i) => {
        const [x, y] = project([p.lng, p.lat]);
        return (
          <g key={p.name}>
            <circle
              cx={x}
              cy={y}
              r={i % 5 === 0 ? 9 : 6}
              fill="var(--primary)"
              fillOpacity="0.12"
            />
            <circle
              cx={x}
              cy={y}
              r={i % 5 === 0 ? 3.2 : 2.4}
              fill="var(--primary)"
              fillOpacity={i % 3 === 0 ? 0.95 : 0.6}
            />
          </g>
        );
      })}
    </svg>
  );
}
