/** Sort key ↔ the dictionary entry that names it. `label` is the offline fallback wording. */
export const NEW_ARRIVALS_SORT_OPTIONS = [
  { labelKey: 'newestFirst', label: 'Newest First', value: 'newest' },
  { labelKey: 'priceLowToHigh', label: 'Price: Low to High', value: 'price_asc' },
  { labelKey: 'priceHighToLow', label: 'Price: High to Low', value: 'price_desc' },
  { labelKey: 'popularity', label: 'Popularity', value: 'popularity' },
  { labelKey: 'brandAZ', label: 'Brand A–Z', value: 'brand_az' },
] as const;

/** Filter ids — the display copy is `NEW_ARRIVALS_CATEGORY_LABELS[id]`, which an editor can reword without breaking the filter. */
export const NEW_ARRIVALS_CATEGORIES = ['all', 'clothing', 'shoes', 'accessories'] as const;

export type NewArrivalCategory = (typeof NEW_ARRIVALS_CATEGORIES)[number];
