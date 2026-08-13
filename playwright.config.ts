// This file sits next to the root `tsconfig.json`, which excludes it, so the
// editor loads it as an inferred project that pulls in no `@types` — without
// this directive every `process.env` below is "Cannot find name 'process'".
// `tests/e2e/tsconfig.json` covers the specs themselves; only this root-level
// file falls outside its directory-based lookup.
/// <reference types="node" />
import { loadEnvConfig } from '@next/env';
import { defineConfig, devices } from '@playwright/test';

// The Playwright runner does not read `.env.local` on its own — only the
// Next.js dev server it spawns does. Without this every `process.env.E2E_*`
// lookup in a spec is `undefined` and the `test.skip(!ENV, …)` guards silently
// skip the whole authorised suite (MCP `playwright-e2e`). `@next/env` ships
// with Next itself, so no extra dependency is needed.
loadEnvConfig(process.cwd());

export default defineConfig({
  testDir: './tests/e2e',
  // Compiles `/` and the other heavy routes before the first test runs, so the
  // cold Turbopack build is not billed to whichever spec happens to navigate
  // first. Without it the suite failed-then-passed-on-retry and reported
  // `flaky` — a status that hides a genuinely broken first attempt.
  globalSetup: './tests/e2e/global-setup.ts',
  fullyParallel: true,
  forbidOnly: !!process.env.CI,
  // Was declared twice before — the second literal silently won, so CI ran
  // with 1 retry instead of the intended 2.
  retries: process.env.CI ? 2 : 1,
  // Locally the suite runs against `next dev`, which compiles per route and is
  // the bottleneck — the default (one worker per core pair) just queues six
  // browsers behind one compiler and turns slow renders into failures.
  workers: process.env.CI ? 1 : 2,
  reporter: 'html',
  // Per-test budget, sized to hold two or three navigations at the
  // `navigationTimeout` below — most specs open `/`, clear storage, reload, and
  // only then start asserting.
  timeout: 240_000,
  expect: { timeout: 15_000 },

  use: {
    // Deliberately NOT `BASE_URL`: that variable is the app's public canonical
    // origin (sitemap, OG tags) and loading `.env` above would silently point
    // the whole suite at the deployed site instead of the server started below.
    baseURL: process.env.E2E_BASE_URL || 'http://localhost:3001',
    trace: 'on-first-retry',
    screenshot: 'only-on-failure',
    video: 'retain-on-failure',
    // OneEntry is slow on a cold dev server — the first form / catalogue fetch
    // routinely takes several seconds.
    actionTimeout: 15_000,
    // `/` is the expensive one: seven OneEntry loaders behind a Turbopack
    // compile, and every spec's `beforeEach` starts there. Measured on a loaded
    // dev machine (two sessions sharing one server) it answered in 6 s, 59 s and
    // 70 s on three consecutive requests — so a 30 s ceiling failed specs whose
    // subject was something else entirely, and failed them as a navigation
    // timeout that reads exactly like a broken page. `global-setup.ts` warms the
    // heavy routes, but its own budget is best-effort and the caches it fills
    // (ISR, the 5-minute form cache) expire mid-suite.
    navigationTimeout: 120_000,
  },

  projects: [
    {
      name: 'chromium',
      use: { ...devices['Desktop Chrome'] },
    },
    {
      name: 'mobile',
      use: { ...devices['iPhone 14'] },
    },
  ],

  // Skipped when `E2E_BASE_URL` names a server that is already running. Next 16
  // refuses to start a second `next dev` in the same directory ("Another next
  // dev server is already running"), so with a dev server up on :3000 the
  // spawn below fails and takes the whole run with it — even though the suite
  // was pointed somewhere else entirely.
  ...(process.env.E2E_BASE_URL
    ? {}
    : {
        webServer: {
          command: 'npx next dev -p 3001',
          url: 'http://localhost:3001',
          reuseExistingServer: true,
          timeout: 120_000,
        },
      }),
});
