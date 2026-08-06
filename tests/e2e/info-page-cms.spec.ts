import { test, expect } from '@playwright/test';

/**
 * Info pages take their editorial sections from OneEntry `info_section_*`
 * blocks and their SEO from the page's own `meta_*` attributes — previously
 * both were hardcoded in `src/app/data/infoPageLabels.ts` / `infoPages.ts`.
 *
 * Assertions target the wiring, not the wording, so editors can rewrite the
 * copy in the admin panel without breaking the suite.
 */
test.describe('Info page content from CMS', () => {
  test('about-us renders sections and CMS metadata', async ({ page }) => {
    await page.goto('/about-us', { waitUntil: 'domcontentloaded' });
    await page.locator('[data-testid="info-sections"]').waitFor({ state: 'attached', timeout: 60_000 });

    // Four editorial sections come from OE blocks linked to the page.
    const sections = page.locator('[data-testid="info-section"]');
    expect(await sections.count()).toBeGreaterThan(0);

    // Each rendered section must carry a heading — an empty block would mean
    // the attribute markers stopped matching.
    const firstHeading = sections.first().locator('h2');
    expect((await firstHeading.innerText()).trim().length).toBeGreaterThan(0);
  });

  test('metadata comes from the OE page attributes', async ({ page }) => {
    await page.goto('/about-us', { waitUntil: 'domcontentloaded' });

    // `meta_title` in OE is stored with the brand suffix already applied.
    await expect(page).toHaveTitle(/Kekimoro/i);

    const description = await page.locator('meta[name="description"]').getAttribute('content');
    expect((description ?? '').trim().length).toBeGreaterThan(0);

    const canonical = await page.locator('link[rel="canonical"]').getAttribute('href');
    expect(canonical ?? '').toContain('/about-us');
  });

  test('delivery page exists and is not a 404', async ({ page }) => {
    // `delivery` was the one info slug missing from OneEntry; it is created now.
    const response = await page.goto('/delivery', { waitUntil: 'domcontentloaded' });
    expect(response?.status()).toBeLessThan(400);
    await expect(page.locator('[data-testid="info-sections"]')).toBeAttached({ timeout: 60_000 });
  });
});
