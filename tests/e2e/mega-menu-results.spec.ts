import { expect, test } from '@playwright/test';
import { defineOneEntry } from 'oneentry';

import { waitForHeaderHydration } from './helpers';

/**
 * Every second-level mega-menu entry that OE has products for must land on a catalog that
 * shows them.
 *
 * The existing header specs only assert that the URL changes, which is why this shipped
 * broken: the menu links by OE `pageUrl` (`women_bags_bags`), while a product stores the
 * same leaf split from its parent (`home/women/women_bags/bags`). The URL was right and the
 * page was empty — "NO RESULTS FOUND" on every leaf whose pageUrl carries the parent prefix,
 * and on every SEASONAL TRENDS page, whose `st_trends` is a comma-separated list that was
 * being matched whole. A URL check cannot see any of that.
 *
 * OE is asked directly for the expected count so a category the merchant simply has not
 * filled yet (a legitimate, and changing, state) does not fail the suite — only a leaf that
 * HAS products and still renders none does.
 */
test.describe('Mega menu — second level leads to products', () => {
  // Deliberately not `/`: it is the slowest route to render on a dev server, and the
  // second-level bar is identical on every catalog page.
  const ENTRY = '/women/clothing';

  test('no second-level category with products lands on an empty catalog', async ({ page }) => {
    test.slow();
    const url = process.env.NEXT_PUBLIC_ONEENTRY_URL;
    const token = process.env.NEXT_PUBLIC_ONEENTRY_TOKEN;
    test.skip(!url || !token, 'NEXT_PUBLIC_ONEENTRY_URL / _TOKEN are not set');
    const api = defineOneEntry(url as string, { token: token as string, langCode: 'en_US' });

    await page.goto(ENTRY, { waitUntil: 'domcontentloaded' });
    await waitForHeaderHydration(page);

    // Collect the leaves behind every top-level entry of the category bar.
    const hrefs = new Set<string>();
    for (const name of ['SHOES', 'CLOTHING', 'BAGS', 'ACCESSORIES']) {
      const btn = page.getByRole('button', { name: new RegExp(`^${name}$`, 'i') }).first();
      if ((await btn.count()) === 0) continue;
      await btn.hover();
      await page.waitForTimeout(600);
      for (const h of await page
        .locator('a[href*="category="]')
        .evaluateAll((els) => els.map((e) => e.getAttribute('href') ?? ''))) {
        if (h) hrefs.add(h);
      }
    }

    expect(hrefs.size, 'the mega menu must expose category leaves').toBeGreaterThan(0);

    const broken: string[] = [];
    for (const href of hrefs) {
      const pageUrl = new URL(href, 'http://x').searchParams.get('category');
      if (!pageUrl) continue;

      await page.goto(href, { waitUntil: 'domcontentloaded' });
      await page.waitForLoadState('networkidle').catch(() => undefined);
      const isEmpty = await page
        .getByText(/no results found/i)
        .first()
        .isVisible()
        .catch(() => false);
      if (!isEmpty) continue;

      // Empty on screen — is it empty in the CMS too? A SEASONAL TRENDS page carries no
      // products of its own, so its `st_trends` attribute standing in for them counts.
      const res = await api.Products.getProductsByPageUrl(pageUrl, undefined, 'en_US', { limit: 1 });
      const total = (res as { total?: number })?.total ?? 0;
      const cms = await api.Pages.getPageByUrl(pageUrl, 'en_US');
      const attrs = (cms as { attributeValues?: Record<string, unknown> })?.attributeValues ?? {};
      const slice = (attrs as Record<string, unknown>)['en_US'];
      const bag = (slice && typeof slice === 'object' ? slice : attrs) as Record<string, unknown>;
      const trend = (bag['st_trends'] as { value?: unknown } | undefined)?.value;
      if (total > 0 || (typeof trend === 'string' && trend.trim())) broken.push(href);
    }

    expect(broken, `mega-menu categories that have products but render none: ${broken.join(', ')}`).toEqual([]);
  });
});
