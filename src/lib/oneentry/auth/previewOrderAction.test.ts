/**
 * Unit tests for the missing-product-id extraction inside `previewOrderAction`.
 *
 * The action wraps the OE SDK's `Orders.previewOrder`. When OE returns an
 * IError whose `.message` contains `"Product <id> not found"`, the action must
 * parse every matching id out and return them as `missingProductIds: number[]`.
 *
 * Mocking strategy mirrors `google-oauth.test.ts`: stub `../index` (the OE SDK
 * facade) and `next/headers` so no network or cookie runtime is needed.
 */

import { beforeEach, describe, expect, it, vi } from 'vitest';

// ── OE SDK mock ──────────────────────────────────────────────────────────────

const previewOrderMock = vi.fn();
const getDiscountByMarkerMock = vi.fn();

// `isError` in the real module checks for `statusCode` on the response object.
// We replicate that so the action's `if (isError(result))` branch fires.
const isErrorMock = (v: unknown): v is { message?: string; statusCode?: number } =>
  !!v && typeof v === 'object' && 'statusCode' in (v as Record<string, unknown>);

// Stubs for the nested calls inside fetchMe / fetchLoyalty / fetchUserOrders
// that fire when discountAmount === 0 && totalSum > 0 && access.
const stubUserApi = () => ({
  Orders: {
    previewOrder: previewOrderMock,
    getAllOrdersByMarker: vi.fn(async () => ({ items: [], total: 0 })),
  },
  Discounts: {
    getDiscountByMarker: getDiscountByMarkerMock,
    getBonusBalance: vi.fn(async () => ({ balance: 0 })),
  },
  Users: {
    getUser: vi.fn(async () => ({ statusCode: 401, message: 'no user' })),
    getCart: vi.fn(async () => ({ statusCode: 401 })),
    getWishlist: vi.fn(async () => ({ statusCode: 401 })),
    updateUser: vi.fn(async () => ({ statusCode: 401 })),
    setCart: vi.fn(async () => ({ statusCode: 401 })),
    setWishlist: vi.fn(async () => ({ statusCode: 401 })),
  },
  FormData: {
    getFormsDataByMarker: vi.fn(async () => ({ items: [], total: 0 })),
    postFormsData: vi.fn(async () => ({ statusCode: 401 })),
    updateFormsDataByid: vi.fn(async () => ({ statusCode: 401 })),
    deleteFormsDataByid: vi.fn(async () => ({ statusCode: 401 })),
  },
});

vi.mock('../index', () => ({
  isOneEntryEnabled: true,
  isError: (v: unknown) => isErrorMock(v),
  getUserApi: () => stubUserApi(),
  getGuestApi: () => null,
  // `oneentry` is the app-token singleton used for Discounts.getDiscountByMarker
  // in the gift-only detection path.
  oneentry: {
    Discounts: { getDiscountByMarker: getDiscountByMarkerMock },
  },
}));

// ── next/headers cookies() mock ───────────────────────────────────────────────

const cookieStore: Map<string, string> = new Map();
vi.mock('next/headers', () => ({
  cookies: async () => ({
    get: (name: string) => {
      const v = cookieStore.get(name);
      return v === undefined ? undefined : { value: v };
    },
    set: vi.fn(),
    delete: vi.fn(),
  }),
}));

// ── catalog/products (pulled in by the module) ────────────────────────────────

vi.mock('../catalog/products', () => ({
  loadProductsByIds: vi.fn(async () => []),
}));

// ── helper ────────────────────────────────────────────────────────────────────

/** Minimal valid input for previewOrderAction */
const baseInput = {
  products: [{ productId: 9171, qty: 1 }],
  currency: 'USD',
};

// ── tests ─────────────────────────────────────────────────────────────────────

