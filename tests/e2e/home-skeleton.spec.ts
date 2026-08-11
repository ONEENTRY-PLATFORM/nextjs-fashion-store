import { expect, test } from '@playwright/test';

/**
 * Homepage loading skeleton.
 *
 * `app/[locale]/loading.tsx` paints a catalog grid — right for `/women/…`,
 * wrong for `/`, where the real page is a 600px hero, a 6-up category grid,
 * product carousels, two promo photos and a discount banner. The homepage now
 * has its own fallback in the `(home)` route group; this spec pins that the
 * fallback shown on the way to `/` is the homepage-shaped one.
 */

/** `/` with or without a locale prefix — never `/stores`, `/sale`, … */
const isHomeUrl = (url: URL) => /^\/(?:[a-z]{2}(?:-[a-z]{2})?)?\/?$/i.test(url.pathname);

test.describe('Homepage skeleton', () => {
  // Two navigations against a dev server, the second one deliberately stalled.
  test.slow();

  test('the fallback on the way to / mirrors the homepage, not the catalog grid', async ({ page }) => {
    // Hold every request for `/` — the document, the prefetch and the RSC
    // navigation payload alike — so the loading boundary stays on screen long
    // enough to be inspected instead of flashing past.
    await page.route(isHomeUrl, async (route) => {
      await new Promise((resolve) => setTimeout(resolve, 4_000));
      await route.continue();
    });

    // Start somewhere cheap that is not the homepage, then walk to `/` through
    // the router so the fallback is rendered client-side.
    await page.goto('/stores', { waitUntil: 'domcontentloaded' });
    await page.getByTestId('header-logo').click();

    const skeleton = page.getByTestId('home-loading');
    await expect(skeleton).toBeVisible();

    // The hero placeholder is the tell: the catalog fallback opens with a
    // narrow heading bar over a product grid, never with a full-bleed block.
    const hero = page.getByTestId('home-hero-skeleton');
    await expect(hero).toBeVisible();
    const heroBox = await hero.boundingBox();
    const viewport = page.viewportSize();
    expect(heroBox?.height).toBeGreaterThan(400);
    expect(heroBox?.width).toBeGreaterThanOrEqual((viewport?.width ?? 0) - 20);

    // The chrome is not part of the fallback — it stays mounted throughout.
    await expect(page.getByTestId('site-header')).toBeVisible();

    // …and the real homepage replaces it once the stalled response lands.
    await expect(page).toHaveURL(/\/$|\/[a-z]{2}$/, { timeout: 30_000 });
    await expect(page.getByTestId('category-section-heading')).toBeVisible({ timeout: 30_000 });
    await expect(skeleton).toBeHidden();
  });
});
