/**
 * Copy shared by this feature's components, overlaid by the OneEntry
 * dictionary at render time — see `src/lib/oneentry/labels/dict.ts`.
 */

export const NEW_ARRIVALS_SORT_LABELS = {
  newestFirst: 'Newest First',
  priceLowToHigh: 'Price: Low to High',
  priceHighToLow: 'Price: High to Low',
  popularity: 'Popularity',
  brandAZ: 'Brand A–Z',
} as const;
