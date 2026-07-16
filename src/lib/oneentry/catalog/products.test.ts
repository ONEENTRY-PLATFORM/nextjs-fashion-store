import { beforeEach, describe, expect, it, vi } from 'vitest';

const getProducts = vi.fn();
const getProductsByVectorSearch = vi.fn();
const searchProduct = vi.fn();
const getProductById = vi.fn();
const getRelatedProductsById = vi.fn();
const getProductsByIds = vi.fn();
const fakeApi = {
  Products: {
    getProducts,
    getProductsByVectorSearch,
    searchProduct,
    getProductById,
    getRelatedProductsById,
    getProductsByIds,
  },
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

beforeEach(() => {
  getProducts.mockReset();
  getProductById.mockReset();
  getRelatedProductsById.mockReset();
  getProductsByIds.mockReset();
});

describe('loadProducts', () => {
  it('normalises raw OneEntry product into CatalogProduct shape', async () => {
    getProducts.mockResolvedValue({
      total: 1,
      items: [
        {
          id: 42,
          statusIdentifier: 'in_stock',
          price: 199.99,
          localizeInfos: { en_US: { title: 'Black T-shirt' } },
          // Attribute markers match the live tenant schema (`sku`, `gallery`);
          // see the marker snapshot referenced in `normalize()` in products.ts.
          attributeValues: {
            en_US: {
              sku: { value: 'WC-1' },
              gallery: { value: [{ downloadLink: 'https://cdn/p.jpg' }] },
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

// ─── categoryPathToViewAllHref ──────────────────────────────────────────────
// Pure function — imported directly, no mock needed.
describe('categoryPathToViewAllHref', () => {
  // Import once at describe level; the function is pure and stateless.
  let categoryPathToViewAllHref: (p: string | undefined) => string;
  beforeEach(async () => {
    ({ categoryPathToViewAllHref } = await import('./products'));
  });

  it('derives /women/clothing from /women/women_clothing/costumes', () => {
    expect(categoryPathToViewAllHref('/women/women_clothing/costumes')).toBe('/women/clothing');
  });

  it('derives /men/outerwear from /men/men_outerwear/coats', () => {
    expect(categoryPathToViewAllHref('/men/men_outerwear/coats')).toBe('/men/outerwear');
  });

  it('handles a path with only gender+sub but no leaf segment', () => {
    expect(categoryPathToViewAllHref('/women/women_clothing')).toBe('/women/clothing');
  });

  it('passes through a sub-segment that has no gender prefix', () => {
    // e.g. a custom category marker without the women_/men_ convention
    expect(categoryPathToViewAllHref('/women/accessories/bags')).toBe('/women/accessories');
  });

  it('falls back to "/" when path is undefined', () => {
    expect(categoryPathToViewAllHref(undefined)).toBe('/');
  });

  it('falls back to "/" when path is an empty string', () => {
    expect(categoryPathToViewAllHref('')).toBe('/');
  });

  it('falls back to "/" when path has only one segment (no sub-category)', () => {
    expect(categoryPathToViewAllHref('/women')).toBe('/');
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

// ─── loadProductById ──────────────────────────────────────────────────────────
// Exercises the new targeted-endpoint flow: cachedGetProductById → normalize →
// cachedGetRelated → cachedGetByIds (for missing relatedIds).
//
// Note: the `loadProducts — disabled` test above calls `vi.doUnmock('../index')`
// which deregisters the hoisted mock for subsequent dynamic imports. We
// re-register it here via `vi.doMock` before each test in these new suites.

const makeRaw = (id: number, title: string, overrides: Record<string, unknown> = {}) => ({
  id,
  statusIdentifier: 'in_stock',
  price: 100,
  categories: [],
  relatedIds: [] as number[],
  localizeInfos: { en_US: { title } },
  attributeValues: { en_US: {} },
  ...overrides,
});

// Import once — stable binding to the mocked `../index`.
let loadProductById: (id: number, lang?: string) => Promise<unknown>;
let loadProductsByIds: (ids: number[], lang?: string) => Promise<unknown[]>;

describe('loadProductById', () => {
  beforeEach(async () => {
    // Re-register the mock that vi.doUnmock() may have stripped in the
    // `loadProducts — disabled` suite above, then get a fresh module.
    vi.resetModules();
    vi.doMock('../index', () => ({
      oneentry: fakeApi,
      isOneEntryEnabled: true,
      getApi: () => fakeApi,
      isError: (v: unknown) =>
        !!v && typeof v === 'object' && 'statusCode' in (v as Record<string, unknown>),
    }));
    vi.doMock('next/cache', () => ({
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      unstable_cache: (fn: any) => fn,
    }));
    ({ loadProductById, loadProductsByIds } = await import('./products') as {
      loadProductById: (id: number, lang?: string) => Promise<unknown>;
      loadProductsByIds: (ids: number[], lang?: string) => Promise<unknown[]>;
    });
  });

  it('returns null when getProductById resolves null (product not found)', async () => {
    getProductById.mockResolvedValue(null);
    // Use unique id per test so React.cache doesn't return a memoised result.
    const result = await loadProductById(1001, 'en_US');
    expect(result).toBeNull();
    expect(getProductById).toHaveBeenCalledWith(1001, 'en_US');
    expect(getRelatedProductsById).not.toHaveBeenCalled();
  });

  it('returns null when getProductById returns an error object', async () => {
    getProductById.mockResolvedValue({ statusCode: 404, message: 'Not found' });
    // isError() detects the statusCode shape → cachedGetProductById returns null
    const result = await loadProductById(1002, 'en_US');
    expect(result).toBeNull();
  });

  it('returns the single product when related lists are empty', async () => {
    getProductById.mockResolvedValue(makeRaw(1010, 'Solo Jacket'));
    getRelatedProductsById.mockResolvedValue([]);
    const result = await loadProductById(1010, 'en_US') as { id: number; title: string; variants?: unknown[] } | null;
    expect(result).not.toBeNull();
    expect(result!.id).toBe(1010);
    expect(result!.title).toBe('Solo Jacket');
    // Only one member in the family → no variant aggregation.
    expect(result!.variants).toBeUndefined();
    expect(getRelatedProductsById).toHaveBeenCalledWith(1010, 'en_US');
    expect(getProductsByIds).not.toHaveBeenCalled();
  });

  it('aggregates colours / sizes / variants when related products exist', async () => {
    const rawTarget = makeRaw(1020, 'Trench Coat', {
      relatedIds: [],
      attributeValues: { en_US: { color: { value: [{ value: 'Beige' }] } } },
    });
    const rawRelated = makeRaw(1021, 'Trench Coat', {
      relatedIds: [],
      attributeValues: { en_US: { color: { value: [{ value: 'Black' }] } } },
    });
    getProductById.mockResolvedValue(rawTarget);
    getRelatedProductsById.mockResolvedValue([rawRelated]);
    const result = await loadProductById(1020, 'en_US') as { colors: string[]; variants: Array<{ id: number }> } | null;
    expect(result).not.toBeNull();
    expect(result!.colors).toEqual(expect.arrayContaining(['Beige', 'Black']));
    expect(result!.variants).toHaveLength(2);
    expect(result!.variants.map((v) => v.id)).toEqual(expect.arrayContaining([1020, 1021]));
  });

  it('fetches missing relatedIds via getProductsByIds', async () => {
    // target has relatedIds: [1030] but getRelatedProductsById returns nothing
    const rawTarget = makeRaw(1025, 'Parka', { relatedIds: [1030] });
    const rawById = makeRaw(1030, 'Parka Navy');
    getProductById.mockResolvedValue(rawTarget);
    getRelatedProductsById.mockResolvedValue([]);
    getProductsByIds.mockResolvedValue([rawById]);
    const result = await loadProductById(1025, 'en_US') as { variants: unknown[] } | null;
    expect(result).not.toBeNull();
    expect(result!.variants).toHaveLength(2);
    // getProductsByIds called with the missing id as csv
    expect(getProductsByIds).toHaveBeenCalledWith('1030', 'en_US');
  });

  it('deduplicates when getRelatedProductsById and relatedIds overlap', async () => {
    // relatedId 1031 is returned by both sources — should appear only once
    const rawTarget = makeRaw(1026, 'Blazer', { relatedIds: [1031] });
    const rawSibling = makeRaw(1031, 'Blazer Alt');
    getProductById.mockResolvedValue(rawTarget);
    getRelatedProductsById.mockResolvedValue([rawSibling]);
    // getProductsByIds should NOT be called because 1031 is already in seen
    const result = await loadProductById(1026, 'en_US') as { variants: unknown[] } | null;
    expect(result).not.toBeNull();
    expect(result!.variants).toHaveLength(2);
    expect(getProductsByIds).not.toHaveBeenCalled();
  });

  it('aggregates statusIdentifier to in_stock when any family member is buyable', async () => {
    const rawOos = makeRaw(1040, 'Dress', { statusIdentifier: 'out_of_stock' });
    const rawInStock = makeRaw(1041, 'Dress');
    getProductById.mockResolvedValue(rawOos);
    getRelatedProductsById.mockResolvedValue([rawInStock]);
    const result = await loadProductById(1040, 'en_US') as { statusIdentifier: string } | null;
    expect(result).not.toBeNull();
    expect(result!.statusIdentifier).toBe('in_stock');
  });
});

// ─── loadProductsByIds ────────────────────────────────────────────────────────

describe('loadProductsByIds', () => {
  beforeEach(async () => {
    vi.resetModules();
    vi.doMock('../index', () => ({
      oneentry: fakeApi,
      isOneEntryEnabled: true,
      getApi: () => fakeApi,
      isError: (v: unknown) =>
        !!v && typeof v === 'object' && 'statusCode' in (v as Record<string, unknown>),
    }));
    vi.doMock('next/cache', () => ({
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      unstable_cache: (fn: any) => fn,
    }));
    ({ loadProductsByIds } = await import('./products') as {
      loadProductsByIds: (ids: number[], lang?: string) => Promise<unknown[]>;
    });
  });

  it('returns empty array for empty ids list', async () => {
    const result = await loadProductsByIds([], 'en_US');
    expect(result).toEqual([]);
    expect(getProductsByIds).not.toHaveBeenCalled();
  });

  it('filters out non-finite and non-positive ids and returns [] when none remain', async () => {
    const result = await loadProductsByIds([0, -1, NaN, Infinity], 'en_US');
    expect(result).toEqual([]);
    expect(getProductsByIds).not.toHaveBeenCalled();
  });

  it('calls getProductsByIds with csv of valid ids and normalizes results', async () => {
    const raws = [makeRaw(2001, 'Item A'), makeRaw(2002, 'Item B')];
    getProductsByIds.mockResolvedValue(raws);
    const result = await loadProductsByIds([2001, 2002], 'en_US') as Array<{ id: number }>;
    expect(getProductsByIds).toHaveBeenCalledWith('2001,2002', 'en_US');
    expect(result).toHaveLength(2);
    expect(result[0].id).toBe(2001);
    expect(result[1].id).toBe(2002);
  });

  it('strips invalid ids from the csv and calls endpoint with only valid ones', async () => {
    getProductsByIds.mockResolvedValue([makeRaw(2005, 'Valid Only')]);
    const result = await loadProductsByIds([2005, -3, 0], 'en_US') as Array<{ id: number }>;
    expect(getProductsByIds).toHaveBeenCalledWith('2005', 'en_US');
    expect(result).toHaveLength(1);
    expect(result[0].id).toBe(2005);
  });

  it('returns empty array when getProductsByIds returns an error object', async () => {
    getProductsByIds.mockResolvedValue({ statusCode: 500, message: 'Server error' });
    const result = await loadProductsByIds([2007], 'en_US');
    // isError() catches the error shape → cachedGetByIds returns []
    expect(result).toEqual([]);
  });
});

// ─── normalize — stock is sourced ONLY from `stockqty` ─────────────────────────
//
// Per merchant decision the tenant tracks inventory exclusively via the
// `stockqty` attribute. The legacy `units_N` marker is intentionally ignored,
// even when it holds a non-zero reading. Exercised through `loadProducts` since
// `normalize` is not exported.
describe('normalize — stock from stockqty only (via loadProducts)', () => {
  beforeEach(() => {
    vi.resetModules();
    vi.doMock('../index', () => ({
      oneentry: fakeApi,
      isOneEntryEnabled: true,
      getApi: () => fakeApi,
      isError: (v: unknown) =>
        !!v && typeof v === 'object' && 'statusCode' in (v as Record<string, unknown>),
    }));
    vi.doMock('next/cache', () => ({
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      unstable_cache: (fn: any) => fn,
    }));
    getProducts.mockReset();
  });

  const makeRawStockProduct = (id: number, stockqtyVal: unknown, unitsVal: unknown) => ({
    id,
    statusIdentifier: 'in_stock',
    price: 100,
    categories: [],
    localizeInfos: { en_US: { title: `P${id}` } },
    attributeValues: {
      en_US: {
        ...(stockqtyVal !== undefined && { stockqty: { value: stockqtyVal } }),
        ...(unitsVal !== undefined && { units: { value: unitsVal } }),
      },
    },
  });

  it('reads stockqty and ignores units when both are set', async () => {
    getProducts.mockResolvedValue({
      total: 1,
      items: [makeRawStockProduct(4001, '5', '3')],
    });
    const { loadProducts } = await import('./products');
    const result = await loadProducts({ unique: false });
    expect((result.items[0] as { stock: number }).stock).toBe(5);
  });

  it('returns 0 when stockqty=0 even if units is > 0', async () => {
    getProducts.mockResolvedValue({
      total: 1,
      items: [makeRawStockProduct(4002, '0', '2')],
    });
    const { loadProducts } = await import('./products');
    const result = await loadProducts({ unique: false });
    expect((result.items[0] as { stock: number }).stock).toBe(0);
  });

  it('reads stockqty=5 regardless of units=0', async () => {
    getProducts.mockResolvedValue({
      total: 1,
      items: [makeRawStockProduct(4003, '5', '0')],
    });
    const { loadProducts } = await import('./products');
    const result = await loadProducts({ unique: false });
    expect((result.items[0] as { stock: number }).stock).toBe(5);
  });

  it('returns 0 when both stockqty and units are 0', async () => {
    getProducts.mockResolvedValue({
      total: 1,
      items: [makeRawStockProduct(4004, '0', '0')],
    });
    const { loadProducts } = await import('./products');
    const result = await loadProducts({ unique: false });
    expect((result.items[0] as { stock: number }).stock).toBe(0);
  });

  it('reads stockqty when it is the only marker present', async () => {
    getProducts.mockResolvedValue({
      total: 1,
      items: [makeRawStockProduct(4005, '7', undefined)],
    });
    const { loadProducts } = await import('./products');
    const result = await loadProducts({ unique: false });
    expect((result.items[0] as { stock: number }).stock).toBe(7);
  });

  it('returns 0 when only units is provided (stockqty missing)', async () => {
    getProducts.mockResolvedValue({
      total: 1,
      items: [makeRawStockProduct(4006, undefined, '4')],
    });
    const { loadProducts } = await import('./products');
    const result = await loadProducts({ unique: false });
    expect((result.items[0] as { stock: number }).stock).toBe(0);
  });
});

// ─── normalizeCategoryPath (via normalize / loadProducts) ────────────────────
//
// The helper is not exported, so we exercise it through the public
// `loadProducts` path (which calls `fetchFullCatalog` → `normalize`).
// Each test supplies a raw product whose `categories` array uses the OE
// live-tenant shape (`home/…`) and asserts that `p.categories` in the
// returned `CatalogProduct` has been converted to the canonical `/…` form.
//
// We also verify the category-path filter still resolves correctly after
// normalisation — that's the end-to-end regression guard for the bug.
describe('normalizeCategoryPath — via normalize inside loadProducts', () => {
  // Each test fresh-imports to avoid React.cache memo hits from earlier suites.
  beforeEach(() => {
    vi.resetModules();
    vi.doMock('../index', () => ({
      oneentry: fakeApi,
      isOneEntryEnabled: true,
      getApi: () => fakeApi,
      isError: (v: unknown) =>
        !!v && typeof v === 'object' && 'statusCode' in (v as Record<string, unknown>),
    }));
    vi.doMock('next/cache', () => ({
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      unstable_cache: (fn: any) => fn,
    }));
    getProducts.mockReset();
  });

  const makeRawWithCategories = (id: number, categories: string[]) => ({
    id,
    statusIdentifier: 'in_stock',
    price: 100,
    categories,
    localizeInfos: { en_US: { title: `P${id}` } },
    attributeValues: { en_US: {} },
  });

  it('strips leading "home/" and prepends "/" (live-tenant shape)', async () => {
    getProducts.mockResolvedValue({
      total: 1,
      items: [makeRawWithCategories(3001, ['home/women/women_clothing/dresses'])],
    });
    const { loadProducts } = await import('./products');
    const result = await loadProducts({ unique: false });
    expect(result.items[0].categories).toEqual(['/women/women_clothing/dresses']);
  });

  it('keeps already-canonical paths (leading "/" only, no "home/") unchanged', async () => {
    getProducts.mockResolvedValue({
      total: 1,
      items: [makeRawWithCategories(3002, ['/women/women_clothing/dresses'])],
    });
    const { loadProducts } = await import('./products');
    const result = await loadProducts({ unique: false });
    expect(result.items[0].categories).toEqual(['/women/women_clothing/dresses']);
  });

  it('strips multiple leading slashes and normalises to a single "/"', async () => {
    getProducts.mockResolvedValue({
      total: 1,
      items: [makeRawWithCategories(3003, ['///women/women_clothing/shoes'])],
    });
    const { loadProducts } = await import('./products');
    const result = await loadProducts({ unique: false });
    expect(result.items[0].categories).toEqual(['/women/women_clothing/shoes']);
  });

  it('handles an empty string category gracefully (returns "/")', async () => {
    getProducts.mockResolvedValue({
      total: 1,
      items: [makeRawWithCategories(3004, [''])],
    });
    const { loadProducts } = await import('./products');
    const result = await loadProducts({ unique: false });
    // empty → stripped → prepend "/" → "/"
    expect(result.items[0].categories).toEqual(['/']);
  });

  // Integration: the category-path filter that was broken by the bug.
  // A product with `categories: ['home/women/women_clothing/dresses']` MUST be
  // included in `loadProducts({ categoryPath: '/women/women_clothing' })`.
  it('categoryPath filter matches after home/ is stripped (bug regression)', async () => {
    getProducts.mockResolvedValue({
      total: 2,
      items: [
        makeRawWithCategories(3010, ['home/women/women_clothing/dresses']),
        makeRawWithCategories(3011, ['home/men/men_clothing/jeans']),
      ],
    });
    const { loadProducts } = await import('./products');
    const result = await loadProducts({
      categoryPath: '/women/women_clothing',
      unique: false,
    });
    expect(result.total).toBe(1);
    expect(result.items[0].id).toBe(3010);
  });
});

// ─── normalize — discountAttributes population ────────────────────────────────
//
// `normalize()` must snapshot every attribute marker starting with `discount_`
// into `CatalogProduct.discountAttributes`. These are the campaign flags that
// `applyProductDiscount` evaluates for ATTRIBUTE-type discount conditions.
describe('normalize — discountAttributes (via loadProducts)', () => {
  beforeEach(() => {
    vi.resetModules();
    vi.doMock('../index', () => ({
      oneentry: fakeApi,
      isOneEntryEnabled: true,
      getApi: () => fakeApi,
      isError: (v: unknown) =>
        !!v && typeof v === 'object' && 'statusCode' in (v as Record<string, unknown>),
    }));
    vi.doMock('next/cache', () => ({
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      unstable_cache: (fn: any) => fn,
    }));
    getProducts.mockReset();
  });

  it('populates discountAttributes from a discount_ marker attribute', async () => {
    getProducts.mockResolvedValue({
      total: 1,
      items: [
        {
          id: 5001,
          statusIdentifier: 'in_stock',
          price: 100,
          categories: [],
          localizeInfos: { en_US: { title: 'Promo Jacket' } },
          attributeValues: {
            en_US: {
              // discount_12 is the OE marker used in the ATTRIBUTE condition
              discount_12: { value: '10' },
            },
          },
        },
      ],
    });
    const { loadProducts } = await import('./products');
    const result = await loadProducts({ unique: false });
    const product = result.items[0] as { discountAttributes: Record<string, string> };
    expect(product.discountAttributes).toEqual({ discount_12: '10' });
  });

  it('does not include non-discount attributes in discountAttributes', async () => {
    getProducts.mockResolvedValue({
      total: 1,
      items: [
        {
          id: 5002,
          statusIdentifier: 'in_stock',
          price: 100,
          categories: [],
          localizeInfos: { en_US: { title: 'Regular Jacket' } },
          attributeValues: {
            en_US: {
              brand: { value: [{ title: 'Nike' }] },
              sku: { value: 'RJ-001' },
            },
          },
        },
      ],
    });
    const { loadProducts } = await import('./products');
    const result = await loadProducts({ unique: false });
    const product = result.items[0] as { discountAttributes: Record<string, string> };
    expect(product.discountAttributes).toEqual({});
  });

  // ── Verbatim-forwarding regression tests. Values are handed to
  //    `applyProductDiscount` exactly as OE ships them so client match
  //    mirrors OE server match — a rule with condition `eq "10"` only
  //    fires if the product attribute is literally `"10"`. Previously
  //    we stripped a trailing `%` to "help" the match, but that made
  //    the catalog show a sale price OE then refused to honour at
  //    checkout (surfacing as a mysterious "Adjustments +$X" row on
  //    payment). Root cause was OE-side data (`"10%"` on the product
  //    but `"10"` on the rule); the fix is to mirror OE's comparison,
  //    not paper over the mismatch.
  const makeDiscountProduct = (id: number, discountValue: string) => ({
    id,
    statusIdentifier: 'in_stock',
    price: 100,
    categories: [],
    localizeInfos: { en_US: { title: `P${id}` } },
    attributeValues: {
      en_US: {
        discount_12: { value: discountValue },
      },
    },
  });

  it('forwards "10%" verbatim (mirrors OE — rule with eq "10" would not fire)', async () => {
    getProducts.mockResolvedValue({ total: 1, items: [makeDiscountProduct(5010, '10%')] });
    const { loadProducts } = await import('./products');
    const result = await loadProducts({ unique: false });
    const product = result.items[0] as { discountAttributes: Record<string, string> };
    expect(product.discountAttributes).toEqual({ discount_12: '10%' });
  });

  it('forwards "15 %" verbatim (internal whitespace preserved)', async () => {
    getProducts.mockResolvedValue({ total: 1, items: [makeDiscountProduct(5011, '15 %')] });
    const { loadProducts } = await import('./products');
    const result = await loadProducts({ unique: false });
    const product = result.items[0] as { discountAttributes: Record<string, string> };
    expect(product.discountAttributes).toEqual({ discount_12: '15 %' });
  });

  it('trims surrounding whitespace but keeps "%": " 20% " → "20%"', async () => {
    // Surrounding whitespace still gets normalised (matches how OE itself
    // treats leading/trailing spaces in `eq` comparisons).
    getProducts.mockResolvedValue({ total: 1, items: [makeDiscountProduct(5012, ' 20% ')] });
    const { loadProducts } = await import('./products');
    const result = await loadProducts({ unique: false });
    const product = result.items[0] as { discountAttributes: Record<string, string> };
    expect(product.discountAttributes).toEqual({ discount_12: '20%' });
  });

  it('leaves numeric-only value untouched: "10" → "10" (matches a rule with eq "10")', async () => {
    getProducts.mockResolvedValue({ total: 1, items: [makeDiscountProduct(5013, '10')] });
    const { loadProducts } = await import('./products');
    const result = await loadProducts({ unique: false });
    const product = result.items[0] as { discountAttributes: Record<string, string> };
    expect(product.discountAttributes).toEqual({ discount_12: '10' });
  });

  it('forwards double trailing "%%" verbatim: "20%%" → "20%%"', async () => {
    getProducts.mockResolvedValue({ total: 1, items: [makeDiscountProduct(5014, '20%%')] });
    const { loadProducts } = await import('./products');
    const result = await loadProducts({ unique: false });
    const product = result.items[0] as { discountAttributes: Record<string, string> };
    expect(product.discountAttributes).toEqual({ discount_12: '20%%' });
  });

  it('omits key when picked list option is empty (title:"", value:"")', async () => {
    // An unpicked/blank list option: after stripping, cleaned === '' → key must be omitted.
    getProducts.mockResolvedValue({
      total: 1,
      items: [{
        id: 5015,
        statusIdentifier: 'in_stock',
        price: 100,
        categories: [],
        localizeInfos: { en_US: { title: 'P5015' } },
        attributeValues: {
          en_US: {
            discount_12: { value: [{ title: '', value: '' }] },
          },
        },
      }],
    });
    const { loadProducts } = await import('./products');
    const result = await loadProducts({ unique: false });
    const product = result.items[0] as { discountAttributes: Record<string, string> };
    expect(product.discountAttributes).toEqual({});
  });

  it('does not strip "%" from a non-discount attribute value (isolation guard)', async () => {
    // Ensure the % stripping only runs inside the discount_ branch and does
    // not accidentally mutate values on unrelated attributes (e.g. a humidity
    // rating stored as "80%").
    getProducts.mockResolvedValue({
      total: 1,
      items: [{
        id: 5016,
        statusIdentifier: 'in_stock',
        price: 100,
        categories: [],
        localizeInfos: { en_US: { title: 'P5016' } },
        attributeValues: {
          en_US: {
            // Non-discount attr whose string value contains a % sign.
            humidity: { value: '80%' },
            // A discount attr to confirm stripping still runs for that key.
            discount_12: { value: '15%' },
          },
        },
      }],
    });
    const { loadProducts } = await import('./products');
    const result = await loadProducts({ unique: false });
    const product = result.items[0] as {
      discountAttributes: Record<string, string>;
    };
    // Only `discount_12` is in `discountAttributes` (value forwarded
    // verbatim as "15%"). The `humidity` attribute is not in
    // `discountAttributes` at all — the isolation check is on which
    // attributes get harvested, not on the value shape.
    expect(product.discountAttributes).toEqual({ discount_12: '15%' });
    // Verify humidity is absent from discountAttributes (it goes to a
    // different field path and is not affected by the discount harvest).
    expect('humidity' in product.discountAttributes).toBe(false);
  });
});

// ─── searchProducts — extractProductIdList regression ────────────────────────
//
// Before the fix, `getProductsByVectorSearch` returned a `{items, total}`
// wrapper which the old flat-array cast caused to throw inside `.map()`.
// The try/catch swallowed the error and `vectorSearchIds` always returned [].
//
// Fix: `extractProductIdList()` now accepts both shapes.  These tests pin the
// merged output and the vector-first ordering guarantee end-to-end.
describe('searchProducts — extractProductIdList regression', () => {
  // Each test needs a fresh module import to avoid React.cache memoisation
  // from earlier suites, so we reset modules and re-register mocks here.
  beforeEach(() => {
    vi.resetModules();
    vi.doMock('../index', () => ({
      oneentry: fakeApi,
      isOneEntryEnabled: true,
      getApi: () => fakeApi,
      isError: (v: unknown) =>
        !!v && typeof v === 'object' && 'statusCode' in (v as Record<string, unknown>),
    }));
    vi.doMock('next/cache', () => ({
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      unstable_cache: (fn: any) => fn,
    }));
    getProductsByVectorSearch.mockReset();
    searchProduct.mockReset();
    getProducts.mockReset();
  });

  // Helper: a minimal raw product that normalize() can process.
  const makeRawCatalog = (id: number) => ({
    id,
    statusIdentifier: 'in_stock',
    price: id * 10,
    categories: [],
    localizeInfos: { en_US: { title: `Product ${id}` } },
    attributeValues: { en_US: {} },
  });

  // ── shape 1: flat array ───────────────────────────────────────────────────

  it('returns enriched results when getProductsByVectorSearch returns a flat array', async () => {
    // Vector returns flat array; quick returns no extra results.
    getProductsByVectorSearch.mockResolvedValue([{ id: 100 }, { id: 101 }]);
    searchProduct.mockResolvedValue([]);
    // Full catalog for enrichment (getProducts drives loadFullCatalog).
    getProducts.mockResolvedValue({
      total: 2,
      items: [makeRawCatalog(100), makeRawCatalog(101)],
    });

    const { searchProducts } = await import('./products');
    const results = await searchProducts('grey t-shirt', { limit: 12 }) as Array<{ id: number }>;

    expect(results.length).toBeGreaterThanOrEqual(1);
    const ids = results.map((p) => p.id);
    expect(ids).toContain(100);
    expect(ids).toContain(101);
  });

  // ── shape 2: wrapped {items, total} — the regression case ────────────────

  it('returns enriched results when getProductsByVectorSearch returns {items, total}', async () => {
    // This was the broken shape — the old flat cast made .map() throw.
    getProductsByVectorSearch.mockResolvedValue({ items: [{ id: 100 }, { id: 101 }], total: 2 });
    searchProduct.mockResolvedValue([]);
    getProducts.mockResolvedValue({
      total: 2,
      items: [makeRawCatalog(100), makeRawCatalog(101)],
    });

    const { searchProducts } = await import('./products');
    const results = await searchProducts('grey t-shirt', { limit: 12 }) as Array<{ id: number }>;

    expect(results.length).toBeGreaterThanOrEqual(1);
    const ids = results.map((p) => p.id);
    expect(ids).toContain(100);
    expect(ids).toContain(101);
  });

  // ── merge order: vector first, then quick, deduped ────────────────────────

  it('places vector ids before quick ids in the merged output, deduping overlaps', async () => {
    // vector: [200, 201]; quick: [201, 202] — 201 is in both.
    // Expected order: 200, 201, 202 (vector-first, 201 deduped, 202 appended).
    getProductsByVectorSearch.mockResolvedValue({ items: [{ id: 200 }, { id: 201 }], total: 2 });
    searchProduct.mockResolvedValue([{ id: 201 }, { id: 202 }]);
    getProducts.mockResolvedValue({
      total: 3,
      items: [makeRawCatalog(200), makeRawCatalog(201), makeRawCatalog(202)],
    });

    const { searchProducts } = await import('./products');
    const results = await searchProducts('grey t-shirt', { limit: 12 }) as Array<{ id: number }>;

    const ids = results.map((p) => p.id);
    // 200 must appear before 201, and 201 before 202.
    expect(ids.indexOf(200)).toBeLessThan(ids.indexOf(201));
    expect(ids.indexOf(201)).toBeLessThan(ids.indexOf(202));
    // 201 must appear exactly once (deduped).
    expect(ids.filter((id) => id === 201)).toHaveLength(1);
  });

  // ── quick path still works when vector path returns nothing ───────────────

  it('falls back to quick results only when vector search returns empty', async () => {
    getProductsByVectorSearch.mockResolvedValue({ items: [], total: 0 });
    searchProduct.mockResolvedValue([{ id: 300 }]);
    getProducts.mockResolvedValue({
      total: 1,
      items: [makeRawCatalog(300)],
    });

    const { searchProducts } = await import('./products');
    const results = await searchProducts('grey t-shirt', { limit: 12 }) as Array<{ id: number }>;

    const ids = results.map((p) => p.id);
    expect(ids).toContain(300);
  });

  // ── short query guard (< 2 chars) ─────────────────────────────────────────

  it('returns [] immediately for a single-character query without calling the SDK', async () => {
    const { searchProducts } = await import('./products');
    const results = await searchProducts('g', { limit: 12 });
    expect(results).toEqual([]);
    expect(getProductsByVectorSearch).not.toHaveBeenCalled();
    expect(searchProduct).not.toHaveBeenCalled();
  });
});

// ─── normalize — stringValue numeric-attribute fix ───────────────────────────
//
// OE markers with `type: 'float'` or `type: 'integer'` ship `value` as a raw
// JS number, not a string. The old `stringValue()` helper only handled strings
// and arrays — numeric values silently returned `''`, so:
//   • `price_14` fell back to the missing `raw.price` → price: 0
//   • `stockqty_12` / `units_11` read as 0 regardless of the real inventory
//
// Fix: a `typeof attr.value === 'number' && Number.isFinite(attr.value)` branch
// now returns `String(attr.value)` before the array check.
// Exercised through `loadProducts` since `normalize` is not exported.
describe('normalize — stringValue numeric-attribute fix (via loadProducts)', () => {
  beforeEach(() => {
    vi.resetModules();
    vi.doMock('../index', () => ({
      oneentry: fakeApi,
      isOneEntryEnabled: true,
      getApi: () => fakeApi,
      isError: (v: unknown) =>
        !!v && typeof v === 'object' && 'statusCode' in (v as Record<string, unknown>),
    }));
    vi.doMock('next/cache', () => ({
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      unstable_cache: (fn: any) => fn,
    }));
    getProducts.mockReset();
  });

  const makeRawNumericProduct = (
    id: number,
    attrOverrides: Record<string, { type?: string; value: unknown }>,
    topLevelPrice = 0,
  ) => ({
    id,
    statusIdentifier: 'in_stock',
    price: topLevelPrice,  // top-level fallback; numeric attr should win
    categories: [],
    localizeInfos: { en_US: { title: `P${id}` } },
    attributeValues: { en_US: attrOverrides },
  });

  it('reads price_14 when value is a numeric float (primary regression)', async () => {
    // OE ships `{ type: 'float', value: 199 }` — previously stringValue() returned
    // '' for this, price fell back to raw.price (0). Now it returns '199'.
    getProducts.mockResolvedValue({
      total: 1,
      items: [makeRawNumericProduct(6001, { price_14: { type: 'float', value: 199 } })],
    });
    const { loadProducts } = await import('./products');
    const result = await loadProducts({ unique: false });
    expect((result.items[0] as { price: number }).price).toBe(199);
  });

  it('reads stockqty=3 as stock=3 when value is an integer (ignores units)', async () => {
    // Regression guard: stockqty is the ONLY inventory source. Even when
    // OE also ships a `units_N` reading, it must be ignored.
    getProducts.mockResolvedValue({
      total: 1,
      items: [makeRawNumericProduct(6002, {
        stockqty_12: { type: 'integer', value: 3 },
        units_11:    { type: 'integer', value: 2 },
      })],
    });
    const { loadProducts } = await import('./products');
    const result = await loadProducts({ unique: false });
    expect((result.items[0] as { stock: number }).stock).toBe(3);
  });

  it('returns stock=0 when only units_11 is present (units is intentionally ignored)', async () => {
    getProducts.mockResolvedValue({
      total: 1,
      items: [makeRawNumericProduct(6003, {
        units_11: { type: 'integer', value: 5 },
      })],
    });
    const { loadProducts } = await import('./products');
    const result = await loadProducts({ unique: false });
    expect((result.items[0] as { stock: number }).stock).toBe(0);
  });

  it('still parses price_14 when value is a string (backward compat)', async () => {
    // Tenants that stored value as a string should continue to work.
    getProducts.mockResolvedValue({
      total: 1,
      items: [makeRawNumericProduct(6004, { price_14: { value: '75' } })],
    });
    const { loadProducts } = await import('./products');
    const result = await loadProducts({ unique: false });
    expect((result.items[0] as { price: number }).price).toBe(75);
  });

  it('treats NaN numeric value as unset — price falls back to raw.price', async () => {
    // Number.isFinite(NaN) is false → stringValue returns '' → priceRaw is ''
    // → price falls back to asNumber(raw.price) = asNumber(99) = 99.
    getProducts.mockResolvedValue({
      total: 1,
      items: [makeRawNumericProduct(6005, { price_14: { type: 'float', value: NaN } }, 99)],
    });
    const { loadProducts } = await import('./products');
    const result = await loadProducts({ unique: false });
    expect((result.items[0] as { price: number }).price).toBe(99);
  });

  it('treats Infinity numeric value as unset — price falls back to raw.price', async () => {
    // Number.isFinite(Infinity) is false → same fallback path as NaN.
    getProducts.mockResolvedValue({
      total: 1,
      items: [makeRawNumericProduct(6006, { price_14: { type: 'float', value: Infinity } }, 55)],
    });
    const { loadProducts } = await import('./products');
    const result = await loadProducts({ unique: false });
    expect((result.items[0] as { price: number }).price).toBe(55);
  });
});
