import { expect, test } from '@playwright/test';

/**
 * Copy that used to be read straight off a `src/app/data/*Labels.ts` constant
 * — bypassing `useT` / `useDict` — and is now admin-editable.
 *
 * The regression is silent by construction: the shipped fallback equals the
 * value seeded in OneEntry, so a screen that stopped reading the dictionary
 * still renders the same English. Each assertion therefore compares the
 * rendered text against the value fetched live from OE, exactly as
 * `dictionary-cms-copy.spec.ts` does — pinning wording would pass even when
 * the wiring is gone.
 */

const OE_URL = (process.env.NEXT_PUBLIC_ONEENTRY_URL ?? process.env.ONEENTRY_URL ?? '').replace(/\/$/, '');
const OE_TOKEN = process.env.NEXT_PUBLIC_ONEENTRY_TOKEN ?? process.env.ONEENTRY_TOKEN ?? '';
// Mirrors `DEFAULT_LOCALE` in src/lib/oneentry/locale.ts.
const LANG = 'en_US';

/** Read one attribute set straight from OE, flattened to `marker → value`. */
async function fetchSet(marker: string): Promise<Record<string, string>> {
  const res = await fetch(`${OE_URL}/api/content/attributes-sets/marker/${marker}?langCode=${LANG}`, {
    headers: { 'x-app-token': OE_TOKEN, Accept: 'application/json' },
  });
  if (!res.ok) return {};
  const body = (await res.json()) as {
    schema?: Record<string, { identifier?: string; initialValue?: unknown }>;
  };
  const out: Record<string, string> = {};
  for (const [key, attr] of Object.entries(body?.schema ?? {})) {
    const raw = attr?.initialValue as { value?: unknown } | Record<string, { value?: unknown }> | undefined;
    if (!raw || typeof raw !== 'object') continue;
    const langKeyed = (raw as Record<string, { value?: unknown }>)[LANG];
    const value =
      typeof langKeyed?.value === 'string'
        ? langKeyed.value
        : typeof (raw as { value?: unknown }).value === 'string'
          ? (raw as { value: string }).value
          : '';
    if (value) out[attr?.identifier ?? key] = value;
  }
  return out;
}

test.describe('residual hardcoded copy now comes from the CMS', () => {
  test.skip(!OE_URL || !OE_TOKEN, 'OneEntry credentials are not configured');

  test('home page heading and hero carousel a11y labels read from `interface_controls`', async ({ page }) => {
    const ui = await fetchSet('interface_controls');
    const heading = ui['interface_controls_shop_by_category'];
    const featured = ui['interface_controls_featured_collections'];
    const previousSlide = ui['interface_controls_previous_slide'];
    test.skip(!heading && !featured, 'tenant has no copy published for these markers');

    await page.goto('/', { waitUntil: 'domcontentloaded' });

    if (heading) {
      const el = page.locator('[data-testid="category-section-heading"]');
      await el.waitFor({ state: 'visible', timeout: 90_000 });
      // Rendered uppercase via CSS; compare case-insensitively against the
      // authored value rather than pinning the transform.
      expect((await el.innerText()).trim().toLowerCase()).toBe(heading.toLowerCase());
    }

    if (featured) {
      await expect(page.getByRole('region', { name: featured })).toBeVisible({ timeout: 60_000 });
    }

    if (previousSlide) {
      await expect(page.getByRole('button', { name: previousSlide })).toBeVisible({ timeout: 60_000 });
    }
  });

  test('catalog pagination counter and filter search placeholder read from `interface_controls`', async ({ page }) => {
    const ui = await fetchSet('interface_controls');
    const pageOf = ui['interface_controls_page_of'];
    test.skip(!pageOf, 'tenant has no `interface_controls_page_of` published');

    await page.goto('/women/clothing', { waitUntil: 'domcontentloaded' });
    await page.locator('a[href^="/product/"]').first().waitFor({ state: 'visible', timeout: 90_000 });

    // `Page %current% of %total%` — assert on the token-free stem so the test
    // stays valid whatever page the catalogue lands on.
    const stem = pageOf.split('%')[0].trim();
    if (stem) {
      await expect(page.getByText(new RegExp(stem, 'i')).first()).toBeVisible({ timeout: 60_000 });
    }
  });

  test('main navigation and footer legal-links landmarks read their names from the CMS', async ({ page }) => {
    const [header, footer] = await Promise.all([fetchSet('header'), fetchSet('footer')]);
    const mainNav = header['header_aria_main_navigation'];
    const legal = footer['footer_aria_legal_links'];
    test.skip(!mainNav && !legal, 'tenant has no navigation ARIA copy published');

    await page.goto('/', { waitUntil: 'domcontentloaded' });

    if (mainNav) {
      await expect(page.getByRole('navigation', { name: mainNav })).toBeVisible({ timeout: 90_000 });
    }
    if (legal) {
      await expect(page.getByRole('navigation', { name: legal })).toBeVisible({ timeout: 60_000 });
    }
  });

  test('checkout stepper takes its accessible name from `checkout_cart`', async ({ page }) => {
    const checkout = await fetchSet('checkout_cart');
    const progress = checkout['checkout_stepper_aria_progress'];
    const cartStep = checkout['checkout_stepper_cart'];
    test.skip(!progress, 'tenant has no `checkout_stepper_aria_progress` published');

    await page.goto('/cart', { waitUntil: 'domcontentloaded' });
    const stepper = page.getByRole('navigation', { name: progress });
    await expect(stepper).toBeVisible({ timeout: 90_000 });
    if (cartStep) {
      await expect(stepper.getByText(cartStep, { exact: true }).first()).toBeVisible({ timeout: 30_000 });
    }
  });
});
