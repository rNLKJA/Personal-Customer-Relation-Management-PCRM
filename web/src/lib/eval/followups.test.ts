import { describe, expect, it } from "vitest";
import { FOLLOW_UP_CORPUS } from "./followup-corpus";
import {
  baselineScores,
  compare,
  extractFollowUpsBaseline,
  matchesGold,
  noteF1,
  notesInSplit,
  scoreNote,
  summarise,
  tokens,
  type FollowUp,
} from "./followups";

describe("follow-up corpus", () => {
  it("every gold label is matched by its own keyword groups", () => {
    for (const n of FOLLOW_UP_CORPUS) {
      if (!n.gold.length) continue;
      const self = scoreNote(
        n,
        n.gold.map((g) => ({ action: g.label, due: null })),
      );
      expect(self.recall, `note ${n.id}: ${self.missed.join("; ")}`).toBe(1);
    }
  });

  it("has unique ids, both splits and only redacted placeholders", () => {
    const ids = FOLLOW_UP_CORPUS.map((n) => n.id);
    expect(new Set(ids).size).toBe(ids.length);
    expect(notesInSplit("development").length).toBe(16);
    expect(notesInSplit("held-out").length).toBe(16);
    for (const n of FOLLOW_UP_CORPUS) {
      expect(n.note).not.toMatch(/@|\b04\d{2}\b/); // no raw e-mails or mobiles
      for (const g of n.gold) expect(g.groups.length).toBeGreaterThan(0);
    }
  });
});

describe("baseline extractor", () => {
  it("keeps the author's commitments and strips lead-ins", () => {
    expect(
      extractFollowUpsBaseline(
        "Coffee catch-up. Promised to send over the slides by Friday. She'll intro me to her manager.",
      ),
    ).toEqual([{ action: "Send over the slides by Friday", due: "by Friday" }]);
  });

  it("returns nothing for notes without actions", () => {
    expect(extractFollowUpsBaseline("Great chat; no next steps, just keeping in touch.")).toEqual(
      [],
    );
  });

  it("caps the number of suggestions", () => {
    const note = Array.from({ length: 8 }, (_, i) => `Send item ${i}.`).join(" ");
    expect(extractFollowUpsBaseline(note, 3)).toHaveLength(3);
  });
});

describe("scorer", () => {
  const gold = {
    label: "Send the slides",
    groups: [
      ["send", "share"],
      ["slide", "deck"],
    ],
  };

  it("needs one keyword prefix from every group", () => {
    expect(matchesGold("Share the deck with Ava", gold)).toBe(true);
    expect(matchesGold("Send the slides", gold)).toBe(true);
    expect(matchesGold("Send the reading list", gold)).toBe(false);
    expect(matchesGold("Prepare slides", gold)).toBe(false);
  });

  it('reads "e-mail" as "email" (the house style must not be penalised)', () => {
    expect(tokens("E-mail [NAME] the dataset link")).toEqual([
      "email",
      "name",
      "the",
      "dataset",
      "link",
    ]);
    const note101 = FOLLOW_UP_CORPUS.find((n) => n.id === 101)!;
    expect(
      scoreNote(note101, [{ action: "E-mail [NAME] the dataset link", due: null }]).recall,
    ).toBe(1);
    expect(
      scoreNote(note101, [{ action: "Owe her an email with the dataset link", due: null }]).recall,
    ).toBe(1);
  });

  it("matches predictions to gold items one-to-one", () => {
    const note = {
      id: 1,
      split: "development" as const,
      meetingDay: "x",
      note: "x",
      gold: [gold, { label: "Book a room", groups: [["book"], ["room"]] }],
    };
    const preds: FollowUp[] = [
      { action: "Send the slides", due: null },
      { action: "Send the slides again", due: null },
    ];
    expect(scoreNote(note, preds)).toMatchObject({
      matchedGold: 1,
      matchedPredictions: 1,
      recall: 0.5,
      precision: 0.5,
      missed: ["Book a room"],
    });
    expect(scoreNote({ ...note, gold: [] }, []).recall).toBeNull();
    expect(scoreNote(note, preds).f1).toBeCloseTo(0.5);
  });

  it("defines per-note F1 on every note, penalising over-suggestion", () => {
    expect(noteF1(0, 0, 0)).toBe(1); // nothing to do, nothing suggested
    expect(noteF1(0, 2, 0)).toBe(0); // spurious suggestions
    expect(noteF1(2, 0, 0)).toBe(0);
    expect(noteF1(2, 2, 2)).toBe(1);
    expect(noteF1(1, 5, 1)).toBeCloseTo((2 * 0.2 * 1) / 1.2);
  });
});

describe("summaries and paired comparison", () => {
  it("scores the baseline far lower on the held-out split than on the notes it was written on", () => {
    const dev = summarise(baselineScores(notesInSplit("development")));
    const held = summarise(baselineScores(notesInSplit("held-out")));
    expect(dev.meanRecall!.estimate).toBeGreaterThan(held.meanRecall!.estimate);
    expect(held.meanRecall!.n).toBe(notesInSplit("held-out").filter((n) => n.gold.length).length);
    expect(held.meanRecall!.lower).toBeLessThanOrEqual(held.meanRecall!.estimate);
    expect(held.meanRecall!.upper).toBeGreaterThanOrEqual(held.meanRecall!.estimate);
    expect(held.meanRecall).toMatchObject({ seed: 4399, resamples: 4000 });
  });

  it("compares a candidate with the baseline note by note", () => {
    const notes = notesInSplit("held-out");
    const base = baselineScores(notes);
    // A perfect "oracle" candidate that lists every gold label.
    const oracle = notes.map((n) =>
      scoreNote(
        n,
        n.gold.map((g) => ({ action: g.groups.map((grp) => grp[0]).join(" "), due: null })),
      ),
    );
    const c = compare(oracle, base);
    expect(c.n).toBe(notes.filter((n) => n.gold.length).length);
    expect(c.losses).toBe(0);
    expect(c.wins + c.ties).toBe(c.n);
    expect(c.difference!.estimate).toBeGreaterThan(0);
    expect(c.difference!.lower).toBeGreaterThan(0);
    expect(c.signTestP).toBeLessThan(0.05);

    const self = compare(base, base);
    expect([self.wins, self.losses, self.signTestP]).toEqual([0, 0, 1]);
    expect(self.difference!.estimate).toBe(0);
  });

  it("pairs F1 over every note, so padding with extra suggestions does not pay", () => {
    const notes = notesInSplit("held-out");
    const base = baselineScores(notes);
    // Recall-maximising "spray": every gold item plus five spurious suggestions on every note.
    const spray = notes.map((n) =>
      scoreNote(n, [
        ...n.gold.map((g) => ({ action: g.groups.map((grp) => grp[0]).join(" "), due: null })),
        ...Array.from({ length: 5 }, (_, i) => ({ action: `Spurious idea ${i}`, due: null })),
      ]),
    );
    const recall = compare(spray, base, "recall");
    const f1 = compare(spray, base, "f1");
    expect(f1.metric).toBe("f1");
    expect(f1.n).toBe(notes.length);
    expect(recall.difference!.estimate).toBeGreaterThan(0.5);
    expect(f1.difference!.estimate).toBeLessThan(recall.difference!.estimate);
    expect(f1.losses).toBeGreaterThan(0); // no-action notes the baseline got right
  });
});
