import { beforeEach, describe, expect, it, vi } from 'vitest';

const getAttributeSetByMarker = vi.fn();

vi.mock('@/lib/oneentry/index', async (importActual) => ({
  ...(await importActual<typeof import('@/lib/oneentry/index')>()),
  getApiSafe: () => ({
    AttributesSets: { getAttributeSetByMarker },
  }),
  isOneEntryEnabled: true,
  isError: (v: unknown) =>
    !!v && typeof v === 'object' && 'statusCode' in (v as Record<string, unknown>),
}));

const importFresh = async () => {
  vi.resetModules();
  return import('@/lib/oneentry/dictionary');
};

beforeEach(() => {
  getAttributeSetByMarker.mockReset();
});

describe('getDictionary', () => {
  it('flattens every configured set into one namespace', async () => {
    getAttributeSetByMarker.mockImplementation(async (marker: string) => {
      if (marker === 'customer-reviews') {
        return { schema: { 'write-a-review-cta': { initialValue: { en_US: { value: 'Write a Review' } } } } };
      }
      if (marker === 'product-card') {
        return {
          schema: {
            'product-card_add_to_cart_cta': { initialValue: { en_US: { value: 'Add To Cart' } } },
            // Blank values must not mask a call site's inline fallback.
            empty: { initialValue: { en_US: { value: '' } } },
          },
        };
      }
      return null;
    });

    const { getDictionary } = await importFresh();
    const dict = await getDictionary();

    expect(dict['write-a-review-cta']).toBe('Write a Review');
    expect(dict['product-card_add_to_cart_cta']).toBe('Add To Cart');
    expect(dict.empty).toBeUndefined();
  });

  it('reads the already-flattened SDK shape as well as the language-keyed one', async () => {
    getAttributeSetByMarker.mockImplementation(async (marker: string) =>
      marker === 'header'
        ? { schema: { header_search: { initialValue: { value: 'Search' } } } }
        : null,
    );

    const { getDictionary } = await importFresh();
    expect((await getDictionary()).header_search).toBe('Search');
  });

  it('requests every marker in DICTIONARY_SET_MARKERS', async () => {
    getAttributeSetByMarker.mockResolvedValue(null);

    const { getDictionary, DICTIONARY_SET_MARKERS } = await importFresh();
    await getDictionary();

    const requested = getAttributeSetByMarker.mock.calls.map(([marker]) => marker);
    expect(new Set(requested)).toEqual(new Set(DICTIONARY_SET_MARKERS));
  });

  it('returns an empty dictionary when the SDK is disabled', async () => {
    vi.resetModules();
    vi.doMock('@/lib/oneentry/index', async (importActual) => ({
      ...(await importActual<typeof import('@/lib/oneentry/index')>()),
      getApiSafe: () => null,
      isOneEntryEnabled: false,
    }));
    const { getDictionary } = await import('@/lib/oneentry/dictionary');
    expect(await getDictionary()).toEqual({});
    vi.doUnmock('@/lib/oneentry/index');
  });
});

describe('translate', () => {
  it('prefers the CMS value and falls back on missing or blank entries', async () => {
    const { translate } = await importFresh();

    expect(translate({ a: 'CMS' }, 'a', 'local')).toBe('CMS');
    expect(translate({ a: '' }, 'a', 'local')).toBe('local');
    expect(translate({}, 'a', 'local')).toBe('local');
    expect(translate(null, 'a', 'local')).toBe('local');
    expect(translate(undefined, 'a', 'local')).toBe('local');
  });
});
