import { beforeEach, describe, expect, it, vi } from 'vitest';

// React.cache is transparent in tests — call the wrapped fn directly.
vi.mock('react', () => ({
  cache: (fn: unknown) => fn,
}));

const getFilterByMarker = vi.fn();

vi.mock('../index', () => ({
  getApi: () => ({ Filters: { getFilterByMarker } }),
  isOneEntryEnabled: true,
  isError: (v: unknown) =>
    !!v && typeof v === 'object' && 'statusCode' in (v as Record<string, unknown>),
}));

const importFresh = async () => {
  vi.resetModules();
  return import('./filter-chips');
};

beforeEach(() => {
  getFilterByMarker.mockReset();
});

// ---------------------------------------------------------------------------
// loadFilterChips — happy paths
// ---------------------------------------------------------------------------
describe('loadFilterChips — happy paths', () => {
  it('returns FilterChip descriptors for a mix of page and attribute items', async () => {
    getFilterByMarker.mockResolvedValue({
      items: [
        {
          position: 1,
          type: 'page',
          url: 'outerwear',
          localizeInfos: { en_US: { title: 'Outerwear' } },
        },
        {
          position: 2,
          type: 'attribute',
          marker: 'material_14',
          value: 'Leather',
          localizeInfos: { en_US: { title: 'Leather' } },
        },
      ],
    });
    const { loadFilterChips } = await importFresh();
    const result = await loadFilterChips('women-clothing');
    expect(result).toEqual([
      { label: 'Outerwear', type: 'page', url: 'outerwear' },
      { label: 'Leather', type: 'attribute', marker: 'material_14', value: 'Leather' },
    ]);
  });

  it('orders chips by position ascending', async () => {
    getFilterByMarker.mockResolvedValue({
      items: [
        {
          position: 3,
          type: 'page',
          url: 'boots',
          localizeInfos: { en_US: { title: 'Boots' } },
        },
        {
          position: 1,
          type: 'page',
          url: 'bags',
          localizeInfos: { en_US: { title: 'Bags' } },
        },
        {
          position: 2,
          type: 'attribute',
          marker: 'color_5',
          value: 'Black',
          localizeInfos: { en_US: { title: 'Black' } },
        },
      ],
    });
    const { loadFilterChips } = await importFresh();
    const result = await loadFilterChips('women-shoes');
    expect(result?.map((c) => c.label)).toEqual(['Bags', 'Black', 'Boots']);
  });

  it('drops type:page items that are missing url', async () => {
    getFilterByMarker.mockResolvedValue({
      items: [
        { position: 1, type: 'page', localizeInfos: { en_US: { title: 'NoUrl' } } },
        {
          position: 2,
          type: 'page',
          url: 'jackets',
          localizeInfos: { en_US: { title: 'Jackets' } },
        },
      ],
    });
    const { loadFilterChips } = await importFresh();
    const result = await loadFilterChips('women-clothing');
    expect(result).toEqual([{ label: 'Jackets', type: 'page', url: 'jackets' }]);
  });

  it('drops type:attribute items that are missing marker', async () => {
    getFilterByMarker.mockResolvedValue({
      items: [
        { position: 1, type: 'attribute', value: 'Silk', localizeInfos: { en_US: { title: 'Silk' } } },
        {
          position: 2,
          type: 'attribute',
          marker: 'material_5',
          value: 'Cotton',
          localizeInfos: { en_US: { title: 'Cotton' } },
        },
      ],
    });
    const { loadFilterChips } = await importFresh();
    const result = await loadFilterChips('women-clothing');
    expect(result).toEqual([
      { label: 'Cotton', type: 'attribute', marker: 'material_5', value: 'Cotton' },
    ]);
  });

  it('drops type:attribute items that are missing value', async () => {
    getFilterByMarker.mockResolvedValue({
      items: [
        { position: 1, type: 'attribute', marker: 'material_5', localizeInfos: { en_US: { title: 'NoValue' } } },
        {
          position: 2,
          type: 'attribute',
          marker: 'size_3',
          value: 'M',
          localizeInfos: { en_US: { title: 'Medium' } },
        },
      ],
    });
    const { loadFilterChips } = await importFresh();
    const result = await loadFilterChips('women-clothing');
    expect(result).toEqual([
      { label: 'Medium', type: 'attribute', marker: 'size_3', value: 'M' },
    ]);
  });

  it('skips items whose resolved title is empty or whitespace', async () => {
    getFilterByMarker.mockResolvedValue({
      items: [
        { position: 1, type: 'page', url: 'coats', localizeInfos: { en_US: { title: 'Coats' } } },
        { position: 2, type: 'page', url: 'x', localizeInfos: { en_US: { title: '   ' } } },
        { position: 3, type: 'page', url: 'y', localizeInfos: {} },
        { position: 4, type: 'page', url: 'z', value: '' },
        { position: 5, type: 'page', url: 'boots', localizeInfos: { en_US: { title: 'Boots' } } },
      ],
    });
    const { loadFilterChips } = await importFresh();
    const result = await loadFilterChips('women-shoes');
    expect(result?.map((c) => c.label)).toEqual(['Coats', 'Boots']);
  });

  it('falls back to flat localizeInfos.title when en_US is absent', async () => {
    getFilterByMarker.mockResolvedValue({
      items: [
        { position: 1, type: 'page', url: 'dresses', localizeInfos: { title: 'Dresses' } },
        { position: 2, type: 'page', url: 'skirts', localizeInfos: { title: 'Skirts' } },
      ],
    });
    const { loadFilterChips } = await importFresh();
    const result = await loadFilterChips('women-clothing');
    expect(result?.map((c) => c.label)).toEqual(['Dresses', 'Skirts']);
  });

  it('falls back to item.value for label when localizeInfos is absent', async () => {
    getFilterByMarker.mockResolvedValue({
      items: [
        { position: 1, type: 'page', url: 'accessories', value: 'Accessories' },
        { position: 2, type: 'page', url: 'bags', value: 'Bags' },
      ],
    });
    const { loadFilterChips } = await importFresh();
    const result = await loadFilterChips('men-bags');
    expect(result?.map((c) => c.label)).toEqual(['Accessories', 'Bags']);
  });
});

