import { expect, test } from '@playwright/test';

import { INFO_PAGE_META } from '@/app/data/infoPages';

/**
 * Three strings that used to be rendered straight from code, with the CMS
 * unable to touch them:
 *
 *  - the skip-to-content link in the root layout, printed from `A11Y_LABELS`
 *    even though the dictionary was already loaded two lines above it;
 *  - the 404's `<title>`, taken from `SEO.notFound` with no CMS pass at all;
 *  - the info-page heading, where `INFO_PAGE_META[slug].title` was checked
 *    *before* the OE page title, so a heading an editor changed never appeared.
 *
 * Each assertion compares what the browser renders against the value fetched
 * live from OneEntry, not against pinned wording — the point is that the CMS
 * value wins, whatever it happens to say today.
 */

const OE_URL = (process.env.NEXT_PUBLIC_ONEENTRY_URL ?? process.env.ONEENTRY_URL ?? '').replace(/\/$/, '');
const OE_TOKEN = process.env.NEXT_PUBLIC_ONEENTRY_TOKEN ?? process.env.ONEENTRY_TOKEN ?? '';
/** Mirrors `DEFAULT_LOCALE` in src/lib/oneentry/locale.ts. */
const LANG = 'en_US';

const oeHeaders = { 'x-app-token': OE_TOKEN, Accept: 'application/json' };

/** One attribute set from OE, flattened to `marker → value`. */
async function fetchSet(marker: string): Promise<Record<string, string>> {
  const res = await fetch(`${OE_URL}/api/content/attributes-sets/marker/${marker}?langCode=${LANG}`, {
    headers: oeHeaders,
  });
  if (!res.ok) return {};
  const body = (await res.json()) as { schema?: Record<string, { initialValue?: unknown }> };
  const out: Record<string, string> = {};
  for (const [key, attr] of Object.entries(body?.schema ?? {})) {
    const raw = attr?.initialValue as { value?: unknown } | Record<string, { value?: unknown }> | undefined;
    if (!raw || typeof raw !== 'object') continue;
    // `initialValue` comes back flat or language-keyed depending on the
    // endpoint that surfaced it; accept both.
    const langKeyed = (raw as Record<string, { value?: unknown }>)[LANG];
    const value =
      typeof langKeyed?.value === 'string'
        ? langKeyed.value
        : typeof (raw as { value?: unknown }).value === 'string'
          ? (raw as { value: string }).value
          : '';
    if (value) out[key] = value;
  }
  return out;
}

/**
 * The editor-facing title of one OE page. `localizeInfos` comes back either
 * keyed by locale or already unwrapped, depending on the endpoint — the same
 * two shapes `normalize()` in `catalog/pages.ts` handles.
 */
async function fetchPageTitle(pageUrl: string): Promise<string> {
  const res = await fetch(`${OE_URL}/api/content/pages/url/${pageUrl}?langCode=${LANG}`, { headers: oeHeaders });
  if (!res.ok) return '';
  const body = (await res.json()) as { localizeInfos?: Record<string, unknown> & { title?: string } };
  const localize = body?.localizeInfos ?? {};
  const perLocale = localize[LANG] as { title?: string } | undefined;
  const title = perLocale?.title ?? localize.title;
  return typeof title === 'string' ? title.trim() : '';
}

test.describe('copy that used to be hardcoded now comes from the CMS', () => {
  test.skip(!OE_URL || !OE_TOKEN, 'OneEntry credentials are not configured');

  test('skip-to-content link renders the `header` dictionary value', async ({ page }) => {
    const header = await fetchSet('header');
    const skip = header['header_aria_skip_to_content'];
    test.skip(!skip, 'tenant has no `header_aria_skip_to_content` published');

    await page.goto('/', { waitUntil: 'domcontentloaded' });
    const link = page.locator('[data-testid="skip-to-content"]');
    await expect(link).toHaveCount(1);
    // Visually hidden until focused, so assert on the text, not on visibility.
    expect((await link.innerText()).trim()).toBe(skip);
    await expect(link).toHaveAttribute('href', '#main-content');
  });

  test('404 metadata comes from `system_pages`, not from the root layout', async ({ page }) => {
    const systemPages = await fetchSet('system_pages');
    const seoTitle = systemPages['not_found_seo_title'];
    test.skip(!seoTitle, 'tenant has no `not_found_seo_title` published');

    // No status assertion: Next answers a streamed `notFound()` with 200 by
    // design (see `not-found.js` in the Next docs), so the document — not the
    // status line — is what proves the 404 rendered.
    await page.goto('/this-route-does-not-exist-e2e', { waitUntil: 'domcontentloaded' });
    await expect(page.locator('[data-testid="not-found-heading"]')).toBeVisible({ timeout: 60_000 });
    // Exactly the CMS value: metadata is returned by `[...slug]`'s
    // `generateMetadata` as `title.absolute`, so the layout's `%s | brand`
    // template must not have appended the brand a second time.
    await expect(page).toHaveTitle(seoTitle);
  });

  test('info page heading renders the OE page title', async ({ page }, testInfo) => {
    // Prefer a slug whose CMS title differs from the coded one — that case
    // distinguishes the two sources outright. Today every published title
    // happens to equal its fallback, so fall back to any page with a title:
    // the assertion still pins the rendered heading to the CMS value, and it
    // starts discriminating the moment an editor rewords one.
    const slugs = Object.keys(INFO_PAGE_META);
    let slug = '';
    let cmsTitle = '';
    let distinguishing = false;
    for (const candidate of slugs) {
      const title = await fetchPageTitle(candidate);
      if (!title) continue;
      if (!slug) {
        slug = candidate;
        cmsTitle = title;
      }
      if (title !== INFO_PAGE_META[candidate]?.title) {
        slug = candidate;
        cmsTitle = title;
        distinguishing = true;
        break;
      }
    }
    test.skip(!slug, 'tenant publishes no info-page titles');
    if (!distinguishing) {
      testInfo.annotations.push({
        type: 'weak',
        description: `every OE title equals its coded fallback; "${slug}" cannot tell the two apart`,
      });
    }

    await page.goto(`/${slug}`, { waitUntil: 'domcontentloaded' });

    // The resolved title is what the breadcrumb JSON-LD names as the last
    // crumb — the visible `h1` belongs to the first editorial section block,
    // which is a different string entirely.
    const blocks = await page.locator('script[type="application/ld+json"]').allTextContents();
    const crumbs = blocks
      .map((raw) => {
        try {
          return JSON.parse(raw) as { '@type'?: string; itemListElement?: { name?: string }[] };
        } catch {
          return null;
        }
      })
      .find((node) => node?.['@type'] === 'BreadcrumbList');
    expect(crumbs, 'info page should emit BreadcrumbList JSON-LD').toBeTruthy();

    const last = crumbs?.itemListElement?.at(-1)?.name?.trim();
    expect(last, 'last breadcrumb should be the OE page title').toBe(cmsTitle);
  });
});
