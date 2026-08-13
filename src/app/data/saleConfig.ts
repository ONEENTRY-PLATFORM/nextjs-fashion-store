/** Every sort key the sale page must be able to word; the wording lives with the component that renders it. */
export type SaleSortLabelKey = 'biggestDiscount' | 'priceLowToHigh' | 'priceHighToLow' | 'popularity' | 'newArrivals';

export const SALE_COLOR_LABELS = {
  black: 'Black',
  white: 'White',
  brown: 'Brown',
  beige: 'Beige',
  navy: 'Navy',
  gray: 'Gray',
  red: 'Red',
  pink: 'Pink',
} as const;

const COL = SALE_COLOR_LABELS;

export const SALE_END_DATE = new Date('2026-03-15T23:59:59').getTime();

/** Filter ids — display copy is `SALE_CATEGORY_LABELS[id]` (OE set `sale_page`). */
export const SALE_CATEGORIES = [
  'all',
  'womenClothing',
  'womenShoes',
  'menClothing',
  'menShoes',
  'bags',
  'accessories',
] as const;

export type SaleCategory = (typeof SALE_CATEGORIES)[number];

export const SALE_COLOR_OPTIONS = [
  { label: COL.black, color: '#000000' },
  { label: COL.white, color: '#FFFFFF' },
  { label: COL.brown, color: '#5C3A1E' },
  { label: COL.beige, color: '#C4A882' },
  { label: COL.navy, color: '#1B3A5C' },
  { label: COL.gray, color: '#808080' },
  { label: COL.red, color: '#DA1E1E' },
  { label: COL.pink, color: '#F88A8A' },
];

/** Sort values paired with the label key that words them. */
export const SALE_SORT_OPTIONS = [
  { labelKey: 'biggestDiscount', value: 'discount' },
  { labelKey: 'priceLowToHigh', value: 'price_asc' },
  { labelKey: 'priceHighToLow', value: 'price_desc' },
  { labelKey: 'popularity', value: 'popularity' },
  { labelKey: 'newArrivals', value: 'new' },
] as const satisfies readonly { labelKey: SaleSortLabelKey; value: string }[];
