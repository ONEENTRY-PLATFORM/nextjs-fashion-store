import { beforeEach, describe, expect, it, vi } from 'vitest';

// ---- SDK mock ----------------------------------------------------------------
const getDiscountByMarker = vi.fn();
const fakeApi = {
  Discounts: { getDiscountByMarker },
};

vi.mock('../index', () => ({
  oneentry: fakeApi,
  isOneEntryEnabled: true,
  getApi: () => fakeApi,
  isError: (v: unknown) =>
    !!v && typeof v === 'object' && 'statusCode' in (v as Record<string, unknown>),
}));

// unstable_cache: call the wrapped function directly so caching is transparent.
vi.mock('next/cache', () => ({
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  unstable_cache: (fn: any) => fn,
}));

// isr constants — value doesn't matter in unit tests.
vi.mock('../../isr', () => ({ REVALIDATE_CATALOG: 300 }));

// ---- helpers -----------------------------------------------------------------
const importFresh = async () => {
  vi.resetModules();
  return import('./purchase-bonus');
};

/** Build a minimal CatalogProduct stub. */
const makeProduct = (
  overrides: Partial<{ id: number; price: number; categories: string[] }> = {},
) => ({
  id: 1,
  price: 100,
  categories: [] as string[],
  ...overrides,
});

/** Build a minimal discount rule stub. */
const makeRule = (
  overrides: Partial<{
    startDate: string;
    endDate: string;
    discountValue: Record<string, unknown>;
    conditions: unknown[];
  }> = {},
) => ({
  discountValue: { discountType: 'PERCENT', value: 5 },
  ...overrides,
});

const PAST = new Date(Date.now() - 86_400_000).toISOString();
const FUTURE = new Date(Date.now() + 86_400_000).toISOString();

beforeEach(() => {
  getDiscountByMarker.mockReset();
});

// ---- tests -------------------------------------------------------------------

describe('loadPurchaseBonusForProduct — null cases', () => {
  it('returns null when the SDK returns nothing (empty response)', async () => {
    getDiscountByMarker.mockResolvedValue(null);
    const { loadPurchaseBonusForProduct } = await importFresh();
    expect(await loadPurchaseBonusForProduct(makeProduct())).toBeNull();
  });

  it('returns null when the SDK returns an IError', async () => {
    getDiscountByMarker.mockResolvedValue({ statusCode: 404, message: 'Not found' });
    const { loadPurchaseBonusForProduct } = await importFresh();
    expect(await loadPurchaseBonusForProduct(makeProduct())).toBeNull();
  });

  it('returns null when startDate is in the future (rule not yet active)', async () => {
    getDiscountByMarker.mockResolvedValue(makeRule({ startDate: FUTURE }));
    const { loadPurchaseBonusForProduct } = await importFresh();
    expect(await loadPurchaseBonusForProduct(makeProduct())).toBeNull();
  });

  it('returns null when endDate is in the past (rule expired)', async () => {
    getDiscountByMarker.mockResolvedValue(makeRule({ endDate: PAST }));
    const { loadPurchaseBonusForProduct } = await importFresh();
    expect(await loadPurchaseBonusForProduct(makeProduct())).toBeNull();
  });

  it('returns null when discountValue.value is 0', async () => {
    getDiscountByMarker.mockResolvedValue(
      makeRule({ discountValue: { discountType: 'PERCENT', value: 0 } }),
    );
    const { loadPurchaseBonusForProduct } = await importFresh();
    expect(await loadPurchaseBonusForProduct(makeProduct({ price: 200 }))).toBeNull();
  });

  it('returns null when discountValue.value is negative', async () => {
    getDiscountByMarker.mockResolvedValue(
      makeRule({ discountValue: { discountType: 'PERCENT', value: -5 } }),
    );
    const { loadPurchaseBonusForProduct } = await importFresh();
    expect(await loadPurchaseBonusForProduct(makeProduct({ price: 200 }))).toBeNull();
  });
});

