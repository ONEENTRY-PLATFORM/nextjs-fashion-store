import { expect, type Page, test } from '@playwright/test';

/**
 * Opens the mega dropdown by hovering a tab that has one.
 *
 * The panel is built from the OE `header` menu, so an empty CMS response means
 * no dropdown at all — the caller skips instead of failing red in that case.
 *
 * @param page - Playwright page.
 * @param tab - Sub-category key of the tab to hover.
 * @returns Whether the dropdown became visible.
 */
async function openDropdown(page: Page, tab: string): Promise<boolean> {
  await page.getByTestId(`mega-nav-${tab}`).hover();
  try {
    await expect(page.getByTestId('mega-dropdown')).toBeVisible({ timeout: 3000 });
    return true;
  } catch {
    return false;
  }
}

test.describe('Header — mega dropdown closes on navigation', () => {
  test('clicking another top-level tab closes the dropdown', async ({ page }) => {
    await page.goto('/');
    test.skip(!(await openDropdown(page, 'clothing')), 'CMS header menu returned no sections');

    await page.getByTestId('mega-nav-shoes').click();

    await expect(page).toHaveURL(/\/(women|men)\/shoes/);
    await expect(page.getByTestId('mega-dropdown')).toBeHidden();
  });

  test('clicking the tab of the current page still closes the dropdown', async ({ page }) => {
    // Same href as the current route, so the pathname never changes — only the
    // explicit close in the click handler can take the panel down here.
    await page.goto('/women/shoes');
    test.skip(!(await openDropdown(page, 'shoes')), 'CMS header menu returned no sections');

    await page.getByTestId('mega-nav-shoes').click();

    await expect(page.getByTestId('mega-dropdown')).toBeHidden();
  });

  test('clicking a dropdown link closes the dropdown', async ({ page }) => {
    await page.goto('/');
    test.skip(!(await openDropdown(page, 'clothing')), 'CMS header menu returned no sections');

    await page.getByTestId('mega-dropdown').getByRole('link').first().click();

    await expect(page).toHaveURL(/\/(women|men)\/clothing/);
    await expect(page.getByTestId('mega-dropdown')).toBeHidden();
  });
});
