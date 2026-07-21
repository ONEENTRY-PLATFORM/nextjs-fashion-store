import { beforeEach, describe, expect, it, vi } from 'vitest';

// ---- SDK mock ---------------------------------------------------------------
const getPageByUrl = vi.fn();
const fakeApi = { Pages: { getPageByUrl } };

vi.mock('../index', () => ({
  oneentry: fakeApi,
  isOneEntryEnabled: true,
  getApi: () => fakeApi,
  isError: (v: unknown) =>
    !!v && typeof v === 'object' && 'statusCode' in (v as Record<string, unknown>),
}));

// Strip the ISR cache wrapper so the underlying fetchSalePage runs directly.
vi.mock('next/cache', () => ({
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  unstable_cache: (fn: any) => fn,
}));

const importFresh = async () => {
  vi.resetModules();
  return import('./sale-page');
};

beforeEach(() => {
  getPageByUrl.mockReset();
});

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------
const TEXT_VALUE = [{ htmlValue: '<p>Big Sale</p>', plainValue: 'Big Sale', mdValue: '**Big Sale**' }];
const IMAGE_VALUE = [{ downloadLink: 'https://cdn.example.com/banner.jpg' }];
const TIMER_VALUE = { fullDate: '2026-12-31T23:59:59.000Z' };

/** Minimal wrapped (per-locale) attributeValues shape. */
const wrappedAttrs = {
  en_US: {
    page_sale_top_banner_lable:        { value: 'SALE' },
    page_sale_top_banner_text:         { value: TEXT_VALUE },
    page_sale_top_banner_cta:          { value: 'Shop Now' },
    page_sale_top_banner_timer_lable:  { value: 'Sale ends in' },
    page_sale_top_banner_timer_text:   { value: 'Hurry up!' },
    page_sale_top_banner_picture:      { value: IMAGE_VALUE },
    page_sale_top_banner_timer:        { value: TIMER_VALUE },
    page_sale_footer_banner_lable:     { value: 'Promo' },
    page_sale_footer_banner_title:     { value: 'Winter Collection' },
    page_sale_footer_banner_sub_title: { value: 'Up to 70% off' },
    page_sale_footer_banner_cta:       { value: 'Explore' },
    page_sale_footer_banner_cta_link:  { value: '/winter' },
    page_sale_footer_banner_picture:   { value: [{ downloadLink: 'https://cdn.example.com/footer.jpg' }] },
  },
};

/** Flat (unwrapped) shape — same data, no per-locale key. */
const flatAttrs = wrappedAttrs.en_US;

// ---------------------------------------------------------------------------
describe('loadSalePage — wrapped attributeValues (per-locale)', () => {
  it('extracts all hero string fields', async () => {
    getPageByUrl.mockResolvedValue({ attributeValues: wrappedAttrs });
    const { loadSalePage } = await importFresh();
    const result = await loadSalePage('en_US');
    expect(result).not.toBeNull();
    expect(result!.hero.eyebrow).toBe('SALE');
    expect(result!.hero.ctaLabel).toBe('Shop Now');
    expect(result!.hero.timerLabel).toBe('Sale ends in');
    expect(result!.hero.timerEndsText).toBe('Hurry up!');
  });

  it('extracts hero contentHtml from text attribute array', async () => {
    getPageByUrl.mockResolvedValue({ attributeValues: wrappedAttrs });
    const { loadSalePage } = await importFresh();
    const result = await loadSalePage('en_US');
    expect(result!.hero.contentHtml).toBe('<p>Big Sale</p>');
  });

  it('extracts hero image downloadLink', async () => {
    getPageByUrl.mockResolvedValue({ attributeValues: wrappedAttrs });
    const { loadSalePage } = await importFresh();
    const result = await loadSalePage('en_US');
    expect(result!.hero.image).toBe('https://cdn.example.com/banner.jpg');
  });

  it('parses saleEndsAt as epoch ms from fullDate ISO string', async () => {
    getPageByUrl.mockResolvedValue({ attributeValues: wrappedAttrs });
    const { loadSalePage } = await importFresh();
    const result = await loadSalePage('en_US');
    expect(result!.saleEndsAt).toBe(Date.parse('2026-12-31T23:59:59.000Z'));
  });

  it('extracts all promo fields', async () => {
    getPageByUrl.mockResolvedValue({ attributeValues: wrappedAttrs });
    const { loadSalePage } = await importFresh();
    const result = await loadSalePage('en_US');
    expect(result!.promo).toEqual({
      eyebrow: 'Promo',
      title: 'Winter Collection',
      subtitle: 'Up to 70% off',
      ctaLabel: 'Explore',
      ctaHref: '/winter',
      image: 'https://cdn.example.com/footer.jpg',
    });
  });
});

