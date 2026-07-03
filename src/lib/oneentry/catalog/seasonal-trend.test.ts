import { beforeEach, describe, expect, it, vi } from 'vitest';
import type { CatalogFilters } from './filters';

const getPageByUrl = vi.fn();

vi.mock('../index', () => ({
  oneentry: { Pages: { getPageByUrl } },
  isOneEntryEnabled: true,
  isError: (v: unknown) =>
    !!v && typeof v === 'object' && 'statusCode' in (v as Record<string, unknown>),
}));

const importFresh = async () => {
  vi.resetModules();
  return import('./seasonal-trend');
};

beforeEach(() => {
  getPageByUrl.mockReset();
});

describe('applySeasonalTrend', () => {
  it('sets category filter for a category-kind trend and preserves other fields', async () => {
    const { applySeasonalTrend } = await importFresh();
    const filters: CatalogFilters = { minPrice: 10, colors: ['Red'] };
    const next = applySeasonalTrend(filters, { kind: 'category', value: 'dresses_skirts' });
    expect(next).toEqual({
      minPrice: 10,
      colors: ['Red'],
      category: 'dresses_skirts',
    });
    // input is not mutated
    expect(filters.category).toBeUndefined();
  });

  it('appends the value to the target list for an attribute-kind trend and drops any pageUrl category', async () => {
    const { applySeasonalTrend } = await importFresh();
    const filters: CatalogFilters = { category: 'jackets', materials: ['Wool'] };
    const next = applySeasonalTrend(filters, {
      kind: 'attribute',
      field: 'materials',
      value: 'Suede',
    });
    expect(next.materials).toEqual(['Wool', 'Suede']);
    expect(next.category).toBeUndefined();
    // input untouched
    expect(filters.materials).toEqual(['Wool']);
    expect(filters.category).toBe('jackets');
  });

  it('is a no-op when the attribute value is already present (dedupe)', async () => {
    const { applySeasonalTrend } = await importFresh();
    const filters: CatalogFilters = { styles: ['Casual', 'Sport'] };
    const next = applySeasonalTrend(filters, {
      kind: 'attribute',
      field: 'styles',
      value: 'Casual',
    });
    expect(next.styles).toEqual(['Casual', 'Sport']);
  });

  it('creates the list when the target field is initially undefined', async () => {
    const { applySeasonalTrend } = await importFresh();
    const filters: CatalogFilters = {};
    const next = applySeasonalTrend(filters, {
      kind: 'attribute',
      field: 'brands',
      value: 'Acme',
    });
    expect(next.brands).toEqual(['Acme']);
  });
});

