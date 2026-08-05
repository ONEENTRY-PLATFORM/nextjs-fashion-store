import { test, expect } from '@playwright/test';

/**
 * The header top bar reads its copy from the OneEntry `header` system-text set,
 * and its language switcher from the project's active locales
 * (`Locales.getLocales()`), not from a hardcoded list.
 *
 * Assertions pin the wiring rather than the wording, so an editor changing the
 * copy — or the tenant enabling another locale — must not break the suite.
 */
test.describe('Header copy from CMS', () => {
  test.beforeEach(async ({ page }) => {
    // `domcontentloaded`: the homepage pulls remote hero imagery, and waiting
    // for every subresource times out the dev server before the header (which
    // is server-rendered) is inspectable.
    await page.goto('/', { waitUntil: 'domcontentloaded' });
    await page.locator('[data-testid="header-top-bar"]').waitFor({ state: 'attached', timeout: 60_000 });
  });

  test('region and support copy resolve to non-empty values', async ({ page }) => {
    const region = page.locator('[data-testid="header-region-toggle"]');
    await expect(region).toBeVisible();
    expect((await region.innerText()).trim().length).toBeGreaterThan(0);

    const stores = page.locator('[data-testid="header-store-locations"]');
    await expect(stores).toBeVisible();
    expect((await stores.innerText()).trim().length).toBeGreaterThan(0);
  });

  test('language switcher reflects the project locales', async ({ page }) => {
    const toggle = page.locator('[data-testid="header-language-toggle"]');
    await expect(toggle).toBeVisible();

    // Whatever the tenant publishes, the label must be a real language code —
    // never blank and never the literal list that used to be hardcoded.
    const label = (await toggle.innerText()).trim();
    expect(label).toMatch(/^[A-Z]{2,3}$/);

    // A single-locale project has nothing to switch to, so the control is
    // disabled rather than opening an empty dropdown.
    const disabled = await toggle.isDisabled();
    if (disabled) {
      await expect(page.locator('[data-testid="header-language-toggle"] svg')).toHaveCount(0);
    } else {
      await toggle.click();
      const options = page.locator('[data-testid="header-top-bar"] button', { hasText: /^[A-Z]{2,3}$/ });
      expect(await options.count()).toBeGreaterThan(1);
    }
  });

  test('store locations link navigates to /stores', async ({ page }) => {
    await page.locator('[data-testid="header-store-locations"]').click();
    // First hit compiles the /stores route on a dev server, which can exceed
    // the default navigation budget.
    await page.waitForURL('**/stores', { timeout: 90_000 });
    expect(page.url()).toContain('/stores');
  });
});
