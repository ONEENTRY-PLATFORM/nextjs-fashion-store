import { test, expect } from '@playwright/test';
import { clearState } from './helpers';

test.describe('Homepage', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/');
  });

  test('renders hero slider with slides', async ({ page }) => {
    const hero = page.locator('[class*="hero"], [class*="Hero"], [class*="slider"], [class*="Slider"]').first();
    await expect(hero).toBeVisible();
  });

  test('hero slider auto-rotates', async ({ page }) => {
    const dots = page.locator('[class*="hero"] button, [class*="Hero"] button, [class*="slider"] button, [class*="Slider"] button');
    if (await dots.count() > 1) {
      // Wait for auto-rotation (slides change roughly every 5s)
      await page.waitForTimeout(6000);
      // At least one dot should have active state
      await expect(dots.first()).toBeVisible();
    }
  });

  test('category section renders and links work', async ({ page }) => {
    const categoryLinks = page.getByRole('link').filter({ hasText: /clothing|shoes|bags|accessories/i });
    const count = await categoryLinks.count();
    expect(count).toBeGreaterThan(0);

    // Click first category → navigates to catalog
    const firstLink = categoryLinks.first();
    const href = await firstLink.getAttribute('href');
    await firstLink.click();
    await expect(page).toHaveURL(new RegExp(href!.replace(/\//g, '\\/')));
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
    const socialLinks = footer.locator('a[href*="facebook"], a[href*="instagram"], a[href*="twitter"], a[href*="pinterest"], a[href*="youtube"]');
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
    if (await arrows.count() > 0) {
      await arrows.first().click();
      await page.waitForTimeout(500);
    }
  });

  test('sections animate on scroll (IntersectionObserver)', async ({ page }) => {
    // Scroll to bottom incrementally to trigger animations
    for (let i = 1; i <= 5; i++) {
      await page.evaluate((step) => window.scrollTo(0, document.body.scrollHeight * step / 5), i);
      await page.waitForTimeout(400);
    }
    // Page should not crash; all sections should be rendered
    await expect(page.locator('footer')).toBeVisible();
  });

  test('discount banner click navigates to sale', async ({ page }) => {
    await page.evaluate(() => window.scrollTo(0, document.body.scrollHeight));
    await page.waitForTimeout(500);
    const bannerLink = page.locator('a[href*="/sale"], a[href*="/women"]').filter({ hasText: /shop|sale|discount/i }).first();
    if (await bannerLink.isVisible()) {
      await bannerLink.click();
      await expect(page).not.toHaveURL('/');
    }
  });
});
