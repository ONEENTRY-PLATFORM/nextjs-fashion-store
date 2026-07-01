import { NEW_ARRIVALS_SORT_LABELS as SL, NEW_ARRIVALS_CATEGORY_LABELS as CL } from './newArrivalsLabels';

export const NEW_ARRIVALS_SORT_OPTIONS = [
  { label: SL.newestFirst,    value: 'newest' },
  { label: SL.priceLowToHigh, value: 'price_asc' },
  { label: SL.priceHighToLow, value: 'price_desc' },
  { label: SL.popularity,     value: 'popularity' },
  { label: SL.brandAZ,        value: 'brand_az' },
];

export const NEW_ARRIVALS_CATEGORIES = [CL.all, CL.clothing, CL.shoes, CL.accessories] as const;

export type NewArrivalCategory = (typeof NEW_ARRIVALS_CATEGORIES)[number];
