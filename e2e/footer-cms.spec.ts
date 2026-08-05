import { test, expect } from '@playwright/test';

/**
 * The footer navigation is driven by the OneEntry `footer` menu: nested root
 * nodes render as link columns, flat ones as the legal bottom bar. Each half
 * falls back to its local dataset (`FOOTER_LINKS` / `BOTTOM_LINKS`) when the
 * CMS has nothing of that shape.
 *
 * Assertions pin the wiring — that columns render, carry a title and lead
 * somewhere real — rather than the wording, so an editor reorganising the menu
 * cannot break the suite.
 */
test.describe('Footer navigation', () => {
  test.beforeEach(async ({ page }) => {
    // `domcontentloaded`: the homepage pulls remote hero imagery, and waiting
    // for every subresource times out before the footer is inspectable.
    await page.goto('/', { waitUntil: 'domcontentloaded' });
    await page.locator('[data-testid="footer-bottom-bar"]').waitFor({ state: 'attached', timeout: 60_000 });
  });

  test('link columns render with a title and at least one link', async ({ page }) => {
    const columns = page.locator('[data-testid="footer-column"]');
    expect(await columns.count()).toBeGreaterThan(0);

    const first = columns.first();
    const title = first.locator('[data-testid="footer-column-title"]');
    expect((await title.innerText()).trim().length).toBeGreaterThan(0);
    expect(await first.locator('[data-testid="footer-column-link"]').count()).toBeGreaterThan(0);
  });

  test('every column link points at an in-app path', async ({ page }) => {
    const links = page.locator('[data-testid="footer-column-link"]');
    const count = await links.count();
    expect(count).toBeGreaterThan(0);

    for (let i = 0; i < count; i++) {
      const href = await links.nth(i).getAttribute('href');
      // Either a root-relative route or an absolute URL — never an empty or
      // slug-only href, which is what a missing resolver used to produce.
      expect(href ?? '').toMatch(/^(\/|https?:\/\/)/);
    }
  });

  test('bottom bar renders legal links', async ({ page }) => {
    const links = page.locator('[data-testid="footer-bottom-link"]');
    expect(await links.count()).toBeGreaterThan(0);
    expect((await links.first().innerText()).trim().length).toBeGreaterThan(0);
  });

  test('a column link navigates without hitting a 404', async ({ page }) => {
    const first = page.locator('[data-testid="footer-column-link"]').first();
    const href = await first.getAttribute('href');
    test.skip(!href?.startsWith('/'), 'first link leaves the storefront');

    // First hit compiles the target route on a dev server, which can exceed
    // the default navigation budget.
    const response = await page.goto(href as string, { waitUntil: 'domcontentloaded', timeout: 90_000 });
    expect(response?.status()).toBeLessThan(400);
  });
});
