/**
 * Unit tests for `canReviewProduct`.
 *
 * The function is a pure helper — no SDK, no network, no Next.js runtime
 * involved, so no mocks are required.
 *
 * Inline type alias mirrors only the fields `canReviewProduct` actually reads
 * (`statusIdentifier`, `products[].id`) so we avoid importing the full
 * `OeOrder` interface from the server-action module.
 */

import { describe, expect, it } from 'vitest';
import { canReviewProduct } from './review-eligibility';

// ── Minimal inline shape ──────────────────────────────────────────────────────

type MinOrder = {
  statusIdentifier: string;
  products: { id: number }[];
};

/** Cast a MinOrder array to the param type expected by canReviewProduct. */
// eslint-disable-next-line @typescript-eslint/no-explicit-any
const asOrders = (orders: MinOrder[]) => orders as any;

// ── Fixtures ──────────────────────────────────────────────────────────────────

const PRODUCT_ID = 42;

const deliveredOrder = (statusIdentifier: string, productIds: number[] = [PRODUCT_ID]): MinOrder => ({
  statusIdentifier,
  products: productIds.map((id) => ({ id })),
});

// ── Tests ─────────────────────────────────────────────────────────────────────

describe('canReviewProduct', () => {
  // ── 1. Empty / absent orders ───────────────────────────────────────────────

  describe('returns false for absent or empty orders', () => {
    it('returns false for undefined orders', () => {
      expect(canReviewProduct(undefined, PRODUCT_ID)).toBe(false);
    });

    it('returns false for null orders', () => {
      expect(canReviewProduct(null, PRODUCT_ID)).toBe(false);
    });

    it('returns false for an empty array', () => {
      expect(canReviewProduct([], PRODUCT_ID)).toBe(false);
    });
  });

  // ── 2. Invalid productId ───────────────────────────────────────────────────

  describe('returns false for invalid productId', () => {
    const orders = asOrders([deliveredOrder('done')]);

    it('returns false for productId 0', () => {
      expect(canReviewProduct(orders, 0)).toBe(false);
    });

    it('returns false for a negative productId', () => {
      expect(canReviewProduct(orders, -1)).toBe(false);
    });

    it('returns false for NaN', () => {
      expect(canReviewProduct(orders, NaN)).toBe(false);
    });

    it('returns false for Infinity', () => {
      expect(canReviewProduct(orders, Infinity)).toBe(false);
    });
  });

  // ── 3-5. Delivered / terminal statuses ────────────────────────────────────

  describe('returns true for delivered / terminal statusIdentifiers', () => {
    const cases: string[] = [
      'home_done',
      'pickup_delivered',
      'received',
      'completed',
      'closed',
      'finish',
      'arrived',
      // Mixed-case variants — regex is case-insensitive
      'DONE',
      'Delivered',
      'Complete',
      'FINISHED',
    ];

    for (const status of cases) {
      it(`returns true for statusIdentifier: '${status}'`, () => {
        const orders = asOrders([deliveredOrder(status)]);
        expect(canReviewProduct(orders, PRODUCT_ID)).toBe(true);
      });
    }
  });

  // ── 6. Non-terminal statuses ───────────────────────────────────────────────

  describe('returns false for non-terminal statusIdentifiers even when product is present', () => {
    const cases: string[] = [
      'processing',
      'shipped',
      'cancelled',
      'refunded',
      '',
    ];

    for (const status of cases) {
      it(`returns false for statusIdentifier: '${JSON.stringify(status)}'`, () => {
        const orders = asOrders([deliveredOrder(status)]);
        expect(canReviewProduct(orders, PRODUCT_ID)).toBe(false);
      });
    }
  });

  // ── 7. Delivered order WITHOUT the queried product ─────────────────────────

  it('returns false when the delivered order does not include the product', () => {
    const orders = asOrders([deliveredOrder('done', [99, 100])]);
    expect(canReviewProduct(orders, PRODUCT_ID)).toBe(false);
  });

  // ── 8. At least one qualifying order among many ────────────────────────────

  it('returns true when only one of several orders is delivered and contains the product', () => {
    const orders = asOrders([
      deliveredOrder('processing'),               // wrong status, right product
      deliveredOrder('done', [999]),              // right status, wrong product
      deliveredOrder('cancelled'),                // wrong status, right product
      deliveredOrder('pickup_delivered'),         // right status, right product
    ]);
    expect(canReviewProduct(orders, PRODUCT_ID)).toBe(true);
  });

  it('returns false when no order is both delivered and contains the product', () => {
    const orders = asOrders([
      deliveredOrder('processing'),               // wrong status, right product
      deliveredOrder('done', [999]),              // right status, wrong product
    ]);
    expect(canReviewProduct(orders, PRODUCT_ID)).toBe(false);
  });
});
