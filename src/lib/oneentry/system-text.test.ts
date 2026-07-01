import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

const getAttributeSetByMarker = vi.fn();

vi.mock('./index', () => ({
  oneentry: {
    AttributesSets: { getAttributeSetByMarker },
  },
  isOneEntryEnabled: true,
}));

const importFresh = async () => {
  vi.resetModules();
  return import('./system-text');
};

beforeEach(() => {
  getAttributeSetByMarker.mockReset();
});

afterEach(() => {
  vi.doUnmock('./index');
});

describe('t(set, key, fallback)', () => {
  it('returns initialValue.en_US.value when present', async () => {
    getAttributeSetByMarker.mockResolvedValueOnce({
      schema: {
        cta: {
          identifier: 'cta',
          type: 'string',
          initialValue: { en_US: { value: 'Add To Cart' } },
        },
      },
    });
    const { t } = await importFresh();
    expect(await t('product-card', 'cta', 'fallback')).toBe('Add To Cart');
  });

  it('returns fallback when key missing in schema', async () => {
    getAttributeSetByMarker.mockResolvedValueOnce({
      schema: { other: { initialValue: { en_US: { value: 'x' } } } },
    });
    const { t } = await importFresh();
    expect(await t('product-card', 'missing', 'fb')).toBe('fb');
  });

  it('returns fallback when value is empty string', async () => {
    getAttributeSetByMarker.mockResolvedValueOnce({
      schema: { cta: { initialValue: { en_US: { value: '' } } } },
    });
    const { t } = await importFresh();
    expect(await t('product-card', 'cta', 'fb')).toBe('fb');
  });

  it('returns fallback when set has no schema', async () => {
    getAttributeSetByMarker.mockResolvedValueOnce({ schema: null });
    const { t } = await importFresh();
    expect(await t('product-card', 'cta', 'fb')).toBe('fb');
  });

  it('returns fallback when SDK throws', async () => {
    getAttributeSetByMarker.mockRejectedValueOnce(new Error('network'));
    const { t } = await importFresh();
    expect(await t('product-card', 'cta', 'fb')).toBe('fb');
  });
});

describe('t when OneEntry is disabled (no env)', () => {
  it('returns fallback without calling SDK', async () => {
    vi.resetModules();
    vi.doMock('./index', () => ({ oneentry: null, isOneEntryEnabled: false }));
    const { t } = await import('./system-text');
    expect(await t('any', 'key', 'fb')).toBe('fb');
    expect(getAttributeSetByMarker).not.toHaveBeenCalled();
  });
});
