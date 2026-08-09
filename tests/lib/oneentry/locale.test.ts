import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

/**
 * The as-needed URL scheme is the load-bearing promise of this migration:
 * enabling a second locale must not move a single existing English URL. These
 * tests pin that, plus the short-code mapping the URLs are built from.
 *
 * The module reads `NEXT_PUBLIC_LOCALES` at import time, so each block
 * re-imports it with a fresh env.
 */
const importWith = async (locales?: string, def?: string) => {
  vi.resetModules();
  if (locales === undefined) delete process.env.NEXT_PUBLIC_LOCALES;
  else process.env.NEXT_PUBLIC_LOCALES = locales;
  if (def === undefined) delete process.env.NEXT_PUBLIC_DEFAULT_LOCALE;
  else process.env.NEXT_PUBLIC_DEFAULT_LOCALE = def;
  return import('@/lib/oneentry/locale');
};

const ORIGINAL = { ...process.env };
beforeEach(() => {
  vi.resetModules();
});
afterEach(() => {
  process.env = { ...ORIGINAL };
});

describe('single-locale deployment', () => {
  it('routes only the default and never prefixes anything', async () => {
    const L = await importWith(undefined, 'en_US');

    expect(L.SHORT_LOCALES).toEqual(['en']);
    expect(L.IS_MULTI_LOCALE).toBe(false);
    // The whole point: URLs are byte-identical to the pre-migration ones.
    expect(L.localizeHref('/cart', 'en')).toBe('/cart');
    expect(L.localizeHref('/', 'en')).toBe('/');
    // An unrouted locale cannot smuggle a prefix in.
    expect(L.localizeHref('/cart', 'fr')).toBe('/cart');
  });
});

describe('multi-locale deployment', () => {
  it('prefixes every locale except the default', async () => {
    const L = await importWith('en_US,fr_FR', 'en_US');

    expect(L.SHORT_LOCALES).toEqual(['en', 'fr']);
    expect(L.IS_MULTI_LOCALE).toBe(true);
    expect(L.localizeHref('/cart', 'en')).toBe('/cart');
    expect(L.localizeHref('/cart', 'fr')).toBe('/fr/cart');
    expect(L.localizeHref('/', 'fr')).toBe('/fr');
  });

  it('never double-prefixes an already-localized href', async () => {
    const L = await importWith('en_US,fr_FR', 'en_US');
    expect(L.localizeHref('/fr/cart', 'fr')).toBe('/fr/cart');
    // Switching languages replaces the prefix rather than stacking one.
    expect(L.localizeHref('/fr/cart', 'en')).toBe('/cart');
  });

  it('leaves non-app hrefs alone', async () => {
    const L = await importWith('en_US,fr_FR', 'en_US');
    for (const href of ['https://x.test/a', '//cdn.test/a', 'mailto:a@b.c', 'tel:+1', '#top']) {
      expect(L.localizeHref(href, 'fr')).toBe(href);
    }
  });

  it('reads the locale back off a path', async () => {
    const L = await importWith('en_US,fr_FR', 'en_US');
    expect(L.localeFromPath('/fr/cart')).toBe('fr');
    // No prefix means the default — that is what as-needed encodes.
    expect(L.localeFromPath('/cart')).toBe('en');
    expect(L.localeFromPath('/')).toBe('en');
    // A path segment that merely looks like a locale is not one.
    expect(L.localeFromPath('/de/cart')).toBe('en');
  });

  it('strips the prefix back to the bare route', async () => {
    const L = await importWith('en_US,fr_FR', 'en_US');
    expect(L.stripLocale('/fr/cart')).toBe('/cart');
    expect(L.stripLocale('/fr')).toBe('/');
    expect(L.stripLocale('/cart')).toBe('/cart');
    expect(L.stripLocale('/de/cart')).toBe('/de/cart');
  });
});

describe('code mapping', () => {
  it('converts between CMS and URL spellings', async () => {
    const L = await importWith('en_US,fr_FR', 'en_US');
    expect(L.toShortCode('fr_FR')).toBe('fr');
    expect(L.toShortCode('en')).toBe('en');
    expect(L.toCmsLocale('fr')).toBe('fr_FR');
    // Unknown segments resolve to the default rather than throwing — a stray
    // URL must not take the page down.
    expect(L.toCmsLocale('zz')).toBe('en_US');
    expect(L.toCmsLocale(undefined)).toBe('en_US');
  });

  it('builds BCP-47 tags for html lang and hreflang', async () => {
    const L = await importWith('en_US,fr_FR', 'en_US');
    expect(L.htmlLang('en')).toBe('en-US');
    expect(L.htmlLang('fr')).toBe('fr-FR');
  });

  it('always keeps the default routable even if the env omits it', async () => {
    const L = await importWith('fr_FR', 'en_US');
    expect(L.SHORT_LOCALES).toEqual(['en', 'fr']);
  });
});

describe('hreflang alternates', () => {
  it('points x-default at the unprefixed URL', async () => {
    const L = await importWith('en_US,fr_FR', 'en_US');
    expect(L.buildLanguageAlternates('https://shop.test', '/cart')).toEqual({
      'en-US': 'https://shop.test/cart',
      'fr-FR': 'https://shop.test/fr/cart',
      'x-default': 'https://shop.test/cart',
    });
  });

  it('handles the site root without a trailing slash', async () => {
    const L = await importWith('en_US,fr_FR', 'en_US');
    expect(L.buildLanguageAlternates('https://shop.test', '/')).toEqual({
      'en-US': 'https://shop.test',
      'fr-FR': 'https://shop.test/fr',
      'x-default': 'https://shop.test',
    });
  });
});
