/**
 * New Arrivals page UI copy.
 */
export const NEW_ARRIVALS_HERO_LABELS = {
  imageAlt: 'New Arrivals editorial',
  eyebrow: 'KEKIMORO',
  heading: 'NEW ARRIVALS',
  subheading: 'Latest fashion drops',
} as const;

export const NEW_ARRIVALS_SORT_LABELS = {
  newestFirst: 'Newest First',
  priceLowToHigh: 'Price: Low to High',
  priceHighToLow: 'Price: High to Low',
  popularity: 'Popularity',
  brandAZ: 'Brand A–Z',
} as const;

export const NEW_ARRIVALS_CATEGORY_LABELS = {
  all: 'All',
  clothing: 'Clothing',
  shoes: 'Shoes',
  accessories: 'Accessories',
} as const;

export const NEW_ARRIVALS_PAGE_LABELS = {
  // Breadcrumb
  breadcrumbHome: 'Home',
  breadcrumbCurrent: 'New Arrivals',
  stylesSuffix: 'styles',
  // Sort/view controls
  viewLabel: 'View:',
  view3ColAria: '3-column view',
  view4ColAria: '4-column view',
  sortFallback: 'Sort',
  sortMobileCta: 'Sort',
  // Results
  resultSingular: 'Result',
  resultPlural: 'Results',
  emptyMessage: 'No products in this category yet.',
  // Editorial strip
  editorialEyebrow: 'Always in stock — never out of style',
  editorialHeading: 'New drops every week',
  editorialBody:
    'Subscribe to stay ahead of the curve. Get first access to new arrivals, exclusive launches, and members-only offers.',
  newsletterPlaceholder: 'Your email address',
  newsletterCta: 'Subscribe',
} as const;
