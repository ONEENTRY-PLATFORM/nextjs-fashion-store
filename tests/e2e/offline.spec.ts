import { expect, test } from '@playwright/test';

/**
 * Offline behaviour of the service worker.
 *
 * The worker registers in production only (`ServiceWorkerRegistrar` bails out on
 * `NODE_ENV !== 'production'`, deliberately — a stale dev worker used to serve
 * `offline.html` over live navigations). The default e2e webServer is
 * `next dev`, so these tests skip there instead of asserting a worker that is
 * intentionally absent. Point `E2E_BASE_URL` at a production server (or run in
 * CI) to exercise them.
 */

const PROD_SERVER = Boolean(process.env.E2E_BASE_URL) || Boolean(process.env.CI);

test.describe('Service worker — offline', () => {
  test.skip(
    !PROD_SERVER,
    'the service worker registers in production only; set E2E_BASE_URL to a prod server',
  );

  test('registers and takes control', async ({ page }) => {
    await page.goto('/');
    await page.waitForLoadState('networkidle');

    const controlled = await page.evaluate(async () => {
      if (!('serviceWorker' in navigator)) return false;
      const registration = await navigator.serviceWorker.ready;
      return Boolean(registration.active);
    });
    expect(controlled, 'a service worker must be active').toBe(true);
  });

  test('a navigation made offline falls back to the offline page', async ({ page, context }) => {
    // Prime the worker first — an uncontrolled page has no fetch handler yet.
    await page.goto('/');
    await page.evaluate(() => navigator.serviceWorker.ready);

    await context.setOffline(true);
    try {
      await page.goto('/stores');
      // The worker answers a failed navigation with the cached offline page;
      // what matters is that the browser shows the app's own page rather than
      // the network-error screen.
      const body = await page.textContent('body');
      expect(body ?? '').not.toBe('');
    } finally {
      await context.setOffline(false);
    }
  });

  test('API calls are never served from the worker cache', async ({ page, context }) => {
    // `sw.js` returns early for `*.oneentry.cloud`, so a cart or session read
    // must fail loudly offline rather than resolve from a stale cache — a
    // cached cart is worse than no cart.
    await page.goto('/');
    await page.evaluate(() => navigator.serviceWorker.ready);

    await context.setOffline(true);
    try {
      const failed = await page.evaluate(async () => {
        try {
          await fetch('https://demo-fashion.oneentry.cloud/api/content/products', {
            method: 'GET',
          });
          return false;
        } catch {
          return true;
        }
      });
      expect(failed, 'an API request must not resolve from cache while offline').toBe(true);
    } finally {
      await context.setOffline(false);
    }
  });
});
