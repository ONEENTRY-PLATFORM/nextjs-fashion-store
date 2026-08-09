import { describe, expect, it } from 'vitest';

import { catalogKeyToCategoryPath } from '@/lib/oneentry/catalog/adapt';
import { catalogRoutePath } from '@/lib/oneentry/catalog/catalog-routes';

describe('catalogRoutePath', () => {
  it('drops the parent prefix OE repeats on a child url', () => {
    expect(catalogRoutePath('women', 'women_clothing')).toBe('women/clothing');
    expect(catalogRoutePath('men', 'men_accessories')).toBe('men/accessories');
  });

  it('keeps a child that does not follow the convention', () => {
    // A category an editor names freely must still get a route rather than a
    // mangled one.
    expect(catalogRoutePath('women', 'jewellery')).toBe('women/jewellery');
  });
});

describe('catalogKeyToCategoryPath', () => {
  it('derives the OE category path for every shipped catalog key', () => {
    expect(catalogKeyToCategoryPath('women-clothing')).toBe('/women/women_clothing');
    expect(catalogKeyToCategoryPath('men-accessories')).toBe('/men/men_accessories');
  });

  it('derives one for a key that did not exist at build time', () => {
    // The point of the change: a ninth category needs no ninth table row.
    expect(catalogKeyToCategoryPath('women-jewellery')).toBe('/women/women_jewellery');
  });

  it('returns null for a key with no parent segment', () => {
    expect(catalogKeyToCategoryPath('sale')).toBeNull();
    expect(catalogKeyToCategoryPath('')).toBeNull();
  });
});
