import { mkdirSync, rmSync, writeFileSync } from "node:fs";
import { writeFile } from "node:fs/promises";
import path from "node:path";
import type { BrowserContext, Locator, Page } from "@playwright/test";

/**
 * Helpers for the recorded tour: an on-screen caption banner ("Step n of N"),
 * a visible cursor with a click ripple, human pacing, and a timeline of marks
 * that `scripts/showcase-media.mjs` uses to trim the start and cut long waits.
 *
 * Recording uses Playwright's `page.screencast` frames (JPEG, with arrival
 * times) rather than `recordVideo`, which needs a separately downloaded ffmpeg
 * build; the frames are assembled into video by the system ffmpeg later.
 */

export const BASE_URL = (
  process.env.BASE_URL ?? "https://comp30022-personal-crm.vercel.app"
).replace(/\/$/, "");

/** Working directory for raw output (git-ignored). */
export const WORK_DIR = path.resolve(__dirname, "..", ".showcase");
export const VIDEO_SIZE = { width: 1280, height: 800 };
/** Height kept free for the caption banner when pointing at things. */
const CAPTION_CLEARANCE = 130;

const OVERLAY_SCRIPT = `(() => {
  if (window.__tourInstalled) return;
  window.__tourInstalled = true;
  const KEY = "__tour_state";
  const read = () => { try { return JSON.parse(sessionStorage.getItem(KEY) || "{}"); } catch { return {}; } };
  const write = (s) => { try { sessionStorage.setItem(KEY, JSON.stringify(s)); } catch {} };
  const css = \`
    #__tour-caption{position:fixed;left:50%;bottom:18px;transform:translateX(-50%);z-index:2147483646;
      width:min(820px,calc(100vw - 48px));box-sizing:border-box;display:flex;gap:14px;align-items:center;
      padding:11px 18px;border-radius:16px;background:rgba(20,18,38,.92);color:#fff;
      font:500 16.5px/1.4 ui-sans-serif,system-ui,-apple-system,"Segoe UI",sans-serif;letter-spacing:-.005em;
      box-shadow:0 12px 32px rgba(0,0,0,.28);pointer-events:none;transition:opacity .25s}
    #__tour-caption[hidden]{display:flex!important;opacity:0}
    @media (min-width:1024px){body:has(aside.bg-sidebar) #__tour-caption{left:calc(50% + 124px);width:min(820px,calc(100vw - 296px))}}
    #__tour-caption .n{flex:none;padding:4px 10px;border-radius:999px;background:#6d5efc;font-weight:650;
      font-size:13px;letter-spacing:.02em;white-space:nowrap}
    #__tour-caption .t{flex:1}
    #__tour-caption .w{display:block;font-size:12px;font-weight:500;opacity:.7;margin-bottom:2px}
    #__tour-badge{position:fixed;top:14px;right:14px;z-index:2147483646;padding:6px 12px;border-radius:999px;
      background:#b45309;color:#fff;font:650 13px/1.3 ui-sans-serif,system-ui,sans-serif;pointer-events:none;
      box-shadow:0 6px 18px rgba(0,0,0,.25)}
    #__tour-badge[hidden]{display:none}
    main#main{padding-bottom:180px!important}
    #__tour-cursor{position:fixed;left:0;top:0;width:22px;height:22px;margin:-11px 0 0 -11px;border-radius:50%;
      background:rgba(109,94,252,.35);border:2px solid #fff;box-shadow:0 0 0 2px rgba(109,94,252,.9),0 2px 8px rgba(0,0,0,.3);
      z-index:2147483647;pointer-events:none;transition:transform .08s linear;will-change:transform}
    #__tour-cursor[hidden]{display:none}
    .__tour-ripple{position:fixed;width:44px;height:44px;margin:-22px 0 0 -22px;border-radius:50%;
      border:3px solid rgba(109,94,252,.9);z-index:2147483646;pointer-events:none;animation:__tour-r .5s ease-out forwards}
    @keyframes __tour-r{from{transform:scale(.4);opacity:1}to{transform:scale(1.6);opacity:0}}
  \`;
  let caption, badge, cursor;
  const render = () => {
    const s = read();
    if (!caption) return;
    if (s.text) {
      caption.hidden = false;
      caption.innerHTML = "";
      const n = document.createElement("span"); n.className = "n"; n.textContent = s.step || "";
      const t = document.createElement("span"); t.className = "t";
      if (s.workflow) { const w = document.createElement("span"); w.className = "w"; w.textContent = s.workflow; t.appendChild(w); }
      t.appendChild(document.createTextNode(s.text));
      if (s.step) caption.appendChild(n);
      caption.appendChild(t);
    } else caption.hidden = true;
    badge.hidden = !s.badge; badge.textContent = s.badge || "";
    if (s.x != null) { cursor.hidden = false; cursor.style.transform = "translate(" + s.x + "px," + s.y + "px)"; }
    else cursor.hidden = true;
  };
  const install = () => {
    if (document.getElementById("__tour-caption")) return;
    const style = document.createElement("style"); style.textContent = css;
    caption = document.createElement("div"); caption.id = "__tour-caption"; caption.setAttribute("aria-hidden", "true");
    badge = document.createElement("div"); badge.id = "__tour-badge"; badge.setAttribute("aria-hidden", "true");
    cursor = document.createElement("div"); cursor.id = "__tour-cursor"; cursor.setAttribute("aria-hidden", "true");
    document.head.appendChild(style);
    document.body.appendChild(caption);
    document.body.appendChild(badge);
    document.body.appendChild(cursor);
    render();
  };
  window.__tourSet = (patch) => { write({ ...read(), ...patch }); render(); };
  document.addEventListener("mousemove", (e) => {
    const s = read(); s.x = e.clientX; s.y = e.clientY; write(s);
    if (cursor) { cursor.hidden = false; cursor.style.transform = "translate(" + e.clientX + "px," + e.clientY + "px)"; }
  }, true);
  document.addEventListener("mousedown", (e) => {
    const r = document.createElement("div"); r.className = "__tour-ripple";
    r.style.left = e.clientX + "px"; r.style.top = e.clientY + "px";
    document.body.appendChild(r); setTimeout(() => r.remove(), 600);
  }, true);
  if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", install); else install();
})();`;

