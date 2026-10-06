import { execFileSync } from "node:child_process";
import { existsSync, mkdirSync, readFileSync, writeFileSync } from "node:fs";
import path from "node:path";
import {
  chromium,
  expect,
  test,
  type Browser,
  type BrowserContext,
  type Locator,
  type Page,
} from "@playwright/test";
import { TOUR_SHOTS, TOUR_WORKFLOWS } from "../src/lib/tour";
import { BASE_URL, Tour, VIDEO_SIZE, WORK_DIR, melbourneNow } from "./tour-kit";

/**
 * The showcase tour: key-feature screenshots and three narrated workflow
 * recordings of the site at BASE_URL (production by default). Each workflow
 * is also an end-to-end test of that journey.
 *
 * Data: screenshots use the shared, seeded "Demo user" (seed 4399) and change
 * nothing; the workflows run in a fresh guest sandbox (deleted after 24 hours)
 * and only add fixed, fictional data. The AI provider is never called: the
 * request to api.anthropic.com is intercepted and answered with a response
 * that says it is mocked, and the "key" typed is a placeholder.
 */

test.describe.configure({ mode: "serial" });

const SHOTS_DIR = path.join(WORK_DIR, "shots");
const GUEST_STATE = path.join(WORK_DIR, "guest-state.json");
const FAKE_CAMERA = path.join(WORK_DIR, "fake-camera.y4m");
const HEADLESS = !process.env.HEADED;
const BROWSER_ARGS = ["--enable-unsafe-swiftshader", "--use-angle=swiftshader", "--lang=en-AU"];

/** Fixed, fictional inputs (example.org e-mail, ACMA fiction-range phone number). */
const MEETING = {
  contact: "Ava Chen",
  place: "State Library Victoria",
  note:
    "Coffee with Ava at the State Library. She is starting a UX research guild and asked me to send the survey template by Friday. " +
    "Her new mobile is 0491 570 159 and her work e-mail is ava.research@example.org. " +
    "Intro her to Sam Patel about the open-data project, and book a follow-up in two weeks.",
};
const FRIEND = { firstName: "Lena", lastName: "Park", occupation: "Product designer" };
/** Typed into the BYOK dialog. Not a key: the provider call is intercepted. */
const PLACEHOLDER_KEY = "placeholder-not-a-real-key";
const MOCKED_OUTPUT = {
  summary:
    "(Mocked response for illustration - no model was called.) [NAME] is starting a UX research guild and asked for the survey template; you agreed to connect [NAME] with [NAME] about the open-data project.",
  follow_ups: [
    { action: "Send [NAME] the survey template", due: "by Friday" },
    { action: "Introduce [NAME] to [NAME] about the open-data project", due: null },
    { action: "Book a follow-up coffee", due: "in two weeks" },
  ],
};

mkdirSync(SHOTS_DIR, { recursive: true });

const workflow = (slug: string) => {
  const w = TOUR_WORKFLOWS.find((x) => x.slug === slug);
  if (!w) throw new Error(`Unknown workflow ${slug}`);
  return w;
};

async function settle(page: Page, ms = 600) {
  await page.waitForLoadState("networkidle").catch(() => {});
  await page.waitForTimeout(ms);
}

/** Wait until the MapLibre canvas has drawn its tiles. */
async function mapReady(page: Page, ms = 1500) {
  await page.locator("canvas.maplibregl-canvas").first().waitFor({ state: "visible" });
  await page.waitForLoadState("networkidle").catch(() => {});
  await page.waitForTimeout(ms);
}

/** A contact's own page (not /contacts/add or /contacts/new). */
const isContactPage = (url: URL) => /^\/contacts\/(?!add$|new$)[^/]+$/.test(url.pathname);
/** A meeting's own page (not /records/new). */
const isMeetingPage = (url: URL) => /^\/records\/(?!new$)[^/]+$/.test(url.pathname);

/** Meeting rows in the records list (links to /records/<id>). */
const meetingLinks = (page: Page) => page.locator('main section a[href^="/records/"]');

