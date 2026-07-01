/**
 * Sale page UI copy (filter bar, results count, promo block, recommendations).
 */
export const SALE_PAGE_LABELS = {
  // Breadcrumb
  breadcrumbHome: 'Home',
  breadcrumbCurrent: 'Sale',
  // Filter group labels
  filterDiscount: 'Discount',
  filterSize: 'Size',
  filterBrand: 'Brand',
  filterCategoryHeading: 'Category',
  filterDiscountHeading: 'Discount',
  filterSizeHeading: 'Size',
  filterColorHeading: 'Color',
  filterBrandHeading: 'Brand',
  // Bar controls
  clearAll: 'Clear all',
  filtersCta: 'Filters',
  viewLabel: 'View:',
  view3ColAria: '3-column view',
  view4ColAria: '4-column view',
  sortFallback: 'Sort',
  sortMobileCta: 'Sort',
  // Results
  itemsOnSaleSuffix: 'items on sale',
  // Pagination
  prevPageAria: 'Previous page',
  nextPageAria: 'Next page',
  // Mid promo block
  promoLimitedTime: 'LIMITED TIME',
  promoHeading: "Women's Collection — Extra 10% Off",
  promoBody: 'Use code EXTRA10 at checkout. Limited time only.',
  promoCta: 'SHOP NOW',
  promoHref: '/women/clothing',
  promoImageAlt: 'Extra savings',
  // Recommendations
  recsEyebrow: 'You May Also Like',
  recsHeading: 'TRENDING NOW',
  // PillDropdown
  clearOne: 'Clear',
  colourFilter: 'Colour',
  // Hero
  heroImageAlt: 'Season Sale',
  heroEyebrow: 'LIMITED TIME OFFER',
  heroTitleLine1: 'SEASON',
  heroTitleLine2: 'SALE',
  heroUpTo: 'UP TO',
  heroPercent: '50%',
  heroOff: 'OFF',
  heroSubtitle: 'Major markdowns across clothing, shoes, bags, and accessories.',
  heroShopSale: 'SHOP SALE',
  heroShopSaleHref: '#sale-grid',
  countdownLabel: 'Sale ends in',
  countdownDays: 'days',
  countdownHours: 'hours',
  countdownMinutes: 'min',
  countdownSeconds: 'sec',
  countdownEndsAt: 'Ends March 15, 2026 at midnight',
} as const;

export const SALE_CATEGORY_LABELS = {
  all: 'All',
  womenClothing: "Women's Clothing",
  womenShoes: "Women's Shoes",
  menClothing: "Men's Clothing",
  menShoes: "Men's Shoes",
  bags: 'Bags',
  accessories: 'Accessories',
} as const;

export const SALE_DISCOUNT_LABELS = {
  d10_20: '10% – 20%',
  d20_30: '20% – 30%',
  d30_40: '30% – 40%',
  d40_50: '40% – 50%',
  d50plus: '50% and more',
} as const;

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

export const SALE_SORT_LABELS = {
  biggestDiscount: 'Biggest Discount',
  priceLowToHigh: 'Price: Low to High',
  priceHighToLow: 'Price: High to Low',
  popularity: 'Popularity',
  newArrivals: 'New Arrivals',
} as const;
