import {
  EMAIL_CODE_TTL_MS,
  FAST_REGISTER_CODE_TTL_MS,
  PENDING_ACCOUNT_TTL_MS,
} from "./legacy/codes";

/**
 * What 4399 CRM stores, why, and for how long. Rendered on /your-data and
 * /methods so the policy and the code share one source.
 */

export const ACTIVITY_RETENTION_DAYS = 180;
export const GUEST_TTL_HOURS = 24;

export interface DataCategory {
  what: string;
  why: string;
  kept: string;
}

const minutes = (ms: number) => `${Math.round(ms / 60_000)} minutes`;

export const DATA_INVENTORY: DataCategory[] = [
  {
    what: "Account: user name, password hash, name, occupation, status line, phones, e-mails, optional photo",
    why: "Sign-in, and the details other people copy when they add you by user name or QR code.",
    kept: "Until you delete the account. Guest sandboxes are deleted after 24 hours.",
  },
  {
    what: "Contacts and meetings (who, when, where, notes, custom fields, accepted AI summaries)",
    why: "The address book and meeting log you keep - the purpose of the app.",
    kept: "Until you delete them or the account. Deleting a contact deletes its meetings.",
  },
  {
    what: "Activity log (what was viewed, created, changed, deleted or exported, and AI actions)",
    why: "Accountability: you can see every access to your records.",
    kept: `${ACTIVITY_RETENTION_DAYS} days, then deleted automatically; or with the account.`,
  },
  {
    what: "AI audit log (redacted text sent to the provider, the answer, model, timing, tokens, your decision)",
    why: "Transparency about every AI call made with your key, and the human decision on it.",
    kept: "Until you delete the account. Never contains your API key.",
  },
  {
    what: "Demo inbox e-mails (codes, invitations)",
    why: "Replaces real e-mail in this demo so sign-up and password reset work.",
    kept: "Until the account is deleted.",
  },
  {
    what: "E-mail codes and invitation links",
    why: "Verifying an e-mail address, password reset, inviting a contact.",
    kept: `Codes ${minutes(EMAIL_CODE_TTL_MS)}, invitations ${minutes(FAST_REGISTER_CODE_TTL_MS)} (unconfirmed invitee accounts ${minutes(PENDING_ACCOUNT_TTL_MS)}).`,
  },
];

/** Things the app deliberately does not collect. */
export const NOT_COLLECTED = [
  "No analytics, tracking pixels or third-party cookies.",
  "No IP addresses or user agents in the database (rate limits are in memory only).",
  "Your AI API key: it stays in your browser (sessionStorage by default) and goes only to the AI provider you chose.",
  'Background location: a meeting stores the place you pick on the map, or your current position only when you press "Use my location".',
];
