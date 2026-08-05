import { test, expect } from '@playwright/test';

/**
 * The footer newsletter reads every visible string from the OneEntry
 * `subscribe_new_drops` form (field placeholder, button label, result
 * messages) instead of hardcoded copy — see docs/HARDCODED_TEXTS.md §4.3.
 *
 * These tests pin the wiring, not the exact wording: an admin editing the copy
 * in OneEntry must not break the suite, but the form disappearing or falling
 * back to a blank placeholder must.
 */
test.describe('Footer newsletter form', () => {
  test.beforeEach(async ({ page }) => {
    // `domcontentloaded`, not the default `load`: the homepage pulls remote
    // hero imagery, so waiting for every subresource makes the dev server time
    // out well before the footer (which is server-rendered) is inspectable.
    await page.goto('/', { waitUntil: 'domcontentloaded' });
    // Generous timeout: with both projects running, the dev server compiles the
    // route on first hit and can take far longer than the default 15s.
    const form = page.locator('[data-testid="newsletter-form"]');
    await form.waitFor({ state: 'attached', timeout: 60_000 });
    await form.scrollIntoViewIfNeeded();
  });

  test('renders with copy sourced from OneEntry', async ({ page }) => {
    const form = page.locator('[data-testid="newsletter-form"]');
    await expect(form).toBeVisible();

    // Placeholder comes from the form attribute's `additionalFields`.
    const input = page.locator('[data-testid="newsletter-email"]');
    await expect(input).toBeVisible();
    const placeholder = await input.getAttribute('placeholder');
    expect(placeholder?.trim().length ?? 0).toBeGreaterThan(0);

    // Button label comes from the `subscribe_new_drops_button` attribute title.
    const submit = page.locator('[data-testid="newsletter-submit"]');
    await expect(submit).toBeVisible();
    expect((await submit.innerText()).trim().length).toBeGreaterThan(0);
  });

  test('submit stays disabled until an email is entered', async ({ page }) => {
    const submit = page.locator('[data-testid="newsletter-submit"]');
    await expect(submit).toBeDisabled();

    await page.locator('[data-testid="newsletter-email"]').fill('shopper@example.com');
    await expect(submit).toBeEnabled();
  });

  test('reports an outcome after submitting', async ({ page }) => {
    await page.locator('[data-testid="newsletter-email"]').fill(`e2e-${Date.now()}@example.com`);
    await page.locator('[data-testid="newsletter-submit"]').click();

    // Either OE accepts the subscription or it reports a failure — both paths
    // must surface a non-empty message in the live region rather than a silent
    // no-op. `sr-only` keeps the idle state invisible, so assert on text.
    const status = page.locator('[data-testid="newsletter-status"]');
    await expect
      .poll(async () => (await status.innerText()).trim().length, { timeout: 15000 })
      .toBeGreaterThan(0);
  });
});