/**
 * Type into the location picker's place search and wait for the first
 * suggestion. Photon (behind /api/geocode) is a free public service, so a slow
 * or failed lookup is retried by typing the query again.
 */
async function searchPlace(page: Page, text: string, type: (box: Locator) => Promise<void>) {
  const box = page.getByRole("combobox", { name: "Search for a place" });
  const first = page.getByRole("option").first();
  for (let attempt = 1; ; attempt++) {
    await type(box);
    try {
      await first.waitFor({ timeout: 15_000 });
      return first;
    } catch (error) {
      if (attempt >= 3) throw error;
      await box.fill("");
      await page.waitForTimeout(1500);
    }
  }
}

async function shoot(page: Page, file: string, opts: { fullPage?: boolean } = {}) {
  if (!TOUR_SHOTS.some((s) => s.file === file)) throw new Error(`Unknown screenshot ${file}`);
  await page.screenshot({ path: path.join(SHOTS_DIR, `${file}.png`), fullPage: opts.fullPage });
}

async function guestLogin(page: Page) {
  await page.goto("/");
  await page.getByRole("button", { name: /Try it as a guest/ }).click();
  await page.waitForURL(/\/home/, { timeout: 60_000 });
}

async function recordingBrowser(extraArgs: string[] = []): Promise<Browser> {
  return chromium.launch({
    channel: "chrome",
    headless: HEADLESS,
    args: [...BROWSER_ARGS, ...extraArgs],
  });
}

async function recordingContext(
  browser: Browser,
  opts: { storageState?: string; permissions?: string[] } = {},
): Promise<BrowserContext> {
  const context = await browser.newContext({
    baseURL: BASE_URL,
    viewport: VIDEO_SIZE,
    locale: "en-AU",
    timezoneId: "Australia/Melbourne",
    colorScheme: "light",
    storageState: opts.storageState,
    permissions: opts.permissions,
  });
  await Tour.install(context);
  return context;
}

