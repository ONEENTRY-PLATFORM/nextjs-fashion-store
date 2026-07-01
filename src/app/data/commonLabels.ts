/**
 * Shared UI widget labels — used across multiple components.
 */
export const PRICE_RANGE_LABELS = {
  minPrice: 'Min price',
  maxPrice: 'Max price',
} as const;

export const QTY_CONTROL_LABELS = {
  groupLabel: 'Quantity',
  decreaseLabel: 'Decrease quantity',
  increaseLabel: 'Increase quantity',
} as const;

export const HORIZONTAL_SCROLLER_LABELS = {
  scrollLeft: 'Scroll left',
  scrollRight: 'Scroll right',
} as const;

export const CAROUSEL_LABELS = {
  previous: 'Previous',
  next: 'Next',
  previousSlide: 'Previous slide',
  nextSlide: 'Next slide',
  slides: 'Slides',
  featuredCollections: 'Featured collections',
} as const;

export const MINI_CART_ARIA_LABELS = {
  yourBag: 'Your bag',
  removeBundle: 'Remove bundle',
} as const;

export const PRODUCT_CARD_ARIA_LABELS = {
  addToWishlist: 'Add to wishlist',
  removeFromWishlist: 'Remove from wishlist',
  removeFromFavourites: 'Remove from favourites',
} as const;

export const PRODUCT_CARD_LABELS = {
  addToCart: 'Add to Cart',
  added: 'Added!',
} as const;

export const CHECKOUT_STEPPER_ARIA = {
  checkoutProgress: 'Checkout progress',
} as const;

export const MOBILE_FILTER_ARIA = {
  productFilters: 'Product Filters',
  closeFilters: 'Close filters',
} as const;

export const COMMON_EMPTY_STATES = {
  noResults: 'No results',
  noResultsFound: 'No results found',
  noFilterResultsBody: 'No items match your current filters. Try broadening your search or removing some filters.',
  clearAllFilters: 'Clear all filters',
  searchInGroupTpl: (groupLabel: string) => `Search ${groupLabel.toLowerCase()}…`,
} as const;

export const CATALOG_TREND_BLOCKS_LABELS = {
  eyebrow: 'Discover',
  heading: "We Think You'll Love",
} as const;

export const FOOTER_LABELS = {
  acceptedPaymentMethods: 'Accepted Payment Methods',
  followUs: 'Follow Us',
  customerSupport: 'Customer Support:',
} as const;

export const A11Y_LABELS = {
  skipToContent: 'Skip to content',
  errorLoadingImage: 'Error loading image',
} as const;

export const CATALOG_PAGINATION_LABELS = {
  pageOfTpl: (current: number, total: number) => `Page ${current} of ${total}`,
} as const;

export const CART_LINE_LABELS = {
  sizeLabel: 'Size',
  qtyLabel: 'Qty',
  colorPrefix: 'Color:',
  skuPrefix: 'SKU:',
  sizePrefix: 'Size:',
} as const;

export const SIZE_DROPDOWN_LABELS = {
  sizeLabel: 'Size:',
  clothingSizes: ['XS', 'S', 'M', 'L', 'XL', 'XXL'] as const,
  shoeSizes: ['36', '37', '38', '39', '40', '41', '42'] as const,
  oneSize: 'One Size',
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
  colorSwatchTpl: (idx: number) => `Color ${idx}`,
  colorSwatchOutOfStockSuffix: ' (out of stock)',
} as const;

export const CATALOG_SORT_LABELS = {
  featured: 'Featured',
  priceLowToHigh: 'Price: Low to High',
  priceHighToLow: 'Price: High to Low',
  popularity: 'Popularity',
  newArrivals: 'New Arrivals',
} as const;

export const ERROR_BOUNDARY_LABELS = {
  heading: 'Something went wrong',
  tryAgain: 'Try Again',
  unexpectedError: 'An unexpected error occurred.',
} as const;

export const CATEGORY_SECTION_LABELS = {
  heading: 'Shop By Category',
} as const;

export const REVIEW_CARD_LABELS = {
  verifiedPurchase: 'Verified purchase',
} as const;

export const CATALOG_MOBILE_SORT_LABELS = {
  heading: 'SORT BY',
  closeSort: 'Close sort',
  options: [
    { label: 'Featured',           value: 'featured' },
    { label: 'Price: Low to High', value: 'price_asc' },
    { label: 'Price: High to Low', value: 'price_desc' },
    { label: 'Popularity',         value: 'popularity' },
    { label: 'New Arrivals',       value: 'new' },
  ] as const,
} as const;

export const HEADER_ARIA = {
  mainNavigation: 'Main navigation',
} as const;

export const FOOTER_ARIA = {
  legalLinks: 'Legal links',
} as const;

export const ADDRESSES_SECTION_ARIA = {
  editAddress: 'Edit address',
  deleteAddress: 'Delete address',
} as const;

export const PERSONAL_INFO_SECTION_ARIA = {
  save: 'Save personal information',
  cancel: 'Cancel editing personal information',
} as const;

export const MINI_CART_DYNAMIC_ARIA = {
  removeFromCart: (name: string) => `Remove ${name} from cart`,
} as const;

export const FOOTER_DYNAMIC_ARIA = {
  followOn: (network: string) => `Follow us on ${network}`,
} as const;

export const CHECKOUT_STEPPER_DYNAMIC_ARIA = {
  stepSuffixCompleted: ' (completed)',
  stepSuffixCurrent: ' (current step)',
  stepSuffixUpcoming: ' (upcoming)',
} as const;

export const HERO_SLIDER_DYNAMIC_ARIA = {
  slideDescriptionTpl: (idx: number, total: number, headline: string) => `${idx} of ${total}: ${headline}`,
  slidePrefix: 'Slide',
} as const;

export const WRITE_REVIEW_DYNAMIC_ARIA = {
  starSuffix: 'star',
} as const;

export const WISHLIST_DYNAMIC_ARIA = {
  quickViewPrefix: 'Quick view',
} as const;

export const MY_ORDERS_DYNAMIC_ARIA = {
  viewDetailsTpl: (orderId: string) => `View details for order ${orderId}`,
} as const;
