import { USERNAME_PATTERN } from "./legacy/validation";

/**
 * QR payloads. The 2021 app encoded the bare user name
 * (`QRCode.toDataURL(profile.userName)`) and the scanner posted it straight to
 * `/contact/createContactByUserName`. The revival encodes a link
 * (`https://<site>/contacts/add?u=<userName>`) so a phone camera can open it
 * directly, and the scanner accepts both formats.
 */

export function qrPayloadFor(userName: string, origin: string): string {
  const url = new URL("/contacts/add", origin);
  url.searchParams.set("u", userName);
  return url.toString();
}

/** Extract a user name from a scanned QR payload, or `null` if it is not one of ours. */
export function parseQrPayload(raw: string): string | null {
  const text = raw.trim();
  if (!text) return null;
  if (/^https?:\/\//i.test(text)) {
    try {
      const url = new URL(text);
      if (!/\/contacts\/add\/?$/.test(url.pathname)) return null;
      const u = url.searchParams.get("u")?.trim() ?? "";
      return USERNAME_PATTERN.test(u) ? u : null;
    } catch {
      return null;
    }
  }
  // Original format: the bare user name.
  return USERNAME_PATTERN.test(text) ? text : null;
}
