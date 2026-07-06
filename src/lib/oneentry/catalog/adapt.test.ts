/**
 * Tests for pure utility functions in adapt.ts.
 *
 * NOTE: adaptCatalogProductToUiProduct / adaptCatalogProductToPdpProduct
 * depend on CURRENCY.format (needs canvas/env) — those are tested elsewhere
 * via integration coverage. This file focuses on the pure, side-effect-free
 * helpers that can run cheaply.
 */

import { describe, expect, it } from 'vitest';

// catalogKeyToCategoryPath has no external imports, so we can import it
// directly without any mocks.
import { catalogKeyToCategoryPath } from './adapt';

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
