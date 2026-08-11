import { cpus } from 'node:os';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

import { storybookTest } from '@storybook/addon-vitest/vitest-plugin';
import react from '@vitejs/plugin-react';
import { playwright } from '@vitest/browser-playwright';
import { defineConfig } from 'vitest/config';

const dirname = typeof __dirname !== 'undefined' ? __dirname : path.dirname(fileURLToPath(import.meta.url));

// More info at: https://storybook.js.org/docs/next/writing-tests/integrations/vitest-addon
export default defineConfig({
  plugins: [react()],
  // Mirrors the `@/*` → `./src/*` mapping in tsconfig.json. Without it any
  // test that pulls in a module importing through the alias — e.g.
  // external-origin.test.ts reaching into app/auth/callback/google/route.ts —
  // dies during collection with "Failed to resolve import".
  resolve: {
    alias: { '@': path.resolve(dirname, 'src') }
  },
  test: {
    // `next-transition-router` ships ESM that imports `next/navigation` as a
    // bare specifier, which Node's resolver (used for externalised deps)
    // refuses — "Did you mean to import next/navigation.js?". Only
    // `PageTransition` imports the library, so this matters just for tests
    // that render it; inlined, Vite resolves the import the same way it does
    // for the app's own code.
    server: { deps: { inline: ['next-transition-router'] } },
    projects: [{
      extends: true,
      test: {
        name: 'unit',
        environment: 'jsdom',
        globals: true,
        include: ['tests/**/*.{test,spec}.{ts,tsx}'],
        // `tests/e2e/**` is load-bearing, not leftover: the Playwright suite
        // now lives under `tests/`, its files are named `*.spec.ts`, and the
        // include glob above matches `spec` as well. Without this the jsdom
        // runner would collect 21 Playwright specs and fail them all on the
        // missing `@playwright/test` runner context.
        exclude: [
          'node_modules',
          'tests/e2e/**',
          '.next',
          'playwright-report',
          'storybook-static'
        ],
        // Capped deliberately. Vitest's default (~cores-1 forks) starves the
        // pool on this suite: each fork boots its own jsdom + transform
        // pipeline, and forks start failing with "Timeout waiting for worker
        // to respond". That failure mode is dangerous because the affected
        // files are never collected — the run reports a green-looking subset
        // (47 of 67 files) instead of an error.
        //
        // Was `/ 3`, which held while the suite was smaller. At 74 files it
        // started losing 5–9 tests per run, in a different file each time
        // (reviews, stores, google-oauth, PageBlocksRenderer…), while every
        // one of them passed in isolation — contention, not a real failure.
        // `/ 4` was green across repeated full runs; the extra headroom costs
        // a little wall-clock and buys a trustworthy signal.
        maxWorkers: Math.max(2, Math.ceil(cpus().length / 4)),
        // Vitest rejects projects that share a groupOrder but disagree on
        // maxWorkers. Distinct orders also stop the jsdom forks and the
        // storybook project's chromium from competing for the same cores.
        sequence: { groupOrder: 0 }
      }
    }, {
      extends: true,
      plugins: [
      // The plugin will run tests for the stories defined in your Storybook config
      // See options at: https://storybook.js.org/docs/next/writing-tests/integrations/vitest-addon#storybooktest
      storybookTest({
        configDir: path.join(dirname, '.storybook')
      })],
      test: {
        name: 'storybook',
        sequence: { groupOrder: 1 },
        browser: {
          enabled: true,
          headless: true,
          provider: playwright({}),
          instances: [{
            browser: 'chromium'
          }]
        }
      }
    }]
  }
});