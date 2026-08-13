/** Copy shared by this feature's components, overlaid by the OneEntry dictionary at render time. */

export const COMMON_EMPTY_STATES = {
  noResults: 'No results',
  noResultsFound: 'No results found',
  noFilterResultsBody: 'No items match your current filters. Try broadening your search or removing some filters.',
  clearAllFilters: 'Clear all filters',
  /** `%group%` — the filter group's label, lower-cased by the caller. */
  searchInGroup: 'Search %group%…',
} as const;

/** Catalog page titles, gender labels, and breadcrumb fragments. */

export const CATALOG_PAGE_LABELS = {
  // Gender labels (uppercase, displayed in catalog header)
  women: 'WOMEN',
  men: 'MEN',
  // Category titles (uppercase, displayed in catalog header)
  clothing: 'CLOTHING',
  shoes: 'SHOES',
  bags: 'BAGS',
  accessories: 'ACCESSORIES',
  // Breadcrumb labels (title-case)
  breadcrumbHome: 'Home',
  breadcrumbWomen: 'Women',
  breadcrumbMen: 'Men',
  breadcrumbClothing: 'Clothing',
  breadcrumbShoes: 'Shoes',
  breadcrumbBags: 'Bags',
  breadcrumbAccessories: 'Accessories',
  // Heading of the trending carousel when OE has no `catalog_trend_blocks` block (or the block carries no title of its own).
  trendingFallbackTitle: "We Think You'll Love",
} as const;

export const CATALOG_VIEW_LABELS = {
  view3ColAria: '3-column view',
  view4ColAria: '4-column view',
  viewPrefix: 'View:',
  activePrefix: 'Active:',
  pageOf: 'Page',
  pageOfMid: 'of',
  stylesCount: 'Styles',
  filtersHeading: 'FILTERS',
  sortHeading: 'SORT',
  clearAll: 'Clear All',
  clearAllLower: 'Clear all',
  outOfStock: 'Out of Stock',
  outOfStockLower: 'Out of stock',
  quickView: 'Quick View',
  quickAdd: 'Quick Add',
  shopNowArrow: 'Shop now →',
  viewAll: 'View All',
  viewAllPrefix: 'View All',
  newIn: 'New In',
  lowStock: 'Low Stock',
  youveViewedPrefix: "You've viewed ",
  youveViewedMid: ' of ',
  youveViewedSuffix: ' products',
  /** `%index%` — 1-based swatch position. */
  colorSwatch: 'Color %index%',
  colorSwatchOutOfStockSuffix: ' (out of stock)',
} as const;

export const CATALOG_SORT_LABELS = {
  featured: 'Featured',
  priceLowToHigh: 'Price: Low to High',
  priceHighToLow: 'Price: High to Low',
  popularity: 'Popularity',
  newArrivals: 'New Arrivals',
} as const;
