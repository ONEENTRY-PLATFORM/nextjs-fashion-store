import {
  SALE_CATEGORY_LABELS as CAT,
  SALE_DISCOUNT_LABELS as DL,
  SALE_COLOR_LABELS as COL,
  SALE_SORT_LABELS as SL,
} from './salePageLabels';

export const SALE_END_DATE = new Date('2026-03-15T23:59:59').getTime();

export const SALE_CATEGORIES = [
  CAT.all,
  CAT.womenClothing,
  CAT.womenShoes,
  CAT.menClothing,
  CAT.menShoes,
  CAT.bags,
  CAT.accessories,
] as const;

export type SaleCategory = (typeof SALE_CATEGORIES)[number];

export const DISCOUNT_OPTIONS = [
  DL.d10_20,
  DL.d20_30,
  DL.d30_40,
  DL.d40_50,
  DL.d50plus,
];

export const SALE_SIZE_OPTIONS = [
  'XS', 'S', 'M', 'L', 'XL', 'XXL',
  '36', '37', '38', '39', '40', '41', '42',
];

export const SALE_COLOR_OPTIONS = [
  { label: COL.black, color: '#000000' },
  { label: COL.white, color: '#FFFFFF' },
  { label: COL.brown, color: '#5C3A1E' },
  { label: COL.beige, color: '#C4A882' },
  { label: COL.navy,  color: '#1B3A5C' },
  { label: COL.gray,  color: '#808080' },
  { label: COL.red,   color: '#DA1E1E' },
  { label: COL.pink,  color: '#F88A8A' },
];

export const SALE_BRAND_OPTIONS = [
  'Kekimoro', 'Vagabond', 'Sam Edelman',
  'Common Projects', 'Clarks', 'Tommy Hilfiger',
];

export const SALE_SORT_OPTIONS = [
  { label: SL.biggestDiscount,  value: 'discount' },
  { label: SL.priceLowToHigh,   value: 'price_asc' },
  { label: SL.priceHighToLow,   value: 'price_desc' },
  { label: SL.popularity,       value: 'popularity' },
  { label: SL.newArrivals,      value: 'new' },
];
