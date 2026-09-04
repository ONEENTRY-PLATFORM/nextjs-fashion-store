/**
 * Tests for the crawl-facing half of filters.ts: which query strings make a catalog listing a
 * filtered variant that must stay out of the search index.
 */

import { describe, expect, it } from 'vitest';

import { FACET_URL_KEYS, isFilteredCatalogView } from '@/lib/oneentry/catalog/filters';

describe('isFilteredCatalogView — bare listing', () => {
  it('treats an empty map as the bare listing', () => {
    expect(isFilteredCatalogView({})).toBe(false);
  });

  it('ignores empty and nullish values left behind by a cleared filter', () => {
    expect(isFilteredCatalogView({ color: '' })).toBe(false);
    expect(isFilteredCatalogView({ color: undefined })).toBe(false);
    expect(isFilteredCatalogView({ color: [] })).toBe(false);
  });

  it('treats page=1 as the bare listing under another name', () => {
    expect(isFilteredCatalogView({ page: '1' })).toBe(false);
    expect(isFilteredCatalogView({ page: '2' })).toBe(true);
  });

  it('ignores params the catalog does not facet on', () => {
    expect(isFilteredCatalogView({ utm_source: 'newsletter', fbclid: 'abc' })).toBe(false);
  });
});

describe('isFilteredCatalogView — facets', () => {
  it.each(FACET_URL_KEYS.filter((k) => k !== 'page').map((k) => [k]))('flags "%s"', (key) => {
    expect(isFilteredCatalogView({ [key]: 'x' })).toBe(true);
  });

  it('covers every list facet the parser understands', () => {
    for (const key of ['color', 'size', 'brand', 'style', 'material', 'season', 'fit']) {
      expect(FACET_URL_KEYS).toContain(key);
    }
  });
});

describe('isFilteredCatalogView — navigation destinations stay indexable', () => {
  /*
    A mega-menu leaf (`/women/clothing/category/outerwear`) redirects to `/women/clothing?chip=…`, so
    that query URL is the leaf's actual address. Flagging it would drop the whole leaf category out of
    the index — the exact failure a blanket "de-index anything with a query string" rule produces.
  */
  it('does not flag ?chip=, the redirect target of a mega-menu leaf', () => {
    expect(isFilteredCatalogView({ chip: 'Outerwear' })).toBe(false);
    expect(FACET_URL_KEYS).not.toContain('chip');
  });

  it('does not flag ?category=, which may likewise be a destination', () => {
    expect(isFilteredCatalogView({ category: 'outerwear' })).toBe(false);
    expect(FACET_URL_KEYS).not.toContain('category');
  });

  it('still flags a chip combined with a real facet', () => {
    expect(isFilteredCatalogView({ chip: 'Outerwear', color: 'black' })).toBe(true);
  });
});
