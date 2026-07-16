/**
 * Unit tests for the `finalTotal` derivation in PaymentPage.tsx (line 102):
 *
 *   const finalTotal = activePreview ? activeTotalDue : total;
 *
 * Hotfix: previous shape only surfaced OE's totalDue when at least one discount
 * flag was set, so when OE quoted *higher* than the client optimistic sale price
 * (e.g. Discount rule required a user-group the shopper lacks) `finalTotal`
 * collapsed to the client `total`, and the CTA + confirmation snapshot showed
 * the wrong (lower) amount while the warning banner correctly said $35.
 *
 * New shape: trust OE unconditionally whenever a preview is available.
 *
 * Tested as a pure function — no React / Next.js runtime required.
 */
import { describe, it, expect } from 'vitest';

interface ActivePreview {
  totalDue: number;
}

/** Mirrors the exact derivation in PaymentPage.tsx line 102. */
function deriveFinalTotal(
  activePreview: ActivePreview | null,
  total: number,
): number {
  // activeTotalDue mirrors: activePreview?.totalDue ?? total
  const activeTotalDue = activePreview?.totalDue ?? total;
  return activePreview ? activeTotalDue : total;
}

describe('deriveFinalTotal (PaymentPage hotfix)', () => {
  // Case 1 — no preview: fall back to client total.
  it('returns client total when activePreview is null', () => {
    expect(deriveFinalTotal(null, 31.5)).toBe(31.5);
  });

  // Case 2 — OE quotes higher than client sale price (the regression).
  // Catalog overlay baked in $31.5 but OE's Discount rule didn't apply,
  // so OE returns totalDue=35. finalTotal must be 35, not 31.5.
  it('returns OE totalDue when OE quotes higher than client optimistic total', () => {
    expect(deriveFinalTotal({ totalDue: 35 }, 31.5)).toBe(35);
  });

  // Case 3 — OE applied a real discount: totalDue is lower than client total.
  it('returns OE totalDue when OE applied a discount (totalDue < total)', () => {
    expect(deriveFinalTotal({ totalDue: 27 }, 31.5)).toBe(27);
  });
});
