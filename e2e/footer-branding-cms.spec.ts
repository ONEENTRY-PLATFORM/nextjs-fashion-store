import { test, expect } from '@playwright/test';

/**
 * Footer branding — company blurb, support phone, copyright and the four
 * support cards — resolves through the OE `footer` system-text set, with
 * `data/footerConfig.ts` as the offline fallback.
 *
 * The suite pins the wiring, not the wording: whatever the tenant publishes,
 * each slot must render non-empty and the phone must stay a usable `tel:`
 * link.
 */
test.describe('Footer branding from CMS', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/', { waitUntil: 'domcontentloaded' });
    await page.locator('[data-testid="footer-copyright"]').waitFor({ state: 'attached', timeout: 60_000 });
  });

  test('company blurb, phone and copyright render non-empty', async ({ page }) => {
    for (const id of ['footer-company-description', 'footer-support-phone', 'footer-copyright']) {
      const el = page.locator(`[data-testid="${id}"]`);
      await expect(el).toBeAttached();
      expect((await el.innerText()).trim().length).toBeGreaterThan(0);
    }
  });

  test('support phone is a dialable tel: link', async ({ page }) => {
    const href = await page.locator('[data-testid="footer-support-phone"]').getAttribute('href');
    expect(href ?? '').toMatch(/^tel:\+?[\d]+$/);
  });

  test('support cards render with copy', async ({ page }) => {
    const items = page.locator('[data-testid="footer-support-item"]');
    expect(await items.count()).toBeGreaterThan(0);
    expect((await items.first().innerText()).trim().length).toBeGreaterThan(0);
  });
});
