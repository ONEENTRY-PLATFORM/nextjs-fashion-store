import { describe, expect, it } from 'vitest';

import { SITE_URL } from '@/app/data/seoData';
import { buildLanguageAlternates } from '@/lib/oneentry/locale';

/**
 * Regression guard for the canonical → hreflang chain.
 *
 * `withCmsSeo` reduces whatever canonical it is handed to a site-relative path
 * before building the language map. When it only recognised `SITE_URL`-prefixed
 * values, a canonical typed into the admin panel against the *previous* domain
 * silently produced no `alternates.languages` at all — every route lost its
 * hreflang and pointed at a host that no longer answers. The parsing rule is
 * exercised here directly; the rendered result is covered by
 * `tests/e2e/locale-routing.spec.ts`.
 */

/** Mirror of the reduction `page-seo.ts` performs (kept in step by the tests). */
function toSitePath(href: string): string | null {
  const raw = href.trim();
  if (!raw) return null;
  if (raw.startsWith(SITE_URL)) return raw.slice(SITE_URL.length) || '/';
  if (raw.startsWith('/')) return raw;
  if (/^https?:\/\//i.test(raw)) {
    try {
      const { pathname, search } = new URL(raw);
      return `${pathname}${search}` || '/';
    } catch {
      return null;
    }
  }
  return null;
}

describe('canonical → site path', () => {
  it('accepts a bare path', () => {
    expect(toSitePath('/cart')).toBe('/cart');
  });

  it('accepts a URL on the current origin', () => {
    expect(toSitePath(`${SITE_URL}/cart`)).toBe('/cart');
    expect(toSitePath(SITE_URL)).toBe('/');
  });

  it('keeps the path of a URL left over from a previous domain', () => {
    // The case that broke hreflang site-wide when the origin moved.
    expect(toSitePath('https://old-domain.example/cart')).toBe('/cart');
    expect(toSitePath('https://old-domain.example/')).toBe('/');
  });

  it('rejects a value that is not addressable', () => {
    expect(toSitePath('')).toBeNull();
    expect(toSitePath('   ')).toBeNull();
    expect(toSitePath('cart')).toBeNull();
  });

  it('yields a language map for every reduced path', () => {
    const languages = buildLanguageAlternates(SITE_URL, toSitePath('https://old-domain.example/cart')!);
    expect(Object.keys(languages).length).toBeGreaterThan(0);
    for (const href of Object.values(languages)) {
      expect(href.startsWith(SITE_URL)).toBe(true);
    }
  });
});
