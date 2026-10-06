import type { CustomField } from "./legacy/validation";
import type { Place } from "./geo";
import { pick, randInt, shuffle } from "./random";

/**
 * Deterministic synthetic data for the demo account and guest sandboxes.
 * Everything here is fictional: names are invented, e-mail addresses use the
 * reserved example.* domains and phone numbers come from ACMA's range reserved
 * for fiction (0491 570 xxx - 0491 579 xxx).
 */

export const FICTIONAL_MOBILES = [
  "0491570006",
  "0491570156",
  "0491570157",
  "0491570158",
  "0491570159",
  "0491570110",
  "0491570313",
  "0491570737",
  "0491571266",
  "0491571491",
  "0491571804",
  "0491572549",
  "0491572665",
  "0491572983",
  "0491573770",
  "0491573087",
  "0491574118",
  "0491574632",
  "0491575254",
  "0491575789",
  "0491576398",
  "0491576801",
  "0491577426",
  "0491577644",
  "0491578957",
  "0491578148",
  "0491578888",
  "0491579212",
  "0491579760",
  "0491579455",
] as const;

const FIRST_NAMES = [
  "Amelia",
  "Oliver",
  "Charlotte",
  "Lucas",
  "Isla",
  "Mateo",
  "Harper",
  "Kai",
  "Sienna",
  "Arjun",
  "Priya",
  "Tomas",
  "Leila",
  "Hamish",
  "Matilda",
  "Jun",
  "Yasmin",
  "Felix",
  "Grace",
  "Rafael",
  "Chloe",
  "Darcy",
  "Aisha",
  "Hugo",
  "Imogen",
  "Ravi",
  "Sofia",
  "Callum",
  "Mei",
  "Theo",
];
const LAST_NAMES = [
  "Nguyen",
  "Smith",
  "Kowalski",
  "Okafor",
  "Singh",
  "Papadopoulos",
  "Tran",
  "O'Brien",
  "Rossi",
  "Haddad",
  "Fraser",
  "Liu",
  "Mendes",
  "Walker",
  "Kaur",
  "Brennan",
  "Sato",
  "Costa",
  "Murphy",
  "Ivanova",
  "Ali",
  "Park",
  "Fitzgerald",
  "Moreau",
  "Ngata",
  "Schmidt",
  "Lopez",
  "Wright",
  "Zhou",
  "Evans",
];
const OCCUPATIONS = [
  "Product designer",
  "Data analyst",
  "Barista & roaster",
  "Software engineer",
  "Physiotherapist",
  "Urban planner",
  "Research fellow",
  "Recruiter",
  "Startup founder",
  "Architect",
  "Marketing lead",
  "Teacher",
  "Nurse",
  "Photographer",
  "Accountant",
  "UX researcher",
  "Journalist",
  "Chef",
  "Mechanical engineer",
  "Policy advisor",
  "Pharmacist",
  "Musician",
  "Venture analyst",
  "Landscape designer",
  "Lawyer",
];
const EMAIL_DOMAINS = ["example.com", "example.org", "example.net"];

const NOTE_TEMPLATES = [
  "Coffee catch-up. Talked about {topic}; promised to send over {thing}.",
  "Met at a meetup on {topic}. Great energy, wants to stay in touch.",
  "Quick lunch - shared notes on {topic}. Follow up in two weeks.",
  "Walked through {topic} together. Owes me {thing}.",
  "Introduced by a friend. Interested in collaborating on {topic}.",
  "Caught up after a long time. Moving teams soon, keen on {topic}.",
  "Brainstormed {topic} over a flat white. Send {thing} by Friday.",
  "Mentoring session about {topic}. Next step: review {thing}.",
];
const UPCOMING_TEMPLATES = [
  "Catch-up about {topic} - bring {thing}.",
  "Coffee to talk {topic}.",
  "Lunch to follow up on {topic}.",
  "Intro chat - they want to hear about {topic}.",
  "Planning session for {topic}; prep {thing} beforehand.",
];
const TOPICS = [
  "design systems",
  "career moves",
  "the IT project",
  "open data",
  "public transport apps",
  "UX research",
  "machine learning",
  "a side project",
  "hiring",
  "climate tech",
  "photography",
  "board games",
  "the Melbourne food scene",
  "accessibility",
];
const THINGS = [
  "the slides",
  "a reading list",
  "a podcast episode",
  "their portfolio",
  "the meetup link",
  "a café recommendation",
  "the job ad",
  "a book",
  "the repo link",
  "a short demo",
];
const CONTACT_NOTES = [
  "Prefers messages over calls.",
  "Knows everyone in the Melbourne design community.",
  "Big AFL fan - avoid scheduling on grand final day.",
  "Vegetarian; loves dumplings in the CBD.",
  "Met through the University of Melbourne alumni network.",
  "Usually free on Thursday afternoons.",
  "Runs a monthly book club.",
  "",
];
const RECORD_FIELDS: CustomField[][] = [
  [{ field: "Follow-up", value: "Send the slides" }],
  [{ field: "Mood", value: "Upbeat" }],
  [
    { field: "Follow-up", value: "Intro to a recruiter" },
    { field: "Priority", value: "High" },
  ],
  [{ field: "Topic", value: "Career chat" }],
];
const CONTACT_FIELDS: CustomField[][] = [
  [{ field: "Birthday", value: "14 March" }],
  [{ field: "LinkedIn", value: "linkedin.com/in/example" }],
  [{ field: "Company", value: "Example Pty Ltd" }],
  [{ field: "Met at", value: "IT Project expo" }],
];

