import { beforeEach, describe, expect, it, vi } from 'vitest';

// SDK mock — `getBlockByMarker` drives `loadBlockWithProducts`.
const getBlockByMarker = vi.fn();
const fakeApi = { Blocks: { getBlockByMarker } };

vi.mock('../index', () => ({
  oneentry: fakeApi,
  getApi: () => fakeApi,
  isOneEntryEnabled: true,
  isError: (v: unknown) =>
    !!v && typeof v === 'object' && 'statusCode' in (v as Record<string, unknown>),
}));

// unstable_cache is transparent in tests — call the wrapped fn directly.
vi.mock('next/cache', () => ({
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  unstable_cache: (fn: any) => fn,
}));

// `loadProducts` and the adapter are the fallback's dependencies. Both are
// stubbed so we can assert what the fallback asked for and what it emits.
const loadProducts = vi.fn();
vi.mock('../catalog/products', () => ({ loadProducts }));

const adaptCatalogProductToUiProduct = vi.fn();
vi.mock('../catalog/adapt', () => ({ adaptCatalogProductToUiProduct }));

const importFresh = async () => {
  vi.resetModules();
  return import('./page-blocks');
};

beforeEach(() => {
  getBlockByMarker.mockReset();
  loadProducts.mockReset();
  adaptCatalogProductToUiProduct.mockReset();
});

describe('loadBlockWithProducts — homepage fallback', () => {
  // Common shape: similar_products_block with no inline items — the branch
  // where the new fallback fires.
  const emptySimilarBlock = {
    type: 'similar_products_block',
    position: 3,
    quantity: 12,
    localizeInfos: { title: 'New Arrivals' },
    similarProducts: { items: [] },
    products: [],
  };

  it('falls back to the "NEW" label for homepage_new_arrivals', async () => {
    getBlockByMarker.mockResolvedValue(emptySimilarBlock);
    loadProducts.mockResolvedValue({
      total: 1,
      items: [{ id: 1, title: 'Coat' }],
      fromCms: true,
    });
    adaptCatalogProductToUiProduct.mockImplementation((p: { id: number }) => ({
      id: String(p.id),
      name: 'ui',
    }));

    const { loadBlockWithProducts } = await importFresh();
    const block = await loadBlockWithProducts('homepage_new_arrivals');

    expect(loadProducts).toHaveBeenCalledTimes(1);
    expect(loadProducts).toHaveBeenCalledWith(
      expect.objectContaining({ tags: ['NEW'], limit: 12 }),
    );
    expect(block).not.toBeNull();
    expect(block!.products).toEqual([{ id: '1', name: 'ui' }]);
  });

  it('maps homepage_best_sellers -> BESTSELLER and homepage_sale -> SALE', async () => {
    getBlockByMarker.mockResolvedValue(emptySimilarBlock);
    loadProducts.mockResolvedValue({ total: 0, items: [], fromCms: true });

    const { loadBlockWithProducts } = await importFresh();
    await loadBlockWithProducts('homepage_best_sellers');
    await loadBlockWithProducts('homepage_sale');

    // 1st call: BESTSELLER. 2nd call: SALE. Order of args verified by index.
    const tagCalls = loadProducts.mock.calls.map((c) => c[0].tags);
    expect(tagCalls).toEqual([['BESTSELLER'], ['SALE']]);
  });

  it('returns empty products when marker is outside the fallback map', async () => {
    getBlockByMarker.mockResolvedValue({
      ...emptySimilarBlock,
      localizeInfos: { title: 'Unknown Marker Block' },
    });
    // Also stub loadProducts to prove it's never called for unknown markers.
    loadProducts.mockResolvedValue({ total: 0, items: [], fromCms: true });

    const { loadBlockWithProducts } = await importFresh();
    const block = await loadBlockWithProducts('some_random_marker');

    expect(loadProducts).not.toHaveBeenCalled();
    expect(block).not.toBeNull();
    expect(block!.products).toEqual([]);
  });

  it('skips fallback when the SDK already returned inline products', async () => {
    getBlockByMarker.mockResolvedValue({
      type: 'similar_products_block',
      position: 1,
      quantity: 12,
      localizeInfos: { title: 'New Arrivals' },
      similarProducts: { items: [{ id: 77 }] },
    });
    loadProducts.mockResolvedValue({
      total: 1,
      items: [{ id: 77, title: 'From SDK' }],
      fromCms: true,
    });
    adaptCatalogProductToUiProduct.mockImplementation((p: { id: number }) => ({
      id: String(p.id),
      name: 'inline',
    }));

    const { loadBlockWithProducts } = await importFresh();
    const block = await loadBlockWithProducts('homepage_new_arrivals');

    // Inline path calls loadProducts once with {ids: [77]}, fallback would call
    // again with {tags: ['NEW']} — assert only the inline call happened.
    expect(loadProducts).toHaveBeenCalledTimes(1);
    expect(loadProducts).toHaveBeenCalledWith(
      expect.objectContaining({ ids: [77] }),
    );
    expect(loadProducts).not.toHaveBeenCalledWith(
      expect.objectContaining({ tags: ['NEW'] }),
    );
    expect(block!.products).toEqual([{ id: '77', name: 'inline' }]);
  });
});
