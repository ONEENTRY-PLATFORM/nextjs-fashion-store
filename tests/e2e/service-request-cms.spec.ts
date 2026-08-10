import { expect, test } from '@playwright/test';

import { SERVICE_LABELS } from '@/app/data/accountLabels';

import { clearState, login } from './helpers';

/**
 * The service-request category picker must be driven by the OneEntry
 * `service_request` form's `category` attribute (`listTitles`), not by the
 * `service_maintenance_category_*` dictionary keys it used to read.
 *
 * The two lists had silently drifted: the dictionary offered `restoration`,
 * which OE does not accept as a `list` value (the submit is rejected), while
 * OE's own `sole-replacement` had no key and was therefore unreachable from
 * the UI. Nothing in the type system connects a dictionary key to a form
 * option, so this spec is the guard — it asserts the rendered `<option>`
 * values are exactly the ones the form is willing to store.
 */

/** Option values authored on the OE form; mirrored offline in SERVICE_LABELS. */
const EXPECTED_VALUES = Object.keys(SERVICE_LABELS.categoryLabels);

test.describe('Service request — categories from the OE form', () => {
  test.beforeEach(async ({ page }) => {
    // Land straight on the target route instead of routing through `/`. The
    // homepage fans out to seven OE loaders and its cold compile overruns the
    // 30 s navigation timeout, which made this spec fail-then-pass-on-retry
    // for a reason that has nothing to do with what it asserts. `/account` is
    // prerendered and the header (which `login` drives) is in the layout, so
    // nothing is lost. `domcontentloaded` for the same reason — the suite
    // never needs the images to settle.
    await page.goto('/account?tab=service', { waitUntil: 'domcontentloaded' });
    await clearState(page);
    await page.reload({ waitUntil: 'domcontentloaded' });
    await login(page);
  });

  test('category options match the form listTitles and exclude retired values', async ({ page }) => {
    // The form only mounts behind the section's "new request" CTA.
    // Located by testid, not by caption: the CTA label is CMS copy
    // (`service_maintenance_new_request_cta`), so a text locator would turn a
    // renamed button into a silent skip that reads as a pass.
    const cta = page.locator('[data-testid="service-new-request"]');
    const hasCta = await cta.isVisible().catch(() => false);
    test.skip(!hasCta, 'service section is auth-gated; no session in this run');
    await cta.click();

    const select = page.locator('[data-testid="service-form-category"]');
    await expect(select).toBeVisible();

    const values = await select
      .locator('option')
      .evaluateAll((nodes) => nodes.map((n) => (n as HTMLOptionElement).value));

    // Every rendered option is a value OE will accept for the `list` attribute.
    // Compared on copies — `sort()` mutates, and the assertion below needs the
    // list still in its rendered (OE `position`) order.
    expect([...values].sort()).toEqual([...EXPECTED_VALUES].sort());

    // The retired UI-only category must never come back — it is not in the
    // form, so picking it fails the submit with a validation error.
    expect(values).not.toContain('restoration');

    // Options carry authored titles, not raw markers.
    const titles = await select
      .locator('option')
      .evaluateAll((nodes) => nodes.map((n) => (n.textContent ?? '').trim()));
    expect(titles.every((t) => t.length > 0)).toBe(true);

    // The select starts on an accepted value rather than a literal default.
    await expect(select).toHaveValue(values[0]);
  });

  test('form fields are present and submittable', async ({ page }) => {
    // Located by testid, not by caption: the CTA label is CMS copy
    // (`service_maintenance_new_request_cta`), so a text locator would turn a
    // renamed button into a silent skip that reads as a pass.
    const cta = page.locator('[data-testid="service-new-request"]');
    const hasCta = await cta.isVisible().catch(() => false);
    test.skip(!hasCta, 'service section is auth-gated; no session in this run');
    await cta.click();

    await expect(page.locator('[data-testid="service-form"]')).toBeVisible();
    await expect(page.locator('[data-testid="service-form-item"]')).toBeVisible();
    await expect(page.locator('[data-testid="service-form-date"]')).toBeVisible();
    await expect(page.locator('[data-testid="service-form-description"]')).toBeVisible();
    await expect(page.locator('[data-testid="service-form-submit"]')).toBeEnabled();
  });
});
