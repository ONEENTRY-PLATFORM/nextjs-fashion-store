import { expect, type Page } from '@playwright/test';

/**
 * Credentials of the permanent E2E user. Overridable from `.env.local` so a
 * real tenant can point the suite at its own long-lived test account — the
 * MCP `playwright-e2e` rule is explicit that tests must reuse an existing
 * active user rather than creating (and stranding) new ones.
 */
export const VALID_CREDS = {
  email: process.env.E2E_TEST_EMAIL || 'test@test.com',
  password: process.env.E2E_TEST_PASSWORD || '111',
};

/**
 * Browser-storage keys that make up a shopper session.
 *
 * The session moved from httpOnly cookies into the browser (MCP `tokens`):
 * the SDK's `saveFunction` writes `refresh-token`, and the app records which
 * provider minted it plus the OE user identifier it needs for form-data
 * writes. Tests assert on these directly.
 */
export const SESSION_KEYS = {
  refreshToken: 'refresh-token',
  providerMarker: 'authProviderMarker',
  userIdentifier: 'oe_user_identifier',
} as const;

/** Read the persisted session as the browser sees it. */
export async function readSession(page: Page) {
  return page.evaluate(
    (keys) => ({
      refreshToken: localStorage.getItem(keys.refreshToken),
      providerMarker: localStorage.getItem(keys.providerMarker),
      userIdentifier: localStorage.getItem(keys.userIdentifier),
    }),
    SESSION_KEYS,
  );
}

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

/**
 * Reset every scrap of client state between tests.
 *
 * Both stores matter now: the shopper session lives in `localStorage`
 * (refresh token + provider marker) and the checkout hand-off flags live in
 * `sessionStorage`. Clearing only the former used to leave a half-finished
 * checkout leaking into the next test.
 */
export async function clearState(page: Page) {
  await page.evaluate(() => {
    localStorage.clear();
    sessionStorage.clear();
  });
}

/**
 * Assert a nullable value is present, and narrow it for TypeScript.
 *
 * Needed because Playwright's matchers are not TS assertion functions:
 * `expect(href).not.toBeNull()` fails the test at runtime but leaves the
 * static type `string | null`, so every call site had to follow up with a
 * non-null `!`. That silently turns a missing attribute into a confusing
 * `Cannot read properties of null` deep inside a regex build; this reports
 * *which* value was missing instead.
 */
export function assertPresent<T>(value: T | null | undefined, what: string): asserts value is T {
  if (value === null || value === undefined) {
    throw new Error(`Expected ${what} to be present, got ${String(value)}`);
  }
}

/**
 * Path of a real product, resolved from the catalogue rather than hardcoded.
 *
 * The suite used to point at `/product/wc-1`, a playground SKU. But the route
 * parses its segment as a number (`app/product/[id]/page.tsx` — `/^\d+$/`), so
 * `wc-1` resolved to `null`, and every one of those pages rendered "Page Not
 * Found". Combined with the `if (await x.isVisible())` guards these specs are
 * built on, that turned an entire dead fixture into a green run: the bodies
 * simply never executed.
 *
 * Resolving from the first catalogue card keeps the suite working when the
 * tenant's catalogue changes, which a hardcoded numeric id would not.
 */
const cachedProductPaths = new Map<number, string>();

export async function productPath(page: Page, index = 0): Promise<string> {
  const cached = cachedProductPaths.get(index);
  if (cached) return cached;
  await page.goto('/women/clothing');
  await page.waitForLoadState('networkidle');
  const href = await page.locator('a[href*="/product/"]').nth(index).getAttribute('href');
  assertPresent(href, `href of catalogue product card #${index}`);
  const path = href.split('?')[0];
  cachedProductPaths.set(index, path);
  return path;
}

/**
 * Navigate to a real PDP and return its path.
 *
 * @param query Optional query string, e.g. `'?size=M'`.
 * @param index Which catalogue card to resolve — pass `1` when a test needs a
 *              *second*, distinct product (recently-viewed, comparisons).
 */
export async function gotoProduct(page: Page, query = '', index = 0): Promise<string> {
  const path = await productPath(page, index);
  await page.goto(`${path}${query}`);
  await page.waitForLoadState('networkidle');
  return path;
}

/**
 * Pick the first in-stock size on a PDP. Returns false when the product
 * exposes no selectable size.
 *
 * Replaces `page.locator('button:has-text("M")').first()`, which was in every
 * spec that added to cart. Playwright's `has-text` is a case-insensitive
 * *substring* match, so on a real page it matched 27 buttons — "Store
 * Locations" in the header first of all. Those tests were clicking the header
 * link and navigating away from the product.
 */
export async function selectFirstAvailableSize(page: Page): Promise<boolean> {
  const chips = page.locator('[data-testid="pdp-size-chip"]:not([disabled])');
  if ((await chips.count()) === 0) return false;
  await chips.first().click();
  return true;
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
      items: [
        {
          id: 'wc-3-seed',
          name: 'Seed Dress',
          brand: 'OE',
          sku: 'wc-3',
          color: '#000',
          size: 'M',
          quantity: 1,
          price: 49.99,
          image: '/icons/icon-192.png',
        },
      ],
      miniCartOpen: false,
    };
    store.__version = 3;
    localStorage.setItem('oe_store', JSON.stringify(store));
  });
}