describe('previewOrderAction — missingProductIds extraction', () => {
  beforeEach(() => {
    previewOrderMock.mockReset();
    getDiscountByMarkerMock.mockReset();
    cookieStore.clear();
    // Provide a valid access token so `getUserApi` path is taken.
    cookieStore.set('oe_access', 'fake-access-token');
  });

  it('returns missingProductIds: [] for non-product-missing IError messages', async () => {
    previewOrderMock.mockResolvedValue({
      statusCode: 400,
      message: 'Coupon not applicable',
    });
    const { previewOrderAction } = await import('./actions');
    const res = await previewOrderAction(baseInput);
    expect(res.ok).toBe(false);
    if (res.ok) return;
    expect(res.missingProductIds).toEqual([]);
    expect(res.error).toBe('Coupon not applicable');
  });

  it('extracts a single product id from "Product 9171 not found"', async () => {
    previewOrderMock.mockResolvedValue({
      statusCode: 404,
      message: 'Product 9171 not found',
    });
    const { previewOrderAction } = await import('./actions');
    const res = await previewOrderAction(baseInput);
    expect(res.ok).toBe(false);
    if (res.ok) return;
    expect(res.missingProductIds).toEqual([9171]);
  });

  it('is case-insensitive — accepts "product 42 Not Found"', async () => {
    previewOrderMock.mockResolvedValue({
      statusCode: 404,
      message: 'product 42 Not Found',
    });
    const { previewOrderAction } = await import('./actions');
    const res = await previewOrderAction(baseInput);
    expect(res.ok).toBe(false);
    if (res.ok) return;
    expect(res.missingProductIds).toEqual([42]);
  });

  it('extracts multiple product ids when they appear in a single message', async () => {
    previewOrderMock.mockResolvedValue({
      statusCode: 404,
      // Hypothetical future format listing several ids in one string
      message: 'Product 100 not found; Product 200 not found; product 300 not found',
    });
    const { previewOrderAction } = await import('./actions');
    const res = await previewOrderAction(baseInput);
    expect(res.ok).toBe(false);
    if (res.ok) return;
    expect(res.missingProductIds).toEqual([100, 200, 300]);
  });

  it('returns missingProductIds: [] when OE message is undefined', async () => {
    previewOrderMock.mockResolvedValue({ statusCode: 500 }); // no .message
    const { previewOrderAction } = await import('./actions');
    const res = await previewOrderAction(baseInput);
    expect(res.ok).toBe(false);
    if (res.ok) return;
    expect(res.missingProductIds).toEqual([]);
  });

  it('falls through to ok:true when previewOrder returns a non-error response', async () => {
    previewOrderMock.mockResolvedValue({
      totalSum: '150.00',
      totalSumWithDiscount: '135.00',
      bonusApplied: 0,
      totalDue: '135.00',
      currency: 'USD',
      discountConfig: {},
    });
    const { previewOrderAction } = await import('./actions');
    const res = await previewOrderAction(baseInput);
    expect(res.ok).toBe(true);
  });
});

// ── Helper: a minimal OE previewOrder success response ────────────────────────

function makePreviewResponse(overrides: Record<string, unknown> = {}) {
  return {
    totalSum: '100.00',
    totalSumWithDiscount: '100.00',
    bonusApplied: 0,
    totalDue: '100.00',
    currency: 'USD',
    discountConfig: {},
    orderPreview: [],
    ...overrides,
  };
}

// ── Tests: gift item parsing from orderPreview[] ──────────────────────────────

