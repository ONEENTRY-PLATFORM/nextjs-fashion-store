import { expect, type Page, test } from '@playwright/test';

import { clearState, gotoProduct, selectFirstAvailableSize } from './helpers';

/**
 * Checkout reads its field definitions from the OneEntry forms it posts into,
 * rather than from markers and option values compiled into the bundle. These
 * specs assert the storefront and the CMS actually agree — a shipped table
 * drifts silently, and the symptom only shows up as OE rejecting the order two
 * screens later.
 *
 * Locators are `data-testid` only: every label, store name and method title on
 * this screen is CMS copy and changes per locale.
 */

const OE_URL = (process.env.NEXT_PUBLIC_ONEENTRY_URL ?? process.env.ONEENTRY_URL ?? '').replace(/\/$/, '');
const OE_TOKEN = process.env.NEXT_PUBLIC_ONEENTRY_TOKEN ?? process.env.ONEENTRY_TOKEN ?? '';
const OE_CONFIGURED = Boolean(OE_URL && OE_TOKEN);
const LANG = 'en_US';

interface RawAttribute {
  marker: string;
  type: string;
  listTitles?: Array<{ title?: string; value?: unknown }>;
}

/** Fetch a form straight from OE, the same payload the loaders decode. */
async function fetchForm(marker: string): Promise<{ attributes: RawAttribute[] }> {
  const res = await fetch(`${OE_URL}/api/content/forms/marker/${marker}?langCode=${LANG}`, {
    headers: { 'x-app-token': OE_TOKEN },
  });
  expect(res.ok, `OE form ${marker} should be reachable`).toBe(true);
  const body = (await res.json()) as { attributes?: RawAttribute[] };
  return { attributes: body.attributes ?? [] };
}

/** Walk a guest through to the delivery step with one item in the cart. */
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

test.describe('Checkout — driven by the CMS form definition', () => {
  test.skip(!OE_CONFIGURED, 'NEXT_PUBLIC_ONEENTRY_URL / _TOKEN are not set');

  test.beforeEach(async ({ page }) => {
    await page.goto('/');
    await clearState(page);
    await page.reload();
    await page.waitForLoadState('networkidle');
  });

  test('the store picker offers exactly the stores an editor ticked on the order form', async ({ page }) => {
    const form = await fetchForm('checkout_store_pickup_guest');
    const entityField = form.attributes.find((a) => a.type === 'entity');
    expect(entityField, 'the store form should carry an entity attribute').toBeTruthy();

    // The first row is the containing section (`depth: 0`) — a heading, not a
    // selectable store, so it must never reach the picker.
    const authored = (entityField?.listTitles ?? [])
      .map((o) => o.value)
      .filter((v): v is { id: number; depth: number } => !!v && typeof v === 'object' && 'id' in v)
      .filter((v) => v.depth !== 0)
      .map((v) => String(v.id))
      .sort();
    test.skip(authored.length === 0, 'tenant has no stores selected on the pickup form');

    await guestDeliveryStep(page);
    // The picker lives inside the Store Pickup card, and a `RadioCard` renders
    // its body only while selected.
    await page.getByTestId('delivery-method-store').click();
    await page.getByTestId('store-picker-toggle').click();

    const rendered = (
      await page
        .getByTestId('store-option')
        .evaluateAll((nodes) => nodes.map((n) => (n as HTMLElement).dataset.storeId ?? ''))
    ).sort();

    expect(rendered).toEqual(authored);
  });

  /**
   * Only the list is asserted, not the handoff payload: a guest who picks
   * Store Pickup or Parcel Locker cannot leave the delivery step at all.
   * `handleContinueToPayment` validates `guestContactSchema` for both methods
   * while the contact form itself is commented out of the cards ("checkout is
   * sign-in-only"), so the values are always empty and the CTA silently does
   * nothing. The locker id's trip to the payment step is covered by the unit
   * tests instead.
   */
  test('the locker picker offers the OE pages the form points at', async ({ page }) => {
    const form = await fetchForm('checkout_locker_guest');
    const entityField = form.attributes.find((a) => a.type === 'entity');
    expect(entityField, 'the locker form should reference lockers as pages').toBeTruthy();

    const authored = (entityField?.listTitles ?? [])
      .map((o) => o.value)
      .filter((v): v is { id: number; depth: number } => !!v && typeof v === 'object' && 'id' in v)
      .filter((v) => v.depth !== 0)
      .map((v) => String(v.id))
      .sort();
    test.skip(authored.length === 0, 'tenant has no lockers selected on the locker form');

    await guestDeliveryStep(page);
    await page.getByTestId('delivery-method-locker').click();
    await page.getByTestId('locker-picker-toggle').click();

    const rendered = (
      await page
        .getByTestId('locker-option')
        .evaluateAll((nodes) => nodes.map((n) => (n as HTMLElement).dataset.lockerId ?? ''))
    ).sort();
    // Every rendered option carries the page id the order will reference, not a
    // position in a hardcoded array — which is what the old `integer` field
    // submitted, and what made list order part of the wire contract.
    expect(rendered).toEqual(authored);
    expect(rendered.every((id) => id.length > 0)).toBe(true);
  });

  test('the delivery method submitted is the option value authored in OE', async ({ page }) => {
    const form = await fetchForm('checkout_home_delivery_guest');
    const listField = form.attributes.find((a) => a.type === 'list');
    // The home card is matched to its option by the order-storage marker, so
    // the value it submits is that marker — wherever the option sits in the
    // admin panel's list.
    const homeOption = (listField?.listTitles ?? []).find((o) => o.value === 'home');
    expect(homeOption, 'the method picker should carry an option for home delivery').toBeTruthy();

    await guestDeliveryStep(page);
    await page.getByTestId('addr-fullName').fill('Test User');
    await page.getByTestId('addr-phone').fill('+44 207 946 0000');
    await page.getByTestId('addr-line1').fill('12 Baker Street');
    await page.getByTestId('addr-city').fill('London');
    await page.getByTestId('addr-postcode').fill('W1A 1AA');
    await page.getByTestId('delivery-continue').click();
    await expect(page).toHaveURL(/payment/, { timeout: 10000 });

    // The handoff payload is what the payment step turns into the order's
    // `delivery_method` form data.
    const handed = await page.evaluate(() => {
      const raw = sessionStorage.getItem('oe_checkout_payload');
      return raw ? (JSON.parse(raw) as { deliveryMethodValue?: string }).deliveryMethodValue : null;
    });

    expect(handed).toBe('home');
  });

  test('a street line that is only long enough before trimming is rejected', async ({ page }) => {
    const form = await fetchForm('checkout_home_delivery_guest');
    const trimmed = form.attributes.some(
      (a) => (a as { validators?: { trimValidator?: unknown } }).validators?.trimValidator,
    );
    test.skip(!trimmed, 'tenant has no trimValidator on the guest address form');

    await guestDeliveryStep(page);
    await page.getByTestId('addr-fullName').fill('Test User');
    await page.getByTestId('addr-phone').fill('+44 207 946 0000');
    // 14 characters as typed, 8 once OE trims it — under the 10-char minimum.
    await page.getByTestId('addr-line1').fill('   Baker st   ');
    await page.getByTestId('addr-city').fill('London');
    await page.getByTestId('addr-postcode').fill('W1A 1AA');

    await page.getByTestId('delivery-continue').click();

    await expect(page.getByTestId('addr-line1-error')).toBeVisible({ timeout: 5000 });
    await expect(page).toHaveURL(/delivery/);
  });
});