test("screenshots of the key features", async ({ browser }) => {
  // Public pages, light and dark.
  for (const scheme of ["light", "dark"] as const) {
    const ctx = await browser.newContext({
      viewport: { width: 1440, height: 900 },
      colorScheme: scheme,
    });
    const page = await ctx.newPage();
    await page.goto("/");
    await expect(page.getByRole("heading", { level: 1 })).toContainText("Remember the people");
    await settle(page, 1200);
    await shoot(page, scheme === "light" ? "01-landing-light" : "02-landing-dark");
    if (scheme === "light") {
      await page.goto("/methods#evaluation");
      await settle(page, 800);
      await shoot(page, "14-methods");
    }
    await ctx.close();
  }

  // The shared, seeded demo account (read-only use).
  const ctx = await browser.newContext({ viewport: { width: 1440, height: 900 } });
  const page = await ctx.newPage();
  await page.goto("/login");
  await page.getByRole("button", { name: "Demo user" }).click();
  await page.waitForURL(/\/home/);
  await settle(page, 1000);
  await shoot(page, "03-home");

  await page.goto("/contacts");
  await expect(page.getByRole("searchbox", { name: "Search contacts" })).toBeVisible();
  await settle(page);
  await shoot(page, "04-contacts");

  // The linked contact (one with their own account) with the most meetings.
  await page.getByRole("button", { name: /On 4399 CRM/ }).click();
  await page.waitForTimeout(500);
  const cards = page.locator('main a[href^="/contacts/"]').filter({ hasText: /\d+ meetings?/ });
  await expect(cards.first()).toBeVisible();
  const counts = await cards.evaluateAll((els) =>
    els.map((el) => Number(/(\d+) meetings?/.exec(el.textContent ?? "")?.[1] ?? 0)),
  );
  await cards.nth(counts.indexOf(Math.max(...counts))).click();
  await page.waitForURL(isContactPage);
  await settle(page, 1000);
  await shoot(page, "05-contact");

  await page.goto("/contacts/add?tab=code");
  await expect(page.getByRole("img", { name: /QR code for @demo/ })).toBeVisible();
  await settle(page);
  await shoot(page, "06-add-by-qr");

  await page.goto("/records/new");
  await page.getByRole("combobox", { name: "Who did you meet?" }).click();
  await page.getByPlaceholder("Search contacts…").fill("Ava Chen");
  await page.getByRole("option", { name: /Ava Chen/ }).click();
  await mapReady(page, 500);
  const typeSlowly = (text: string) => async (box: Locator) => {
    await box.click();
    await box.pressSequentially(text, { delay: 40 });
  };
  await (await searchPlace(page, MEETING.place, typeSlowly(MEETING.place))).click();
  await mapReady(page, 2000);
  await page.getByLabel("Notes").fill(MEETING.note);
  // Show the place search results over the pinned map.
  await searchPlace(page, "State Library", typeSlowly("State Library"));
  await page.evaluate(() => window.scrollTo(0, 0));
  await page.waitForTimeout(500);
  await shoot(page, "07-log-meeting");

  await page.goto("/map");
  await mapReady(page, 2500);
  await shoot(page, "08-records-map");

  await page.goto("/calendar");
  await settle(page);
  await shoot(page, "09-calendar");

  await page.goto("/insights");
  await settle(page, 1000);
  await shoot(page, "10-insights");

  // The seeded, detail-rich note (fictional details) for the redaction preview.
  await page.goto("/records");
  await page.getByRole("searchbox", { name: "Search meetings" }).fill("Wattlebird");
  await meetingLinks(page).first().click();
  await page.waitForURL(isMeetingPage);
  await page.getByRole("button", { name: /Summarise note|Summarise again/ }).click();
  const preview = page.getByLabel("Exact message that will be sent");
  await expect(preview).toContainText("[EMAIL]");
  await preview.evaluate((el) =>
    el.closest("section")?.scrollIntoView({ block: "start", behavior: "instant" }),
  );
  await page.evaluate(() => window.scrollBy(0, -16));
  await page.waitForTimeout(400);
  await shoot(page, "11-ai-redaction");

  await page.getByRole("button", { name: "Add your API key to continue" }).click();
  await expect(page.getByRole("dialog", { name: "AI settings" })).toBeVisible();
  await page.waitForTimeout(600);
  await shoot(page, "12-ai-settings");
  await page.keyboard.press("Escape");

  await page.goto("/your-data");
  await settle(page);
  await shoot(page, "13-your-data");
  await ctx.close();

  // Phone-sized shots at 2x, downscaled later.
  const phone = await browser.newContext({
    viewport: { width: 390, height: 844 },
    deviceScaleFactor: 2,
    isMobile: true,
    hasTouch: true,
  });
  const m = await phone.newPage();
  await m.goto("/login");
  await m.getByRole("button", { name: "Demo user" }).click();
  await m.waitForURL(/\/home/);
  await m.goto("/contacts");
  await settle(m);
  await shoot(m, "15-mobile-contacts");
  await m.goto("/records");
  await m.getByRole("searchbox", { name: "Search meetings" }).fill("Wattlebird");
  await meetingLinks(m).first().click();
  await m.waitForURL(isMeetingPage);
  await mapReady(m, 1500);
  await shoot(m, "16-mobile-meeting");
  await m.goto("/calendar");
  await settle(m);
  await shoot(m, "17-mobile-calendar");
  await phone.close();
});

