/**
 * Unit tests for the `finalTotal` derivation in CartPage.tsx (line 178-179):
 *
 *   const bonusBurned = (preview?.bonusApplied ?? 0) > 0;
 *   const finalTotal = personalDiscount > 0 || couponDiscount > 0 || bonusBurned ? totalDue : total;
 *
 * OE's `totalDue` is used when OE applied a discount (loyalty tier, coupon)
 * OR when the shopper burned bonus points. Otherwise the client-side `total`
 * is authoritative because the sale price is already baked into `item.price`.
 *
 * Tested as a pure function — no React / Next.js runtime required.
 */
import { describe, it, expect } from 'vitest';

interface FinalTotalInput {
  personalDiscount: number;
  couponDiscount: number;
  bonusApplied: number;
  totalDue: number;
  total: number;
}

/** Mirrors the exact derivation in CartPage.tsx lines 178-179. */
function deriveFinalTotal({
  personalDiscount,
  couponDiscount,
  bonusApplied,
  totalDue,
  total,
}: FinalTotalInput): number {
  const bonusBurned = bonusApplied > 0;
  return personalDiscount > 0 || couponDiscount > 0 || bonusBurned ? totalDue : total;
}

describe('deriveFinalTotal (CartPage)', () => {
  // Case 1 — no OE discount at all: use the client-side total.
  it('uses client total when neither personalDiscount nor couponDiscount is set', () => {
    expect(
      deriveFinalTotal({ personalDiscount: 0, couponDiscount: 0, bonusApplied: 0, totalDue: 95, total: 100 }),
    ).toBe(100);
  });

  // Case 2 — only personalDiscount (loyalty tier): OE's totalDue wins.
  it('uses totalDue when personalDiscount > 0 and couponDiscount is zero', () => {
    expect(
      deriveFinalTotal({ personalDiscount: 10, couponDiscount: 0, bonusApplied: 0, totalDue: 90, total: 100 }),
    ).toBe(90);
  });

  // Case 3 — only couponDiscount: OE's totalDue wins.
  it('uses totalDue when couponDiscount > 0 and personalDiscount is zero', () => {
    expect(
      deriveFinalTotal({ personalDiscount: 0, couponDiscount: 5, bonusApplied: 0, totalDue: 95, total: 100 }),
    ).toBe(95);
  });

  // Case 4 — both discounts present: OE's totalDue wins (coupon stacks with loyalty).
  it('uses totalDue when both discounts are positive', () => {
    expect(
      deriveFinalTotal({ personalDiscount: 10, couponDiscount: 5, bonusApplied: 0, totalDue: 85, total: 100 }),
    ).toBe(85);
  });

  // Case 5 — bonus burned, no other discounts: OE's totalDue wins.
  it('uses totalDue when bonusApplied > 0 and no other discounts (regression)', () => {
    expect(
      deriveFinalTotal({ personalDiscount: 0, couponDiscount: 0, bonusApplied: 100, totalDue: 50, total: 150 }),
    ).toBe(50);
  });

  // Case 6 — everything zero: client total wins.
  it('uses client total when everything is zero', () => {
    expect(
      deriveFinalTotal({ personalDiscount: 0, couponDiscount: 0, bonusApplied: 0, totalDue: 0, total: 0 }),
    ).toBe(0);
  });

  // Case 7 — bonus burned and loyalty discount both active: OE's totalDue wins.
  it('uses totalDue when bonusApplied > 0 and personalDiscount > 0', () => {
    expect(
      deriveFinalTotal({ personalDiscount: 10, couponDiscount: 0, bonusApplied: 50, totalDue: 40, total: 100 }),
    ).toBe(40);
  });
});
