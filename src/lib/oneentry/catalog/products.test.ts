import { beforeEach, describe, expect, it, vi } from 'vitest';

const getProducts = vi.fn();
const getProductsByVectorSearch = vi.fn();
const searchProduct = vi.fn();
const fakeApi = {
  Products: { getProducts, getProductsByVectorSearch, searchProduct },
};

vi.mock('../index', () => ({
  oneentry: fakeApi,
  isOneEntryEnabled: true,
  getApi: () => fakeApi,
  isError: (v: unknown) => !!v && typeof v === 'object' && 'statusCode' in (v as Record<string, unknown>),
}));

// unstable_cache calls the underlying function directly in tests (no real
// disk/edge cache), so the wrapper is transparent to our assertions.
vi.mock('next/cache', () => ({
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  unstable_cache: (fn: any) => fn,
}));

const importFresh = async () => {
  vi.resetModules();
  return import('./products');
};

beforeEach(() => { getProducts.mockReset(); });

describe('loadProducts', () => {
  it('normalises raw OneEntry product into CatalogProduct shape', async () => {
    getProducts.mockResolvedValue({
      total: 1,
      items: [
        {
          id: 42,
          identifier: 'wc-1',
          statusIdentifier: 'in_stock',
          price: 199.99,
          localizeInfos: { en_US: { title: 'Black T-shirt' } },
          attributeValues: {
            en_US: {
              sku_id2: { value: 'WC-1' },
              image_id3: [{ downloadLink: 'https://cdn/p.jpg' }],
            },
          },
        },
      ],
    });
    const { loadProducts } = await importFresh();
    const result = await loadProducts({ limit: 10 });
    expect(result.fromCms).toBe(true);
    expect(result.total).toBe(1);
    expect(result.items[0]).toMatchObject({
      id: 42,
      identifier: 'wc-1',
      title: 'Black T-shirt',
      statusIdentifier: 'in_stock',
      price: 199.99,
      sku: 'WC-1',
      preview: 'https://cdn/p.jpg',
    });
  });

  it('returns fromCms:false when SDK throws (e.g. 403)', async () => {
    getProducts.mockRejectedValue(new Error('forbidden'));
    const { loadProducts } = await importFresh();
    const result = await loadProducts();
    expect(result).toEqual({ total: 0, items: [], fromCms: false });
  });

  it('returns fromCms:false when SDK returns null items', async () => {
    getProducts.mockResolvedValue(null);
    const { loadProducts } = await importFresh();
    const result = await loadProducts();
    expect(result.fromCms).toBe(false);
  });
});

// Regression guard for the SEASONAL TRENDS category filter branch of
// `matchesCatalogFilters` (internal). The needle stored in `filters.category`
// can be either an OE `pageUrl` slug (already lowercase-dashed, e.g.
// `t-shirts-polos`) OR a human-readable display name from an attribute
// (`"T-Shirts & Polos"`). `p.categories[]` only stores the slug form, so the
// helper must slugify the needle before comparing.
describe('loadFilteredProducts — category slugify branch', () => {
  // Independent mock reset — the file-wide `beforeEach` only wipes mocks
  // between describes-worth of runs; the sibling `loadProducts` suite above
  // installs a rejected/resolved value that lingers into this suite when
  // vitest re-uses the mock across tests.
  beforeEach(() => {
    getProducts.mockReset();
  });

  const makeRawProduct = (id: number, categories: string[]) => ({
    id,
    statusIdentifier: 'in_stock',
    price: 100,
    categories,
    localizeInfos: { en_US: { title: `P${id}` } },
    attributeValues: { en_US: {} },
  });

  it('matches when needle is already the slug in p.categories', async () => {
    getProducts.mockResolvedValue({
      total: 2,
      items: [
        makeRawProduct(1, ['/women/women_clothing/t-shirts-polos']),
        makeRawProduct(2, ['/women/women_clothing/dresses']),
      ],
    });
    const { loadFilteredProducts } = await importFresh();
    const result = await loadFilteredProducts({
      filters: { category: 't-shirts-polos' },
    });
    expect(result.total).toBe(1);
    expect(result.items[0].id).toBe(1);
  });

  it('matches when needle is a display name containing "&" and spaces', async () => {
    // p.categories only ever stores the slug; the needle here is the raw
    // human-readable value merchant put in the st_trends attribute.
    getProducts.mockResolvedValue({
      total: 2,
      items: [
        makeRawProduct(10, ['/women/women_clothing/t-shirts-polos']),
        makeRawProduct(11, ['/women/women_clothing/dresses']),
      ],
    });
    const { loadFilteredProducts } = await importFresh();
    const result = await loadFilteredProducts({
      filters: { category: 'T-Shirts & Polos' },
    });
    expect(result.total).toBe(1);
    expect(result.items[0].id).toBe(10);
  });

  it('drops products whose category path segments match neither raw nor slug', async () => {
    getProducts.mockResolvedValue({
      total: 1,
      items: [makeRawProduct(20, ['/women/women_clothing/dresses'])],
    });
    const { loadFilteredProducts } = await importFresh();
    const result = await loadFilteredProducts({
      filters: { category: 'T-Shirts & Polos' },
    });
    expect(result.total).toBe(0);
    expect(result.items).toEqual([]);
  });

  it('slugify strips leading/trailing dashes and collapses non-alphanumerics', async () => {
    // Needle `"  Coats & Jackets!  "` → slug `coats-jackets`. The trailing
    // "!" would otherwise leave a dangling dash without the trim step.
    getProducts.mockResolvedValue({
      total: 1,
      items: [makeRawProduct(30, ['/men/men_clothing/coats-jackets'])],
    });
    const { loadFilteredProducts } = await importFresh();
    const result = await loadFilteredProducts({
      filters: { category: '  Coats & Jackets!  ' },
    });
    expect(result.total).toBe(1);
    expect(result.items[0].id).toBe(30);
  });
});

describe('loadProducts — disabled', () => {
  it('returns fromCms:false when SDK is disabled', async () => {
    vi.resetModules();
    vi.doMock('../index', () => ({
      oneentry: null,
      isOneEntryEnabled: false,
      getApi: () => { throw new Error('SDK disabled'); },
      isError: () => false,
    }));
    const { loadProducts } = await import('./products');
    const result = await loadProducts();
    expect(result.fromCms).toBe(false);
    vi.doUnmock('../index');
  });
});
