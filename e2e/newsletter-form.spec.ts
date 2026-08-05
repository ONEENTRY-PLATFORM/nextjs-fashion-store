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
    // Asserted on an info page rather than the homepage: the footer is the same
    // on every route, but the homepage's hero imagery keeps reflowing the layout
    // while it loads, so the form never settles long enough to interact with.
    await page.goto('/about-us', { waitUntil: 'domcontentloaded' });
    // Wait for attachment only. No explicit scroll: the page is still painting
    // and Playwright rejects a scroll on an element it considers unstable —
    // `fill`/`click` scroll into view on their own anyway.
    const form = page.locator('[data-testid="newsletter-form"]');
    await form.waitFor({ state: 'attached', timeout: 60_000 });
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
    const email = page.locator('[data-testid="newsletter-email"]');
    await expect(submit).toBeDisabled();

    // A plain <input> is editable before React hydrates, so an early `fill`
    // lands in the DOM but never reaches component state and the button stays
    // disabled. Retry the fill until the state actually flips.
    await expect
      .poll(async () => {
        await email.fill('shopper@example.com');
        return submit.isEnabled();
      }, { timeout: 45_000 })
      .toBe(true);
  });

  test('reports an outcome after submitting', async ({ page }) => {
    const email = page.locator('[data-testid="newsletter-email"]');
    const submit = page.locator('[data-testid="newsletter-submit"]');
    // Same hydration caveat as above — only click once the button has enabled.
    await expect
      .poll(async () => {
        await email.fill(`e2e-${Date.now()}@example.com`);
        return submit.isEnabled();
      }, { timeout: 45_000 })
      .toBe(true);
    await submit.click();

    // Either OE accepts the subscription or it reports a failure — both paths
    // must surface a non-empty message in the live region rather than a silent
    // no-op. `sr-only` keeps the idle state invisible, so assert on text.
    const status = page.locator('[data-testid="newsletter-status"]');
    await expect
      .poll(async () => (await status.innerText()).trim().length, { timeout: 15000 })
      .toBeGreaterThan(0);
  });
});
