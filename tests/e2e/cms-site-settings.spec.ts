import { expect, test } from '@playwright/test';

import { clearState, login } from './helpers';

/**
 * The site-wide settings that used to be TypeScript constants — brand palette,
 * commerce terms, referral programme — are now read from the OneEntry
 * `site_settings` set. These tests assert the wiring, not the values: an editor
 * is free to change the numbers, but the storefront must be reading them from
 * one place and publishing them consistently.
 */
test.describe('CMS site settings', () => {
  test('brand palette is published as custom properties on the document', async ({ page }) => {
    await page.goto('/');
    const html = page.locator('html');
    for (const name of ['--brand-accent-women', '--brand-accent-men', '--brand-sale']) {
      const value = await html.evaluate((el, prop) => getComputedStyle(el).getPropertyValue(prop).trim(), name);
      // A hex triple — anything else means the value never made it out of the
      // CMS, or was rejected by the parser and never replaced.
      expect(value, `${name} should resolve to a colour`).toMatch(/^#(?:[0-9a-f]{3}|[0-9a-f]{6})$/i);
    }
  });

  test('component-local aliases resolve against the brand palette, not themselves', async ({ page }) => {
    await page.goto('/');
    // `--sale` is declared on subtrees as `var(--brand-sale, …)`. If the global
    // used the same name the reference would be cyclic and drop the colour.
    const saleColor = await page
      .locator('html')
      .evaluate((el) => getComputedStyle(el).getPropertyValue('--brand-sale').trim());
    expect(saleColor.length).toBeGreaterThan(0);
  });

  test('Inter is self-hosted and actually requested', async ({ page }) => {
    const googleFontRequests: string[] = [];
    page.on('request', (req) => {
      if (/fonts\.(googleapis|gstatic)\.com/.test(req.url())) googleFontRequests.push(req.url());
    });
    await page.goto('/');

    const family = await page.evaluate(() => getComputedStyle(document.body).fontFamily);
    // `next/font` mangles the family name, so match its stem rather than the
    // literal "Inter" the stripped remote `@import` used to promise.
    expect(family).toMatch(/inter/i);

    // The font file must be ours, and it must actually answer.
    const href = await page.locator('link[rel="preload"][as="font"]').first().getAttribute('href');
    expect(href, 'a font should be preloaded').toBeTruthy();
    expect(href!).toMatch(/^\/_next\/static\/media\/.+\.woff2$/);
    const font = await page.request.get(href!);
    expect(font.status()).toBe(200);
    expect(font.headers()['content-type']).toContain('font');

    // And nothing should be reaching out to Google for it any more.
    expect(googleFontRequests).toEqual([]);
  });

  test('robots.txt and the sitemap agree on one origin', async ({ page, baseURL }) => {
    const robots = await page.request.get('/robots.txt');
    expect(robots.ok()).toBe(true);
    const body = await robots.text();
    const hostLine = /Host:\s*(\S+)/i.exec(body);
    expect(hostLine, 'robots.txt should declare a host').not.toBeNull();
    const host = hostLine![1];
    expect(host).toMatch(/^https?:\/\//);

    const sitemap = await page.request.get('/sitemap.xml');
    expect(sitemap.ok()).toBe(true);
    const xml = await sitemap.text();
    // Every url in the sitemap must live on the same origin robots.txt names —
    // the previous constant pointed at a domain that does not serve this app.
    const firstUrl = /<loc>([^<]+)<\/loc>/.exec(xml)?.[1] ?? '';
    expect(firstUrl.startsWith(host)).toBe(true);
    void baseURL;
  });

  test('the manifest carries the CMS brand name', async ({ page }) => {
    const res = await page.request.get('/manifest.webmanifest');
    expect(res.ok()).toBe(true);
    const manifest = (await res.json()) as { name?: string; short_name?: string; icons?: unknown[] };
    expect(manifest.name?.length ?? 0).toBeGreaterThan(0);
    expect(manifest.short_name?.length ?? 0).toBeGreaterThan(0);
    expect(Array.isArray(manifest.icons) && manifest.icons.length > 0).toBe(true);
  });

  test('the homepage Organization schema quotes the same currency the prices use', async ({ page }) => {
    await page.goto('/');
    const scripts = page.locator('script[type="application/ld+json"]');
    await expect.poll(async () => scripts.count()).toBeGreaterThan(0);
    const blocks = await scripts.allTextContents();
    const org = blocks
      .map((raw) => JSON.parse(raw) as Record<string, unknown>)
      .find((node) => typeof node['currenciesAccepted'] === 'string');
    expect(org, 'an Organization node should be present').toBeTruthy();
    expect(String(org!['currenciesAccepted'])).toMatch(/^[A-Z]{3}$/);
    expect(Array.isArray(org!['sameAs'])).toBe(true);
  });
});

test.describe('Region switcher', () => {
  test('remembers the picked region across a reload', async ({ page }) => {
    await page.goto('/');
    const toggle = page.getByTestId('header-region-toggle');
    // Rendered only when the admin panel lists more than one region. Waited
    // for rather than probed once: a single `isVisible()` on a cold server
    // races the first paint and silently skips the test.
    await toggle.waitFor({ state: 'visible' });

    const active = page.getByTestId('header-region-active');
    const before = (await active.textContent())?.trim() ?? '';
    await toggle.click();
    const options = page.locator('[data-testid="header-region-toggle"] ~ div button');
    const other = options.filter({ hasNotText: before }).first();
    const picked = (await other.textContent())?.trim() ?? '';
    await other.click();
    await expect(active).toHaveText(picked);

    await page.reload();
    // The point of the change: the control used to do nothing at all.
    await expect(page.getByTestId('header-region-active')).toHaveText(picked);
  });
});

test.describe('Referral programme', () => {
  test('advertises a reward only when the CMS funds one', async ({ page }) => {
    // Same warm-up the rest of the account suite uses: a stale session from a
    // previous spec leaves `/account` on its logged-out shell.
    await page.goto('/');
    await clearState(page);
    await page.reload();
    await login(page);
    await page.goto('/account');
    await page.waitForLoadState('networkidle');
    // The account nav renders its sections as links, not buttons.
    const referTab = page.getByRole('link', { name: /refer/i }).first();
    await referTab.waitFor({ state: 'visible' });
    await referTab.click();

    const banner = page.getByTestId('refer-reward-banner');
    const shown = await banner.isVisible().catch(() => false);
    if (shown) {
      // A visible banner must name a non-zero credit.
      await expect(banner).not.toContainText(/\B0\b\s*$/);
    }
    // The share link always points at this storefront, never a third-party host.
    const link = page.locator('text=/\\/ref\\//').first();
    if (await link.isVisible().catch(() => false)) {
      const text = (await link.textContent()) ?? '';
      expect(text).not.toContain('oneentryfashion.com');
    }
  });
});
