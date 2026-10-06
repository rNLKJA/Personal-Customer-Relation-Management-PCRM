/**
 * Client-side redaction applied to a meeting note BEFORE anything is sent to a
 * language-model provider (see docs/decisions/DR-003-redact-before-llm.md).
 *
 * Deterministic, rule-based detectors for:
 *   - e-mail addresses
 *   - phone numbers (Australian mobile / landline / 13 / 1300 / 1800 numbers
 *     and +country international numbers)
 *   - street addresses (number + street name + street type, optional unit /
 *     level prefix and suburb / state / postcode tail) and PO boxes
 *   - names the app already knows: the meeting contact's and the signed-in
 *     user's first and last names (case-insensitive, each word on its own),
 *     and the full names of everyone in the user's address book
 *     (case-sensitive "First Last", so a contact called "May" or "Will" does
 *     not blank out ordinary words) - see DR-006
 *
 * It does NOT detect people who are not in the address book, other contacts'
 * first names on their own, obfuscated contact details ("jo at example dot
 * com") or free-text locations. The evaluation in `evaluate.ts` measures this
 * on a labelled corpus and the numbers are shown on /methods, including the
 * misses.
 */

export type RedactionCategory = "email" | "phone" | "address" | "name";

export const REDACTION_TOKENS: Record<RedactionCategory, string> = {
  email: "[EMAIL]",
  phone: "[PHONE]",
  address: "[ADDRESS]",
  name: "[NAME]",
};

export const REDACTION_LABELS: Record<RedactionCategory, string> = {
  email: "E-mail addresses",
  phone: "Phone numbers",
  address: "Street addresses",
  name: "Known names",
};

export interface RedactionSpan {
  category: RedactionCategory;
  start: number;
  end: number;
  original: string;
}

export interface RedactionResult {
  text: string;
  spans: RedactionSpan[];
  counts: Record<RedactionCategory, number>;
}

export interface RedactionOptions {
  /**
   * Names to replace with [NAME] wherever they appear as a word, ignoring
   * case (the meeting contact's and the user's first and last names).
   */
  knownNames?: readonly string[];
  /**
   * Full names from the user's address book ("Sam Patel"), replaced only when
   * the whole name appears with the same capitalisation.
   */
  addressBook?: readonly string[];
}

const EMAIL = /[A-Za-z0-9._%+-]+@[A-Za-z0-9-]+(?:\.[A-Za-z0-9-]+)*\.[A-Za-z]{2,}/g;

// A run of digits with optional +country, (area) and space / dot / dash
// separators. Validated afterwards (digit count, allowed first digit).
const PHONE_CANDIDATE =
  /(?:\(\+?\d{1,4}\)|\+\d{1,3})?[\s.-]?(?:\(\d{1,4}\))?[\s.-]?\d(?:[\s.-]?\d){5,14}/g;

const STREET_TYPES = [
  "Street",
  "St",
  "Road",
  "Rd",
  "Avenue",
  "Ave",
  "Lane",
  "Ln",
  "Drive",
  "Dr",
  "Court",
  "Ct",
  "Place",
  "Pl",
  "Parade",
  "Pde",
  "Crescent",
  "Cres",
  "Boulevard",
  "Blvd",
  "Highway",
  "Hwy",
  "Terrace",
  "Tce",
  "Way",
  "Close",
  "Grove",
  "Gr",
  "Square",
  "Sq",
  "Esplanade",
  "Esp",
  "Circuit",
  "Cct",
];
const STATES = "VIC|NSW|QLD|SA|WA|TAS|NT|ACT|Vic|Victoria";
const UNIT_PREFIX = String.raw`(?:(?:Unit|Apt|Apartment|Suite|Level|Shop|Flat)\s*\d+[A-Za-z]?\s*[,/]?\s*)?`;
const NUMBER = String.raw`\d{1,5}[A-Za-z]?(?:\s*[-/]\s*\d{1,5}[A-Za-z]?)?`;
const NAME_WORD = String.raw`[A-Z][A-Za-z'’-]+`;
const TAIL = String.raw`(?:,?\s+(?:${NAME_WORD}\s+){0,2}(?:(?:${STATES})\s*)?\d{4}\b|,\s*${NAME_WORD}(?:\s+${NAME_WORD})?(?:\s+(?:${STATES}))?(?:\s+\d{4})?)?`;
const STREET_ADDRESS = new RegExp(
  String.raw`\b${UNIT_PREFIX}${NUMBER}\s+(?:${NAME_WORD}\s+){1,3}?(?:${STREET_TYPES.join("|")})\b\.?${TAIL}`,
  "g",
);
const PO_BOX = new RegExp(String.raw`\b(?:PO|P\.O\.|Post Office)\s*Box\s+\d{1,6}${TAIL}`, "g");

function digitsOf(s: string): string {
  return s.replace(/\D/g, "");
}

