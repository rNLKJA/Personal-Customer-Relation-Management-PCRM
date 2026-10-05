import { ImageResponse } from "next/og";
import { SITE } from "@/lib/site";

/**
 * Social preview card (1200x630), rendered at build time with next/og's
 * bundled Geist font: brand mark, name, tagline and a few "meeting" dots.
 */

export const alt = `${SITE.name} - ${SITE.tagline}`;
export const size = { width: 1200, height: 630 };
export const contentType = "image/png";

const INK = "#1f1d2e";
const MUTED = "#6b6982";
const PRIMARY = "#5b4ae0";
const DOTS: [number, number, number][] = [
  [880, 150, 16],
  [985, 225, 11],
  [930, 330, 20],
  [1060, 360, 12],
  [820, 410, 10],
  [1010, 470, 15],
  [900, 520, 9],
];

export default function OpengraphImage() {
  return new ImageResponse(
    <div
      style={{
        width: "100%",
        height: "100%",
        display: "flex",
        position: "relative",
        background: "linear-gradient(135deg, #fbfaff 0%, #eeebff 100%)",
        padding: 80,
        color: INK,
      }}
    >
      {DOTS.map(([x, y, r], i) => (
        <div
          key={i}
          style={{
            position: "absolute",
            left: x - r * 2.5,
            top: y - r * 2.5,
            width: r * 5,
            height: r * 5,
            borderRadius: 9999,
            background: "rgba(91, 74, 224, 0.12)",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
          }}
        >
          <div style={{ width: r, height: r, borderRadius: 9999, background: PRIMARY }} />
        </div>
      ))}
      <div style={{ display: "flex", flexDirection: "column", justifyContent: "space-between" }}>
        <div style={{ display: "flex", alignItems: "center", gap: 22 }}>
          <svg width="76" height="76" viewBox="0 0 32 32">
            <defs>
              <linearGradient id="g" x1="0" y1="0" x2="1" y2="1">
                <stop offset="0" stopColor="#7c6cf0" />
                <stop offset="1" stopColor="#4f3fd6" />
              </linearGradient>
            </defs>
            <rect width="32" height="32" rx="9" fill="url(#g)" />
            <circle cx="12.5" cy="14" r="5.5" fill="#fff" fillOpacity="0.92" />
            <circle cx="19.5" cy="18" r="5.5" fill="#fff" fillOpacity="0.55" />
            <circle cx="19.5" cy="18" r="1.6" fill="#4f3fd6" />
          </svg>
          <div style={{ display: "flex", fontSize: 44, letterSpacing: -1 }}>
            4399 <span style={{ color: MUTED, marginLeft: 12 }}>CRM</span>
          </div>
        </div>
        <div style={{ display: "flex", flexDirection: "column", maxWidth: 700 }}>
          <div style={{ fontSize: 68, lineHeight: 1.05, letterSpacing: -2.5 }}>
            Remember the people, and the moments you met them.
          </div>
          <div style={{ marginTop: 28, fontSize: 28, color: MUTED, lineHeight: 1.35 }}>
            Contacts, geo-tagged meetings, a map, a calendar and QR-code contact exchange.
          </div>
        </div>
        <div style={{ display: "flex", fontSize: 22, color: MUTED }}>
          {SITE.subject} · {SITE.university} · 2021, revived 2026
        </div>
      </div>
    </div>,
    size,
  );
}