/** A second guest sandbox renamed "Lena Park": the person whose QR code is scanned. */
async function prepareFriend(browser: Browser): Promise<string> {
  const ctx = await browser.newContext({ viewport: { width: 1280, height: 900 } });
  const page = await ctx.newPage();
  await guestLogin(page);
  await page.goto("/profile");
  await page.getByLabel("First name").fill(FRIEND.firstName);
  await page.getByLabel("Last name").fill(FRIEND.lastName);
  await page.getByLabel("Occupation").fill(FRIEND.occupation);
  await page.getByRole("button", { name: /Save/ }).first().click();
  await page.waitForTimeout(1500);
  await page.goto("/contacts/add?tab=code");
  const qr = page.getByRole("img", { name: /QR code for @/ });
  await expect(qr).toBeVisible();
  const label = (await qr.getAttribute("aria-label")) ?? "";
  const userName = label.replace(/^QR code for @/, "");
  const png = path.join(WORK_DIR, "friend-qr.png");
  await qr.screenshot({ path: png });
  await ctx.close();

  // A simulated camera feed: two seconds out of focus, then the code in focus.
  execFileSync("ffmpeg", [
    "-y",
    "-loglevel",
    "error",
    "-loop",
    "1",
    "-t",
    "6",
    "-framerate",
    "15",
    "-i",
    png,
    "-filter_complex",
    [
      "color=c=0xd8d8e0:s=640x480:r=15:d=6[bg]",
      "[0:v]scale=300:300:flags=neighbor,split[a][b]",
      "[a]boxblur=12:2[blur]",
      "[bg][blur]overlay=(W-w)/2:(H-h)/2:enable='lt(t,2.5)'[t1]",
      "[t1][b]overlay=(W-w)/2:(H-h)/2:enable='gte(t,2.5)',format=yuv420p[out]",
    ].join(";"),
    "-map",
    "[out]",
    "-t",
    "6",
    "-r",
    "15",
    FAKE_CAMERA,
  ]);
  return userName;
}

test("workflow 1: contacts", async ({ browser }) => {
  const w = workflow("workflow-1-contacts");
  const friendUserName = await prepareFriend(browser);

  const rec = await recordingBrowser([
    "--use-fake-ui-for-media-stream",
    "--use-fake-device-for-media-stream",
    `--use-file-for-fake-video-capture=${FAKE_CAMERA}`,
  ]);
  const context = await recordingContext(rec, { permissions: ["camera"] });
  const page = await context.newPage();
  const tour = new Tour(page, w);
  await tour.record();

  await page.goto("/");
  await expect(page.getByRole("heading", { level: 1 })).toBeVisible();
  await settle(page, 300);
  await tour.begin();
  await tour.step(1, 1600);
  await tour.click(page.getByRole("button", { name: /Try it as a guest/ }));
  await tour.quiet(() => page.waitForURL(/\/home/, { timeout: 60_000 }));
  await settle(page, 300);
  await tour.refresh();

  await tour.step(2, 2600);

  await tour.click(
    page.getByRole("navigation", { name: "Main" }).getByRole("link", { name: "Contacts" }),
  );
  await page.waitForURL(/\/contacts$/);
  const search = page.getByRole("searchbox", { name: "Search contacts" });
  await expect(search).toBeVisible();
  await tour.step(3, 1200);
  await tour.type(search, "chen", 140);
  await expect(page.getByRole("link", { name: /Ava Chen/ }).first()).toBeVisible();
  await tour.pause(1500);
  await search.fill("");
  await tour.pause(500);

  await tour.step(4, 900);
  await tour.click(page.getByRole("button", { name: /On 4399 CRM/ }));
  await tour.pause(1800);

  await tour.click(page.getByRole("link", { name: /QR \/ user name/ }));
  await page.waitForURL(/\/contacts\/add/);
  await tour.step(5, 900);
  await tour.click(page.getByRole("tab", { name: "User name" }));
  await tour.type(page.getByLabel("Their user name"), "demo", 150);
  await tour.pause(500);
  await tour.click(page.getByRole("button", { name: "Add contact" }));
  await tour.quiet(() => page.waitForURL(isContactPage, { timeout: 30_000 }));
  await expect(page.getByRole("heading", { name: /Jordan Lee/ })).toBeVisible();
  await settle(page, 300);
  await tour.step(6, 900);
  await tour.moveTo(page.getByText(/On 4399 CRM as/));
  await tour.pause(2400);

  await page.goto("/contacts/add?tab=code");
  await expect(page.getByRole("img", { name: /QR code for @guest-/ })).toBeVisible();
  await tour.refresh();
  await tour.step(7, 2600);

  await tour.click(page.getByRole("tab", { name: "Scan" }));
  await tour.step(8, 800);
  await tour.click(page.getByRole("button", { name: "Start camera" }));
  // Keep the camera feed in the video; cut the wait while the contact is saved.
  await expect(page.getByText("Adding contact…")).toBeVisible({ timeout: 30_000 });
  await tour.pause(700);
  await tour.quiet(() => page.waitForURL(isContactPage, { timeout: 30_000 }));
  await expect(
    page.getByRole("heading", { name: new RegExp(`${FRIEND.firstName} ${FRIEND.lastName}`) }),
  ).toBeVisible();
  await settle(page, 300);
  await tour.step(9, 900);
  await tour.moveTo(page.getByText(/On 4399 CRM as/));
  await tour.pause(2800);
  expect(friendUserName).toMatch(/^guest-/);

  await context.storageState({ path: GUEST_STATE });
  await tour.finish();
  await context.close();
  await rec.close();
});

