import { convert, convertDay } from "./convert";

/**
 * Ports of the client-side search / sort helpers from the 2021 front-end:
 *
 * - `People#searchContacts` and `sortContact` in `src/API/contact/Contact.js`
 * - `RecordList#searchRecords` and `sortRecord` in `src/API/record/Record.js`
 * - the date-range filter used by the records map in
 *   `src/API/map/google_map/map_acmp.js`
 *
 * The matching rules (case-insensitive substring on one field, or on a
 * space-joined "all fields" string) are unchanged. Two deliberate deviations,
 * both documented in the README:
 *   1. functions return new arrays instead of sorting React state in place;
 *   2. the "time"/"add date" sorts compare real timestamps. The original
 *      compared the 12-hour `convert()` strings, which mis-ordered meetings on
 *      the same day (e.g. "01:30 pm" sorted before "11:00 am").
 */

export const CONTACT_SEARCH_OPTIONS = [
  { value: "all", label: "All fields" },
  { value: "firstName", label: "First name" },
  { value: "lastName", label: "Last name" },
  { value: "occupation", label: "Occupation" },
  { value: "notes", label: "Notes" },
  { value: "addDate", label: "Add date" },
] as const;
export type ContactSearchOption = (typeof CONTACT_SEARCH_OPTIONS)[number]["value"];

export const CONTACT_SORT_OPTIONS = [
  { value: "added", label: "Recently added" },
  { value: "firstName", label: "First name" },
  { value: "lastName", label: "Last name" },
  { value: "occupation", label: "Occupation" },
  { value: "notes", label: "Notes" },
  { value: "addDate", label: "Add date (oldest first)" },
] as const;
export type ContactSortOption = (typeof CONTACT_SORT_OPTIONS)[number]["value"];

export const RECORD_SEARCH_OPTIONS = [
  { value: "all", label: "All fields" },
  { value: "firstName", label: "First name" },
  { value: "lastName", label: "Last name" },
  { value: "location", label: "Location" },
  { value: "notes", label: "Notes" },
  { value: "time", label: "Time" },
] as const;
export type RecordSearchOption = (typeof RECORD_SEARCH_OPTIONS)[number]["value"];

export const RECORD_SORT_OPTIONS = [
  { value: "newest", label: "Newest first" },
  { value: "firstName", label: "First name" },
  { value: "lastName", label: "Last name" },
  { value: "location", label: "Location" },
  { value: "notes", label: "Notes" },
  { value: "time", label: "Oldest first" },
] as const;
export type RecordSortOption = (typeof RECORD_SORT_OPTIONS)[number]["value"];

/** Original page size for the "More" button on contacts and records. */
export const LEGACY_PAGE_SIZE = 9;

export interface SearchableContact {
  firstName: string;
  lastName: string;
  occupation: string;
  note: string | null;
  addDate: Date | string | number;
}

export interface SearchableRecord {
  meetingPerson: { firstName: string; lastName: string };
  location: string;
  notes: string | null;
  dateTime: Date | string | number;
}

const includes = (haystack: string | null | undefined, needle: string) =>
  (haystack ?? "").toLowerCase().includes(needle.toLowerCase());

export function searchContacts<T extends SearchableContact>(
  contacts: readonly T[],
  searchKey: string,
  option: ContactSearchOption = "all",
  timeZone?: string,
): T[] {
  switch (option) {
    case "firstName":
      return contacts.filter((c) => includes(c.firstName, searchKey));
    case "lastName":
      return contacts.filter((c) => includes(c.lastName, searchKey));
    case "occupation":
      return contacts.filter((c) => includes(c.occupation, searchKey));
    case "notes":
      return contacts.filter((c) => includes(c.note, searchKey));
    case "addDate":
      return contacts.filter((c) => includes(convert(c.addDate, timeZone), searchKey));
    case "all":
      return contacts.filter((c) =>
        includes(
          c.firstName +
            " " +
            c.lastName +
            " " +
            convert(c.addDate, timeZone) +
            " " +
            (c.note ?? "") +
            " " +
            c.occupation,
          searchKey,
        ),
      );
    default:
      return [];
  }
}

const time = (d: Date | string | number) => new Date(d).getTime();

export function sortContacts<T extends SearchableContact>(
  contacts: readonly T[],
  option: ContactSortOption,
): T[] {
  const list = [...contacts];
  switch (option) {
    case "firstName":
      return list.sort((a, b) => a.firstName.localeCompare(b.firstName));
    case "lastName":
      return list.sort((a, b) => a.lastName.localeCompare(b.lastName));
    case "occupation":
      return list.sort((a, b) => a.occupation.localeCompare(b.occupation));
    case "notes":
      return list.sort((a, b) => (a.note ?? "").localeCompare(b.note ?? ""));
    case "addDate":
      return list.sort((a, b) => time(a.addDate) - time(b.addDate));
    case "added":
    default:
      // The original list order: the user's contactList, newest link last.
      // We show the most recently added first.
      return list.sort((a, b) => time(b.addDate) - time(a.addDate));
  }
}

export function searchRecords<T extends SearchableRecord>(
  records: readonly T[],
  searchKey: string,
  option: RecordSearchOption = "all",
  timeZone?: string,
): T[] {
  switch (option) {
    case "firstName":
      return records.filter((r) => includes(r.meetingPerson.firstName, searchKey));
    case "lastName":
      return records.filter((r) => includes(r.meetingPerson.lastName, searchKey));
    case "location":
      return records.filter((r) => includes(r.location, searchKey));
    case "notes":
      return records.filter((r) => includes(r.notes, searchKey));
    case "time":
      return records.filter((r) => includes(convert(r.dateTime, timeZone), searchKey));
    case "all":
      return records.filter((r) =>
        includes(
          r.meetingPerson.firstName +
            " " +
            r.meetingPerson.lastName +
            " " +
            convert(r.dateTime, timeZone) +
            " " +
            (r.notes ?? "") +
            " " +
            r.location,
          searchKey,
        ),
      );
    default:
      return [];
  }
}

export function sortRecords<T extends SearchableRecord>(
  records: readonly T[],
  option: RecordSortOption,
): T[] {
  const list = [...records];
  switch (option) {
    case "firstName":
      return list.sort((a, b) => a.meetingPerson.firstName.localeCompare(b.meetingPerson.firstName));
    case "lastName":
      return list.sort((a, b) => a.meetingPerson.lastName.localeCompare(b.meetingPerson.lastName));
    case "location":
      return list.sort((a, b) => a.location.localeCompare(b.location));
    case "notes":
      return list.sort((a, b) => (a.notes ?? "").localeCompare(b.notes ?? ""));
    case "time":
      return list.sort((a, b) => time(a.dateTime) - time(b.dateTime));
    case "newest":
    default:
      // Original default: records.sort((b, a) => convert(a).localeCompare(convert(b)))
      return list.sort((a, b) => time(b.dateTime) - time(a.dateTime));
  }
}

/**
 * The records map only showed meetings whose day (`YYYY-MM-DD`, from
 * `convert()`) fell inside the inclusive [start, end] day range.
 */
export function filterRecordsByDayRange<T extends { dateTime: Date | string | number }>(
  records: readonly T[],
  start: Date | string | number,
  end: Date | string | number,
  timeZone?: string,
): T[] {
  const from = convertDay(start, timeZone);
  const to = convertDay(end, timeZone);
  return records.filter((r) => {
    const day = convertDay(r.dateTime, timeZone);
    return day >= from && day <= to;
  });
}
