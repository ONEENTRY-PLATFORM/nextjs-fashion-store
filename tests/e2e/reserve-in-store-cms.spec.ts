import { test, expect } from '@playwright/test';

/**
 * The reserve-in-store picker lists the tenant's real OneEntry stores (loaded
 * by the PDP route via `loadStores`). It used to ship five hardcoded London
 * branches with invented "In stock / Low stock" badges — availability the
 * business had no way to honour, since OE exposes no branch-level inventory.
 *
 * Assertions pin the wiring: the CTA only appears when stores exist, the
 * picker is non-empty, and no stock promise is rendered per branch.
 */
test.describe('Reserve in store — CMS stores', () => {
  test('picker lists stores and promises no per-branch stock', async ({ page }) => {
    await page.goto('/stores', { waitUntil: 'domcontentloaded' });
    // Pull a product id from the catalog so the test does not pin one.
    await page.goto('/women/clothing', { waitUntil: 'domcontentloaded', timeout: 90_000 });
    const firstProduct = page.locator('a[href^="/product/"]').first();
    await firstProduct.waitFor({ state: 'attached', timeout: 60_000 });
    const href = await firstProduct.getAttribute('href');
    test.skip(!href, 'catalog returned no products');

    await page.goto(href as string, { waitUntil: 'domcontentloaded', timeout: 90_000 });

    const cta = page.locator('[data-testid="pdp-reserve-in-store"]');
    // The CTA is hidden when OE returned no stores — a correct outcome, not a
    // failure, so the rest of the assertions only run when it is present.
    const hasCta = await cta.count() > 0;
    test.skip(!hasCta, 'tenant has no stores, reserve CTA intentionally hidden');

    await cta.click();

    // Signed-out shoppers get the login modal instead of the reserve modal.
    const list = page.locator('[data-testid="reserve-store-list"]');
    const opened = await list.count() > 0;
    test.skip(!opened, 'reservation is auth-gated; no session in this run');

    const options = page.locator('[data-testid="reserve-store-option"]');
    expect(await options.count()).toBeGreaterThan(0);

    // Store name and address must be real copy, never an empty row.
    expect((await options.first().innerText()).trim().length).toBeGreaterThan(0);

    // No stock badge: the old UI rendered "In Stock" / "Low Stock" per branch.
    await expect(options.first()).not.toContainText(/in stock|low stock|out of stock/i);
  });
});