/** Reuse the guest from workflow 1, or open a new sandbox when run on its own. */
async function guestState(browser: Browser): Promise<string> {
  if (existsSync(GUEST_STATE)) {
    const ctx = await browser.newContext({ storageState: GUEST_STATE });
    const page = await ctx.newPage();
    const res = await page.goto("/home");
    const ok = res?.ok() && /\/home/.test(page.url());
    await ctx.close();
    if (ok) return GUEST_STATE;
  }
  const ctx = await browser.newContext();
  const page = await ctx.newPage();
  await guestLogin(page);
  await ctx.storageState({ path: GUEST_STATE });
  await ctx.close();
  return GUEST_STATE;
}

test("workflow 2: log a meeting", async ({ browser }) => {
  const w = workflow("workflow-2-meeting");
  const state = await guestState(browser);
  const rec = await recordingBrowser();
  const context = await recordingContext(rec, { storageState: state });
  const page = await context.newPage();
  const tour = new Tour(page, w);
  await tour.record();

  await page.goto("/records");
  await settle(page, 300);
  await tour.begin();
  await tour.step(1, 1000);
  await tour.click(page.getByRole("button", { name: /New/ }).first());
  await tour.pause(600);
  await tour.click(page.getByRole("menuitem", { name: "Log a meeting" }));
  await page.waitForURL(/\/records\/new/);
  await mapReady(page, 300);

  await tour.step(2, 700);
  await tour.click(page.getByRole("combobox", { name: "Who did you meet?" }));
  await page.getByPlaceholder("Search contacts…").pressSequentially("Ava", { delay: 140 });
  await tour.pause(500);
  await tour.click(page.getByRole("option", { name: /Ava Chen/ }));
  await tour.pause(700);

  await tour.step(3, 700);
  const when = melbourneNow(-90);
  await tour.click(page.getByLabel("When"));
  await page.getByLabel("When").fill(`${when.date}T${when.time}`);
  await tour.pause(900);

  await tour.step(4, 700);
  await searchPlace(page, MEETING.place, (box) => tour.type(box, MEETING.place, 70));
  const option = page.getByRole("option", { name: /State Library/ }).first();
  await option.waitFor({ timeout: 20_000 });
  await tour.pause(900);
  await tour.moveTo(option);
  await tour.pause(400);
  await option.dispatchEvent("mousedown");

  await tour.step(5, 400);
  await mapReady(page, 2000);
  await expect(page.getByText(/Pinned at/)).toBeVisible();
  await expect(page.getByLabel("Location name")).toHaveValue(/State Library/);
  await tour.moveTo(page.getByText(/Pinned at/));
  await tour.pause(1200);

  await tour.step(6, 500);
  await tour.type(page.getByLabel("Notes"), MEETING.note, 12);
  await tour.pause(600);
  await tour.click(page.getByRole("button", { name: "Log meeting" }));
  await tour.quiet(() => page.waitForURL(isMeetingPage, { timeout: 30_000 }));
  await mapReady(page, 800);
  await tour.refresh();

  await tour.step(7, 1800);
  await tour.scrollTo(page.getByRole("heading", { name: "Notes" }), 360);
  await tour.pause(1600);

  await tour.click(
    page.getByRole("navigation", { name: "Main" }).getByRole("link", { name: "Map" }),
  );
  await page.waitForURL(/\/map$/);
  await mapReady(page, 1200);
  await tour.step(8, 600);
  await tour.click(page.getByRole("button", { name: "Last 30 days" }));
  await tour.pause(1500);
  const item = page
    .getByRole("button")
    .filter({ hasText: MEETING.contact })
    .filter({ hasText: /State Library/ })
    .first();
  await tour.click(item);
  await tour.pause(2600);

  await tour.click(
    page.getByRole("navigation", { name: "Main" }).getByRole("link", { name: "Calendar" }),
  );
  await page.waitForURL(/\/calendar/);
  await settle(page, 300);
  await tour.step(9, 600);
  const entry = page.getByRole("link").filter({ hasText: MEETING.contact }).first();
  await expect(entry).toBeVisible();
  await tour.moveTo(entry);
  await tour.pause(2800);

  await tour.finish();
  await context.close();
  await rec.close();
});

