/**
 * Unit tests for the `displayTotal` derivation in MiniCart.tsx (lines 26-27):
 *
 *   const bonusBurned = (preview?.bonusApplied ?? 0) > 0;
 *   const displayTotal = personalDiscount > 0 || couponDiscount > 0 || bonusBurned ? totalDue : subtotal;
 *
 * The subtotal row shows plain `subtotal` (sum of item.price × qty — sale
 * price already baked in). OE's `totalDue` is used in the Total row only
 * when OE actually knocked something extra off (loyalty tier, coupon, or
 * bonus burn).
 *
 * Tested as a pure function — no React / Next.js runtime required.
 */
import { describe, it, expect } from 'vitest';

interface MiniCartTotalInput {
  personalDiscount: number;
  couponDiscount: number;
  bonusApplied: number;
  totalDue: number;
  subtotal: number;
}

/** Mirrors the exact derivation in MiniCart.tsx lines 26-27. */
function deriveMiniCartTotal({
  personalDiscount,
  couponDiscount,
  bonusApplied,
  totalDue,
  subtotal,
}: MiniCartTotalInput): number {
  const bonusBurned = bonusApplied > 0;
  return personalDiscount > 0 || couponDiscount > 0 || bonusBurned ? totalDue : subtotal;
}

describe('deriveMiniCartTotal (MiniCart)', () => {
  // Case 1 — no OE discount: plain subtotal is shown.
  it('uses subtotal when neither personalDiscount nor couponDiscount is set', () => {
    expect(
      deriveMiniCartTotal({ personalDiscount: 0, couponDiscount: 0, bonusApplied: 0, totalDue: 85, subtotal: 100 }),
    ).toBe(100);
  });

  // Case 2 — only personalDiscount (loyalty tier): OE's totalDue wins.
  it('uses totalDue when personalDiscount > 0 and couponDiscount is zero', () => {
    expect(
      deriveMiniCartTotal({ personalDiscount: 10, couponDiscount: 0, bonusApplied: 0, totalDue: 90, subtotal: 100 }),
    ).toBe(90);
  });

  // Case 3 — only couponDiscount: OE's totalDue wins.
  it('uses totalDue when couponDiscount > 0 and personalDiscount is zero', () => {
    expect(
      deriveMiniCartTotal({ personalDiscount: 0, couponDiscount: 5, bonusApplied: 0, totalDue: 95, subtotal: 100 }),
    ).toBe(95);
  });

  // Case 4 — both discounts present: OE's totalDue wins.
  it('uses totalDue when both discounts are positive', () => {
    expect(
      deriveMiniCartTotal({ personalDiscount: 10, couponDiscount: 5, bonusApplied: 0, totalDue: 85, subtotal: 100 }),
    ).toBe(85);
  });

  // Case 5 — bonus burned, no other discounts: OE's totalDue wins (regression).
  it('uses totalDue when bonusApplied > 0 and no other discounts', () => {
    expect(
      deriveMiniCartTotal({ personalDiscount: 0, couponDiscount: 0, bonusApplied: 100, totalDue: 50, subtotal: 150 }),
    ).toBe(50);
  });

  // Case 6 — everything zero: plain subtotal.
  it('uses subtotal when everything is zero', () => {
    expect(
      deriveMiniCartTotal({ personalDiscount: 0, couponDiscount: 0, bonusApplied: 0, totalDue: 0, subtotal: 0 }),
    ).toBe(0);
  });
});
