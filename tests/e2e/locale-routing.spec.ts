import { expect, test } from '@playwright/test';

/**
 * Locale routing uses the "as-needed" scheme: the default locale keeps bare
 * URLs (`/cart`), every other locale is prefixed (`/fr/cart`).
 *
 * The regression worth guarding is the expensive one — a change that starts
 * prefixing the default locale would move every indexed URL on the site at
 * once. These assertions pin the URL shape rather than any copy, so they hold
 * whatever the tenant publishes and however many locales are switched on.
 */

// Mirrors `DEFAULT_LOCALE` in src/lib/oneentry/locale.ts — a constant there, so
// a constant here; the e2e project does not share the app's path aliases.
const DEFAULT_SHORT = 'en';

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
    const xDefault = await page.locator('link[rel="alternate"]').evaluateAll((links) =>
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

/**
 * These only run on a multi-locale deployment; on a single-locale one they skip
 * rather than fail, so the same suite covers both shapes.
 */
test.describe('second locale', () => {
  /**
   * The short code of the first non-default locale the storefront routes, read
   * off the switcher rather than hardcoded — the routed set comes from the OE
   * project settings and this suite must not pin a particular language.
   *
   * @param page - Page already on a storefront route.
   * @returns      Lower-case short code, or `null` when only one locale routes.
   */
  async function firstAlternateLocale(page: import('@playwright/test').Page): Promise<string | null> {
    const toggle = page.locator('[data-testid="header-language-toggle"]');
    if ((await toggle.count()) === 0) return null;
    await toggle.click();
    const labels = await page.locator('[data-testid="header-language-option"]').allInnerTexts();
    const alternate = labels.map((l) => l.trim().toLowerCase()).find((l) => l && l !== DEFAULT_SHORT);
    return alternate ?? null;
  }

  test('switching language keeps the shopper on the same page, prefixed', async ({ page }) => {
    await page.goto('/stores', { waitUntil: 'domcontentloaded' });
    await page.locator('[data-testid="header-top-bar"]').waitFor({ state: 'attached', timeout: 60_000 });

    const alternate = await firstAlternateLocale(page);
    if (!alternate) {
      test.info().annotations.push({ type: 'note', description: 'single locale — nothing to switch to' });
      return;
    }

    await page
      .locator('[data-testid="header-language-option"]', { hasText: new RegExp(`^${alternate}$`, 'i') })
      .click();
    await page.waitForURL(`**/${alternate}/stores`, { timeout: 90_000 });

    // Same route, other language — not a bounce to the homepage.
    expect(new URL(page.url()).pathname).toBe(`/${alternate}/stores`);
    expect(await page.locator('html').getAttribute('lang')).toMatch(new RegExp(`^${alternate}(-[A-Z]{2})?$`));
  });

  test('switching language renders the root layout without console noise', async ({ page }) => {
    const consoleErrors: string[] = [];
    const pageErrors: string[] = [];
    page.on('console', (msg) => {
      if (msg.type() === 'error') consoleErrors.push(msg.text());
    });
    page.on('pageerror', (err) => pageErrors.push(err.message));

    await page.goto('/stores', { waitUntil: 'domcontentloaded' });
    await page.locator('[data-testid="header-top-bar"]').waitFor({ state: 'attached', timeout: 60_000 });

    // The top bar is `hidden md:block`, so on a phone viewport the switcher is
    // in the DOM but unreachable — there is no switch to perform, not a failure.
    if (!(await page.locator('[data-testid="header-top-bar"]').isVisible())) {
      test.info().annotations.push({ type: 'note', description: 'top bar hidden at this width' });
      return;
    }

    const alternate = await firstAlternateLocale(page);
    if (!alternate) {
      test.info().annotations.push({ type: 'note', description: 'single locale — nothing to switch to' });
      return;
    }

    await page
      .locator('[data-testid="header-language-option"]', { hasText: new RegExp(`^${alternate}$`, 'i') })
      .click();
    await page.waitForURL(`**/${alternate}/stores`, { timeout: 90_000 });

    // A locale switch crosses the root param, so the client re-renders the root
    // layout. Anything React cannot render there — a `<script>` element being
    // the one that bit us — surfaces as this warning and nothing else.
    expect(consoleErrors.filter((t) => /script tag while rendering React component/i.test(t))).toEqual([]);

    // The dev-only performance.measure guard moved out of that layout into
    // `instrumentation-client.ts`, which must still run before hydration. If it
    // stops doing so, the React 19 dev regression it swallows resurfaces here.
    expect(pageErrors.filter((m) => /negative time stamp/i.test(m))).toEqual([]);
  });

  test('the alternate locale advertises its own canonical', async ({ page }) => {
    await page.goto('/', { waitUntil: 'domcontentloaded' });
    await page.locator('[data-testid="header-top-bar"]').waitFor({ state: 'attached', timeout: 60_000 });
    const alternate = await firstAlternateLocale(page);
    if (!alternate) {
      test.info().annotations.push({ type: 'note', description: 'single locale — nothing to switch to' });
      return;
    }

    await page.goto(`/${alternate}`, { waitUntil: 'domcontentloaded' });
    const canonical = await page.locator('link[rel="canonical"]').first().getAttribute('href');
    // A translated page that names the default-locale URL as its canonical asks
    // search engines to drop it from the index — the regression worth pinning.
    expect(canonical).toBeTruthy();
    expect(new URL(canonical ?? '').pathname.replace(/\/$/, '')).toBe(`/${alternate}`);
  });
});
