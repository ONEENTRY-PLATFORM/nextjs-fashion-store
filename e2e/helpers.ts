import { type Page, expect } from '@playwright/test';

/** Valid mock credentials */
export const VALID_CREDS = { email: 'test@test.com', password: '111' };

/** Click the account/user icon in the Header to open login modal */
export async function clickAccountIcon(page: Page) {
  const btn = page.locator('button[aria-label="My account"]');
  await btn.waitFor({ state: 'visible', timeout: 10_000 });
  await btn.click();
}

/** Log in via the login modal */
export async function login(page: Page) {
  await clickAccountIcon(page);
  const dialog = page.locator('[role="dialog"]');
  await dialog.waitFor({ state: 'visible', timeout: 5000 });
  await page.locator('input[placeholder*="example.com"]').fill(VALID_CREDS.email);
  await page.locator('input[placeholder="••••••••"]').fill(VALID_CREDS.password);
  await page.locator('button:has-text("Log In")').click();
  // Wait for modal to close (login takes ~500ms server action)
  await expect(dialog).toBeHidden({ timeout: 8000 });
  // Wait for post-login state to settle
  await page.waitForTimeout(500);
}

/** Clear localStorage to reset state */
export async function clearState(page: Page) {
  await page.evaluate(() => localStorage.clear());
}

/** Reliably add a product to cart via catalog card hover */
export async function addToCartFromCatalog(page: Page) {
  await page.goto('/women/clothing');
  await page.waitForLoadState('networkidle');
  const card = page.locator('a[href*="/product/"]').first();
  await card.hover();
  await page.waitForTimeout(400);
  const addBtn = card.locator('button:has-text("Add to Cart")');
  await addBtn.waitFor({ state: 'visible', timeout: 5000 });
  await addBtn.click();
  // Wait for mini cart confirmation
  await page.locator('text=/Your Bag/i').waitFor({ state: 'visible', timeout: 5000 });
}

/** Seed cart via addInitScript (runs before page JS — no hydration conflict) */
export async function seedCart(page: Page) {
  await page.addInitScript(() => {
    const store = JSON.parse(localStorage.getItem('oe_store') || '{}');
    store.cart = {
      items: [{ id: 'wc-3-seed', name: 'Seed Dress', brand: 'OE', sku: 'wc-3', color: '#000', size: 'M', quantity: 1, price: 49.99, image: '/icons/icon-192.png' }],
      miniCartOpen: false,
    };
    store.__version = 3;
    localStorage.setItem('oe_store', JSON.stringify(store));
  });
}
