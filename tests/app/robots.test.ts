/**
 * Tests for `app/robots.ts`.
 *
 * The point of interest is locale coverage: prefixes are as-needed, so the
 * private routes have to be listed once per routed locale. Writing them out by
 * hand left the German copies (`/de/cart`, `/de/account`, …) crawlable.
 */
import { describe, expect, it } from 'vitest';

import robots from '@/app/../../app/robots';
import { DEFAULT_SHORT_LOCALE, SHORT_LOCALES } from '@/lib/oneentry/locale';

/** The `disallow` list of the wildcard rule, normalised to an array. */
const wildcardDisallow = (): string[] => {
  const rules = robots().rules;
  const list = Array.isArray(rules) ? rules : [rules];
  const wildcard = list.find((rule) => rule.userAgent === '*');
  const disallow = wildcard?.disallow ?? [];
  return Array.isArray(disallow) ? disallow : [disallow];
};

describe('robots — private paths', () => {
  const PRIVATE_ROUTES = ['/cart', '/favorites', '/account', '/checkout/'];

  it('closes every private route in the default (unprefixed) locale', () => {
    const disallow = wildcardDisallow();
    for (const route of PRIVATE_ROUTES) {
      expect(disallow).toContain(route);
    }
  });

  it('closes every private route in each prefixed locale', () => {
    const disallow = wildcardDisallow();
    const prefixed = SHORT_LOCALES.filter((short) => short !== DEFAULT_SHORT_LOCALE);

    // Guards the test itself: with a single locale there is nothing to cover.
    expect(prefixed.length).toBeGreaterThan(0);

    for (const short of prefixed) {
      for (const route of PRIVATE_ROUTES) {
        expect(disallow).toContain(`/${short}${route}`);
      }
    }
  });

  it('leaves /api/ unprefixed — it is not locale-routed', () => {
    const disallow = wildcardDisallow();
    expect(disallow).toContain('/api/');
    for (const short of SHORT_LOCALES.filter((s) => s !== DEFAULT_SHORT_LOCALE)) {
      expect(disallow).not.toContain(`/${short}/api/`);
    }
  });

  it('lists no duplicates', () => {
    const disallow = wildcardDisallow();
    expect(new Set(disallow).size).toBe(disallow.length);
  });
});
