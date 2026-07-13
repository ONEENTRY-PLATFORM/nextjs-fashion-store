/**
 * Filter UI labels — sections, groups, options, chip filters.
 * Used by all catalog pages (Women/Men × Clothing/Shoes/Bags/Accessories).
 * Filter chip labels are user-facing display text; the matching
 * predicate values stay in the catalog page configs.
 */

export const FILTER_SECTION_LABELS = {
  mainFilters: 'Main Filters',
  details: 'Details',
  storeAvailability: 'Store Availability',
} as const;

export const FILTER_GROUP_LABELS = {
  bagType: 'Bag Type',
  bagSize: 'Bag Size',
  brand: 'Brand',
  color: 'Color',
  upperMaterial: 'Upper Material',
  style: 'Style',
  discount: 'Discount',
  price: 'Price',
  materialOrigin: 'Material Origin',
  brandCountry: 'Brand Country',
  strapWidth: 'Strap Width',
  frame: 'Frame',
  materialFinish: 'Material Finish',
  availability: 'Availability',
  city: 'City',
  store: 'Store',
  clothingType: 'Clothing Type',
  size: 'Size',
  fit: 'Fit',
  silhouette: 'Silhouette',
  collar: 'Collar',
  neckline: 'Neckline',
  sleeve: 'Sleeve',
  hood: 'Hood',
  pockets: 'Pockets',
  liningMaterial: 'Lining Material',
  productDetails: 'Product Details',
  season: 'Season',
  shoeType: 'Shoe Type',
  soleMaterial: 'Sole Material',
  insoleMaterial: 'Insole Material',
  closure: 'Closure',
  closureType: 'Closure Type',
  heelHeight: 'Heel Height',
  width: 'Width',
  shoeHeight: 'Shoe Height',
  shaftVolume: 'Shaft Volume',
  toeShape: 'Toe Shape',
  stitchType: 'Stitch Type',
  technologies: 'Technologies',
  heelWidth: 'Heel Width',
  heelCounter: 'Heel Counter',
  soleType: 'Sole Type',
  soleThickness: 'Sole Thickness',
  soleConstruction: 'Sole Construction',
  accessoryType: 'Accessory Type',
  outerMaterial: 'Outer Material',
  material: 'Material',
  genderTarget: 'Gender',
} as const;

export const FILTER_OPTION_LABELS = {
  inStock: 'In Stock',
  outOfStock: 'Out of Stock',
} as const;

export const FILTER_DISCOUNT_LABELS = {
  tplPercentAndMore: (pct: number) => `${pct}% and more`,
} as const;

export const FILTER_SECTION_LABELS_EXT = {
  primaryFilters: 'Primary Filters',
} as const;

export const FILTER_GROUP_LABELS_EXT = {
  fit: 'Fit (Rise)',
  outerMaterial: 'Outer Material',
} as const;

/** Price range option labels — currency symbol injected via fn for CMS swap */
import { CURRENCY } from './currencyConfig';
export const FILTER_PRICE_LABELS = {
  under: (max: number) => `Under ${CURRENCY.formatInteger(max)}`,
  range: (min: number, max: number) => `${CURRENCY.formatInteger(min)} – ${CURRENCY.formatInteger(max)}`,
  over: (min: number) => `Over ${CURRENCY.formatInteger(min)}`,
} as const;

/** City labels — reused across all catalog pages */
export const FILTER_CITY_NAMES = {
  newYork: 'New York',
  losAngeles: 'Los Angeles',
  chicago: 'Chicago',
  miami: 'Miami',
  lasVegas: 'Las Vegas',
  boston: 'Boston',
  seattle: 'Seattle',
  austin: 'Austin',
} as const;

/** Cities — same set used across all catalog pages */
export const FILTER_CITIES = [
  { label: FILTER_CITY_NAMES.newYork, count: 1243 },
  { label: FILTER_CITY_NAMES.losAngeles, count: 987 },
  { label: FILTER_CITY_NAMES.chicago, count: 712 },
  { label: FILTER_CITY_NAMES.miami, count: 634 },
  { label: FILTER_CITY_NAMES.lasVegas, count: 423 },
  { label: FILTER_CITY_NAMES.boston, count: 378 },
  { label: FILTER_CITY_NAMES.seattle, count: 312 },
  { label: FILTER_CITY_NAMES.austin, count: 267 },
] as const;

/** Store names — same set used across all catalog pages */
export const FILTER_STORE_NAMES = {
  fifthAve: 'Kekimoro Fifth Ave',
  beverlyHills: 'Kekimoro Beverly Hills',
  magnificentMile: 'Kekimoro Magnificent Mile',
  brickell: 'Kekimoro Brickell',
  forumShops: 'Kekimoro Forum Shops',
  newburySt: 'Kekimoro Newbury St',
  lincolnRoad: 'Kekimoro Lincoln Road',
  lasVegasStrip: 'Kekimoro Las Vegas Strip',
} as const;
