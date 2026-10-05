import type { CustomField } from "./validation";

/**
 * Port of the request handling shared by `createRecord` and `editRecord` in
 * `controller/recordController.js`:
 *
 * - `contact_id` / `location` (and `_id` when editing) are required; a missing
 *   value (`== null`) yields the original "Miss Important Information Input";
 * - a missing `dateTime` defaults to "now";
 * - a missing `geoCoords` stores `lat`/`lng` as null, otherwise both are cast to
 *   numbers (Mongoose cast the strings "122334545" -> 122334545);
 * - an empty `location` string passed the null check but failed Mongoose's
 *   `required` validator, which surfaced as "Database query failed".
 *
 * Deviation: when `dateTime` was missing the original stored
 * `Date.now() - getTimezoneOffset()`, i.e. the server's *wall-clock* time
 * mislabelled as UTC. The port stores the real current instant.
 */

export const MISSING_INFO = "Miss Important Information Input";
export const QUERY_FAILED = "Database query failed";

export interface RecordRequestBody {
  _id?: string | null;
  contact_id?: string | null;
  location?: string | null;
  dateTime?: string | number | Date | null;
  geoCoords?: { lat: number | string; lng: number | string } | null;
  notes?: string | null;
  customField?: CustomField[] | null;
}

export interface NormalisedRecord {
  id: string | null;
  contactId: string;
  location: string;
  dateTime: Date;
  lat: number | null;
  lng: number | null;
  notes: string;
  customFields: CustomField[];
}

export type RecordInputResult =
  | { ok: true; value: NormalisedRecord }
  | { ok: false; error: typeof MISSING_INFO | typeof QUERY_FAILED };

export function normaliseRecordRequest(
  body: RecordRequestBody,
  opts: { editing: boolean; now?: () => Date },
): RecordInputResult {
  const { _id, contact_id, location, dateTime, geoCoords, notes, customField } = body;
  if ((opts.editing && _id == null) || contact_id == null || location == null) {
    return { ok: false, error: MISSING_INFO };
  }
  if (location === "") return { ok: false, error: QUERY_FAILED };

  const when = dateTime == null ? (opts.now ?? (() => new Date()))() : new Date(dateTime);
  if (Number.isNaN(when.getTime())) return { ok: false, error: QUERY_FAILED };

  let lat: number | null = null;
  let lng: number | null = null;
  if (geoCoords != null) {
    lat = Number(geoCoords.lat);
    lng = Number(geoCoords.lng);
    if (!Number.isFinite(lat) || !Number.isFinite(lng)) return { ok: false, error: QUERY_FAILED };
  }

  return {
    ok: true,
    value: {
      id: opts.editing ? (_id as string) : null,
      contactId: contact_id,
      location,
      dateTime: when,
      lat,
      lng,
      notes: notes ?? "",
      customFields: customField ?? [],
    },
  };
}