test("workflow 3: AI with a human in the loop", async ({ browser }) => {
  const w = workflow("workflow-3-ai");
  const state = await guestState(browser);
  const rec = await recordingBrowser();
  const context = await recordingContext(rec, { storageState: state });

  // Never reach the provider: answer the browser's request with a labelled mock.
  let providerCalls = 0;
  await context.route("https://api.anthropic.com/**", async (route) => {
    const cors = {
      "access-control-allow-origin": "*",
      "access-control-allow-headers": "*",
      "access-control-allow-methods": "POST, OPTIONS",
    };
    if (route.request().method() === "OPTIONS") {
      await route.fulfill({ status: 204, headers: cors });
      return;
    }
    providerCalls += 1;
    await new Promise((r) => setTimeout(r, 1400));
    await route.fulfill({
      status: 200,
      headers: { ...cors, "content-type": "application/json" },
      body: JSON.stringify({
        id: "msg_mocked_for_showcase",
        type: "message",
        role: "assistant",
        model: "mocked-response-no-model-called",
        stop_reason: "end_turn",
        content: [{ type: "text", text: JSON.stringify(MOCKED_OUTPUT) }],
        usage: { input_tokens: 0, output_tokens: 0 },
      }),
    });
  });
  await context.route("https://api.openai.com/**", (route) => route.abort());

  const page = await context.newPage();
  const tour = new Tour(page, w);
  await tour.record();

  await page.goto("/records");
  const search = page.getByRole("searchbox", { name: "Search meetings" });
  await expect(search).toBeVisible();
  await settle(page, 300);
  await tour.begin();
  await tour.step(1, 800);
  await tour.type(search, "guild", 120);
  const meeting = meetingLinks(page).filter({ hasText: MEETING.contact }).first();
  await expect(meeting).toBeVisible();
  await tour.pause(700);
  await tour.click(meeting);
  await page.waitForURL(isMeetingPage);
  await mapReady(page, 500);
  await tour.refresh();
  await tour.scrollTo(page.getByRole("heading", { name: "Notes" }), 140);
  await tour.pause(1500);

  await tour.step(2, 600);
  await tour.click(page.getByRole("button", { name: /Summarise note/ }));
  const preview = page.getByLabel("Exact message that will be sent");
  await expect(preview).toContainText("[PHONE]");
  await expect(preview).toContainText("[EMAIL]");
  await tour.scrollTo(page.getByRole("heading", { name: /Meeting-note assistant/ }), 80);
  await tour.moveTo(preview);
  await tour.pause(3200);

  await tour.step(3, 600);
  await tour.click(page.getByRole("button", { name: "Add your API key to continue" }));
  const dialog = page.getByRole("dialog", { name: "AI settings" });
  await expect(dialog).toBeVisible();
  await tour.pause(1500);
  await tour.type(dialog.getByLabel(/API key/), PLACEHOLDER_KEY, 35);
  await tour.pause(600);
  await tour.moveTo(dialog.getByText("Remember on this device"));
  await tour.pause(1500);
  await tour.click(dialog.getByRole("button", { name: "Save" }));
  await tour.pause(900);

  await tour.badge("Mocked AI response for illustration");
  await tour.step(4, 500);
  await tour.click(page.getByRole("button", { name: /Send to/ }));
  await expect(page.getByText(/Mocked response for illustration/)).toBeVisible();
  expect(providerCalls).toBe(1);
  await tour.pause(800);

  await tour.step(5, 1200);
  await tour.moveTo(page.getByRole("button", { name: "Edit" }));
  await tour.pause(700);
  await tour.moveTo(page.getByRole("button", { name: "Reject" }));
  await tour.pause(700);
  await tour.click(page.getByRole("button", { name: "Accept" }));
  await expect(page.getByRole("heading", { name: /AI-assisted summary/ })).toBeVisible();
  await tour.pause(600);

  await tour.step(6, 400);
  await tour.scrollTo(page.getByRole("heading", { name: /AI-assisted summary/ }), 160);
  await tour.pause(2400);

  await tour.click(page.getByRole("link", { name: "AI log" }).first());
  await page.waitForURL(/\/ai-log$/);
  await settle(page, 300);
  await tour.refresh();
  await tour.step(7, 3200);

  await tour.click(page.getByRole("link", { name: "Activity log" }).first());
  await page.waitForURL(/\/activity/);
  await settle(page, 300);
  await tour.step(8, 3000);

  await tour.click(page.getByRole("link", { name: "Your data" }).first());
  await page.waitForURL(/\/your-data$/);
  await settle(page, 300);
  await tour.step(9, 1200);
  const downloadPromise = page.waitForEvent("download");
  await tour.click(page.getByRole("link", { name: /All data \(JSON\)/ }));
  const download = await downloadPromise;
  const file = path.join(WORK_DIR, "export-data.json");
  await download.saveAs(file);
  const exported = JSON.parse(readFileSync(file, "utf8")) as Record<string, unknown>;
  const summary = Object.entries(exported)
    .filter(([, v]) => Array.isArray(v))
    .map(([k, v]) => `${k}: ${(v as unknown[]).length}`)
    .join(" · ");
  await page.evaluate(
    ({ name, size, summary }) => {
      const el = document.createElement("div");
      el.id = "__tour-download";
      el.setAttribute("aria-hidden", "true");
      el.style.cssText =
        "position:fixed;right:20px;top:64px;z-index:2147483646;max-width:420px;padding:14px 16px;border-radius:14px;" +
        "background:#fff;color:#16161d;border:1px solid #e3e3ea;box-shadow:0 12px 32px rgba(0,0,0,.18);" +
        "font:500 14px/1.45 ui-sans-serif,system-ui,sans-serif";
      el.innerHTML = `<div style="font-weight:650">Downloaded ${name}</div><div style="opacity:.7">${size}</div><div style="margin-top:6px;font:12px/1.5 ui-monospace,monospace">${summary}</div>`;
      document.body.appendChild(el);
    },
    {
      name: download.suggestedFilename(),
      size: `${(Buffer.byteLength(readFileSync(file)) / 1024).toFixed(1)} KB, readable JSON`,
      summary,
    },
  );
  await tour.pause(3600);
  await page.evaluate(() => document.getElementById("__tour-download")?.remove());

  await tour.badge(null);
  await tour.step(10, 600);
  await tour.click(page.getByRole("button", { name: /AI settings/ }).first());
  const settings = page.getByRole("dialog", { name: "AI settings" });
  await expect(settings).toBeVisible();
  await tour.pause(800);
  await tour.click(settings.getByRole("button", { name: "Forget keys" }));
  await tour.pause(2200);

  writeFileSync(path.join(WORK_DIR, "export-summary.txt"), summary);
  await tour.finish();
  await context.close();
  await rec.close();
});
