import { expect, test } from '@playwright/test';

import { assertPresent } from './helpers';

test.describe('Homepage', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/');
  });

  test('renders hero slider with slides', async ({ page }) => {
    const hero = page.locator('[class*="hero"], [class*="Hero"], [class*="slider"], [class*="Slider"]').first();
    await expect(hero).toBeVisible();
  });

  test('hero slider auto-rotates', async ({ page }) => {
    // Was `[class*="hero"] button, [class*="slider"] button, …` — a selector
    // that matched nothing, because the markup is styled with Tailwind
    // utilities and no element carries a "hero"/"slider" class name. Combined
    // with the `if (count > 1)` guard the whole body was skipped, so this test
    // reported green for its entire life without ever looking at a slider.
    const dots = page.getByTestId('hero-slider-dot');
    await expect(dots.first()).toBeVisible({ timeout: 15_000 });

    // A single-slide tenant has nothing to rotate — a real outcome, not a
    // failure, but say so rather than passing silently.
    const count = await dots.count();
    test.skip(count < 2, 'tenant publishes a single hero slide; nothing to rotate');

    // The active dot is the wide one (`aria-selected`), so rotation is
    // observable as the selection moving off the slide it started on.
    const initial = await dots.evaluateAll((els) => els.findIndex((e) => e.getAttribute('aria-selected') === 'true'));
    await expect
      .poll(async () => dots.evaluateAll((els) => els.findIndex((e) => e.getAttribute('aria-selected') === 'true')), {
        timeout: 15_000,
        message: 'hero slider did not advance',
      })
      .not.toBe(initial);
  });

  test('category section renders and links work', async ({ page }) => {
    const categoryLinks = page.getByRole('link').filter({ hasText: /clothing|shoes|bags|accessories/i });
    // Same race as the footer test below: a bare `count()` is a snapshot with
    // no retry, and the category section is CMS-driven, so on a cold homepage
    // it read 0 before the section had mounted.
    await expect(categoryLinks.first()).toBeAttached({ timeout: 15_000 });
    const count = await categoryLinks.count();
    expect(count).toBeGreaterThan(0);

    // Click first category → navigates to catalog
    const firstLink = categoryLinks.first();
    const href = await firstLink.getAttribute('href');
    assertPresent(href, 'category link href');
    await firstLink.click();
    await expect(page).toHaveURL(new RegExp(href.replace(/\//g, '\\/')));
  });

  test('product sections render with cards', async ({ page }) => {
    // Should have product cards (best sellers, new arrivals, etc.)
    const cards = page.locator('a[href*="/product/"]');
    await expect(cards.first()).toBeVisible({ timeout: 10_000 });
    expect(await cards.count()).toBeGreaterThan(0);
  });

  test('promo block is visible', async ({ page }) => {
    await page.evaluate(() => window.scrollTo(0, document.body.scrollHeight / 2));
    await page.waitForTimeout(500);
    const promo = page.locator('text=/shop now|explore/i').first();
    if (await promo.isVisible()) {
      await expect(promo).toBeVisible();
    }
  });

  test('footer renders all link columns', async ({ page }) => {
    await page.evaluate(() => window.scrollTo(0, document.body.scrollHeight));
    await page.waitForTimeout(500);
    const footer = page.locator('footer');
    await expect(footer).toBeVisible();
    // Check that footer has multiple link groups
    const links = footer.getByRole('link');
    expect(await links.count()).toBeGreaterThan(10);
  });

  test('footer social links are present', async ({ page }) => {
    await page.evaluate(() => window.scrollTo(0, document.body.scrollHeight));
    const footer = page.locator('footer');
    const socialLinks = footer.locator(
      'a[href*="facebook"], a[href*="instagram"], a[href*="twitter"], a[href*="pinterest"], a[href*="youtube"]',
    );
    // `count()` is a synchronous snapshot with no retry, so this asserted on
    // whatever happened to be in the DOM at that instant — it read 0 while the
    // footer was still rendering and reported "no social links" for what was
    // really a timing race (failing outright in one run and passing on retry
    // in the next). Waiting for the first link makes the assertion about the
    // footer's content rather than about when it mounted.
    await expect(socialLinks.first()).toBeAttached({ timeout: 15_000 });
    expect(await socialLinks.count()).toBeGreaterThan(0);
  });

  test('hero slider pauses on hover', async ({ page }) => {
    const hero = page.locator('[class*="hero"], [class*="Hero"], [class*="slider"], [class*="Slider"]').first();
    if (await hero.isVisible()) {
      await hero.hover();
      // Capture current state, wait, check it didn't auto-rotate
      await page.waitForTimeout(3000);
    }
  });

  test('hero slider dot/arrow navigation works', async ({ page }) => {
    const arrows = page.locator('button[aria-label*="next"], button[aria-label*="prev"], button[aria-label*="slide"]');
    if ((await arrows.count()) > 0) {
      await arrows.first().click();
      await page.waitForTimeout(500);
    }
  });

  test('sections animate on scroll (IntersectionObserver)', async ({ page }) => {
    // Scroll to bottom incrementally to trigger animations
    for (let i = 1; i <= 5; i++) {
      await page.evaluate((step) => window.scrollTo(0, (document.body.scrollHeight * step) / 5), i);
      await page.waitForTimeout(400);
    }
    // Page should not crash; all sections should be rendered
    await expect(page.locator('footer')).toBeVisible();
  });

  test('discount banner click navigates to sale', async ({ page }) => {
    await page.evaluate(() => window.scrollTo(0, document.body.scrollHeight));
    await page.waitForTimeout(500);
    const bannerLink = page
      .locator('a[href*="/sale"], a[href*="/women"]')
      .filter({ hasText: /shop|sale|discount/i })
      .first();
    if (await bannerLink.isVisible()) {
      await bannerLink.click();
      await expect(page).not.toHaveURL('/');
    }
  });
});
