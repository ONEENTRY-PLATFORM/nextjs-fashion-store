/** Sort key ↔ the dictionary entry that names it. */
import { NEW_ARRIVALS_SORT_LABELS as SL } from '@/app/pages/new/copy';

export const NEW_ARRIVALS_SORT_OPTIONS = [
  { labelKey: 'newestFirst', label: SL.newestFirst, value: 'newest' },
  { labelKey: 'priceLowToHigh', label: SL.priceLowToHigh, value: 'price_asc' },
  { labelKey: 'priceHighToLow', label: SL.priceHighToLow, value: 'price_desc' },
  { labelKey: 'popularity', label: SL.popularity, value: 'popularity' },
  { labelKey: 'brandAZ', label: SL.brandAZ, value: 'brand_az' },
] as const;

/** Filter ids — the display copy is `NEW_ARRIVALS_CATEGORY_LABELS[id]`, which an editor can reword without breaking the filter. */
export const NEW_ARRIVALS_CATEGORIES = ['all', 'clothing', 'shoes', 'accessories'] as const;

export type NewArrivalCategory = (typeof NEW_ARRIVALS_CATEGORIES)[number];