// ---------------------------------------------------------------------------
describe('loadSalePage — flat attributeValues (no per-locale wrapper)', () => {
  it('still extracts all fields correctly', async () => {
    getPageByUrl.mockResolvedValue({ attributeValues: flatAttrs });
    const { loadSalePage } = await importFresh();
    const result = await loadSalePage('en_US');
    expect(result).not.toBeNull();
    expect(result!.hero.eyebrow).toBe('SALE');
    expect(result!.hero.contentHtml).toBe('<p>Big Sale</p>');
    expect(result!.hero.image).toBe('https://cdn.example.com/banner.jpg');
    expect(result!.saleEndsAt).toBe(Date.parse('2026-12-31T23:59:59.000Z'));
    expect(result!.promo.title).toBe('Winter Collection');
  });
});

// ---------------------------------------------------------------------------
describe('loadSalePage — saleEndsAt edge cases', () => {
  it('returns null for saleEndsAt when timer attribute is absent', async () => {
    const attrsNoTimer = {
      en_US: { ...wrappedAttrs.en_US, page_sale_top_banner_timer: { value: undefined } },
    };
    getPageByUrl.mockResolvedValue({ attributeValues: attrsNoTimer });
    const { loadSalePage } = await importFresh();
    const result = await loadSalePage('en_US');
    expect(result!.saleEndsAt).toBeNull();
  });

  it('returns null for saleEndsAt when fullDate is an invalid ISO string', async () => {
    const attrsInvalidDate = {
      en_US: { ...wrappedAttrs.en_US, page_sale_top_banner_timer: { value: { fullDate: 'not-a-date' } } },
    };
    getPageByUrl.mockResolvedValue({ attributeValues: attrsInvalidDate });
    const { loadSalePage } = await importFresh();
    const result = await loadSalePage('en_US');
    expect(result!.saleEndsAt).toBeNull();
  });

  it('returns null for saleEndsAt when fullDate is missing from timer value', async () => {
    const attrsNoFullDate = {
      en_US: { ...wrappedAttrs.en_US, page_sale_top_banner_timer: { value: {} } },
    };
    getPageByUrl.mockResolvedValue({ attributeValues: attrsNoFullDate });
    const { loadSalePage } = await importFresh();
    const result = await loadSalePage('en_US');
    expect(result!.saleEndsAt).toBeNull();
  });
});

// ---------------------------------------------------------------------------
describe('loadSalePage — image / html graceful degradation', () => {
  it('returns empty string for hero image when picture attribute is absent', async () => {
    const attrsNoPic = {
      en_US: { ...wrappedAttrs.en_US, page_sale_top_banner_picture: { value: [] } },
    };
    getPageByUrl.mockResolvedValue({ attributeValues: attrsNoPic });
    const { loadSalePage } = await importFresh();
    const result = await loadSalePage('en_US');
    expect(result!.hero.image).toBe('');
  });

  it('returns empty string for contentHtml when text value array is empty', async () => {
    const attrsNoHtml = {
      en_US: { ...wrappedAttrs.en_US, page_sale_top_banner_text: { value: [] } },
    };
    getPageByUrl.mockResolvedValue({ attributeValues: attrsNoHtml });
    const { loadSalePage } = await importFresh();
    const result = await loadSalePage('en_US');
    expect(result!.hero.contentHtml).toBe('');
  });

  it('returns empty strings for all string fields when attributeValues is empty', async () => {
    getPageByUrl.mockResolvedValue({ attributeValues: { en_US: {} } });
    const { loadSalePage } = await importFresh();
    const result = await loadSalePage('en_US');
    expect(result).not.toBeNull();
    expect(result!.hero.eyebrow).toBe('');
    expect(result!.hero.contentHtml).toBe('');
    expect(result!.hero.image).toBe('');
    expect(result!.promo.title).toBe('');
    expect(result!.saleEndsAt).toBeNull();
  });
});

