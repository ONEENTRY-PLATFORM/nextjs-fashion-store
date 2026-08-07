import { test, expect } from '@playwright/test';

/**
 * The storefront reads all UI copy from one flat CMS dictionary loaded once in
 * the root layout (`getDictionary()` → `DictProvider`). Screens used to mount
 * their own label provider and load their own attribute set; those are gone.
 *
 * The regression this guards against is silent: a screen whose provider was
 * removed keeps rendering, but falls back to the shipped English copy instead
 * of the CMS value, and nothing throws. So rather than pinning wording, each
 * assertion compares the rendered text against the value fetched live from
 * OneEntry — the copy must match what an editor actually published.
 *
 * The anchors below are deliberately keys whose local fallback is the empty
 * string: if the dictionary does not reach the screen, the element is not
 * rendered at all, which is unambiguous.
 */

const OE_URL = (process.env.NEXT_PUBLIC_ONEENTRY_URL ?? process.env.ONEENTRY_URL ?? '').replace(/\/$/, '');
const OE_TOKEN = process.env.NEXT_PUBLIC_ONEENTRY_TOKEN ?? process.env.ONEENTRY_TOKEN ?? '';
const LANG = process.env.NEXT_PUBLIC_DEFAULT_LOCALE ?? 'en_US';

/** Read one attribute set straight from OE, flattened to `marker → value`. */
async function fetchSet(marker: string): Promise<Record<string, string>> {
  const res = await fetch(`${OE_URL}/api/content/attributes-sets/marker/${marker}?langCode=${LANG}`, {
    headers: { 'x-app-token': OE_TOKEN, Accept: 'application/json' },
  });
  if (!res.ok) return {};
  const body = (await res.json()) as { schema?: Record<string, { initialValue?: unknown }> };
  const out: Record<string, string> = {};
  for (const [key, attr] of Object.entries(body?.schema ?? {})) {
    const raw = attr?.initialValue as
      | { value?: unknown }
      | Record<string, { value?: unknown }>
      | undefined;
    if (!raw || typeof raw !== 'object') continue;
    // OE returns `initialValue` either flat or language-keyed depending on
    // which endpoint surfaced it; accept both.
    const langKeyed = (raw as Record<string, { value?: unknown }>)[LANG];
    const value = typeof langKeyed?.value === 'string'
      ? langKeyed.value
      : typeof (raw as { value?: unknown }).value === 'string'
        ? ((raw as { value: string }).value)
        : '';
    if (value) out[key] = value;
  }
  return out;
}

test.describe('CMS dictionary reaches every screen', () => {
  test.skip(!OE_URL || !OE_TOKEN, 'OneEntry credentials are not configured');

  test('PDP renders copy from sets that used to need a page-level provider', async ({ page }) => {
    // `product-card` was loaded by the root layout; `product_card_delivery_returns`
    // came from `PdpLabelsProvider`, mounted on the product route. Both must now
    // arrive through the single root dictionary.
    const [productCard, deliveryReturns] = await Promise.all([
      fetchSet('product-card'),
      fetchSet('product_card_delivery_returns'),
    ]);

    const snippets = [
      productCard['product-card_free_delivery'],
      productCard['product-card_free_returns'],
      productCard['product-card_secure_checkout'],
    ].filter(Boolean);
    const deliveryTitle = deliveryReturns['p_c_d_r_standart_delivery_title'];

    test.skip(
      snippets.length === 0 && !deliveryTitle,
      'tenant has no copy published for these markers',
    );

    // Land on a real product via the catalogue so the test does not depend on
    // any one product id surviving in the CMS.
    await page.goto('/women/clothing', { waitUntil: 'domcontentloaded' });
    const firstProduct = page.locator('a[href^="/product/"]').first();
    await firstProduct.waitFor({ state: 'visible', timeout: 90_000 });
    await firstProduct.click();
    await page.waitForURL('**/product/**', { timeout: 90_000 });

    if (snippets.length > 0) {
      const rendered = page.locator('[data-testid="pdp-delivery-snippet"]');
      await rendered.first().waitFor({ state: 'visible', timeout: 60_000 });
      const texts = (await rendered.allInnerTexts()).map((t) => t.trim());
      for (const snippet of snippets) {
        expect(texts, `"${snippet}" should come from the CMS dictionary`).toContain(snippet);
      }
    }

    if (deliveryTitle) {
      const titles = page.locator('[data-testid="pdp-delivery-row-title"]');
      await titles.first().waitFor({ state: 'visible', timeout: 60_000 });
      const texts = (await titles.allInnerTexts()).map((t) => t.trim());
      expect(texts, 'delivery accordion copy should come from the CMS dictionary').toContain(deliveryTitle);
    }
  });

  test('stores page renders copy that used to come from StoresLabelsProvider', async ({ page }) => {
    const storePages = await fetchSet('store_pages');
    const moreInfo = storePages['store_pages_more_info_cta'];
    test.skip(!moreInfo, 'tenant has no `store_pages_more_info_cta` published');

    await page.goto('/stores', { waitUntil: 'domcontentloaded' });
    // The CTA repeats per store card; one visible match is enough to prove the
    // dictionary reached this route.
    await expect(page.getByText(moreInfo, { exact: true }).first()).toBeVisible({ timeout: 90_000 });
  });
});
