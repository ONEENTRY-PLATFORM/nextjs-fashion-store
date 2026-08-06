// This file sits next to the root `tsconfig.json`, which excludes it, so the
// editor loads it as an inferred project that pulls in no `@types` — without
// this directive every `process.env` below is "Cannot find name 'process'".
// `tests/e2e/tsconfig.json` covers the specs themselves; only this root-level
// file falls outside its directory-based lookup.
/// <reference types="node" />
import { defineConfig, devices } from '@playwright/test';
import { loadEnvConfig } from '@next/env';

// The Playwright runner does not read `.env.local` on its own — only the
// Next.js dev server it spawns does. Without this every `process.env.E2E_*`
// lookup in a spec is `undefined` and the `test.skip(!ENV, …)` guards silently
// skip the whole authorised suite (MCP `playwright-e2e`). `@next/env` ships
// with Next itself, so no extra dependency is needed.
loadEnvConfig(process.cwd());

export default defineConfig({
  testDir: './tests/e2e',
  fullyParallel: true,
  forbidOnly: !!process.env.CI,
  // Was declared twice before — the second literal silently won, so CI ran
  // with 1 retry instead of the intended 2.
  retries: process.env.CI ? 2 : 1,
  workers: process.env.CI ? 1 : undefined,
  reporter: 'html',
  timeout: 60_000,
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
    navigationTimeout: 30_000,
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

  webServer: {
    command: 'npx next dev -p 3001',
    url: 'http://localhost:3001',
    reuseExistingServer: true,
    timeout: 120_000,
  },
});
