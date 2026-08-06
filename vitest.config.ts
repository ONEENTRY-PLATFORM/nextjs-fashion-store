import { defineConfig } from 'vitest/config';
import react from '@vitejs/plugin-react';
import path from 'node:path';
import { cpus } from 'node:os';
import { fileURLToPath } from 'node:url';
import { storybookTest } from '@storybook/addon-vitest/vitest-plugin';
import { playwright } from '@vitest/browser-playwright';
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
        exclude: ['node_modules', 'tests/e2e/**', '.next', 'playwright-report', 'storybook-static'],
        // Capped deliberately. Vitest's default (~cores-1 forks) starves the
        // pool on this suite: each fork boots its own jsdom + transform
        // pipeline, and forks start failing with "Timeout waiting for worker
        // to respond". That failure mode is dangerous because the affected
        // files are never collected — the run reports a green-looking subset
        // (47 of 67 files) instead of an error. A third of the cores keeps
        // every file collected and is ~5x faster in wall-clock.
        maxWorkers: Math.max(2, Math.ceil(cpus().length / 3)),
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