describe('previewOrderAction — giftItems parsing from orderPreview[]', () => {
  beforeEach(() => {
    previewOrderMock.mockReset();
    // Default: return an error so fetchLoyalty's `.filter(!isError)` drops it
    // and the tier-fallback code path stays inert (no TypeError on undefined).
    getDiscountByMarkerMock.mockResolvedValue({ statusCode: 404, message: 'not found' });
    cookieStore.clear();
    cookieStore.set('oe_access', 'fake-access-token');
  });

  it('returns giftItems: [] when orderPreview has no gift entries', async () => {
    previewOrderMock.mockResolvedValue(makePreviewResponse({
      orderPreview: [
        { id: 9171, quantity: 1, price: '50.00', isGift: false },
      ],
    }));
    const { previewOrderAction } = await import('./actions');
    const res = await previewOrderAction(baseInput);
    expect(res.ok).toBe(true);
    if (!res.ok) return;
    expect(res.giftItems).toEqual([]);
  });

  it('parses a single gift entry into giftItems', async () => {
    previewOrderMock.mockResolvedValue(makePreviewResponse({
      orderPreview: [
        { id: 9171, quantity: 1, price: '50.00', isGift: false },
        { id: 5555, quantity: 2, price: '29.99', isGift: true },
      ],
    }));
    const { previewOrderAction } = await import('./actions');
    const res = await previewOrderAction(baseInput);
    expect(res.ok).toBe(true);
    if (!res.ok) return;
    expect(res.giftItems).toEqual([
      { productId: 5555, quantity: 2, price: 29.99 },
    ]);
  });

  it('parses multiple gift entries, excludes non-gift rows', async () => {
    previewOrderMock.mockResolvedValue(makePreviewResponse({
      orderPreview: [
        { id: 1, quantity: 3, price: '10.00', isGift: false },
        { id: 2, quantity: 1, price: '0.00', isGift: true },
        { id: 3, quantity: 2, price: '15.50', isGift: true },
      ],
    }));
    const { previewOrderAction } = await import('./actions');
    const res = await previewOrderAction(baseInput);
    expect(res.ok).toBe(true);
    if (!res.ok) return;
    expect(res.giftItems).toHaveLength(2);
    expect(res.giftItems[0]).toMatchObject({ productId: 2, quantity: 1, price: 0 });
    expect(res.giftItems[1]).toMatchObject({ productId: 3, quantity: 2, price: 15.5 });
  });

  it('defaults quantity to 1 and price to 0 when fields are missing', async () => {
    previewOrderMock.mockResolvedValue(makePreviewResponse({
      orderPreview: [{ id: 7, isGift: true }],
    }));
    const { previewOrderAction } = await import('./actions');
    const res = await previewOrderAction(baseInput);
    expect(res.ok).toBe(true);
    if (!res.ok) return;
    expect(res.giftItems).toEqual([{ productId: 7, quantity: 1, price: 0 }]);
  });

  it('filters out gift entries with invalid/missing productId', async () => {
    previewOrderMock.mockResolvedValue(makePreviewResponse({
      orderPreview: [
        { id: 0, quantity: 1, price: '5.00', isGift: true },
        { quantity: 1, price: '5.00', isGift: true }, // no id
      ],
    }));
    const { previewOrderAction } = await import('./actions');
    const res = await previewOrderAction(baseInput);
    expect(res.ok).toBe(true);
    if (!res.ok) return;
    expect(res.giftItems).toEqual([]);
  });
});

// ── Tests: couponDiscountAmount — gift-only vs monetary coupons ───────────────

/** OE discount config shape returned by Discounts.getDiscountByMarker */
function makeDiscountCfg(overrides: {
  discountValue?: { value?: number | null } | null;
  gifts?: unknown[];
} = {}) {
  return {
    conditions: [],
    endDate: null,
    discountValue: { value: 10 },
    gifts: [],
    ...overrides,
  };
}