// ---------------------------------------------------------------------------
// loadFilterChips — null paths
// ---------------------------------------------------------------------------
describe('loadFilterChips — null paths', () => {
  it('returns null when SDK returns an IError object', async () => {
    getFilterByMarker.mockResolvedValue({ statusCode: 404, message: 'not found' });
    const { loadFilterChips } = await importFresh();
    expect(await loadFilterChips('men-bags')).toBeNull();
  });

  it('returns null when SDK throws', async () => {
    getFilterByMarker.mockRejectedValue(new Error('network error'));
    const { loadFilterChips } = await importFresh();
    expect(await loadFilterChips('men-bags')).toBeNull();
  });
});

// ---------------------------------------------------------------------------
// loadFilterChips — marker derivation
// ---------------------------------------------------------------------------
describe('loadFilterChips — marker derivation', () => {
  it('converts catalogKey hyphens to underscores and prefixes filter_chips_', async () => {
    getFilterByMarker.mockResolvedValue({ items: [] });
    const { loadFilterChips } = await importFresh();
    await loadFilterChips('men-bags');
    expect(getFilterByMarker).toHaveBeenCalledWith('filter_chips_men_bags', expect.any(String));
  });
});

// ---------------------------------------------------------------------------
// loadFilterChips — disabled SDK
// ---------------------------------------------------------------------------
describe('loadFilterChips — disabled', () => {
  it('returns null when isOneEntryEnabled is false', async () => {
    vi.resetModules();
    vi.doMock('../index', () => ({
      getApi: () => { throw new Error('should not be called'); },
      isOneEntryEnabled: false,
      isError: () => false,
    }));
    const { loadFilterChips } = await import('./filter-chips');
    expect(await loadFilterChips('men-bags')).toBeNull();
    vi.doUnmock('../index');
  });
});