interface Mark {
  t: number;
  kind: "start" | "step" | "cut-start" | "cut-end" | "end";
  label?: string;
}

/** A narrated recording session on one page. */
export class Tour {
  private readonly marks: Mark[] = [];
  private t0 = Date.now();
  private stepIndex = 0;
  private readonly frames: { file: string; t: number }[] = [];
  private readonly writes: Promise<void>[] = [];
  private stopRecording: (() => Promise<void>) | null = null;

  constructor(
    readonly page: Page,
    private readonly opts: { slug: string; title: string; steps: string[] },
  ) {}

  static async install(context: BrowserContext): Promise<void> {
    await context.addInitScript(OVERLAY_SCRIPT);
  }

  private get frameDir() {
    return path.join(WORK_DIR, "frames", this.opts.slug);
  }

  /** Start capturing frames; the video timeline (t = 0) starts here. */
  async record(): Promise<void> {
    rmSync(this.frameDir, { recursive: true, force: true });
    mkdirSync(this.frameDir, { recursive: true });
    this.t0 = Date.now();
    await this.page.screencast.start({
      size: VIDEO_SIZE,
      quality: 92,
      onFrame: ({ data }) => {
        const t = (Date.now() - this.t0) / 1000;
        const file = `${String(this.frames.length).padStart(6, "0")}.jpg`;
        this.frames.push({ file, t });
        this.writes.push(writeFile(path.join(this.frameDir, file), data));
      },
    });
    this.stopRecording = () => this.page.screencast.stop();
  }

  private mark(kind: Mark["kind"], label?: string) {
    this.marks.push({ t: (Date.now() - this.t0) / 1000, kind, label });
  }

  /**
   * The first frame worth keeping (everything before is trimmed). Chrome only
   * sends screencast frames when something repaints, and the first ones can
   * lag behind; nudge the cursor until fresh frames flow, then start.
   */
  async begin(): Promise<void> {
    const since = (Date.now() - this.t0) / 1000;
    const deadline = Date.now() + 20_000;
    let x = 40;
    while (Date.now() < deadline) {
      const fresh = this.frames.filter((f) => f.t > since).length;
      if (fresh >= 4) break;
      x = x === 40 ? 44 : 40;
      await this.page.mouse.move(x, 40);
      await this.page.waitForTimeout(250);
    }
    await this.page.waitForTimeout(400);
    this.mark("start");
  }

