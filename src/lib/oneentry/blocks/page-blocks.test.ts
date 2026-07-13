import { beforeEach, describe, expect, it, vi } from 'vitest';

// SDK mock — `getBlockByMarker` drives `loadBlockWithProducts`.
const getBlockByMarker = vi.fn();
const getTrending = vi.fn();
const getFrequentlyOrderedProducts = vi.fn();
const fakeApi = { Blocks: { getBlockByMarker, getTrending, getFrequentlyOrderedProducts } };

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
  getFrequentlyOrderedProducts.mockReset();
  loadProducts.mockReset();
  adaptCatalogProductToUiProduct.mockReset();
  // Clear any leftover in-flight dedup state from previous tests.
  const g = globalThis as typeof globalThis & { __oneentryFrequentlyOrderedInflight__?: unknown };
  delete g.__oneentryFrequentlyOrderedInflight__;
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

describe('loadFrequentlyOrderedBlock — 2 s timeout ceiling', () => {
  it('returns products:[] when getFrequentlyOrderedProducts never resolves within 2 s', async () => {
    vi.useFakeTimers();

    const blockDescriptor = {
      type: 'frequently_ordered_block',
      position: 1,
      quantity: 12,
      localizeInfos: { title: 'Bought Together' },
    };
    getBlockByMarker.mockResolvedValue(blockDescriptor);

    // A promise that intentionally never settles — simulates a hung OE endpoint.
    getFrequentlyOrderedProducts.mockReturnValue(new Promise(() => { /* never */ }));

    const { loadFrequentlyOrderedBlock } = await importFresh();
    const blockP = loadFrequentlyOrderedBlock('freq_block', 10, 'en_US');

    // Advance fake clock past the 2 s ceiling; the async variant flushes
    // queued microtasks between each tick so Promise.race settles correctly.
    await vi.advanceTimersByTimeAsync(2001);

    const block = await blockP;

    expect(block).not.toBeNull();
    expect(block!.products).toEqual([]);
    // loadProducts must NOT have been called — timeout branch takes over.
    expect(loadProducts).not.toHaveBeenCalled();

    vi.useRealTimers();
  });
});

describe('loadFrequentlyOrderedBlock — in-flight dedup', () => {
  it('collapses two concurrent cold-miss calls into a single SDK request', async () => {
    // Block descriptor — needed because _loadFrequentlyOrderedBlock calls
    // getCachedBlock (getBlockByMarker) before getFrequentlyOrderedProducts.
    const blockDescriptor = {
      type: 'frequently_ordered_block',
      position: 1,
      quantity: 12,
      localizeInfos: { title: 'Bought Together' },
    };
    getBlockByMarker.mockResolvedValue(blockDescriptor);

    // A manually-controlled promise lets us keep both callers in-flight
    // simultaneously before the SDK responds.
    let resolveFreq!: (v: { items: Array<{ id: number }> }) => void;
    const freqPromise = new Promise<{ items: Array<{ id: number }> }>((res) => {
      resolveFreq = res;
    });
    getFrequentlyOrderedProducts.mockReturnValue(freqPromise);

    loadProducts.mockResolvedValue({ total: 1, items: [{ id: 42 }], fromCms: true });
    adaptCatalogProductToUiProduct.mockImplementation((p: { id: number }) => ({
      id: String(p.id),
      name: 'ui',
    }));

    const { loadFrequentlyOrderedBlock } = await importFresh();

    // Kick off two concurrent calls with the SAME (marker, productId, lang) key
    // — both should share the single in-flight promise, not fire two SDK calls.
    const call1 = loadFrequentlyOrderedBlock('freq_block', 10, 'en_US');
    const call2 = loadFrequentlyOrderedBlock('freq_block', 10, 'en_US');

    // Neither call has resolved yet — the SDK mock is still pending.
    // Now let the in-flight promise settle.
    resolveFreq({ items: [{ id: 42 }] });

    const [block1, block2] = await Promise.all([call1, call2]);

    // The core assertion: the SDK was hit exactly once, not twice.
    expect(getFrequentlyOrderedProducts).toHaveBeenCalledTimes(1);
    expect(getFrequentlyOrderedProducts).toHaveBeenCalledWith(10, 'freq_block', 'en_US');

    // Both callers still got the right result.
    expect(block1).not.toBeNull();
    expect(block2).not.toBeNull();
    expect(block1!.products).toEqual([{ id: '42', name: 'ui' }]);
    expect(block2!.products).toEqual([{ id: '42', name: 'ui' }]);
  });
});
