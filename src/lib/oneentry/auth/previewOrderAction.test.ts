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

// `isError` in the real module checks for `statusCode` on the response object.
// We replicate that so the action's `if (isError(result))` branch fires.
const isErrorMock = (v: unknown): v is { message?: string; statusCode?: number } =>
  !!v && typeof v === 'object' && 'statusCode' in (v as Record<string, unknown>);

vi.mock('../index', () => ({
  isOneEntryEnabled: true,
  isError: (v: unknown) => isErrorMock(v),
  getUserApi: () => ({
    Orders: { previewOrder: previewOrderMock },
  }),
  getGuestApi: () => null,
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
