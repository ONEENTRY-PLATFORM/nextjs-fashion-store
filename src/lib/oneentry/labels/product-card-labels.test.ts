import { beforeEach, describe, expect, it, vi } from 'vitest';

const getAttributeSetByMarker = vi.fn();

vi.mock('../index', () => ({
  oneentry: {
    AttributesSets: { getAttributeSetByMarker },
  },
  isOneEntryEnabled: true,
}));

const importFresh = async () => {
  vi.resetModules();
  return import('./product-card-labels');
};

beforeEach(() => {
  getAttributeSetByMarker.mockReset();
});

describe('loadProductCardSystemTexts', () => {
  it('returns flat Record of values for product-card set', async () => {
    getAttributeSetByMarker.mockResolvedValue({
      schema: {
        'product-card_add_to_cart_cta': { initialValue: { en_US: { value: 'Add To Cart' } } },
        'product-card-reviews':         { initialValue: { en_US: { value: 'reviews' } } },
        empty:                          { initialValue: { en_US: { value: '' } } },
      },
    });
    const { loadProductCardSystemTexts } = await importFresh();
    const result = await loadProductCardSystemTexts();
    expect(result).toEqual({
      'product-card_add_to_cart_cta': 'Add To Cart',
      'product-card-reviews':         'reviews',
    });
  });
});

describe('loadProductCardSystemTexts — disabled', () => {
  it('returns empty record when SDK disabled', async () => {
    vi.resetModules();
    vi.doMock('../index', () => ({ oneentry: null, isOneEntryEnabled: false }));
    const { loadProductCardSystemTexts } = await import('./product-card-labels');
    const result = await loadProductCardSystemTexts();
    expect(result).toEqual({});
    vi.doUnmock('../index');
  });
});