describe('resolveSeasonalTrend', () => {
  it('returns null when the SDK yields an error object', async () => {
    getPageByUrl.mockResolvedValue({ statusCode: 404, message: 'not found' });
    const { resolveSeasonalTrend } = await importFresh();
    expect(await resolveSeasonalTrend('trend-page')).toBeNull();
  });

  it('returns null when the SDK throws', async () => {
    getPageByUrl.mockRejectedValue(new Error('network'));
    const { resolveSeasonalTrend } = await importFresh();
    expect(await resolveSeasonalTrend('trend-page')).toBeNull();
  });

  it('returns null when SEASONAL TRENDS attributes are missing', async () => {
    getPageByUrl.mockResolvedValue({
      id: 1,
      attributeValues: { en_US: {} },
    });
    const { resolveSeasonalTrend } = await importFresh();
    expect(await resolveSeasonalTrend('trend-page')).toBeNull();
  });

  it('resolves a category trend from wrapped attributeValues', async () => {
    getPageByUrl.mockResolvedValue({
      id: 2,
      attributeValues: {
        en_US: {
          'st_type-of-trends': { value: 'category' },
          st_trends: { value: 'dresses_skirts' },
        },
      },
    });
    const { resolveSeasonalTrend } = await importFresh();
    expect(await resolveSeasonalTrend('trend-page')).toEqual({
      kind: 'category',
      value: 'dresses_skirts',
    });
  });

  it('resolves an attribute trend using the short alias ("material" -> materials)', async () => {
    getPageByUrl.mockResolvedValue({
      id: 3,
      attributeValues: {
        en_US: {
          'st_type-of-trends': { value: 'material' },
          st_trends: { value: 'Suede' },
        },
      },
    });
    const { resolveSeasonalTrend } = await importFresh();
    expect(await resolveSeasonalTrend('trend-page')).toEqual({
      kind: 'attribute',
      field: 'materials',
      value: 'Suede',
    });
  });

  it('resolves an attribute trend using the OE marker with suffix ("material_15")', async () => {
    getPageByUrl.mockResolvedValue({
      id: 4,
      attributeValues: {
        en_US: {
          'st_type-of-trends': { value: 'material_15' },
          st_trends: { value: 'Leather' },
        },
      },
    });
    const { resolveSeasonalTrend } = await importFresh();
    expect(await resolveSeasonalTrend('trend-page')).toEqual({
      kind: 'attribute',
      field: 'materials',
      value: 'Leather',
    });
  });

  it('accepts capitalised type values ("Material") via case-insensitive alias lookup', async () => {
    getPageByUrl.mockResolvedValue({
      id: 5,
      attributeValues: {
        en_US: {
          'st_type-of-trends': { value: 'Material' },
          st_trends: { value: 'Cotton' },
        },
      },
    });
    const { resolveSeasonalTrend } = await importFresh();
    expect(await resolveSeasonalTrend('trend-page')).toEqual({
      kind: 'attribute',
      field: 'materials',
      value: 'Cotton',
    });
  });

  it('falls back to the underscore alias when the tenant uses "st_type_of_trends"', async () => {
    getPageByUrl.mockResolvedValue({
      id: 6,
      attributeValues: {
        en_US: {
          st_type_of_trends: { value: 'style' },
          st_trends: { value: 'Casual' },
        },
      },
    });
    const { resolveSeasonalTrend } = await importFresh();
    expect(await resolveSeasonalTrend('trend-page')).toEqual({
      kind: 'attribute',
      field: 'styles',
      value: 'Casual',
    });
  });

  it('reads flat attributeValues (no per-locale wrapper)', async () => {
    getPageByUrl.mockResolvedValue({
      id: 7,
      attributeValues: {
        'st_type-of-trends': { value: 'brand' },
        st_trends: { value: 'Acme' },
      },
    });
    const { resolveSeasonalTrend } = await importFresh();
    expect(await resolveSeasonalTrend('trend-page')).toEqual({
      kind: 'attribute',
      field: 'brands',
      value: 'Acme',
    });
  });

  it('returns null for an unknown attribute type', async () => {
    getPageByUrl.mockResolvedValue({
      id: 8,
      attributeValues: {
        en_US: {
          'st_type-of-trends': { value: 'nonsense_marker_99' },
          st_trends: { value: 'X' },
        },
      },
    });
    const { resolveSeasonalTrend } = await importFresh();
    expect(await resolveSeasonalTrend('trend-page')).toBeNull();
  });

  it('unwraps OE list-attribute payloads ({ value: [{ value: "..." }] })', async () => {
    getPageByUrl.mockResolvedValue({
      id: 9,
      attributeValues: {
        en_US: {
          'st_type-of-trends': { value: [{ value: 'season' }] },
          st_trends: { value: [{ value: 'Winter' }] },
        },
      },
    });
    const { resolveSeasonalTrend } = await importFresh();
    expect(await resolveSeasonalTrend('trend-page')).toEqual({
      kind: 'attribute',
      field: 'seasons',
      value: 'Winter',
    });
  });
});

describe('resolveSeasonalTrend — disabled', () => {
  it('returns null when the SDK is not initialised', async () => {
    vi.resetModules();
    vi.doMock('../index', () => ({
      oneentry: null,
      isOneEntryEnabled: false,
      isError: () => false,
    }));
    const { resolveSeasonalTrend } = await import('./seasonal-trend');
    expect(await resolveSeasonalTrend('trend-page')).toBeNull();
    vi.doUnmock('../index');
  });
});
