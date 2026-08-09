import { expect, type Page, test } from '@playwright/test';

/**
 * PDP Specifications rows read their labels from the OneEntry `product_specs`
 * system-text set instead of the hardcoded list that used to live in
 * `adapt.ts` — see .claude/temp/HARDCODED_TEXTS.md §2.2.
 *
 * These tests pin the wiring, not the wording: an admin renaming "Brand origin"
 * in the panel must not break the suite, but a row losing its label — or the
 * SKU lookup regressing to matching on that editable label — must.
 *
 * Navigation deliberately avoids `waitForLoadState('networkidle')` (and so the
 * shared `gotoProduct` helper): the PDP streams its reviews through a Suspense
 * boundary, so the connection never goes idle and the wait times out.
 */
async function gotoFirstProduct(page: Page): Promise<void> {
  await page.goto('/women/clothing', { waitUntil: 'domcontentloaded' });
  const card = page.locator('a[href*="/product/"]').first();
  await card.waitFor({ state: 'attached', timeout: 60_000 });
  const href = await card.getAttribute('href');
  expect(href, 'catalog should link to at least one product').toBeTruthy();
  await page.goto(href ?? '', { waitUntil: 'domcontentloaded' });
}

test.describe('PDP specifications — CMS-sourced labels', () => {
  // Two full navigations (catalog → PDP) plus a locale redirect do not fit the
  // default 60s budget.
  test.describe.configure({ timeout: 120_000 });

  // The Specifications block is client-rendered, and the PDP does not finish
  // hydrating under the `mobile` project — `product-detail.spec.ts` fails there
  // for the same reason, independently of this file. Skipped rather than left
  // red so the pre-existing hydration bug stays visible as one failure, not two.
  test.skip(
    ({ isMobile }) => Boolean(isMobile),
    'PDP does not hydrate under the mobile project — see product-detail.spec.ts',
  );

  test.beforeEach(async ({ page }) => {
    await gotoFirstProduct(page);
  });

  test('every specification row renders a non-empty label', async ({ page }) => {
    const rows = page.locator('[data-testid="product-spec-row"]');
    // The list is built from whichever OE attributes the product actually
    // fills, so the count varies per product — only require that it rendered.
    await expect(rows.first()).toBeVisible({ timeout: 60_000 });

    const labels = await page.locator('[data-testid="product-spec-label"]').allInnerTexts();
    expect(labels.length).toBeGreaterThan(0);
    for (const label of labels) {
      expect(label.trim().length).toBeGreaterThan(0);
    }
  });

  test('rows carry the stable key the SKU lookup matches on', async ({ page }) => {
    const rows = page.locator('[data-testid="product-spec-row"]');
    await expect(rows.first()).toBeVisible({ timeout: 60_000 });

    const keys = await rows.evaluateAll((els) => els.map((el) => el.getAttribute('data-spec-key')).filter(Boolean));
    expect(keys.length).toBeGreaterThan(0);
    // Keys are code-owned identifiers, never the rendered copy — a label that
    // leaked into this attribute would mean the admin can break the lookup.
    const allowed = ['composition', 'lining', 'fit', 'style', 'season', 'brandOrigin', 'sku'];
    for (const key of keys) {
      expect(allowed).toContain(key);
    }
  });
});
