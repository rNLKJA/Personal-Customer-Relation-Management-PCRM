import { defineConfig } from "@playwright/test";

/**
 * The showcase tour (`pnpm showcase`): screenshots and narrated workflow
 * recordings of the live site, which double as end-to-end tests of the main
 * journeys. It drives the locally installed Google Chrome (`channel: "chrome"`),
 * so no Playwright browser download is needed.
 *
 *   BASE_URL=http://localhost:3000 pnpm showcase:record   # against a local build
 *   pnpm showcase                                        # production, then encode media
 */
const BASE_URL = (process.env.BASE_URL ?? "https://comp30022-personal-crm.vercel.app").replace(
  /\/$/,
  "",
);

export default defineConfig({
  testDir: "e2e",
  outputDir: ".showcase/test-results",
  // The recordings are paced for people, not for speed.
  timeout: 6 * 60_000,
  expect: { timeout: 20_000 },
  fullyParallel: false,
  workers: 1,
  retries: 0,
  reporter: [["list"]],
  use: {
    baseURL: BASE_URL,
    channel: "chrome",
    headless: process.env.HEADED ? false : true,
    locale: "en-AU",
    timezoneId: "Australia/Melbourne",
    actionTimeout: 20_000,
    navigationTimeout: 45_000,
    launchOptions: {
      // MapLibre needs WebGL (rendered in software when headless); --lang sets
      // the Australian date format of native date inputs.
      args: ["--enable-unsafe-swiftshader", "--use-angle=swiftshader", "--lang=en-AU"],
    },
  },
});
