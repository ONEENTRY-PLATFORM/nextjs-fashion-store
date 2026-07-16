import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

// React.cache is transparent in tests — treat the wrapped fn as a plain fn.
vi.mock('react', () => ({
  cache: (fn: unknown) => fn,
}));

const getAttributeSetByMarker = vi.fn();

vi.mock('./index', () => ({
  oneentry: {
    AttributesSets: { getAttributeSetByMarker },
  },
  isError: (v: unknown) =>
    !!v && typeof v === 'object' && 'statusCode' in (v as Record<string, unknown>),
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

// ── TTL-cache poisoning guard (HIGH fix) ───────────────────────────────────
// An empty schema (SDK error / transient 500) must NOT be stored in the
// process-level TTL cache — otherwise a single hiccup silences all labels
// for the entire 5-minute window. Each test uses a unique marker so the
// module-level TTL cache from previous tests doesn't interfere.
describe('getSystemSet — empty schema is NOT cached, non-empty IS cached', () => {
  it('re-fetches when the first response was empty (error path)', async () => {
    vi.resetModules();
    vi.doMock('./index', () => ({
      oneentry: { AttributesSets: { getAttributeSetByMarker } },
      isError: (v: unknown) =>
        !!v && typeof v === 'object' && 'statusCode' in (v as Record<string, unknown>),
      isOneEntryEnabled: true,
    }));
    const { getSystemSet } = await import('./system-text');

    // First call: SDK returns an error envelope → fetchSystemSet yields {}
    getAttributeSetByMarker.mockResolvedValueOnce({ statusCode: 500, message: 'err' });
    const first = await getSystemSet('cache-test-empty');
    expect(first).toEqual({});

    // Second call (same marker): cache is empty so SDK must be called again
    getAttributeSetByMarker.mockResolvedValueOnce({
      schema: { cta: { initialValue: { en_US: { value: 'Buy Now' } } } },
    });
    const second = await getSystemSet('cache-test-empty');
    expect(Object.keys(second)).toContain('cta');
    expect(getAttributeSetByMarker).toHaveBeenCalledTimes(2);
  });

  it('does NOT re-fetch when the first response had a non-empty schema', async () => {
    vi.resetModules();
    vi.doMock('./index', () => ({
      oneentry: { AttributesSets: { getAttributeSetByMarker } },
      isError: (v: unknown) =>
        !!v && typeof v === 'object' && 'statusCode' in (v as Record<string, unknown>),
      isOneEntryEnabled: true,
    }));
    const { getSystemSet } = await import('./system-text');

    // First call: SDK returns a real schema → must be stored in TTL cache
    getAttributeSetByMarker.mockResolvedValueOnce({
      schema: { btn: { initialValue: { en_US: { value: 'Click' } } } },
    });
    const first = await getSystemSet('cache-test-hit');
    expect(Object.keys(first)).toContain('btn');

    // Second call: should be served from the TTL cache — SDK NOT called again
    const second = await getSystemSet('cache-test-hit');
    expect(second).toEqual(first);
    expect(getAttributeSetByMarker).toHaveBeenCalledTimes(1);
  });

  it('re-fetches when the first response had a null schema (treated as empty)', async () => {
    vi.resetModules();
    vi.doMock('./index', () => ({
      oneentry: { AttributesSets: { getAttributeSetByMarker } },
      isError: (v: unknown) =>
        !!v && typeof v === 'object' && 'statusCode' in (v as Record<string, unknown>),
      isOneEntryEnabled: true,
    }));
    const { getSystemSet } = await import('./system-text');

    getAttributeSetByMarker.mockResolvedValueOnce({ schema: null });
    const first = await getSystemSet('cache-test-null');
    expect(first).toEqual({});

    // SDK must be called again because null-schema was not cached
    getAttributeSetByMarker.mockResolvedValueOnce({
      schema: { back: { initialValue: { en_US: { value: 'Back' } } } },
    });
    const second = await getSystemSet('cache-test-null');
    expect(Object.keys(second)).toContain('back');
    expect(getAttributeSetByMarker).toHaveBeenCalledTimes(2);
  });
});
