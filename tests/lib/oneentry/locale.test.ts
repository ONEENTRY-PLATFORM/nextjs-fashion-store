import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

/**
 * The as-needed URL scheme is the load-bearing promise of this migration:
 * enabling a second locale must not move a single existing English URL. These
 * tests pin that, plus the short-code mapping the URLs are built from.
 *
 * The routed list is a build-time snapshot of the OneEntry project settings
 * (`locales.generated.ts`), so each block re-imports the module with that
 * snapshot mocked. `DEFAULT_LOCALE` is a constant and is deliberately not
 * overridable — that is the property the last test in "code mapping" pins.
 */
const importWith = async (codes?: string[]) => {
  vi.resetModules();
  vi.doMock('@/lib/oneentry/locales.generated', () => ({
    GENERATED_CMS_LOCALES: codes ?? ['en_US'],
  }));
  return import('@/lib/oneentry/locale');
};

beforeEach(() => {
  vi.resetModules();
});
afterEach(() => {
  vi.doUnmock('@/lib/oneentry/locales.generated');
  vi.resetModules();
});

describe('single-locale deployment', () => {
  it('routes only the default and never prefixes anything', async () => {
    const L = await importWith();

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
    const L = await importWith(['en_US', 'fr_FR']);

    expect(L.SHORT_LOCALES).toEqual(['en', 'fr']);
    expect(L.IS_MULTI_LOCALE).toBe(true);
    expect(L.localizeHref('/cart', 'en')).toBe('/cart');
    expect(L.localizeHref('/cart', 'fr')).toBe('/fr/cart');
    expect(L.localizeHref('/', 'fr')).toBe('/fr');
  });

  it('never double-prefixes an already-localized href', async () => {
    const L = await importWith(['en_US', 'fr_FR']);
    expect(L.localizeHref('/fr/cart', 'fr')).toBe('/fr/cart');
    // Switching languages replaces the prefix rather than stacking one.
    expect(L.localizeHref('/fr/cart', 'en')).toBe('/cart');
  });

  it('leaves non-app hrefs alone', async () => {
    const L = await importWith(['en_US', 'fr_FR']);
    for (const href of ['https://x.test/a', '//cdn.test/a', 'mailto:a@b.c', 'tel:+1', '#top']) {
      expect(L.localizeHref(href, 'fr')).toBe(href);
    }
  });

  it('reads the locale back off a path', async () => {
    const L = await importWith(['en_US', 'fr_FR']);
    expect(L.localeFromPath('/fr/cart')).toBe('fr');
    // No prefix means the default — that is what as-needed encodes.
    expect(L.localeFromPath('/cart')).toBe('en');
    expect(L.localeFromPath('/')).toBe('en');
    // A path segment that merely looks like a locale is not one.
    expect(L.localeFromPath('/de/cart')).toBe('en');
  });

  it('strips the prefix back to the bare route', async () => {
    const L = await importWith(['en_US', 'fr_FR']);
    expect(L.stripLocale('/fr/cart')).toBe('/cart');
    expect(L.stripLocale('/fr')).toBe('/');
    expect(L.stripLocale('/cart')).toBe('/cart');
    expect(L.stripLocale('/de/cart')).toBe('/de/cart');
  });
});

describe('code mapping', () => {
  it('converts between CMS and URL spellings', async () => {
    const L = await importWith(['en_US', 'fr_FR']);
    expect(L.toShortCode('fr_FR')).toBe('fr');
    expect(L.toShortCode('en')).toBe('en');
    expect(L.toCmsLocale('fr')).toBe('fr_FR');
    // Unknown segments resolve to the default rather than throwing — a stray
    // URL must not take the page down.
    expect(L.toCmsLocale('zz')).toBe('en_US');
    expect(L.toCmsLocale(undefined)).toBe('en_US');
  });

  it('builds BCP-47 tags for html lang and hreflang', async () => {
    const L = await importWith(['en_US', 'fr_FR']);
    expect(L.htmlLang('en')).toBe('en-US');
    expect(L.htmlLang('fr')).toBe('fr-FR');
  });

  it('keeps the default routable and first, whatever the CMS lists', async () => {
    // Admin order puts French first and omits English entirely; neither may
    // change which locale owns the un-prefixed URLs.
    const L = await importWith(['fr_FR']);
    expect(L.DEFAULT_LOCALE).toBe('en_US');
    expect(L.SHORT_LOCALES).toEqual(['en', 'fr']);
    expect(L.localizeHref('/cart', 'en')).toBe('/cart');
  });
});

describe('hreflang alternates', () => {
  it('points x-default at the unprefixed URL', async () => {
    const L = await importWith(['en_US', 'fr_FR']);
    expect(L.buildLanguageAlternates('https://shop.test', '/cart')).toEqual({
      'en-US': 'https://shop.test/cart',
      'fr-FR': 'https://shop.test/fr/cart',
      'x-default': 'https://shop.test/cart',
    });
  });

  it('handles the site root without a trailing slash', async () => {
    const L = await importWith(['en_US', 'fr_FR']);
    expect(L.buildLanguageAlternates('https://shop.test', '/')).toEqual({
      'en-US': 'https://shop.test',
      'fr-FR': 'https://shop.test/fr',
      'x-default': 'https://shop.test',
    });
  });
});