function isPlausiblePhone(raw: string): boolean {
  const s = raw.trim();
  const digits = digitsOf(s);
  if (digits.length < 8 || digits.length > 15) return false;
  // International (+country) or Australian domestic numbers start with 0
  // (mobile 04, area codes 02/03/07/08) or are 13 / 1300 / 1800 numbers.
  // Requiring this keeps ABNs, order numbers and money out.
  const lead = s.replace(/^[\s(]+/, "");
  if (lead.startsWith("+")) return true;
  return /^0/.test(digits) || /^1[38]/.test(digits);
}

function escapeRegExp(s: string): string {
  return s.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

function collect(text: string, re: RegExp, category: RedactionCategory): RedactionSpan[] {
  const spans: RedactionSpan[] = [];
  for (const m of text.matchAll(re)) {
    let original = m[0];
    let start = m.index ?? 0;
    // Trim leading separators / whitespace picked up by optional groups.
    const lead = original.match(/^[\s.-]+/)?.[0].length ?? 0;
    start += lead;
    original = original.slice(lead).replace(/[\s.,-]+$/, "");
    if (!original) continue;
    if (category === "phone" && !isPlausiblePhone(original)) continue;
    spans.push({ category, start, end: start + original.length, original });
  }
  return spans;
}

function nameSpans(
  text: string,
  names: readonly string[],
  { ignoreCase, minLength }: { ignoreCase: boolean; minLength: number },
): RedactionSpan[] {
  const cleaned = [
    ...new Set(
      names.map((n) => n.trim().replace(/\s+/g, " ")).filter((n) => n.length >= minLength),
    ),
  ];
  if (cleaned.length === 0) return [];
  // Longest first so "Mary Ann" wins over "Mary".
  cleaned.sort((a, b) => b.length - a.length);
  // A single space in a name also matches a line break or several spaces.
  const alternatives = cleaned.map((n) => escapeRegExp(n).replace(/ /g, String.raw`\s+`));
  const re = new RegExp(
    String.raw`(?<![\p{L}\p{N}])(?:${alternatives.join("|")})(?![\p{L}\p{N}])`,
    ignoreCase ? "giu" : "gu",
  );
  return collect(text, re, "name");
}

function knownNameSpans(text: string, names: readonly string[]): RedactionSpan[] {
  return nameSpans(text, names, { ignoreCase: true, minLength: 2 });
}

/** Full names only ("First Last"): a lone first name of another contact is not enough. */
function addressBookSpans(text: string, names: readonly string[]): RedactionSpan[] {
  const full = names.filter((n) => /\S\s+\S/.test(n.trim()));
  return nameSpans(text, full, { ignoreCase: false, minLength: 3 });
}

/** Keep the earliest, then longest span where detectors overlap. */
function resolveOverlaps(spans: RedactionSpan[]): RedactionSpan[] {
  const sorted = [...spans].sort((a, b) => a.start - b.start || b.end - a.end);
  const out: RedactionSpan[] = [];
  for (const s of sorted) {
    const last = out.at(-1);
    if (last && s.start < last.end) {
      if (s.end > last.end && s.end - s.start > last.end - last.start) out[out.length - 1] = s;
      continue;
    }
    out.push(s);
  }
  return out;
}

/** "Priya Sharma" -> one [NAME], not "[NAME] [NAME]". */
function mergeAdjacentNames(text: string, spans: RedactionSpan[]): RedactionSpan[] {
  const out: RedactionSpan[] = [];
  for (const s of spans) {
    const last = out.at(-1);
    if (
      last &&
      last.category === "name" &&
      s.category === "name" &&
      /^\s+$/.test(text.slice(last.end, s.start))
    ) {
      out[out.length - 1] = { ...last, end: s.end, original: text.slice(last.start, s.end) };
      continue;
    }
    out.push(s);
  }
  return out;
}

export function emptyCounts(): Record<RedactionCategory, number> {
  return { email: 0, phone: 0, address: 0, name: 0 };
}

/** Detect personal details in `text` and replace each with a category token. */
export function redact(text: string, options: RedactionOptions = {}): RedactionResult {
  const spans = mergeAdjacentNames(
    text,
    resolveOverlaps([
      // E-mails first: their digits must not be read as phone numbers.
      ...collect(text, EMAIL, "email"),
      ...collect(text, STREET_ADDRESS, "address"),
      ...collect(text, PO_BOX, "address"),
      ...collect(text, PHONE_CANDIDATE, "phone"),
      ...knownNameSpans(text, options.knownNames ?? []),
      ...addressBookSpans(text, options.addressBook ?? []),
    ]),
  );
  const counts = emptyCounts();
  let out = "";
  let cursor = 0;
  for (const s of spans) {
    out += text.slice(cursor, s.start) + REDACTION_TOKENS[s.category];
    cursor = s.end;
    counts[s.category]++;
  }
  out += text.slice(cursor);
  return { text: out, spans, counts };
}

/** Split redacted text into plain and token parts (for highlighting in the preview). */
export function tokenizeRedacted(
  text: string,
): { text: string; category: RedactionCategory | null }[] {
  const parts: { text: string; category: RedactionCategory | null }[] = [];
  const re = /\[(EMAIL|PHONE|ADDRESS|NAME)\]/g;
  let cursor = 0;
  for (const m of text.matchAll(re)) {
    const i = m.index ?? 0;
    if (i > cursor) parts.push({ text: text.slice(cursor, i), category: null });
    parts.push({ text: m[0], category: m[1].toLowerCase() as RedactionCategory });
    cursor = i + m[0].length;
  }
  if (cursor < text.length) parts.push({ text: text.slice(cursor), category: null });
  return parts;
}
