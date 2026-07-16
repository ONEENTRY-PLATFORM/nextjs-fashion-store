/**
 * Unit tests for the `dynamicPrice` / `dynamicOriginalPrice` derivation
 * inside ProductDetailPage.tsx (lines 271-279).
 *
 * Verbatim logic under test:
 *
 *   const effectiveFull = activeVariant?.price ?? catalogProduct?.price ?? 0;
 *   const effectiveSale = activeVariant?.salePrice ?? catalogProduct?.salePrice;
 *   const hasVisibleDiscount =
 *     typeof effectiveSale === 'number' &&
 *     effectiveFull > 0 &&
 *     effectiveSale < effectiveFull &&
 *     Math.round((1 - effectiveSale / effectiveFull) * 100) >= 1;
 *   const dynamicPrice = hasVisibleDiscount ? effectiveSale! : effectiveFull;
 *   const dynamicOriginalPrice = hasVisibleDiscount ? effectiveFull : null;
 *
 * Tested as a pure function so no React / Next.js runtime is required.
 */
import { describe, it, expect } from 'vitest';

type Variant = {
  price?: number;
  salePrice?: number;
};

type Product = {
  price?: number;
  salePrice?: number;
};

/** Mirrors the exact derivation in ProductDetailPage.tsx. */
function derivePdpPrice(
  activeVariant: Variant | null,
  catalogProduct: Product | null | undefined,
): { dynamicPrice: number; dynamicOriginalPrice: number | null } {
  const effectiveFull = activeVariant?.price ?? catalogProduct?.price ?? 0;
  const effectiveSale = activeVariant?.salePrice ?? catalogProduct?.salePrice;
  const hasVisibleDiscount =
    typeof effectiveSale === 'number' &&
    effectiveFull > 0 &&
    effectiveSale < effectiveFull &&
    Math.round((1 - effectiveSale / effectiveFull) * 100) >= 1;
  const dynamicPrice = hasVisibleDiscount ? effectiveSale! : effectiveFull;
  const dynamicOriginalPrice = hasVisibleDiscount ? effectiveFull : null;
  return { dynamicPrice, dynamicOriginalPrice };
}

describe('derivePdpPrice', () => {
  // Case 1 — no discount at all: sale UI must be hidden.
  it('returns full price and null originalPrice when there is no salePrice', () => {
    const { dynamicPrice, dynamicOriginalPrice } = derivePdpPrice(
      null,
      { price: 100 },
    );
    expect(dynamicPrice).toBe(100);
    expect(dynamicOriginalPrice).toBeNull();
  });

  // Case 2 — variant.salePrice < variant.price with a visible percentage:
  // both dynamicPrice (sale) and dynamicOriginalPrice (full) should be set.
  it('shows sale when variant salePrice produces >= 1% discount', () => {
    const { dynamicPrice, dynamicOriginalPrice } = derivePdpPrice(
      { price: 200, salePrice: 150 },
      { price: 200 },
    );
    expect(dynamicPrice).toBe(150);
    expect(dynamicOriginalPrice).toBe(200);
  });

  // Case 3 — the original bug: variant.price equals family.price but the
  // family carries a salePrice. Because effectiveFull comes from the variant
  // (35) and effectiveSale falls back to the family (34.999), the percent
  // rounds to 0% → NO sale UI should render.
  it('suppresses sale when variant.price equals family full price and family salePrice produces < 1% discount', () => {
    const { dynamicPrice, dynamicOriginalPrice } = derivePdpPrice(
      { price: 35 },                       // variant has no salePrice
      { price: 35, salePrice: 34.999 },    // family: sub-cent discount
    );
    // 1 - 34.999/35 ≈ 0.000028... → rounds to 0 → no discount shown
    expect(dynamicPrice).toBe(35);
    expect(dynamicOriginalPrice).toBeNull();
  });

  // Case 4 — discount rounds to exactly 0% (34.998 on 35): strike hidden.
  it('hides sale when discount rounds to 0%', () => {
    const { dynamicPrice, dynamicOriginalPrice } = derivePdpPrice(
      null,
      { price: 35, salePrice: 34.998 },
    );
    expect(Math.round((1 - 34.998 / 35) * 100)).toBe(0); // sanity
    expect(dynamicPrice).toBe(35);
    expect(dynamicOriginalPrice).toBeNull();
  });

  // Case 5 — variant.salePrice overrides family.salePrice.
  // Variant has salePrice 80; family also has a different salePrice 90.
  // The variant's value must win.
  it('uses variant.salePrice over family.salePrice', () => {
    const { dynamicPrice, dynamicOriginalPrice } = derivePdpPrice(
      { price: 100, salePrice: 80 },
      { price: 100, salePrice: 90 },
    );
    expect(dynamicPrice).toBe(80);
    expect(dynamicOriginalPrice).toBe(100);
  });
});