export interface SampleContact {
  key: string;
  firstName: string;
  lastName: string;
  occupation: string;
  emails: string[];
  phones: string[];
  note: string;
  status: boolean;
  customFields: CustomField[];
  addDate: Date;
  /** userName of a registered account this contact is linked to. */
  linkedUserName: string | null;
}

export interface SampleRecord {
  contactKey: string;
  dateTime: Date;
  location: string;
  lat: number;
  lng: number;
  notes: string;
  customFields: CustomField[];
}

export interface LinkableAccount {
  userName: string;
  firstName: string;
  lastName: string;
  occupation: string;
  emails: string[];
  phones: string[];
}

const DAY = 864e5;

function fill(template: string, rng: () => number): string {
  return template.replace("{topic}", pick(rng, TOPICS)).replace("{thing}", pick(rng, THINGS));
}

/** Melbourne wall-clock time on the day of `base` (UTC+10/11 handled approximately). */
function melbourneTime(base: Date, hour: number, minute: number): Date {
  // Melbourne is UTC+10 (AEST) or UTC+11 (AEDT, first Sunday Oct - first Sunday Apr).
  const m = base.getUTCMonth();
  const offset = m >= 9 || m <= 2 ? 11 : 10;
  const d = new Date(
    Date.UTC(base.getUTCFullYear(), base.getUTCMonth(), base.getUTCDate(), hour - offset, minute),
  );
  return d;
}

export function generateSampleData(opts: {
  rng: () => number;
  anchor: Date;
  places: readonly Place[];
  linkable: readonly LinkableAccount[];
  contactCount?: number;
  recordCount?: number;
}): { contacts: SampleContact[]; records: SampleRecord[] } {
  const { rng, anchor, places, linkable } = opts;
  const contactCount = opts.contactCount ?? 25;
  const recordCount = opts.recordCount ?? 40;

  const firsts = shuffle(rng, FIRST_NAMES);
  const lasts = shuffle(rng, LAST_NAMES);
  const reserved = new Set(linkable.flatMap((a) => a.phones));
  const phones = shuffle(
    rng,
    FICTIONAL_MOBILES.filter((p) => !reserved.has(p)),
  );
  const contacts: SampleContact[] = [];

  // A few contacts mirror registered accounts (added "by user name").
  linkable.forEach((acc, i) => {
    const stale = i === linkable.length - 1; // one contact is out of date -> "Sync" demo
    contacts.push({
      key: `c${contacts.length}`,
      firstName: acc.firstName,
      lastName: acc.lastName,
      occupation: stale ? "Student" : acc.occupation,
      emails: [...acc.emails],
      phones: stale ? [] : [...acc.phones],
      note: stale ? "Added back in uni - details may be old." : pick(rng, CONTACT_NOTES),
      status: true,
      customFields: [],
      addDate: new Date(anchor.getTime() - randInt(rng, 60, 200) * DAY),
      linkedUserName: acc.userName,
    });
  });

  for (let i = 0; contacts.length < contactCount; i++) {
    const firstName = firsts[i % firsts.length];
    const lastName = lasts[(i * 7) % lasts.length];
    const handle = `${firstName}.${lastName}`.toLowerCase().replace(/[^a-z.]/g, "");
    const extraEmail =
      rng() < 0.2 ? [`${firstName.toLowerCase()}@${pick(rng, EMAIL_DOMAINS)}`] : [];
    const extraPhone = rng() < 0.15 ? [phones[(i + 13) % phones.length]] : [];
    contacts.push({
      key: `c${contacts.length}`,
      firstName,
      lastName,
      occupation: pick(rng, OCCUPATIONS),
      emails: [`${handle}@${pick(rng, EMAIL_DOMAINS)}`, ...extraEmail],
      phones: [phones[i % phones.length], ...extraPhone],
      note: pick(rng, CONTACT_NOTES),
      status: true,
      customFields: rng() < 0.3 ? pick(rng, CONTACT_FIELDS) : [],
      addDate: new Date(
        anchor.getTime() - randInt(rng, 5, 240) * DAY - randInt(rng, 0, 86_000) * 1000,
      ),
      linkedUserName: null,
    });
  }

  const venues = places.filter((p) => p.kind !== "suburb");
  const records: SampleRecord[] = [];
  // Weight some contacts as "close" so the data looks realistic.
  const weighted = contacts.flatMap((c, i) => (i % 4 === 0 ? [c, c, c] : [c]));
  for (let i = 0; i < recordCount; i++) {
    const contact = pick(rng, weighted);
    const upcoming = i < 4;
    const daysOffset = upcoming ? randInt(rng, 1, 18) : -randInt(rng, 0, 150);
    const day = new Date(anchor.getTime() + daysOffset * DAY);
    const dateTime = melbourneTime(day, randInt(rng, 8, 19), pick(rng, [0, 15, 30, 45]));
    const venue = pick(rng, venues);
    const jitter = () => (rng() - 0.5) * 0.0012;
    records.push({
      contactKey: contact.key,
      dateTime,
      location: venue.label,
      lat: +(venue.lat + jitter()).toFixed(6),
      lng: +(venue.lng + jitter()).toFixed(6),
      notes: fill(pick(rng, upcoming ? UPCOMING_TEMPLATES : NOTE_TEMPLATES), rng),
      customFields: rng() < 0.25 ? pick(rng, RECORD_FIELDS) : [],
    });
  }
  records.sort((a, b) => a.dateTime.getTime() - b.dateTime.getTime());
  return { contacts, records };
}
