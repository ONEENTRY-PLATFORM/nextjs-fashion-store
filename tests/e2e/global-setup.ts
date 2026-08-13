/// <reference types="node" />
import { chromium, type FullConfig } from '@playwright/test';

import { DEFAULT_SHORT_LOCALE, SHORT_LOCALES } from '@/lib/oneentry/locale';

/**
 * Routes worth compiling before the first test navigates to one.
 *
 * `/` heads the list because most specs open it in `beforeEach` just to reach
 * the header, and it is the most expensive route in the app — seven OneEntry
 * loaders behind a cold Turbopack compile. The rest are the other heavy
 * entries specs land on directly.
 *
 * The non-default locales get `/account` too: a prefixed URL is its own render
 * (different root params, different CMS reads), so warming only the default
 * left `/de/account` cold and the locale specs paid for it. Derived from the
 * project's locale list rather than hardcoded, so a tenant that adds a
 * language does not silently reintroduce the gap.
 */
const WARM_PATHS = [
  '/',
  '/women/clothing',
  '/sale',
  '/new',
  '/account',
  // Cheap to render but landed on first by the header specs, which then paid
  // the compile inside a `beforeEach` and reported it as a header failure.
  '/cart',
  '/favorites',
  '/stores',
  ...SHORT_LOCALES.filter((l) => l !== DEFAULT_SHORT_LOCALE).map((l) => `/${l}/account`),
];

/** Per-request ceiling. Generous: this is the compile we are paying for. */
const WARM_TIMEOUT_MS = 90_000;

/** How long to wait for the dev server's port to answer at all. */
const SERVER_READY_TIMEOUT_MS = 120_000;

/**
 * Poll the base URL until something answers.
 *
 * Any HTTP response counts as ready — a 404 still proves the server is up, and
 * this hook has no business asserting on status codes.
 *
 * @param   baseURL - Origin the suite will run against.
 * @returns           `true` once the server answers, `false` on timeout.
 */
async function waitForServer(baseURL: string): Promise<boolean> {
  const deadline = Date.now() + SERVER_READY_TIMEOUT_MS;
  while (Date.now() < deadline) {
    try {
      await fetch(baseURL, { method: 'HEAD' });
      return true;
    } catch {
      await new Promise((resolve) => setTimeout(resolve, 1_000));
    }
  }
  return false;
}

/**
 * Compile the heavy routes once, before any test starts.
 *
 * Playwright's `navigationTimeout` (30 s) is a per-test budget, but the first
 * request to a route on a freshly started `next dev` pays for its whole
 * compile plus a cold OneEntry fetch — routinely more than that for `/`. The
 * result was a suite that failed its first attempt and passed on retry, which
 * Playwright reports as `flaky`: a status that reads almost like a pass, so a
 * genuinely broken first run looks the same as a slow one.
 *
 * Warming here moves that cost outside every test's clock. Failures are
 * swallowed on purpose — this is an optimisation, and a route that cannot be
 * reached should fail inside the test that asserts on it, with that test's
 * diagnostics, not in an opaque setup step.
 *
 * Driven through a real browser rather than `fetch`. A plain request compiles
 * the *server* route and stops there; the client bundle is still built on
 * first browser visit, and until it has hydrated the header is inert — which
 * is exactly what specs wait on (`login()` waits for the account button). A
 * fetch-only warm-up left that half of the cost in the first test's budget.
 *
 * @param config - Playwright's resolved config, read for `baseURL`.
 * @returns Resolves once every route has been visited and hydrated.
 */
export default async function globalSetup(config: FullConfig): Promise<void> {
  const baseURL = config.projects[0]?.use?.baseURL ?? process.env.E2E_BASE_URL ?? 'http://localhost:3001';

  // Whether Playwright starts `webServer` before or after this hook is a
  // version detail, and getting it wrong would silently turn the warm-up into
  // a no-op (every request would fail against a dead port and be swallowed
  // below). Waiting for the port makes the ordering irrelevant.
  if (!(await waitForServer(baseURL))) return;

  const browser = await chromium.launch();
  try {
    // Sequentially, one page: the point is to pay the compile cost once, and
    // firing five cold routes at one `next dev` in parallel is the very
    // contention this hook exists to avoid.
    const page = await browser.newPage({ baseURL });
    page.setDefaultNavigationTimeout(WARM_TIMEOUT_MS);
    for (const path of WARM_PATHS) {
      try {
        await page.goto(path, { waitUntil: 'domcontentloaded' });
        // Give hydration a moment to run — `networkidle` would wait on the
        // CMS image firehose, which is not what we are warming.
        await page.waitForLoadState('load');
      } catch {
        /* unreachable route — let the owning test report it */
      }
    }
  } finally {
    await browser.close();
  }
}
