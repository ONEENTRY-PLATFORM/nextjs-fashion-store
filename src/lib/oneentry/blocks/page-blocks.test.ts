import { beforeEach, describe, expect, it, vi } from 'vitest';

// SDK mock — `getBlockByMarker` drives `loadBlockWithProducts`.
const getBlockByMarker = vi.fn();
const getTrending = vi.fn();
const fakeApi = { Blocks: { getBlockByMarker, getTrending } };

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
  getTrending.mockReset();
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

describe('loadBlockWithProducts — trending_block path', () => {
  // The block descriptor returned by getBlockByMarker for a trending_block.
  // Products are NOT inlined here — they come from getTrending instead.
  const trendingBlockDescriptor = {
    type: 'trending_block',
    position: 2,
    quantity: 8,
    localizeInfos: { title: 'Trending Now' },
    similarProducts: { items: [] },
    products: [],
  };

  it('happy path: calls getTrending, resolves product ids through loadProducts', async () => {
    getBlockByMarker.mockResolvedValue(trendingBlockDescriptor);
    getTrending.mockResolvedValue([{ id: 10 }, { id: 20 }]);
    loadProducts.mockResolvedValue({
      total: 2,
      items: [{ id: 10, title: 'Sneaker A' }, { id: 20, title: 'Boot B' }],
      fromCms: true,
    });
    adaptCatalogProductToUiProduct.mockImplementation((p: { id: number }) => ({
      id: String(p.id),
      name: 'ui',
    }));

    const { loadBlockWithProducts } = await importFresh();
    const block = await loadBlockWithProducts('trending_shoes', { lang: 'en_US' });

    expect(getTrending).toHaveBeenCalledOnce();
    expect(getTrending).toHaveBeenCalledWith('trending_shoes', 'en_US');
    expect(loadProducts).toHaveBeenCalledWith(
      expect.objectContaining({ ids: [10, 20] }),
    );
    expect(block).not.toBeNull();
    expect(block!.type).toBe('trending_block');
    expect(block!.products).toHaveLength(2);
  });

  it('handles getTrending returning { items } shape instead of a plain array', async () => {
    getBlockByMarker.mockResolvedValue(trendingBlockDescriptor);
    // OE SDK may return `{ items: [...] }` rather than a bare array.
    getTrending.mockResolvedValue({ items: [{ id: 55 }] });
    loadProducts.mockResolvedValue({
      total: 1,
      items: [{ id: 55, title: 'Loafer C' }],
      fromCms: true,
    });
    adaptCatalogProductToUiProduct.mockImplementation((p: { id: number }) => ({
      id: String(p.id),
      name: 'ui',
    }));

    const { loadBlockWithProducts } = await importFresh();
    const block = await loadBlockWithProducts('trending_shoes');

    expect(loadProducts).toHaveBeenCalledWith(
      expect.objectContaining({ ids: [55] }),
    );
    expect(block!.products).toHaveLength(1);
  });

  it('returns empty products when getTrending signals an error', async () => {
    getBlockByMarker.mockResolvedValue(trendingBlockDescriptor);
    // isError returns true when statusCode is present.
    getTrending.mockResolvedValue({ statusCode: 500, message: 'Server error' });
    loadProducts.mockResolvedValue({ total: 0, items: [], fromCms: true });

    const { loadBlockWithProducts } = await importFresh();
    const block = await loadBlockWithProducts('trending_shoes');

    // Error branch returns [] from getCachedTrending → no ids → loadProducts
    // is called only if the fallback fires, and trending_block is NOT in
    // HOMEPAGE_FALLBACK_LABELS, so loadProducts must NOT be called.
    expect(loadProducts).not.toHaveBeenCalled();
    expect(block).not.toBeNull();
    expect(block!.products).toEqual([]);
  });
});
