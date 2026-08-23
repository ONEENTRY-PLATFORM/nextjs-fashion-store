import { expect, test } from '@playwright/test';

import { assertPresent, productPath } from './helpers';

/**
 * A PDP that cannot resolve must not be storable as a normal page.
 *
 * The route used to render its "no product" state as a 200 with a full render behind it, so any
 * crawler walking made-up ids minted ISR entries (and Vercel Write Units) without limit. Two
 * guards now stand in the way, and they answer differently on purpose:
 *
 * - a non-numeric id is rejected at the edge by `proxy.ts` — a real 404, nothing rendered, nothing
 *   cached;
 * - a numeric id with no product behind it reaches the route, which calls `notFound()` before any
 *   OE round-trip. Every `notFound()` in this app still answers 200 (the segment streams, so the
 *   status is already sent), so the assertion here is on the rendered outcome and `noindex`, not
 *   on the status code.
 */
test.describe('PDP 404', () => {
  test('non-numeric product id is rejected at the edge with a 404', async ({ page }) => {
    const response = await page.goto('/product/not-a-real-id');
    assertPresent(response, 'navigation response for /product/not-a-real-id');
    expect(response.status()).toBe(404);
    await expect(page.getByTestId('not-found-heading')).toBeVisible();
  });

  test('numeric id with no product behind it renders the not-found page, noindexed', async ({ page }) => {
    await page.goto('/product/999999999');
    await expect(page.getByTestId('not-found-heading')).toBeVisible();
    // Several `robots` metas render here (route metadata plus the not-found page's own); all say noindex.
    await expect(page.locator('meta[name="robots"]').first()).toHaveAttribute('content', /noindex/);
  });

  test('a real product still answers 200', async ({ page }) => {
    const path = await productPath(page);
    const response = await page.goto(path);
    assertPresent(response, `navigation response for ${path}`);
    expect(response.status()).toBe(200);
    await expect(page.getByTestId('not-found-heading')).toHaveCount(0);
  });
});
