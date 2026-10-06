#!/usr/bin/env node
/**
 * Turns the raw output of the showcase tour (`pnpm showcase:record`, in
 * .showcase/) into the published media, with the system ffmpeg, ffprobe and cwebp:
 *
 *   recordings  .showcase/frames/<slug>/  ->  .showcase/videos/<slug>.mp4 (edited master)
 *                                         ->  public/showcase/<slug>.mp4 (H.264, crf 28, faststart)
 *                                         ->  public/showcase/<slug>-poster.webp
 *                                         ->  public/showcase/<slug>.vtt (step captions, WebVTT)
 *                                         ->  ../docs/showcase/<slug>.gif (960 px, palette, <= 8 MB)
 *   highlights  the three masters         ->  ../docs/showcase/00-hero.gif (README hero)
 *   screenshots .showcase/shots/*.png     ->  ../docs/showcase/*.png (< 600 KB each)
 *                                         ->  public/showcase/*.webp and *-thumb.webp (for /tour)
 *   manifest                              ->  src/lib/tour-media.json (durations, step times,
 *                                             sizes; read by /tour and the tests)
 *
 * Editing is driven by the timeline the tour writes: everything before the
 * first step is trimmed, and waits on the network longer than 1.6 s are cut
 * down to 0.9 s.
 *
 *   node scripts/showcase-media.mjs [--only=<slug or shot prefix>] [--check]
 */
