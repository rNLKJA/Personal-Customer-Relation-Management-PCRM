import { hashString } from "./random";

/** Up to two initials from a display name ("Ava Nguyen" -> "AN"). */
export function initialsOf(...names: (string | null | undefined)[]): string {
  const words = names
    .filter(Boolean)
    .join(" ")
    .trim()
    .split(/\s+/)
    .filter(Boolean);
  if (words.length === 0) return "?";
  const first = Array.from(words[0])[0] ?? "";
  const last = words.length > 1 ? (Array.from(words[words.length - 1])[0] ?? "") : "";
  return (first + last).toUpperCase();
}

/**
 * Deterministic avatar palette (pairs of OKLCH hues). Generated SVG initials
 * replace the uploaded photos of the original app.
 */
export const AVATAR_HUES = [264, 292, 228, 200, 168, 145, 32, 12, 340, 312] as const;

export function avatarHue(seed: string): number {
  return AVATAR_HUES[hashString(seed) % AVATAR_HUES.length];
}

/** Max size of an optional uploaded portrait stored as a data URL. */
export const MAX_PORTRAIT_BYTES = 180 * 1024;

export function isAllowedPortrait(dataUrl: string): boolean {
  return (
    /^data:image\/(png|jpe?g|webp);base64,[A-Za-z0-9+/=]+$/.test(dataUrl) &&
    dataUrl.length <= Math.ceil((MAX_PORTRAIT_BYTES * 4) / 3) + 64
  );
}
