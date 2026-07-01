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
  return import('./checkout-labels');
};

beforeEach(() => {
  getAttributeSetByMarker.mockReset();
});

describe('loadCheckoutSystemTexts', () => {
  it('skips empty / non-string initialValue', async () => {
    getAttributeSetByMarker.mockResolvedValue({
      schema: {
        x: { initialValue: { en_US: { value: 'present' } } },
        y: { initialValue: { en_US: { value: '' } } },
      },
    });
    const { loadCheckoutSystemTexts } = await importFresh();
    const result = await loadCheckoutSystemTexts();
    expect(result.checkout_cart).toEqual({ x: 'present' });
  });

  it('returns Record per marker with extracted values', async () => {
    getAttributeSetByMarker.mockImplementation(async (marker: string) => {
      if (marker === 'checkout_delivery') {
        return {
          schema: {
            checkout_delivery_back_to_cart: { initialValue: { en_US: { value: 'Back to Cart (CMS)' } } },
          },
        };
      }
      return null;
    });
    const { loadCheckoutSystemTexts, CHECKOUT_SET_MARKERS } = await importFresh();
    const result = await loadCheckoutSystemTexts();
    expect(Object.keys(result)).toEqual(expect.arrayContaining([...CHECKOUT_SET_MARKERS]));
    expect(result.checkout_delivery).toEqual({ checkout_delivery_back_to_cart: 'Back to Cart (CMS)' });
    expect(result.checkout_cart).toEqual({});
    expect(result.checkout_payment).toEqual({});
    expect(result.checkout_confirmed).toEqual({});
  });
});

describe('loadCheckoutSystemTexts — disabled', () => {
  it('returns empty dicts when SDK is disabled', async () => {
    vi.resetModules();
    vi.doMock('../index', () => ({ oneentry: null, isOneEntryEnabled: false }));
    const { loadCheckoutSystemTexts, CHECKOUT_SET_MARKERS } = await import('./checkout-labels');
    const result = await loadCheckoutSystemTexts();
    for (const m of CHECKOUT_SET_MARKERS) {
      expect(result[m]).toEqual({});
    }
    vi.doUnmock('../index');
  });
});
