import { expect, type Page, test } from '@playwright/test';

import { clearState, gotoProduct, selectFirstAvailableSize } from './helpers';

/**
 * OE enforces its own length limits on the guest checkout form — most notably
 * `checkout_home_guest_address_line1`, which requires at least 10 characters.
 * Before those limits were mirrored client-side, a short street line sailed
 * through this step and the order was rejected two screens later with
 * `required values are missing or incorrect: checkout_home_guest_address_line1`
 * next to the Place Order button.
 *
 * Locators are `data-testid` only: every label and placeholder on this screen
 * is CMS copy and changes per locale.
 */

async function guestDeliveryStep(page: Page) {
  await gotoProduct(page);
  await page.waitForLoadState('networkidle');
  await selectFirstAvailableSize(page);
  const addBtn = page.getByRole('button', { name: /add to cart/i }).first();
  if (await addBtn.isVisible()) await addBtn.click();
  await page.waitForTimeout(500);
  await page.goto('/checkout/delivery');
  await page.waitForLoadState('networkidle');
  const guestBtn = page.getByTestId('guest-continue');
  if (await guestBtn.isVisible().catch(() => false)) await guestBtn.click();
}

test.describe('Checkout — guest address limits mirror OE', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/');
    await clearState(page);
    await page.reload();
    await page.waitForLoadState('networkidle');
  });

  test('a too-short street line is rejected on the delivery step', async ({ page }) => {
    await guestDeliveryStep(page);

    await page.getByTestId('addr-fullName').fill('Test User');
    await page.getByTestId('addr-phone').fill('+44 207 946 0000');
    await page.getByTestId('addr-line1').fill('Baker st'); // 8 chars — OE wants 10
    await page.getByTestId('addr-city').fill('London');
    await page.getByTestId('addr-postcode').fill('W1A 1AA');

    await page.getByTestId('delivery-continue').click();

    await expect(page.getByTestId('addr-line1-error')).toBeVisible({ timeout: 5000 });
    await expect(page).toHaveURL(/delivery/);
  });

  test('a compliant address moves the guest to the payment step', async ({ page }) => {
    await guestDeliveryStep(page);

    await page.getByTestId('addr-fullName').fill('Test User');
    await page.getByTestId('addr-phone').fill('+44 207 946 0000');
    await page.getByTestId('addr-line1').fill('12 Baker Street');
    await page.getByTestId('addr-city').fill('London');
    await page.getByTestId('addr-postcode').fill('W1A 1AA');

    await page.getByTestId('delivery-continue').click();

    await expect(page).toHaveURL(/payment/, { timeout: 10000 });
  });
});
