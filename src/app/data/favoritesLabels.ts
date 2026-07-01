/**
 * Favorites page UI copy.
 */
export const FAVORITES_PAGE_LABELS = {
  breadcrumbHome: 'Home',
  breadcrumbCurrent: 'Favourites',
  pageTitle: 'Favourites',
  itemSingular: 'item',
  itemPlural: 'items',
  moveAllToBag: 'Move All to Bag',
  clearAll: 'Clear All',
  confirmClear: 'Are you sure?',
  confirmYes: 'Yes',
  confirmCancel: 'Cancel',
  priceDropTitle: 'Price drop alert!',
  priceDropBody: "Some items in your favourites have dropped in price. Don't miss out!",
  recommendedHeading: 'Recommended for You',
  trendingHeading: 'Trending Now',
  recentlyViewedEyebrow: 'Your History',
  recentlyViewedHeading: 'Recently Viewed',
  ctaContinue: 'Continue Browsing',
  ctaContinueHref: '/women/clothing',
} as const;

export const FAVORITES_EMPTY_LABELS = {
  heading: 'Your Favorites List is Empty',
  body: 'Save the pieces you love and come back to them any time. Start browsing to find your favourites.',
  imageAlt: 'Empty wardrobe',
  ctaWomen: "Browse Women's Collection",
  ctaWomenHref: '/women/clothing',
  ctaHome: 'Go to Home',
  ctaHomeHref: '/',
} as const;

export const FAVORITE_CARD_LABELS = {
  badgeSale: 'SALE',
  priceDrop: 'Price Drop',
  outOfStock: 'Out of Stock',
  removeFromFavourites: 'Remove from favourites',
  addToCart: 'Add to Cart',
  addedToCart: 'Added!',
  quickView: 'Quick View',
  sizeLabel: 'Size',
} as const;