describe('previewOrderAction — couponDiscountAmount', () => {
  beforeEach(() => {
    previewOrderMock.mockReset();
    // Default: return an error so fetchLoyalty's `.filter(!isError)` drops it
    // and the tier-fallback code path stays inert (no TypeError on undefined).
    getDiscountByMarkerMock.mockResolvedValue({ statusCode: 404, message: 'not found' });
    cookieStore.clear();
    cookieStore.set('oe_access', 'fake-access-token');
  });

  it('sets couponDiscountAmount = 0 for a gift-only coupon (discountValue null, gifts non-empty)', async () => {
    // The coupon knocks off $0 in price — OE just appends a gift to orderPreview.
    // totalSum === totalSumWithDiscount so discountAmount = 0, but even if
    // a tier discount fires we must not attribute it to the coupon.
    previewOrderMock.mockResolvedValue(makePreviewResponse({
      totalSum: '100.00',
      totalSumWithDiscount: '100.00',
      discountConfig: {
        coupon: {
          code: 'GIFTME',
          valid: true,
          applied: true,
          discountIdentifier: 'gift_coupon',
        },
      },
      orderPreview: [
        { id: 9171, quantity: 1, price: '100.00', isGift: false },
        { id: 5555, quantity: 1, price: '30.00', isGift: true },
      ],
    }));
    // Simulate gift-only: no monetary value, has gifts
    getDiscountByMarkerMock.mockResolvedValue(
      makeDiscountCfg({ discountValue: null, gifts: [{ productId: 5555 }] }),
    );
    const { previewOrderAction } = await import('./actions');
    const res = await previewOrderAction({
      ...baseInput,
      couponCode: 'GIFTME',
    });
    expect(res.ok).toBe(true);
    if (!res.ok) return;
    expect(res.couponApplied).toBe(true);
    expect(res.couponDiscountAmount).toBe(0);
    expect(res.giftItems).toEqual([{ productId: 5555, quantity: 1, price: 30 }]);
  });

  it('sets couponDiscountAmount = 0 when discountValue.value is 0 and gifts non-empty', async () => {
    previewOrderMock.mockResolvedValue(makePreviewResponse({
      totalSum: '100.00',
      totalSumWithDiscount: '100.00',
      discountConfig: {
        coupon: {
          code: 'GIFTONLY',
          valid: true,
          applied: true,
          discountIdentifier: 'gift_only_zero',
        },
      },
      orderPreview: [],
    }));
    getDiscountByMarkerMock.mockResolvedValue(
      makeDiscountCfg({ discountValue: { value: 0 }, gifts: [{ productId: 999 }] }),
    );
    const { previewOrderAction } = await import('./actions');
    const res = await previewOrderAction({ ...baseInput, couponCode: 'GIFTONLY' });
    expect(res.ok).toBe(true);
    if (!res.ok) return;
    expect(res.couponDiscountAmount).toBe(0);
  });

  it('retains couponDiscountAmount = discountAmount for a monetary coupon', async () => {
    // 20% off coupon: $100 -> $80, discountAmount = $20
    previewOrderMock.mockResolvedValue(makePreviewResponse({
      totalSum: '100.00',
      totalSumWithDiscount: '80.00',
      totalDue: '80.00',
      discountConfig: {
        coupon: {
          code: 'SAVE20',
          valid: true,
          applied: true,
          discountIdentifier: 'monetary_coupon',
        },
      },
      orderPreview: [
        { id: 9171, quantity: 1, price: '100.00', isGift: false },
      ],
    }));
    // Monetary coupon: has discountValue.value > 0, no gifts
    getDiscountByMarkerMock.mockResolvedValue(
      makeDiscountCfg({ discountValue: { value: 20 }, gifts: [] }),
    );
    const { previewOrderAction } = await import('./actions');
    const res = await previewOrderAction({ ...baseInput, couponCode: 'SAVE20' });
    expect(res.ok).toBe(true);
    if (!res.ok) return;
    expect(res.couponApplied).toBe(true);
    expect(res.couponDiscountAmount).toBe(20);
    expect(res.giftItems).toEqual([]);
  });

  it('retains couponDiscountAmount for a coupon with both a discount value and gifts', async () => {
    // A "buy X get Y free" with a 10% price reduction — has both gifts and monetary value
    previewOrderMock.mockResolvedValue(makePreviewResponse({
      totalSum: '100.00',
      totalSumWithDiscount: '90.00',
      totalDue: '90.00',
      discountConfig: {
        coupon: {
          code: 'COMBO',
          valid: true,
          applied: true,
          discountIdentifier: 'combo_coupon',
        },
      },
      orderPreview: [
        { id: 9171, quantity: 1, price: '100.00', isGift: false },
        { id: 1234, quantity: 1, price: '0.00', isGift: true },
      ],
    }));
    // Has both monetary value AND gifts — not gift-only, so discount is attributed
    getDiscountByMarkerMock.mockResolvedValue(
      makeDiscountCfg({ discountValue: { value: 10 }, gifts: [{ productId: 1234 }] }),
    );
    const { previewOrderAction } = await import('./actions');
    const res = await previewOrderAction({ ...baseInput, couponCode: 'COMBO' });
    expect(res.ok).toBe(true);
    if (!res.ok) return;
    expect(res.couponDiscountAmount).toBe(10);
    expect(res.giftItems).toHaveLength(1);
  });
});
