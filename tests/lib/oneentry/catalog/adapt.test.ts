/**
 * Tests for pure utility functions in adapt.ts.
 */

import { describe, expect, it } from 'vitest';

import { adaptCatalogProductToPdpProduct, adaptCatalogProductToUiProduct, catalogKeyToCategoryPath } from './adapt';
import type { CatalogProduct } from './products';

// ─── adaptCatalogProductToUiProduct — statusIdentifier forwarding ─────────────

describe('adaptCatalogProductToUiProduct — statusIdentifier forwarding', () => {
  it('forwards statusIdentifier when set on the OE product', () => {
    const p = makeProduct({ statusIdentifier: 'preorder' });
    const result = adaptCatalogProductToUiProduct(p);
    expect(result.statusIdentifier).toBe('preorder');
  });

  it('omits statusIdentifier when source value is an empty string', () => {
    const p = makeProduct({ statusIdentifier: '' });
    const result = adaptCatalogProductToUiProduct(p);
    expect(Object.prototype.hasOwnProperty.call(result, 'statusIdentifier')).toBe(false);
  });

  it('forwards statusIdentifier per-variant', () => {
    const p = makeProduct({
      colors: ['Red'],
      variants: [
        {
          id: 20,
          colors: ['Red'],
          sizes: ['M'],
          price: 100,
          sku: 'V-20',
          preview: '',
          images: [],
          stock: 1,
          statusIdentifier: 'preorder',
          descriptionHtml: '',
        },
      ],
    });
    const result = adaptCatalogProductToUiProduct(p);
    expect(result.variants?.[0]?.statusIdentifier).toBe('preorder');
  });
});

describe('catalogKeyToCategoryPath', () => {
  it('maps every known catalog key to the expected OE category path', () => {
    const cases: Array<[string, string]> = [
      ['women-clothing',    '/women/women_clothing'],
      ['women-shoes',       '/women/women_shoes'],
      ['women-bags',        '/women/women_bags'],
      ['women-accessories', '/women/women_accessories'],
      ['men-clothing',      '/men/men_clothing'],
      ['men-shoes',         '/men/men_shoes'],
      ['men-bags',          '/men/men_bags'],
      ['men-accessories',   '/men/men_accessories'],
    ];

    for (const [key, expected] of cases) {
      expect(catalogKeyToCategoryPath(key), `key: ${key}`).toBe(expected);
    }
  });

  it('returns null for an unknown catalog key', () => {
    expect(catalogKeyToCategoryPath('kids-clothing')).toBeNull();
    expect(catalogKeyToCategoryPath('')).toBeNull();
    expect(catalogKeyToCategoryPath('WOMEN-CLOTHING')).toBeNull(); // case-sensitive
  });
});

// ─── adaptCatalogProductToPdpProduct — stock gate (`> 0`) ────────────────────
//
// The adapter intentionally omits `stock` when the value is 0 so that a
// "status-only" tenant (where `stock === 0` means "not tracked") doesn't
// cap the cart at zero units. These tests pin that gating logic for both
// the top-level product and each variant.

/** Minimum-viable CatalogProduct for adapter tests. */
function makeProduct(overrides: Partial<CatalogProduct> = {}): CatalogProduct {
  return {
    id: 1,
    title: 'Test Product',
    description: '',
    statusIdentifier: 'in_stock',
    price: 100,
    currency: 'USD',
    sku: 'SKU-1',
    brand: '',
    colors: [],
    sizes: [],
    materials: [],
    styles: [],
    gender: '',
    tag: '',
    stock: 0,
    season: '',
    country: '',
    categories: [],
    images: [],
    preview: '',
    fit: '',
    liningMaterial: '',
    insulation: '',
    productDetails: [],
    descriptionHtml: '',
    careInstructions: [],
    discountAttributes: {},
    relatedIds: [],
    ...overrides,
  };
}

describe('adaptCatalogProductToPdpProduct — stock gate', () => {
  it('forwards stock to the PDP product when p.stock > 0', () => {
    const p = makeProduct({ stock: 3 });
    const result = adaptCatalogProductToPdpProduct(p);
    expect(result.stock).toBe(3);
  });

  it('omits stock from the PDP product when p.stock === 0', () => {
    const p = makeProduct({ stock: 0 });
    const result = adaptCatalogProductToPdpProduct(p);
    // `stock` key must be absent (not present as undefined/0) so the cart
    // doesn't cap at 0 for status-only tenants.
    expect(Object.prototype.hasOwnProperty.call(result, 'stock')).toBe(false);
  });

  it('forwards stock on individual variants when v.stock > 0', () => {
    const p = makeProduct({
      stock: 3,
      colors: ['Red'],
      variants: [
        {
          id: 10,
          colors: ['Red'],
          sizes: ['M'],
          price: 100,
          sku: 'V-1',
          preview: '',
          images: [],
          stock: 2,
          statusIdentifier: 'in_stock',
          descriptionHtml: '',
        },
      ],
    });
    const result = adaptCatalogProductToPdpProduct(p);
    const variant = result.variants?.[0];
    expect(variant).toBeDefined();
    expect(variant!.stock).toBe(2);
  });

  it('omits stock from a variant when v.stock === 0', () => {
    const p = makeProduct({
      stock: 0,
      colors: ['Blue'],
      variants: [
        {
          id: 11,
          colors: ['Blue'],
          sizes: ['S'],
          price: 100,
          sku: 'V-2',
          preview: '',
          images: [],
          stock: 0,
          statusIdentifier: 'in_stock',
          descriptionHtml: '',
        },
      ],
    });
    const result = adaptCatalogProductToPdpProduct(p);
    const variant = result.variants?.[0];
    expect(variant).toBeDefined();
    expect(Object.prototype.hasOwnProperty.call(variant, 'stock')).toBe(false);
  });

  it('gates product and variant stock independently', () => {
    // Product has no tracked stock; variant does.
    const p = makeProduct({
      stock: 0,
      colors: ['Green'],
      variants: [
        {
          id: 12,
          colors: ['Green'],
          sizes: ['L'],
          price: 100,
          sku: 'V-3',
          preview: '',
          images: [],
          stock: 5,
          statusIdentifier: 'in_stock',
          descriptionHtml: '',
        },
      ],
    });
    const result = adaptCatalogProductToPdpProduct(p);
    // Product-level stock absent (was 0).
    expect(Object.prototype.hasOwnProperty.call(result, 'stock')).toBe(false);
    // Variant-level stock present (was 5).
    expect(result.variants?.[0].stock).toBe(5);
  });
});
