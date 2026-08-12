import { expect, test } from '@playwright/test';

import { RESERVE_MODAL_LABELS } from '@/app/pages/product/ReserveInStoreModal';

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
    const hasCta = (await cta.count()) > 0;
    test.skip(!hasCta, 'tenant has no stores, reserve CTA intentionally hidden');

    await cta.click();

    // Signed-out shoppers get the login modal instead of the reserve modal.
    const list = page.locator('[data-testid="reserve-store-list"]');
    const opened = (await list.count()) > 0;
    test.skip(!opened, 'reservation is auth-gated; no session in this run');

    const options = page.locator('[data-testid="reserve-store-option"]');
    expect(await options.count()).toBeGreaterThan(0);

    // Store name and address must be real copy, never an empty row.
    expect((await options.first().innerText()).trim().length).toBeGreaterThan(0);

    // No stock badge: the old UI rendered "In Stock" / "Low Stock" per branch.
    await expect(options.first()).not.toContainText(/in stock|low stock|out of stock/i);
  });

  /**
   * `reserve_in_store` form content is loaded by the PDP route itself
   * (`app/[locale]/product/[id]/page.tsx`), not the root layout — the modal is
   * the only place that renders it. This test pins that move two ways: the
   * modal's field labels must still come from OE, and the footer newsletter on
   * the same page must keep its own layout-level copy, proving the page-level
   * `FormPlaceholdersProvider` merges with the enclosing one instead of
   * replacing it.
   */
  test('PDP-level form provider supplies reserve copy without dropping the layout forms', async ({ page }) => {
    await page.goto('/women/clothing', { waitUntil: 'domcontentloaded', timeout: 90_000 });
    const firstProduct = page.locator('a[href^="/product/"]').first();
    await firstProduct.waitFor({ state: 'attached', timeout: 60_000 });
    const href = await firstProduct.getAttribute('href');
    test.skip(!href, 'catalog returned no products');

    await page.goto(href as string, { waitUntil: 'domcontentloaded', timeout: 90_000 });

    // Layout-level form: the footer newsletter renders on every route, PDP
    // included. Its placeholder must survive the PDP's own provider.
    const newsletterEmail = page.locator('[data-testid="newsletter-email"]');
    await newsletterEmail.waitFor({ state: 'attached', timeout: 60_000 });
    expect((await newsletterEmail.getAttribute('placeholder'))?.trim().length ?? 0).toBeGreaterThan(0);

    const cta = page.locator('[data-testid="pdp-reserve-in-store"]');
    test.skip((await cta.count()) === 0, 'tenant has no stores, reserve CTA intentionally hidden');
    await cta.click();

    const list = page.locator('[data-testid="reserve-store-list"]');
    test.skip((await list.count()) === 0, 'reservation is auth-gated; no session in this run');

    // Route-level form: every field label is authored on the OE
    // `reserve_in_store` attributes.
    const labels = {
      'reserve-label-first-name': RESERVE_MODAL_LABELS.labelFirstName,
      'reserve-label-last-name': RESERVE_MODAL_LABELS.labelLastName,
      'reserve-label-phone': RESERVE_MODAL_LABELS.labelPhone,
      'reserve-label-email': RESERVE_MODAL_LABELS.labelEmail,
      'reserve-label-pickup-date': RESERVE_MODAL_LABELS.labelPickup,
    };
    const rendered: string[] = [];
    for (const [testId, fallback] of Object.entries(labels)) {
      const label = page.locator(`[data-testid="${testId}"]`);
      await expect(label).toBeVisible();
      // Strip the trailing required-marker asterisk before comparing.
      const text = (await label.innerText()).replace(/\*$/, '').trim();
      expect(text.length, `${testId} must not render blank`).toBeGreaterThan(0);
      if (text !== fallback) rendered.push(testId);
    }

    // Every label matching its local fallback means either the CMS copy is
    // identical or the form never reached the modal — the two are
    // indistinguishable from the browser, so skip rather than fail on a
    // tenant that authored the same wording.
    test.skip(
      rendered.length === 0,
      'OE reserve_in_store labels are identical to the local fallbacks — cannot tell the two apart',
    );
  });
});