// ---------------------------------------------------------------------------
describe('loadSalePage — extractHtml meaningful-content normalization', () => {
  const makeTextAttrs = (htmlValue: string) => ({
    en_US: {
      ...wrappedAttrs.en_US,
      page_sale_top_banner_text: { value: [{ htmlValue, plainValue: '' }] },
    },
  });

  it('returns empty string for OE empty rich-text sentinel <p><br></p>', async () => {
    getPageByUrl.mockResolvedValue({ attributeValues: makeTextAttrs('<p><br></p>') });
    const { loadSalePage } = await importFresh();
    const result = await loadSalePage('en_US');
    expect(result!.hero.contentHtml).toBe('');
  });

  it('returns empty string for whitespace-only paragraph <p>   </p>', async () => {
    getPageByUrl.mockResolvedValue({ attributeValues: makeTextAttrs('<p>   </p>') });
    const { loadSalePage } = await importFresh();
    const result = await loadSalePage('en_US');
    expect(result!.hero.contentHtml).toBe('');
  });

  it('preserves html as-is when it has meaningful text content', async () => {
    getPageByUrl.mockResolvedValue({ attributeValues: makeTextAttrs('<p>hello</p>') });
    const { loadSalePage } = await importFresh();
    const result = await loadSalePage('en_US');
    expect(result!.hero.contentHtml).toBe('<p>hello</p>');
  });

  it('returns empty string when htmlValue is empty string', async () => {
    getPageByUrl.mockResolvedValue({ attributeValues: makeTextAttrs('') });
    const { loadSalePage } = await importFresh();
    const result = await loadSalePage('en_US');
    expect(result!.hero.contentHtml).toBe('');
  });
});

// ---------------------------------------------------------------------------
describe('loadSalePage — extractPlain / contentPlain field', () => {
  it('extracts contentPlain from plainValue alongside contentHtml', async () => {
    getPageByUrl.mockResolvedValue({ attributeValues: wrappedAttrs });
    const { loadSalePage } = await importFresh();
    const result = await loadSalePage('en_US');
    expect(result!.hero.contentPlain).toBe('Big Sale');
  });

  it('extracts multi-line plainValue correctly', async () => {
    const attrs = {
      en_US: {
        ...wrappedAttrs.en_US,
        page_sale_top_banner_text: {
          value: [{ htmlValue: '', plainValue: 'SEASON\nSALE' }],
        },
      },
    };
    getPageByUrl.mockResolvedValue({ attributeValues: attrs });
    const { loadSalePage } = await importFresh();
    const result = await loadSalePage('en_US');
    expect(result!.hero.contentPlain).toBe('SEASON\nSALE');
  });

  it('returns empty string for contentPlain when text value array is empty', async () => {
    const attrs = {
      en_US: { ...wrappedAttrs.en_US, page_sale_top_banner_text: { value: [] } },
    };
    getPageByUrl.mockResolvedValue({ attributeValues: attrs });
    const { loadSalePage } = await importFresh();
    const result = await loadSalePage('en_US');
    expect(result!.hero.contentPlain).toBe('');
  });

  it('returns empty string for contentPlain when plainValue is absent from object', async () => {
    const attrs = {
      en_US: {
        ...wrappedAttrs.en_US,
        page_sale_top_banner_text: { value: [{ htmlValue: '<p>X</p>' }] },
      },
    };
    getPageByUrl.mockResolvedValue({ attributeValues: attrs });
    const { loadSalePage } = await importFresh();
    const result = await loadSalePage('en_US');
    expect(result!.hero.contentPlain).toBe('');
  });
});

// ---------------------------------------------------------------------------
describe('loadSalePage — error paths', () => {
  it('returns null when SDK returns an error object', async () => {
    getPageByUrl.mockResolvedValue({ statusCode: 404, message: 'not found' });
    const { loadSalePage } = await importFresh();
    expect(await loadSalePage('en_US')).toBeNull();
  });

  it('returns null when SDK throws', async () => {
    getPageByUrl.mockRejectedValue(new Error('network'));
    const { loadSalePage } = await importFresh();
    expect(await loadSalePage('en_US')).toBeNull();
  });
});

// ---------------------------------------------------------------------------
describe('loadSalePage — disabled', () => {
  it('returns null when OE is not enabled', async () => {
    vi.resetModules();
    vi.doMock('../index', () => ({
      oneentry: null,
      isOneEntryEnabled: false,
      getApi: () => { throw new Error('SDK not configured'); },
      isError: () => false,
    }));
    vi.doMock('next/cache', () => ({
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      unstable_cache: (fn: any) => fn,
    }));
    const { loadSalePage } = await import('./sale-page');
    expect(await loadSalePage('en_US')).toBeNull();
    vi.doUnmock('../index');
    vi.doUnmock('next/cache');
  });
});