  /** Show the caption for the next step (1-based numbering on screen). */
  async step(expected: number, hold = 1800): Promise<void> {
    this.stepIndex += 1;
    if (this.stepIndex !== expected) {
      throw new Error(`Tour step out of order: expected ${expected}, got ${this.stepIndex}`);
    }
    const text = this.opts.steps[expected - 1];
    if (!text) throw new Error(`No caption for step ${expected} of ${this.opts.slug}`);
    this.mark("step", text);
    await this.set({
      step: `Step ${expected} of ${this.opts.steps.length}`,
      workflow: this.opts.title,
      text,
    });
    await this.page.waitForTimeout(hold);
  }

  async badge(text: string | null): Promise<void> {
    await this.set({ badge: text });
  }

  private async set(patch: Record<string, unknown>) {
    await this.page.evaluate((p) => {
      (window as unknown as { __tourSet?: (p: unknown) => void }).__tourSet?.(p);
    }, patch);
  }

  /** Re-apply the caption after a full page load (the init script restores it too). */
  async refresh(): Promise<void> {
    await this.set({});
  }

  pause(ms = 900): Promise<void> {
    return this.page.waitForTimeout(ms);
  }

  /** Run a wait that should be cut from the edited video if it takes long. */
  async quiet<T>(fn: () => Promise<T>): Promise<T> {
    this.mark("cut-start");
    try {
      return await fn();
    } finally {
      this.mark("cut-end");
    }
  }

  /** Glide the cursor to the element, pause, click. */
  async click(target: Locator, opts: { pause?: number } = {}): Promise<void> {
    await this.moveTo(target);
    await this.page.waitForTimeout(opts.pause ?? 350);
    await target.click();
  }

  async moveTo(target: Locator): Promise<void> {
    await target.scrollIntoViewIfNeeded();
    let box = await target.boundingBox();
    if (!box) throw new Error("Element has no bounding box");
    // Keep the target clear of the caption banner at the bottom.
    const limit = VIDEO_SIZE.height - CAPTION_CLEARANCE;
    if (box.y + box.height > limit && box.height < limit / 2) {
      await this.page.evaluate(
        (dy) => window.scrollBy({ top: dy, behavior: "smooth" }),
        box.y + box.height - limit + 24,
      );
      await this.page.waitForTimeout(700);
      box = (await target.boundingBox()) ?? box;
    }
    await this.page.mouse.move(box.x + box.width / 2, box.y + box.height / 2, { steps: 18 });
  }

  /** Click into a field and type at a human pace. */
  async type(target: Locator, text: string, delay = 55): Promise<void> {
    await this.click(target, { pause: 200 });
    await target.pressSequentially(text, { delay });
  }

  /** Smooth scroll so the element sits near the top third of the viewport. */
  async scrollTo(target: Locator, offset = 120): Promise<void> {
    await target.evaluate((el, off) => {
      const y = el.getBoundingClientRect().top + window.scrollY - off;
      window.scrollTo({ top: y, behavior: "smooth" });
    }, offset);
    await this.page.waitForTimeout(900);
  }

  /** Stop recording; write the frame list and the timeline for the media script. */
  async finish(): Promise<void> {
    this.mark("end");
    await this.stopRecording?.();
    await Promise.all(this.writes);
    if (this.frames.length < 10) throw new Error(`Only ${this.frames.length} frames recorded`);
    writeFileSync(
      path.join(this.frameDir, "timeline.json"),
      JSON.stringify(
        {
          slug: this.opts.slug,
          baseUrl: BASE_URL,
          recordedAt: new Date().toISOString(),
          size: VIDEO_SIZE,
          frames: this.frames,
          marks: this.marks,
        },
        null,
        1,
      ),
    );
  }
}

/** Today's date and a clock time in Melbourne as datetime-local value parts. */
export function melbourneNow(offsetMinutes = 0): { date: string; time: string } {
  const at = new Date(Date.now() + offsetMinutes * 60_000);
  const parts = Object.fromEntries(
    new Intl.DateTimeFormat("en-CA", {
      timeZone: "Australia/Melbourne",
      year: "numeric",
      month: "2-digit",
      day: "2-digit",
      hour: "2-digit",
      minute: "2-digit",
      hourCycle: "h23",
    })
      .formatToParts(at)
      .map((p) => [p.type, p.value]),
  );
  const minute = String(Math.floor(Number(parts.minute) / 15) * 15).padStart(2, "0");
  return { date: `${parts.year}-${parts.month}-${parts.day}`, time: `${parts.hour}:${minute}` };
}