import { execFileSync } from "node:child_process";
import { existsSync, mkdirSync, readdirSync, readFileSync, statSync, writeFileSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const WEB = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const WORK = path.join(WEB, ".showcase");
const PUBLIC_DIR = path.join(WEB, "public", "showcase");
const DOCS_DIR = path.resolve(WEB, "..", "docs", "showcase");
const CHECK_DIR = path.join(WORK, "check");
const MANIFEST = path.join(WEB, "src", "lib", "tour-media.json");

const FPS = 25;
const MP4_MAX = 8 * 1024 * 1024;
const GIF_MAX = 8 * 1024 * 1024;
const PNG_MAX = 600 * 1024;
const CUT_MIN = 1.6; // seconds of waiting before a cut is made
const CUT_KEEP = 0.9; // seconds of the wait that stay in

/** Which step's frame becomes the poster (1-based), per recording. */
const POSTER_STEP = {
  "workflow-1-contacts": 9,
  "workflow-2-meeting": 8,
  "workflow-3-ai": 5,
};

/** README hero: short moments from each recording (step is 1-based; seconds into it). */
const HERO_CLIPS = [
  { slug: "workflow-1-contacts", step: 3, from: 0.2, length: 3.6 },
  { slug: "workflow-1-contacts", step: 8, from: 1.8, length: 4.4 },
  { slug: "workflow-2-meeting", step: 4, from: 0.8, length: 4.6 },
  { slug: "workflow-2-meeting", step: 5, from: 0.2, length: 2.6 },
  { slug: "workflow-3-ai", step: 2, from: 0.8, length: 3.4 },
  { slug: "workflow-3-ai", step: 5, from: 0.2, length: 3.6 },
];

const args = process.argv.slice(2);
const only = args.find((a) => a.startsWith("--only="))?.slice(7) ?? null;
const check = args.includes("--check");

for (const dir of [PUBLIC_DIR, DOCS_DIR, CHECK_DIR, path.join(WORK, "videos")]) {
  mkdirSync(dir, { recursive: true });
}

const ff = (...a) => execFileSync("ffmpeg", ["-hide_banner", "-loglevel", "error", "-y", ...a]);
const size = (f) => statSync(f).size;
const kb = (n) => `${(n / 1024).toFixed(0)} KB`;
const mb = (n) => `${(n / 1024 / 1024).toFixed(2)} MB`;
const round2 = (x) => Math.round(x * 100) / 100;

/** Length of a video file in seconds (the encoder can hold the last frame a little longer). */
function probeDuration(file) {
  return Number(
    execFileSync("ffprobe", [
      "-v",
      "error",
      "-show_entries",
      "format=duration",
      "-of",
      "csv=p=0",
      file,
    ])
      .toString()
      .trim(),
  );
}

/** Width and height of an image or video file. */
function dimensions(file) {
  const out = execFileSync("ffprobe", [
    "-v",
    "error",
    "-select_streams",
    "v:0",
    "-show_entries",
    "stream=width,height",
    "-of",
    "csv=p=0:s=x",
    file,
  ])
    .toString()
    .trim();
  const [width, height] = out.split("x").map(Number);
  return { width, height };
}

const manifest = existsSync(MANIFEST)
  ? JSON.parse(readFileSync(MANIFEST, "utf8"))
  : { workflows: {}, shots: {}, hero: null };

/**
 * Kept intervals of the raw timeline: after the start mark (and the first
 * frame - there is nothing to show before it), minus long waits.
 */
function keptIntervals(marks, frames) {
  const start = Math.max(marks.find((m) => m.kind === "start")?.t ?? 0, frames[0]?.t ?? 0);
  const end = marks.findLast((m) => m.kind === "end")?.t;
  const cuts = [];
  for (let i = 0; i < marks.length; i++) {
    if (marks[i].kind !== "cut-start") continue;
    const close = marks.slice(i + 1).find((m) => m.kind === "cut-end");
    if (!close || close.t - marks[i].t < CUT_MIN) continue;
    const half = CUT_KEEP / 2;
    cuts.push([marks[i].t + half, close.t - half]);
  }
  const kept = [];
  let cursor = start;
  for (const [a, b] of cuts.sort((x, y) => x[0] - y[0])) {
    if (a > cursor) kept.push([cursor, a]);
    cursor = Math.max(cursor, b);
  }
  kept.push([cursor, end]);
  return kept.filter(([a, b]) => b > a);
}

/** Map a raw time to the edited timeline. */
function editedTime(kept, t) {
  let acc = 0;
  for (const [a, b] of kept) {
    if (t <= a) return acc;
    if (t < b) return acc + (t - a);
    acc += b - a;
  }
  return acc;
}

/** WebVTT timestamp, e.g. 00:01:02.500. */
function vttTime(seconds) {
  const ms = Math.max(0, Math.round(seconds * 1000));
  const h = Math.floor(ms / 3_600_000);
  const m = Math.floor((ms % 3_600_000) / 60_000);
  const s = ((ms % 60_000) / 1000).toFixed(3).padStart(6, "0");
  return `${String(h).padStart(2, "0")}:${String(m).padStart(2, "0")}:${s}`;
}

/** Edited start time of each step of a recording, from its timeline. */
function stepTimes(slug) {
  const { marks, frames } = JSON.parse(
    readFileSync(path.join(WORK, "frames", slug, "timeline.json"), "utf8"),
  );
  const kept = keptIntervals(marks, frames);
  return marks.filter((m) => m.kind === "step").map((m) => editedTime(kept, m.t));
}

function buildRecording(slug) {
  const dir = path.join(WORK, "frames", slug);
  const timeline = JSON.parse(readFileSync(path.join(dir, "timeline.json"), "utf8"));
  const { frames, marks } = timeline;
  const kept = keptIntervals(marks, frames);
  const end = marks.findLast((m) => m.kind === "end").t;

  // Concat list: each frame lasts until the next one, clipped to the kept intervals.
  const lines = ["ffconcat version 1.0"];
  let total = 0;
  let last = null;
  for (let i = 0; i < frames.length; i++) {
    const from = frames[i].t;
    const to = i + 1 < frames.length ? frames[i + 1].t : end;
    let d = 0;
    for (const [a, b] of kept) d += Math.max(0, Math.min(to, b) - Math.max(from, a));
    if (d <= 0.0005) continue;
    lines.push(`file '${frames[i].file}'`, `duration ${d.toFixed(4)}`);
    total += d;
    last = frames[i].file;
  }
  lines.push(`file '${last}'`);
  const list = path.join(dir, "edit.ffconcat");
  writeFileSync(list, lines.join("\n") + "\n");

  const master = path.join(WORK, "videos", `${slug}.mp4`);
  ff(
    "-f",
    "concat",
    "-safe",
    "0",
    "-i",
    list,
    "-vf",
    // Every frame at the recording size (the first screencast frames can be smaller).
    `scale=1280:800:flags=lanczos,setsar=1,fps=${FPS},format=yuv420p`,
    "-c:v",
    "libx264",
    "-crf",
    "16",
    "-preset",
    "medium",
    "-an",
    master,
  );

  // Site video: H.264, crf ~28, faststart; raise crf if it is over 8 MB.
  const mp4 = path.join(PUBLIC_DIR, `${slug}.mp4`);
  for (const crf of [28, 30, 32, 34]) {
    ff(
      "-i",
      master,
      "-c:v",
      "libx264",
      "-crf",
      String(crf),
      "-preset",
      "slow",
      "-profile:v",
      "high",
      "-pix_fmt",
      "yuv420p",
      "-movflags",
      "+faststart",
      "-an",
      mp4,
    );
    if (size(mp4) <= MP4_MAX) break;
  }

  const length = probeDuration(mp4);

  // Poster: the frame one second into the chosen step.
  const steps = marks.filter((m) => m.kind === "step");
  const starts = steps.map((m) => editedTime(kept, m.t));
  const posterIndex = (POSTER_STEP[slug] ?? 1) - 1;
  const posterAt = Math.min((starts[posterIndex] ?? starts[0]) + 1.2, total - 0.1);
  const posterPng = path.join(WORK, "videos", `${slug}-poster.png`);
  ff("-ss", posterAt.toFixed(2), "-i", master, "-frames:v", "1", posterPng);
  const poster = path.join(PUBLIC_DIR, `${slug}-poster.webp`);
  execFileSync("cwebp", ["-quiet", "-q", "80", "-m", "6", posterPng, "-o", poster]);

  // Captions track: the on-screen step captions as WebVTT cues.
  const cues = steps.map((m, i) => {
    const to = i + 1 < starts.length ? starts[i + 1] : length;
    return `${i + 1}\n${vttTime(starts[i])} --> ${vttTime(to)}\nStep ${i + 1} of ${steps.length}. ${m.label}`;
  });
  const vtt = path.join(PUBLIC_DIR, `${slug}.vtt`);
  writeFileSync(vtt, `WEBVTT\n\n${cues.join("\n\n")}\n`);

  // README GIF: 960 px wide, 10-12 fps, one palette per clip; step down until <= 8 MB.
  const gif = path.join(DOCS_DIR, `${slug}.gif`);
  const attempts = [
    { fps: 12, colors: 160 },
    { fps: 10, colors: 128 },
    { fps: 10, colors: 96 },
    { fps: 10, colors: 64 },
  ];
  for (const { fps, colors } of attempts) {
    ff(
      "-i",
      master,
      "-filter_complex",
      `fps=${fps},scale=960:-1:flags=lanczos,split[a][b];` +
        `[a]palettegen=max_colors=${colors}:stats_mode=diff[p];` +
        `[b][p]paletteuse=dither=bayer:bayer_scale=4:diff_mode=rectangle`,
      "-loop",
      "0",
      gif,
    );
    if (size(gif) <= GIF_MAX) break;
  }

  // Frames to eyeball: one per step.
  if (check) {
    starts.forEach((start, i) => {
      const at = Math.min(start + 1.0, total - 0.1);
      ff(
        "-ss",
        at.toFixed(2),
        "-i",
        master,
        "-frames:v",
        "1",
        "-vf",
        "scale=960:-1",
        path.join(CHECK_DIR, `${slug}-step${String(i + 1).padStart(2, "0")}.jpg`),
      );
    });
  }

  manifest.workflows[slug] = {
    recordedAt: timeline.recordedAt ?? null,
    baseUrl: timeline.baseUrl ?? null,
    duration: round2(length),
    steps: starts.map(round2),
    width: 1280,
    height: 800,
    mp4Bytes: size(mp4),
    gifBytes: size(gif),
    posterBytes: size(poster),
  };

  console.log(
    `${slug}: ${total.toFixed(1)} s (raw ${(end - kept[0][0]).toFixed(1)} s) · ` +
      `mp4 ${mb(size(mp4))} · gif ${mb(size(gif))} · poster ${kb(size(poster))}`,
  );
  if (size(mp4) > MP4_MAX) throw new Error(`${mp4} is over 8 MB`);
  if (size(gif) > GIF_MAX) throw new Error(`${gif} is over 8 MB`);
}

/** A ~25 s highlight reel for the top of the README, cut from the edited masters. */
function buildHero() {
  const inputs = [];
  const parts = [];
  HERO_CLIPS.forEach((clip, i) => {
    const master = path.join(WORK, "videos", `${clip.slug}.mp4`);
    const at = stepTimes(clip.slug)[clip.step - 1] + clip.from;
    inputs.push("-ss", at.toFixed(2), "-t", clip.length.toFixed(2), "-i", master);
    parts.push(`[${i}:v]fps=10,scale=960:-1:flags=lanczos,setpts=PTS-STARTPTS[v${i}]`);
  });
  const joined = HERO_CLIPS.map((_, i) => `[v${i}]`).join("");
  const gif = path.join(DOCS_DIR, "00-hero.gif");
  for (const colors of [128, 96, 64]) {
    ff(
      ...inputs,
      "-filter_complex",
      `${parts.join(";")};${joined}concat=n=${HERO_CLIPS.length}:v=1:a=0,split[a][b];` +
        `[a]palettegen=max_colors=${colors}:stats_mode=diff[p];` +
        `[b][p]paletteuse=dither=bayer:bayer_scale=4:diff_mode=rectangle`,
      "-loop",
      "0",
      gif,
    );
    if (size(gif) <= GIF_MAX) break;
  }
  manifest.hero = {
    duration: round2(HERO_CLIPS.reduce((s, c) => s + c.length, 0)),
    gifBytes: size(gif),
  };
  console.log(`00-hero: gif ${mb(size(gif))}`);
  if (size(gif) > GIF_MAX) throw new Error(`${gif} is over 8 MB`);
}

function buildScreenshot(file) {
  const src = path.join(WORK, "shots", file);
  const stem = file.replace(/\.png$/, "");
  const mobile = stem.includes("mobile");
  const out = path.join(DOCS_DIR, file);
  // Phone shots are captured at 2x and published at 1.5x (585 px wide).
  const scale = mobile ? ["-vf", "scale=585:-1:flags=lanczos"] : [];
  ff("-i", src, ...scale, "-pred", "mixed", "-compression_level", "100", out);
  if (size(out) > PNG_MAX) {
    // Too big as truecolour: quantise to a 256-colour palette.
    ff(
      "-i",
      src,
      "-filter_complex",
      `${mobile ? "scale=585:-1:flags=lanczos," : ""}split[a][b];[a]palettegen=max_colors=256[p];[b][p]paletteuse=dither=sierra2_4a`,
      "-pred",
      "mixed",
      out,
    );
  }
  const webp = path.join(PUBLIC_DIR, `${stem}.webp`);
  const thumb = path.join(PUBLIC_DIR, `${stem}-thumb.webp`);
  execFileSync("cwebp", ["-quiet", "-q", "82", "-m", "6", out, "-o", webp]);
  execFileSync("cwebp", [
    "-quiet",
    "-q",
    "78",
    "-m",
    "6",
    "-resize",
    mobile ? "292" : "720",
    "0",
    out,
    "-o",
    thumb,
  ]);
  const full = dimensions(webp);
  const small = dimensions(thumb);
  manifest.shots[stem] = {
    width: full.width,
    height: full.height,
    thumbWidth: small.width,
    thumbHeight: small.height,
    pngBytes: size(out),
    webpBytes: size(webp),
    thumbBytes: size(thumb),
  };
  console.log(`${stem}: png ${kb(size(out))} · webp ${kb(size(webp))} · thumb ${kb(size(thumb))}`);
  if (size(out) > PNG_MAX) throw new Error(`${out} is over 600 KB`);
}

const shotsDir = path.join(WORK, "shots");
if (existsSync(shotsDir)) {
  for (const f of readdirSync(shotsDir)
    .filter((f) => f.endsWith(".png"))
    .sort()) {
    if (!only || f.startsWith(only)) buildScreenshot(f);
  }
}
const framesDir = path.join(WORK, "frames");
const recorded = existsSync(framesDir)
  ? readdirSync(framesDir)
      .sort()
      .filter((slug) => existsSync(path.join(framesDir, slug, "timeline.json")))
  : [];
for (const slug of recorded) {
  if (!only || slug === only) buildRecording(slug);
}
const heroReady = HERO_CLIPS.every((c) => existsSync(path.join(WORK, "videos", `${c.slug}.mp4`)));
if (heroReady && (!only || only === "00-hero")) buildHero();

// Stable key order and Prettier's layout keep the committed manifest's diffs small.
const sorted = (o) => Object.fromEntries(Object.entries(o).sort(([a], [b]) => a.localeCompare(b)));
const { format } = await import("prettier");
writeFileSync(
  MANIFEST,
  await format(
    JSON.stringify(
      { workflows: sorted(manifest.workflows), shots: sorted(manifest.shots), hero: manifest.hero },
      null,
      2,
    ),
    { parser: "json", printWidth: 100 },
  ),
);