// ---------------------------------------------------------------------------
// chipToFilterPatch
// ---------------------------------------------------------------------------
describe('chipToFilterPatch', () => {
  it('returns { category } for a matching page-type chip', async () => {
    const { chipToFilterPatch } = await importFresh();
    const chips = [{ label: 'Outerwear', type: 'page' as const, url: 'outerwear' }];
    expect(chipToFilterPatch('Outerwear', chips)).toEqual({ category: 'outerwear' });
  });

  it('returns { attributeField, attributeValue } with correct field for material_14', async () => {
    const { chipToFilterPatch } = await importFresh();
    const chips = [
      { label: 'Leather', type: 'attribute' as const, marker: 'material_14', value: 'Leather' },
    ];
    expect(chipToFilterPatch('Leather', chips)).toEqual({
      attributeField: 'materials',
      attributeValue: 'Leather',
    });
  });

  it('returns null when the label is not found in chips', async () => {
    const { chipToFilterPatch } = await importFresh();
    const chips = [{ label: 'Outerwear', type: 'page' as const, url: 'outerwear' }];
    expect(chipToFilterPatch('Boots', chips)).toBeNull();
  });

  it('returns null when chips is null', async () => {
    const { chipToFilterPatch } = await importFresh();
    expect(chipToFilterPatch('Outerwear', null)).toBeNull();
  });

  it('returns null when chips is undefined', async () => {
    const { chipToFilterPatch } = await importFresh();
    expect(chipToFilterPatch('Outerwear', undefined)).toBeNull();
  });

  it('returns null for an attribute chip whose marker does not map to a known field', async () => {
    const { chipToFilterPatch } = await importFresh();
    const chips = [
      { label: 'Mystery', type: 'attribute' as const, marker: 'unknown_99', value: 'X' },
    ];
    expect(chipToFilterPatch('Mystery', chips)).toBeNull();
  });

  it('correctly maps details_* marker → productDetails', async () => {
    const { chipToFilterPatch } = await importFresh();
    const chips = [
      { label: 'Zip Closure', type: 'attribute' as const, marker: 'details_4', value: 'Zip' },
    ];
    expect(chipToFilterPatch('Zip Closure', chips)).toEqual({
      attributeField: 'productDetails',
      attributeValue: 'Zip',
    });
  });

  it('correctly maps color_* marker → colors', async () => {
    const { chipToFilterPatch } = await importFresh();
    const chips = [
      { label: 'Black', type: 'attribute' as const, marker: 'color_5', value: 'Black' },
    ];
    expect(chipToFilterPatch('Black', chips)).toEqual({
      attributeField: 'colors',
      attributeValue: 'Black',
    });
  });

  it('correctly maps fit_* → fits and fitrise_* → fits', async () => {
    const { chipToFilterPatch } = await importFresh();
    const fitChips = [
      { label: 'Slim', type: 'attribute' as const, marker: 'fit_2', value: 'Slim' },
    ];
    expect(chipToFilterPatch('Slim', fitChips)).toEqual({ attributeField: 'fits', attributeValue: 'Slim' });

    const fitriseChips = [
      { label: 'High Rise', type: 'attribute' as const, marker: 'fitrise_1', value: 'High Rise' },
    ];
    expect(chipToFilterPatch('High Rise', fitriseChips)).toEqual({ attributeField: 'fits', attributeValue: 'High Rise' });
  });

  it('correctly maps lining_material_* and lining_* → liningMaterials', async () => {
    const { chipToFilterPatch } = await importFresh();
    const chips1 = [
      { label: 'Silk Lining', type: 'attribute' as const, marker: 'lining_material_3', value: 'Silk' },
    ];
    expect(chipToFilterPatch('Silk Lining', chips1)).toEqual({ attributeField: 'liningMaterials', attributeValue: 'Silk' });

    const chips2 = [
      { label: 'Fleece', type: 'attribute' as const, marker: 'lining_2', value: 'Fleece' },
    ];
    expect(chipToFilterPatch('Fleece', chips2)).toEqual({ attributeField: 'liningMaterials', attributeValue: 'Fleece' });
  });

  it('correctly maps brand_country_* and country_* → brandCountries', async () => {
    const { chipToFilterPatch } = await importFresh();
    const chips1 = [
      { label: 'Italy', type: 'attribute' as const, marker: 'brand_country_1', value: 'Italy' },
    ];
    expect(chipToFilterPatch('Italy', chips1)).toEqual({ attributeField: 'brandCountries', attributeValue: 'Italy' });

    const chips2 = [
      { label: 'France', type: 'attribute' as const, marker: 'country_2', value: 'France' },
    ];
    expect(chipToFilterPatch('France', chips2)).toEqual({ attributeField: 'brandCountries', attributeValue: 'France' });
  });

  it('correctly maps label_* and lable_* → labels', async () => {
    const { chipToFilterPatch } = await importFresh();
    const chips1 = [
      { label: 'New', type: 'attribute' as const, marker: 'label_1', value: 'New' },
    ];
    expect(chipToFilterPatch('New', chips1)).toEqual({ attributeField: 'labels', attributeValue: 'New' });

    const chips2 = [
      { label: 'Sale', type: 'attribute' as const, marker: 'lable_2', value: 'Sale' },
    ];
    expect(chipToFilterPatch('Sale', chips2)).toEqual({ attributeField: 'labels', attributeValue: 'Sale' });
  });

  it('correctly maps careinstructions_* and care_* → careInstructions', async () => {
    const { chipToFilterPatch } = await importFresh();
    const chips1 = [
      { label: 'Dry Clean', type: 'attribute' as const, marker: 'careinstructions_1', value: 'Dry Clean' },
    ];
    expect(chipToFilterPatch('Dry Clean', chips1)).toEqual({ attributeField: 'careInstructions', attributeValue: 'Dry Clean' });

    const chips2 = [
      { label: 'Hand Wash', type: 'attribute' as const, marker: 'care_3', value: 'Hand Wash' },
    ];
    expect(chipToFilterPatch('Hand Wash', chips2)).toEqual({ attributeField: 'careInstructions', attributeValue: 'Hand Wash' });
  });

  it('correctly maps insulation_* → insulations', async () => {
    const { chipToFilterPatch } = await importFresh();
    const chips = [
      { label: 'Down', type: 'attribute' as const, marker: 'insulation_1', value: 'Down' },
    ];
    expect(chipToFilterPatch('Down', chips)).toEqual({ attributeField: 'insulations', attributeValue: 'Down' });
  });
});
