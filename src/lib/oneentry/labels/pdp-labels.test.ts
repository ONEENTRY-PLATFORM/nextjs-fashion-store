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
  return import('./pdp-labels');
};

beforeEach(() => {
  getAttributeSetByMarker.mockReset();
});

describe('loadPdpSystemTexts', () => {
  it('returns Record per PDP marker', async () => {
    getAttributeSetByMarker.mockImplementation(async (marker: string) => {
      if (marker === 'customer-reviews') {
        return { schema: { 'write-a-review-cta': { initialValue: { en_US: { value: 'Write a Review' } } } } };
      }
      return null;
    });
    const { loadPdpSystemTexts, PDP_SET_MARKERS } = await importFresh();
    const result = await loadPdpSystemTexts();
    expect(Object.keys(result)).toEqual(expect.arrayContaining([...PDP_SET_MARKERS]));
    expect(result['customer-reviews']).toEqual({ 'write-a-review-cta': 'Write a Review' });
    expect(result['product_card_actions']).toEqual({});
  });
});

describe('loadPdpSystemTexts — disabled', () => {
  it('returns empty dicts when SDK disabled', async () => {
    vi.resetModules();
    vi.doMock('../index', () => ({ oneentry: null, isOneEntryEnabled: false }));
    const { loadPdpSystemTexts, PDP_SET_MARKERS } = await import('./pdp-labels');
    const result = await loadPdpSystemTexts();
    for (const m of PDP_SET_MARKERS) {
      expect(result[m]).toEqual({});
    }
    vi.doUnmock('../index');
  });
});
