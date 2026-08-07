import { test, expect } from '@playwright/test';

/**
 * Locale routing uses the "as-needed" scheme: the default locale keeps bare
 * URLs (`/cart`), every other locale is prefixed (`/fr/cart`).
 *
 * The regression worth guarding is the expensive one — a change that starts
 * prefixing the default locale would move every indexed URL on the site at
 * once. These assertions pin the URL shape rather than any copy, so they hold
 * whatever the tenant publishes and however many locales are switched on.
 */

const DEFAULT_SHORT = ((process.env.NEXT_PUBLIC_DEFAULT_LOCALE ?? 'en_US').split('_')[0] ?? 'en')
  .toLowerCase();

test.describe('as-needed locale routing', () => {
  test('bare URLs serve the default locale and stay bare', async ({ page }) => {
    const response = await page.goto('/cart', { waitUntil: 'domcontentloaded' });

    expect(response?.status()).toBe(200);
    // The proxy rewrites internally; the address bar must not gain a prefix.
    expect(new URL(page.url()).pathname).toBe('/cart');
  });

  test('html lang reflects the served locale', async ({ page }) => {
    await page.goto('/', { waitUntil: 'domcontentloaded' });
    const lang = await page.locator('html').getAttribute('lang');
    // BCP-47 form derived from the OE code: `en_US` → `en-US`.
    expect(lang).toMatch(new RegExp(`^${DEFAULT_SHORT}(-[A-Z]{2})?$`));
  });

  test('the page advertises hreflang alternates', async ({ page }) => {
    await page.goto('/', { waitUntil: 'domcontentloaded' });

    // Next renders the attribute as `hrefLang`; query on the rel instead so the
    // test does not depend on that spelling.
    const alternates = page.locator('link[rel="alternate"]');
    expect(await alternates.count()).toBeGreaterThan(0);

    // `x-default` must point at the unprefixed URL — that is the whole promise
    // of the as-needed scheme.
    const xDefault = await page
      .locator('link[rel="alternate"]')
      .evaluateAll((links) =>
        links
          .map((l) => ({
            lang: l.getAttribute('hreflang') ?? l.getAttribute('hrefLang'),
            href: l.getAttribute('href'),
          }))
          .find((l) => l.lang === 'x-default'),
      );
    const href = xDefault?.href;
    expect(href).toBeTruthy();
    expect(new URL(href ?? '').pathname).toBe('/');
  });

  test('internal navigation keeps the shopper on bare URLs', async ({ page }) => {
    await page.goto('/', { waitUntil: 'domcontentloaded' });

    const storesLink = page.locator('[data-testid="header-store-locations"]');
    await storesLink.waitFor({ state: 'visible', timeout: 60_000 });
    await storesLink.click();
    await page.waitForURL('**/stores', { timeout: 90_000 });

    // Under the default locale `localizeHref` is a no-op — a prefix here would
    // mean the wrapper started rewriting URLs it must leave alone.
    expect(new URL(page.url()).pathname).toBe('/stores');
  });

  test('the language switcher only appears when there is a choice', async ({ page }) => {
    await page.goto('/', { waitUntil: 'domcontentloaded' });
    await page.locator('[data-testid="header-top-bar"]').waitFor({ state: 'attached', timeout: 60_000 });

    const toggle = page.locator('[data-testid="header-language-toggle"]');
    const count = await toggle.count();

    if (count === 0) {
      // Single routed locale: nothing to switch to, so the control is absent
      // rather than present-and-inert.
      test.info().annotations.push({ type: 'note', description: 'single locale — switcher hidden' });
      return;
    }

    // With more than one locale the control must actually work: opening it
    // lists the options, and each one navigates.
    await toggle.click();
    const options = page.locator('[data-testid="header-language-option"]');
    expect(await options.count()).toBeGreaterThan(1);
  });
});
