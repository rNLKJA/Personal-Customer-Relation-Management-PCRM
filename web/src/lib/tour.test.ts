import { existsSync, readFileSync, statSync } from "node:fs";
import path from "node:path";
import { describe, expect, it } from "vitest";
import {
  TOUR_MEDIA,
  TOUR_SHOTS,
  TOUR_WORKFLOWS,
  formatBytes,
  formatClock,
  shotUrls,
  workflowMedia,
  workflowUrls,
} from "./tour";

const PUBLIC = path.resolve(__dirname, "..", "..", "public");
const file = (url: string) => path.join(PUBLIC, url);
const MB = 1024 * 1024;

describe("formatting", () => {
  it("formats video times as m:ss, rounding down", () => {
    expect(formatClock(0)).toBe("0:00");
    expect(formatClock(9.99)).toBe("0:09");
    expect(formatClock(65.4)).toBe("1:05");
    expect(formatClock(-3)).toBe("0:00");
  });

  it("formats file sizes", () => {
    expect(formatBytes(830_120)).toBe("811 KB");
    expect(formatBytes(2_035_579)).toBe("1.9 MB");
    expect(formatBytes(10)).toBe("1 KB");
  });
});

describe("the recorded workflows", () => {
  it.each(TOUR_WORKFLOWS.map((w) => [w.slug, w] as const))("%s is published", (slug, w) => {
    const m = workflowMedia(slug);
    const urls = workflowUrls(slug);
    for (const url of Object.values(urls)) expect(existsSync(file(url)), url).toBe(true);

    // One start time per caption, in order, inside the video.
    expect(m.steps).toHaveLength(w.steps.length);
    expect(m.steps[0]).toBe(0);
    for (let i = 1; i < m.steps.length; i++) expect(m.steps[i]).toBeGreaterThan(m.steps[i - 1]);
    expect(m.steps.at(-1)!).toBeLessThan(m.duration);

    // Size limits for the site video, and the manifest matches the file.
    expect(statSync(file(urls.mp4)).size).toBe(m.mp4Bytes);
    expect(m.mp4Bytes).toBeLessThanOrEqual(8 * MB);
    expect(m.gifBytes).toBeLessThanOrEqual(8 * MB);
  });

  it.each(TOUR_WORKFLOWS.map((w) => [w.slug, w] as const))(
    "%s has a captions track with the on-screen captions",
    (slug, w) => {
      const vtt = readFileSync(file(workflowUrls(slug).captions), "utf8");
      expect(vtt.startsWith("WEBVTT\n")).toBe(true);
      const cues = vtt
        .trim()
        .split(/\n\n+/)
        .slice(1)
        .map((block) => block.split("\n"));
      expect(cues).toHaveLength(w.steps.length);
      cues.forEach(([id, timing, text], i) => {
        expect(id).toBe(String(i + 1));
        expect(timing).toMatch(/^\d{2}:\d{2}:\d{2}\.\d{3} --> \d{2}:\d{2}:\d{2}\.\d{3}$/);
        expect(text).toBe(`Step ${i + 1} of ${w.steps.length}. ${w.steps[i]}`);
      });
    },
  );

  it("labels the mocked AI response in the captions", () => {
    const ai = TOUR_WORKFLOWS.find((w) => w.slug === "workflow-3-ai")!;
    expect(ai.steps.some((s) => /mocked AI response for illustration/i.test(s))).toBe(true);
  });
});

describe("the screenshots", () => {
  it("has media for every screenshot and nothing else", () => {
    expect(Object.keys(TOUR_MEDIA.shots).sort()).toEqual(TOUR_SHOTS.map((s) => s.file).sort());
  });

  it.each(TOUR_SHOTS.map((s) => [s.file, s] as const))("%s is published", (name, s) => {
    const m = TOUR_MEDIA.shots[name];
    for (const url of Object.values(shotUrls(name))) expect(existsSync(file(url)), url).toBe(true);
    expect(m.pngBytes).toBeLessThan(600 * 1024);
    expect(m.thumbWidth).toBeLessThan(m.width);
    // Desktop shots are 1440 x 900; phone shots 390 x 844 published at 1.5x.
    if (s.mobile) expect([m.width, m.height]).toEqual([585, 1266]);
    else expect([m.width, m.height]).toEqual([1440, 900]);
  });
});

describe("the README showcase", () => {
  const ROOT = path.resolve(__dirname, "..", "..", "..");
  const readme = readFileSync(path.join(ROOT, "README.md"), "utf8");
  const docs = (name: string) => path.join(ROOT, "docs", "showcase", name);

  it("shows the hero GIF and every screenshot, within the size limits", () => {
    expect(readme).toContain("(docs/showcase/00-hero.gif)");
    expect(statSync(docs("00-hero.gif")).size).toBeLessThanOrEqual(8 * MB);
    for (const s of TOUR_SHOTS) {
      expect(readme).toContain(`docs/showcase/${s.file}.png`);
      expect(statSync(docs(`${s.file}.png`)).size).toBeLessThan(600 * 1024);
    }
  });

  it.each(TOUR_WORKFLOWS.map((w) => [w.slug, w] as const))(
    "walks through %s with the on-screen captions",
    (slug, w) => {
      expect(readme).toContain(`(docs/showcase/${slug}.gif)`);
      expect(statSync(docs(`${slug}.gif`)).size).toBe(workflowMedia(slug).gifBytes);
      w.steps.forEach((step, i) => expect(readme).toContain(`\n${i + 1}. ${step}\n`));
    },
  );

  it("links the tour page", () => {
    expect(readme).toContain("https://comp30022-personal-crm.vercel.app/tour");
  });
});