describe('loadPurchaseBonusForProduct — point calculation', () => {
  it('PERCENT rule: rounds(price * value / 100) — 5% on 126 → 6', async () => {
    getDiscountByMarker.mockResolvedValue(
      makeRule({ discountValue: { discountType: 'PERCENT', value: 5 } }),
    );
    const { loadPurchaseBonusForProduct } = await importFresh();
    expect(await loadPurchaseBonusForProduct(makeProduct({ price: 126 }))).toEqual({ points: 6 });
  });

  it('PERCENTAGE alias is treated identically to PERCENT', async () => {
    getDiscountByMarker.mockResolvedValue(
      makeRule({ discountValue: { discountType: 'PERCENTAGE', value: 10 } }),
    );
    const { loadPurchaseBonusForProduct } = await importFresh();
    expect(await loadPurchaseBonusForProduct(makeProduct({ price: 55 }))).toEqual({ points: 6 });
  });

  it('FIXED_AMOUNT rule: returns rounded fixed value as points', async () => {
    getDiscountByMarker.mockResolvedValue(
      makeRule({ discountValue: { discountType: 'FIXED_AMOUNT', value: 25.7 } }),
    );
    const { loadPurchaseBonusForProduct } = await importFresh();
    expect(await loadPurchaseBonusForProduct(makeProduct())).toEqual({ points: 26 });
  });

  it('returns null when computed points round to 0 (e.g. 0.1% on price 1)', async () => {
    getDiscountByMarker.mockResolvedValue(
      makeRule({ discountValue: { discountType: 'PERCENT', value: 0.1 } }),
    );
    const { loadPurchaseBonusForProduct } = await importFresh();
    // Math.round(1 * 0.1 / 100) = Math.round(0.001) = 0 → null
    expect(await loadPurchaseBonusForProduct(makeProduct({ price: 1 }))).toBeNull();
  });
});

describe('loadPurchaseBonusForProduct — PRODUCT condition', () => {
  it('matches when product id is a scalar in the condition value', async () => {
    getDiscountByMarker.mockResolvedValue(
      makeRule({
        conditions: [{ type: 'PRODUCT', value: 42 }],
      }),
    );
    const { loadPurchaseBonusForProduct } = await importFresh();
    const result = await loadPurchaseBonusForProduct(makeProduct({ id: 42, price: 100 }));
    expect(result).toEqual({ points: 5 });
  });

  it('matches when product id appears in an array condition value', async () => {
    getDiscountByMarker.mockResolvedValue(
      makeRule({
        conditions: [{ type: 'PRODUCT', value: [10, 42, 99] }],
      }),
    );
    const { loadPurchaseBonusForProduct } = await importFresh();
    expect(await loadPurchaseBonusForProduct(makeProduct({ id: 42, price: 100 }))).toEqual({ points: 5 });
  });

  it('matches when product id is inside {ids:[...]} shape', async () => {
    getDiscountByMarker.mockResolvedValue(
      makeRule({
        conditions: [{ conditionType: 'PRODUCT', value: { ids: [7, 42] } }],
      }),
    );
    const { loadPurchaseBonusForProduct } = await importFresh();
    expect(await loadPurchaseBonusForProduct(makeProduct({ id: 42, price: 100 }))).toEqual({ points: 5 });
  });

  it('matches when product id is inside {id: N} shape', async () => {
    getDiscountByMarker.mockResolvedValue(
      makeRule({
        conditions: [{ type: 'PRODUCT', value: { id: 42 } }],
      }),
    );
    const { loadPurchaseBonusForProduct } = await importFresh();
    expect(await loadPurchaseBonusForProduct(makeProduct({ id: 42, price: 100 }))).toEqual({ points: 5 });
  });

  it('returns null when product id is NOT in the condition', async () => {
    getDiscountByMarker.mockResolvedValue(
      makeRule({
        conditions: [{ type: 'PRODUCT', value: [10, 99] }],
      }),
    );
    const { loadPurchaseBonusForProduct } = await importFresh();
    expect(await loadPurchaseBonusForProduct(makeProduct({ id: 42 }))).toBeNull();
  });
});

