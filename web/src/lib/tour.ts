import media from "./tour-media.json";

/**
 * The guided tour: the three recorded workflows and the feature screenshots.
 * One source of truth for the captions burnt into the recordings
 * (`e2e/showcase.spec.ts`), the step lists and transcripts on /tour, and the
 * README's "Workflow walkthrough". `tour-media.json` is written by
 * `scripts/showcase-media.mjs` from the recordings' timelines.
 */

export interface TourWorkflow {
  /** File stem of the recording: public/showcase/<slug>.mp4 and <slug>-poster.webp. */
  slug: string;
  title: string;
  summary: string;
  /** One caption per step, shown on screen as "Step n of N". */
  steps: string[];
}

export const TOUR_WORKFLOWS: TourWorkflow[] = [
  {
    slug: "workflow-1-contacts",
    title: "Contacts",
    summary:
      "Open a private guest sandbox with one click, search the address book, and add people by user name and by scanning a QR code.",
    steps: [
      "One click on “Try it as a guest” opens a private 24-hour sandbox. No sign-up.",
      "Home: who you are meeting next and who is due a catch-up.",
      "Contacts: 25 sample people. The search covers every field, ported from the 2021 app.",
      "Filter to the people who have their own 4399 CRM account (linked contacts).",
      "Add someone by user name: @demo is the shared demo account, Jordan Lee.",
      "Their own profile is copied in and stays linked, so one tap syncs it later.",
      "Every account has a QR code to show when you meet in person.",
      "Scan someone else's code. The camera here is a simulated feed showing a second sandbox's code.",
      "The scanned person is added and opened: Lena Park, linked to her own account.",
    ],
  },
  {
    slug: "workflow-2-meeting",
    title: "Log a meeting",
    summary:
      "Record who you met, when and where: search for the venue, check the pin on the map, then find the meeting on the records map and the calendar.",
    steps: [
      "Log a meeting from the “New” menu.",
      "Choose who you met from your contacts.",
      "Set when it happened (Melbourne time).",
      "Search for the venue. Place search uses Photon on OpenStreetMap data, with a bundled Melbourne fallback.",
      "The map flies to the venue and drops a pin you can drag or move with a click.",
      "Add the notes, then log the meeting.",
      "The meeting page: the pin, the distance from the CBD and the notes.",
      "The records map: filter to the last 30 days and open the new meeting from the list.",
      "The calendar: the same meeting on today's date.",
    ],
  },
  {
    slug: "workflow-3-ai",
    title: "AI with a human in the loop",
    summary:
      "The optional meeting-note assistant with your own key: see exactly what would be sent, review an AI-labelled draft, accept it, then check the AI log, the activity log and your data export.",
    steps: [
      "Open the meeting just logged. Its note contains a phone number, an e-mail and names.",
      "Before anything is sent, personal details are removed in the browser and you see the exact text.",
      "Bring your own key: Anthropic (default) or OpenAI. The key stays in this browser, never on 4399 CRM. A placeholder is typed here.",
      "Send. Mocked AI response for illustration: the provider is intercepted in this recording, so no model is called.",
      "The draft is labelled “AI-generated”. Nothing is saved until a person accepts, edits or rejects it.",
      "Accepted: the summary is stored on the meeting with the AI label and can be removed.",
      "The AI log keeps every call: the redacted input, the answer, the model, the latency and the decision.",
      "The activity log records what was done through the account: ids and counts, never contents.",
      "Your data: download everything as JSON or CSV, or delete the account and all of it.",
      "Forget the key when you are done. Signing out forgets it too.",
    ],
  },
];

export interface TourShot {
  /** File stem: docs/showcase/<file>.png and public/showcase/<file>.webp. */
  file: string;
  title: string;
  caption: string;
  mobile?: boolean;
}

