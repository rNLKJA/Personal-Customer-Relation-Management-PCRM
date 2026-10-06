import { describe, expect, it } from "vitest";
import { REDACTION_CORPUS } from "./corpus";
import { evaluateRedaction } from "./evaluate";
import { redact, tokenizeRedacted } from "./redact";

describe("redact", () => {
  it("replaces e-mails, phones, addresses and known names with tokens", () => {
    const r = redact(
      "Met Priya Sharma at 14 Wattlebird Lane, Northcote VIC 3070. Email priya@example.com or call 0491 570 159.",
      { knownNames: ["Priya", "Sharma"] },
    );
    expect(r.text).toBe("Met [NAME] at [ADDRESS]. Email [EMAIL] or call [PHONE].");
    expect(r.counts).toEqual({ email: 1, phone: 1, address: 1, name: 1 });
    expect(r.spans.map((s) => s.original)).toEqual([
      "Priya Sharma",
      "14 Wattlebird Lane, Northcote VIC 3070",
      "priya@example.com",
      "0491 570 159",
    ]);
  });

  it.each([
    "0491 570 159",
    "0491570159",
    "0491-570-159",
    "+61 491 570 159",
    "(+61) 0491 570 159",
    "(03) 5550 1234",
    "03 5550 1234",
    "+61 3 5550 1234",
    "1300 975 707",
    "1800 160 401",
    "+44 7700 900123",
  ])("finds the phone number %s", (phone) => {
    expect(redact(`Call ${phone} today`).text).toBe("Call [PHONE] today");
  });

  it.each([
    "$1,200,000",
    "2024-2026",
    "ABN 51 824 753 556",
    "12.10.2026",
    "version 2.3.1",
    "10:30",
    "Room 12",
  ])("leaves %s alone", (s) => {
    expect(redact(`Note: ${s}.`).text).toBe(`Note: ${s}.`);
  });

  it.each([
    "Unit 4/27 Banksia Parade, Brunswick East",
    "5/18 Grevillea Crescent, Preston",
    "Level 2, 100 Quandong Court, Carlton",
    "Apartment 1203, 45 Kurrajong Street, Southbank",
    "8 Ironbark Road, Coburg North 3058",
    "PO Box 4471, Fitzroy VIC 3065",
    "12 St Kilda Rd",
  ])("finds the address %s", (address) => {
    expect(redact(`Go to ${address} later`).text).toBe("Go to [ADDRESS] later");
  });

  it("matches known names case-insensitively on word boundaries only", () => {
    expect(redact("kai's notes; Kaiser roll", { knownNames: ["Kai"] }).text).toBe(
      "[NAME]'s notes; Kaiser roll",
    );
    expect(redact("nothing to see", { knownNames: ["", " "] }).text).toBe("nothing to see");
  });

  it("redacts full address-book names case-sensitively, never lone first names", () => {
    const addressBook = ["Sam Patel", "May Wong", "Solo"];
    const r = redact(
      "Intro Ava to Sam Patel. Sam's keen. In May Wong and I met; may wong is lower case. Solo trip.",
      { knownNames: ["Ava"], addressBook },
    );
    expect(r.text).toBe(
      "Intro [NAME] to [NAME]. Sam's keen. In [NAME] and I met; may wong is lower case. Solo trip.",
    );
    expect(redact("Sam\nPatel called", { addressBook }).text).toBe("[NAME] called");
    expect(redact("Sam Patelson", { addressBook }).text).toBe("Sam Patelson");
  });

  it("does not read the digits of an e-mail address as a phone number", () => {
    expect(redact("write to team0491570159@example.com").text).toBe("write to [EMAIL]");
  });

  it("is a no-op on text without personal details", () => {
    const text = "Brainstormed design systems over a flat white. Send the slides by Friday.";
    expect(redact(text)).toEqual({
      text,
      spans: [],
      counts: { email: 0, phone: 0, address: 0, name: 0 },
    });
  });

  it("splits redacted text into tokens for highlighting", () => {
    expect(tokenizeRedacted("Call [PHONE] or [EMAIL].")).toEqual([
      { text: "Call ", category: null },
      { text: "[PHONE]", category: "phone" },
      { text: " or ", category: null },
      { text: "[EMAIL]", category: "email" },
      { text: ".", category: null },
    ]);
  });
});

describe("evaluateRedaction", () => {
  const e = evaluateRedaction();

  it("accounts for every labelled span and every redaction", () => {
    const labelled = REDACTION_CORPUS.reduce((n, note) => n + note.labels.length, 0);
    expect(e.overall.labelled).toBe(labelled);
    expect(e.overall.caught + e.overall.partial + e.overall.missed).toBe(labelled);
    expect(e.overall.redacted - e.overall.truePositives).toBe(e.falsePositives.length);
    expect(e.categories.reduce((n, c) => n + c.labelled, 0)).toBe(labelled);
  });

  it("reports the known misses honestly (people outside the address book, spelled-out details)", () => {
    const missed = e.outcomes.filter((o) => o.outcome !== "caught").map((o) => o.text);
    expect(missed).toEqual(
      expect.arrayContaining(["0491 five seven zero 313", "Grace Okafor", "Leila", "Sienna"]),
    );
    expect(missed).not.toContain("Sam Patel"); // a directory account, so in the address book
    expect(e.falsePositives.map((f) => f.text)).toContain("3 Collins Street");
  });

  it("keeps the DR-003 setting (meeting contact only) reproducible", () => {
    const contactOnly = evaluateRedaction(REDACTION_CORPUS, { addressBook: [] });
    const names = (x: typeof e) => x.categories.find((c) => c.category === "name")!;
    expect([names(contactOnly).caught, names(contactOnly).labelled]).toEqual([12, 17]);
    expect([contactOnly.overall.caught, contactOnly.overall.labelled]).toEqual([41, 49]);
    expect(contactOnly.outcomes.find((o) => o.text === "Sam Patel")?.outcome).toBe("missed");
    // The address book adds exactly that one name and no false positive.
    expect(names(e).caught - names(contactOnly).caught).toBe(1);
    expect(e.falsePositives).toEqual(contactOnly.falsePositives);
  });

  it("produces Wilson intervals that contain the point estimates", () => {
    for (const c of [...e.categories, { category: "overall", ...e.overall }]) {
      expect(c.recall!.lower).toBeLessThanOrEqual(c.recall!.estimate);
      expect(c.recall!.upper).toBeGreaterThanOrEqual(c.recall!.estimate);
    }
  });

  it("rejects labels that are not in the note", () => {
    expect(() =>
      evaluateRedaction([
        { id: 1, text: "abc", known: [], labels: [{ category: "name", text: "x" }] },
      ]),
    ).toThrow(/not found/);
  });
});
