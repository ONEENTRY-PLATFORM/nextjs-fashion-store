import { expect, type Page, test } from '@playwright/test';

/**
 * Page transitions.
 *
 * Before this feature every page component rendered its own `<Header>` and
 * `<Footer>`, so a navigation tore the chrome down and rebuilt it while the
 * route skeleton painted a grey bar over the header's place. These specs pin
 * the two properties that fixed it: the chrome is never remounted, and the
 * content column animates through the router's leave/enter stages instead of
 * being swapped in place.
 *
 * Kept to two tests on purpose. Each one has to sit through a full hydration
 * of the (heavy, CMS-driven) homepage before it can click anything, so extra
 * cases cost far more wall-clock than the assertions are worth — the related
 * checks share a single navigation instead.
 */

/**
 * Wait until link clicks are intercepted client-side rather than reloading.
 *
 * Generous by design: hydration of the homepage on the WebKit (mobile) project
 * against a dev server lands well past the default expect budget.
 */
async function waitForHydration(page: Page) {
  await expect(page.getByTestId('page-transition')).toHaveAttribute('data-hydrated', 'true', { timeout: 60_000 });
}

/**
 * Tag the live chrome nodes and start recording the content column's stages.
 *
 * A client-side navigation keeps the same DOM elements, so the tags survive;
 * a remount (or a full page load) drops them — and drops the recorder with it.
 */
async function tagChromeAndRecordStages(page: Page) {
  await page.evaluate(() => {
    document.querySelector('[data-testid="site-header"]')?.setAttribute('data-e2e-tag', 'header');
    document.querySelector('[data-testid="site-footer"]')?.setAttribute('data-e2e-tag', 'footer');

    const el = document.querySelector('[data-testid="page-transition"]');
    if (!el) return;
    const seen: string[] = [];
    (window as unknown as { __stages: string[] }).__stages = seen;
    new MutationObserver(() => {
      seen.push(el.getAttribute('data-stage') ?? '');
    }).observe(el, { attributes: true, attributeFilter: ['data-stage'] });
  });
}

/** Stages the content column has passed through since the recorder started. */
function recordedStages(page: Page) {
  return page.evaluate(() => (window as unknown as { __stages?: string[] }).__stages ?? []);
}

/** A product card on the homepage — the most reliable in-page link there is. */
function firstProductLink(page: Page) {
  return page.locator('a[href*="/product/"]').first();
}

test.describe('Page transitions', () => {
  // Each spec waits for a full hydration of the homepage before it can click
  // anything; on the WebKit project that alone outruns the default 60 s test
  // budget on a dev server.
  test.slow();

  test.beforeEach(async ({ page }) => {
    // `domcontentloaded`, not the default `load`: the homepage pulls a hero
    // slider and several CMS-driven carousels, so waiting for every image to
    // finish routinely outlives the 30 s navigation budget on a dev server.
    // Hydration — the thing these specs actually depend on — is awaited below.
    await page.goto('/', { waitUntil: 'domcontentloaded' });
    await waitForHydration(page);
  });

  test('a link click animates the content and leaves the chrome mounted', async ({ page }) => {
    await expect(page.getByTestId('site-header')).toBeVisible();
    await expect(firstProductLink(page)).toBeVisible({ timeout: 20_000 });
    await tagChromeAndRecordStages(page);

    // Scrolled away from the top, so the "start at the top" assertion below is
    // about the transition and not about where the page happened to be.
    await page.evaluate(() => window.scrollTo(0, 600));
    await expect.poll(async () => page.evaluate(() => window.scrollY)).toBeGreaterThan(0);

    await firstProductLink(page).click();
    await expect(page).toHaveURL(/\/product\//, { timeout: 30_000 });

    // Same nodes, still carrying the tags set before the navigation.
    await expect(page.locator('header[data-e2e-tag="header"]')).toBeVisible();
    await expect(page.locator('footer[data-e2e-tag="footer"]')).toBeAttached();

    // The content column faded out before the router moved…
    await expect
      .poll(async () => recordedStages(page), {
        timeout: 15_000,
        message: 'content container never reported a transition stage',
      })
      .toContain('leaving');

    // …and settled again: no page left dimmed by a stale stage.
    await expect(page.getByTestId('page-transition')).toHaveAttribute('data-stage', 'none', { timeout: 15_000 });

    await expect
      .poll(async () => page.evaluate(() => window.scrollY), {
        timeout: 15_000,
        message: 'destination page did not start at the top',
      })
      .toBe(0);
  });

  test('route skeleton no longer covers the header', async ({ page }) => {
    // The skeleton is the content column only, so whenever it is on screen the
    // real header must be too — that swap is what used to read as the header
    // disappearing mid-navigation.
    const skeleton = page.getByTestId('route-loading');
    await expect(firstProductLink(page)).toBeVisible({ timeout: 20_000 });
    await firstProductLink(page).click();

    if (await skeleton.isVisible().catch(() => false)) {
      await expect(page.getByTestId('site-header')).toBeVisible();
    }

    await expect(page).toHaveURL(/\/product\//, { timeout: 30_000 });
    await expect(page.getByTestId('site-header')).toBeVisible();
  });
});