export const TOUR_SHOTS: TourShot[] = [
  {
    file: "01-landing-light",
    title: "Landing page",
    caption: "What the project is, with a one-click guest sandbox and no sign-up.",
  },
  {
    file: "02-landing-dark",
    title: "Dark mode",
    caption: "Every page has a dark theme, which follows the system setting.",
  },
  {
    file: "03-home",
    title: "Home dashboard",
    caption: "Up next, time to reconnect, and the latest meetings.",
  },
  {
    file: "04-contacts",
    title: "Contacts",
    caption: "Search any field, sort, and filter to linked contacts.",
  },
  {
    file: "05-contact",
    title: "A linked contact",
    caption: "A contact linked to a registered account, with their meetings.",
  },
  {
    file: "06-add-by-qr",
    title: "Add by QR code",
    caption: "Your own code to show; scan or upload someone else's.",
  },
  {
    file: "07-log-meeting",
    title: "Log a meeting",
    caption: "Place search and a map pin for where you met.",
  },
  {
    file: "08-records-map",
    title: "Records map",
    caption: "Every meeting as a pin, with date presets and clustering.",
  },
  {
    file: "09-calendar",
    title: "Calendar",
    caption: "Meetings by day, month by month.",
  },
  {
    file: "10-insights",
    title: "Insights",
    caption: "Meetings per week with a seeded bootstrap interval, and a weekday by hour heatmap.",
  },
  {
    file: "11-ai-redaction",
    title: "What the AI would receive",
    caption: "Redaction preview: the exact text that would be sent, before any key is used.",
  },
  {
    file: "12-ai-settings",
    title: "Bring your own key",
    caption: "AI settings: provider, model, and a key that stays in this browser.",
  },
  {
    file: "13-your-data",
    title: "Your data",
    caption: "Export everything as JSON or CSV, see retention, delete the account.",
  },
  {
    file: "14-methods",
    title: "Methods",
    caption: "Evaluation results with intervals, including the weak ones.",
  },
  {
    file: "15-mobile-contacts",
    title: "Contacts on a phone",
    caption: "Designed phone-first, like the 2021 app (390 px wide).",
    mobile: true,
  },
  {
    file: "16-mobile-meeting",
    title: "A meeting on a phone",
    caption: "Meeting detail with the map pin and notes.",
    mobile: true,
  },
  {
    file: "17-mobile-calendar",
    title: "Calendar on a phone",
    caption: "The month grid and the meetings of the selected day.",
    mobile: true,
  },
];

/** What `scripts/showcase-media.mjs` measured for one recording. */
export interface WorkflowMedia {
  /** When and against which site it was recorded (null for older recordings). */
  recordedAt: string | null;
  baseUrl: string | null;
  /** Length of the edited video, in seconds. */
  duration: number;
  /** Start of each step in the edited video, in seconds. */
  steps: number[];
  width: number;
  height: number;
  mp4Bytes: number;
  gifBytes: number;
  posterBytes: number;
}

/** What `scripts/showcase-media.mjs` measured for one screenshot. */
export interface ShotMedia {
  width: number;
  height: number;
  thumbWidth: number;
  thumbHeight: number;
  pngBytes: number;
  webpBytes: number;
  thumbBytes: number;
}

export interface TourMedia {
  workflows: Record<string, WorkflowMedia>;
  shots: Record<string, ShotMedia>;
  hero: { duration: number; gifBytes: number } | null;
}

export const TOUR_MEDIA = media as TourMedia;

export function workflowMedia(slug: string): WorkflowMedia {
  const m = TOUR_MEDIA.workflows[slug];
  if (!m) throw new Error(`No media for ${slug}: run pnpm showcase:media`);
  return m;
}

export function shotMedia(file: string): ShotMedia {
  const m = TOUR_MEDIA.shots[file];
  if (!m) throw new Error(`No media for ${file}: run pnpm showcase:media`);
  return m;
}

/** Public URLs of a recording's files (under public/showcase). */
export function workflowUrls(slug: string) {
  return {
    mp4: `/showcase/${slug}.mp4`,
    poster: `/showcase/${slug}-poster.webp`,
    captions: `/showcase/${slug}.vtt`,
  };
}

/** Public URLs of a screenshot's files (under public/showcase). */
export function shotUrls(file: string) {
  return { full: `/showcase/${file}.webp`, thumb: `/showcase/${file}-thumb.webp` };
}

/** Video time as m:ss (seconds rounded down), e.g. 65.4 -> "1:05". */
export function formatClock(seconds: number): string {
  const s = Math.max(0, Math.floor(seconds));
  return `${Math.floor(s / 60)}:${String(s % 60).padStart(2, "0")}`;
}

/** File size for people: "830 KB", "1.9 MB". */
export function formatBytes(bytes: number): string {
  if (bytes < 1024 * 1024) return `${Math.max(1, Math.round(bytes / 1024))} KB`;
  return `${(bytes / 1024 / 1024).toFixed(1)} MB`;
}