describe('loadPurchaseBonusForProduct — CATEGORY condition', () => {
  it('matches when needle equals a full category path', async () => {
    getDiscountByMarker.mockResolvedValue(
      makeRule({
        conditions: [{ type: 'CATEGORY', value: '/women/dresses' }],
      }),
    );
    const { loadPurchaseBonusForProduct } = await importFresh();
    const product = makeProduct({ price: 100, categories: ['/women/dresses'] });
    expect(await loadPurchaseBonusForProduct(product)).toEqual({ points: 5 });
  });

  it('matches when needle is a path segment of a category', async () => {
    getDiscountByMarker.mockResolvedValue(
      makeRule({
        conditions: [{ type: 'CATEGORY', value: 'dresses' }],
      }),
    );
    const { loadPurchaseBonusForProduct } = await importFresh();
    const product = makeProduct({ price: 100, categories: ['/women/dresses'] });
    expect(await loadPurchaseBonusForProduct(product)).toEqual({ points: 5 });
  });

  it('matches via {ids:[...]} shape for categories', async () => {
    getDiscountByMarker.mockResolvedValue(
      makeRule({
        conditions: [{ type: 'CATEGORY', value: { ids: ['dresses', 'tops'] } }],
      }),
    );
    const { loadPurchaseBonusForProduct } = await importFresh();
    const product = makeProduct({ price: 100, categories: ['/women/dresses'] });
    expect(await loadPurchaseBonusForProduct(product)).toEqual({ points: 5 });
  });

  it('returns null when no category needle matches any product category', async () => {
    getDiscountByMarker.mockResolvedValue(
      makeRule({
        conditions: [{ type: 'CATEGORY', value: 'jackets' }],
      }),
    );
    const { loadPurchaseBonusForProduct } = await importFresh();
    const product = makeProduct({ price: 100, categories: ['/women/dresses'] });
    expect(await loadPurchaseBonusForProduct(product)).toBeNull();
  });
});

describe('loadPurchaseBonusForProduct — cart-scoped-only conditions', () => {
  it('returns points when only non-product/category conditions are present (e.g. MIN_CART_AMOUNT)', async () => {
    // MIN_CART_AMOUNT is cart-scoped and should not gate PDP badge.
    getDiscountByMarker.mockResolvedValue(
      makeRule({
        conditions: [{ type: 'MIN_CART_AMOUNT', value: 500 }],
      }),
    );
    const { loadPurchaseBonusForProduct } = await importFresh();
    expect(await loadPurchaseBonusForProduct(makeProduct({ price: 126 }))).toEqual({ points: 6 });
  });

  it('returns points when USER_LTV condition is present alongside no product/category gate', async () => {
    getDiscountByMarker.mockResolvedValue(
      makeRule({
        conditions: [{ type: 'USER_LTV', value: 1000 }],
      }),
    );
    const { loadPurchaseBonusForProduct } = await importFresh();
    expect(await loadPurchaseBonusForProduct(makeProduct({ price: 200 }))).toEqual({ points: 10 });
  });
});

describe('loadPurchaseBonusForProduct — mixed PRODUCT + CATEGORY conditions', () => {
  it('returns points when PRODUCT condition matches even if CATEGORY does not', async () => {
    getDiscountByMarker.mockResolvedValue(
      makeRule({
        conditions: [
          { type: 'PRODUCT', value: 42 },
          { type: 'CATEGORY', value: 'jackets' },
        ],
      }),
    );
    const { loadPurchaseBonusForProduct } = await importFresh();
    // product id matches → should succeed regardless of category mismatch
    const product = makeProduct({ id: 42, price: 100, categories: ['/women/dresses'] });
    expect(await loadPurchaseBonusForProduct(product)).toEqual({ points: 5 });
  });

  it('returns null when both PRODUCT and CATEGORY conditions are present and neither matches', async () => {
    getDiscountByMarker.mockResolvedValue(
      makeRule({
        conditions: [
          { type: 'PRODUCT', value: 99 },
          { type: 'CATEGORY', value: 'jackets' },
        ],
      }),
    );
    const { loadPurchaseBonusForProduct } = await importFresh();
    const product = makeProduct({ id: 42, price: 100, categories: ['/women/dresses'] });
    expect(await loadPurchaseBonusForProduct(product)).toBeNull();
  });
});
