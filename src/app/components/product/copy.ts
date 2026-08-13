/** Copy shared by this feature's components, overlaid by the OneEntry dictionary at render time. */

export const PRODUCT_CARD_LABELS = {
  addToCart: 'Add to Cart',
  added: 'Added!',
} as const;

export const PRODUCT_CARD_ARIA_LABELS = {
  addToWishlist: 'Add to wishlist',
  removeFromWishlist: 'Remove from wishlist',
  removeFromFavourites: 'Remove from favourites',
} as const;

/** Quick View modal — fast preview from listing. */
export const QUICK_VIEW_LABELS = {
  closeLabel: 'Close',
  defaultBrand: 'Kekimoro',
  reviewsSuffix: 'reviews',
  beFirstToReview: 'Be the first to review',
  badgeNewIn: 'NEW IN',
  badgeLowStock: 'LOW IN STOCK',
  colorLabel: 'Color:',
  colorSelected: 'Selected',
  colorNotSelected: 'Not selected',
  colorAriaPrefix: 'Color',
  colorOutOfStockAria: '(out of stock)',
  colorError: 'Please select a colour',
  sizeLabel: 'Select Size',
  sizeError: '— Please select a size',
  sizeGuideCta: 'Size Guide',
  viewFullDetails: 'View Full Details',
  buyNow: "Get It Before It's Gone",
  wishlistAdd: 'Add to wishlist',
  wishlistRemove: 'Remove from wishlist',
  thumbnailAltPrefix: 'View',
  // Flat, so `mergeDict` can overlay each string: an array of objects is structure to it and would keep this placeholder copy on screen forever.
  section1Title: 'Description',
  section1Content:
    'Elevate your wardrobe with this stunning piece. Crafted from premium materials with attention to detail, ' +
    'this item combines style and comfort for any occasion.',
  section2Title: 'Size & Fit',
  section2Content: `Model is 5'9" and wears a size S. True to size fit. For a relaxed fit, we recommend sizing up.`,
  section3Title: 'Details',
  section3Content: '100% Premium Cotton. Machine wash cold. Imported. Style #OE2024',
  section4Title: 'Delivery & Returns',
  section4Content:
    'Free standard shipping on orders over $75. Express shipping available. Free returns within 30 days.',
} as const;

// ─── Product Reviews section ────────────────────────────────────────────────
export const PRODUCT_REVIEWS_LABELS = {
  heading: 'Customer Reviews',
  reviewsCountSuffix: 'reviews',
  writeReview: 'Write a Review',
  showAllPrefix: 'Show all',
  showAllSuffix: 'reviews',
  sizePrefix: 'Size:',
  helpfulPrefix: 'Helpful',
  helpfulMarkedAria: 'Marked as helpful',
  helpfulMarkAria: 'Mark as helpful',
  emptyHeading: 'No reviews yet',
  emptyBody: 'Be the first to share your thoughts about this product.',
  purchaseRequired: 'Only shoppers who have received this product can leave a review.',
} as const;

// Product detail action buttons
export const PRODUCT_ACTION_LABELS = {
  addToCart: 'Add to Cart',
  addedToCart: 'Added to Cart!',
  /** `%name%` — the product name, announced to screen readers on add. */
  announceAddedToCart: '%name% added to cart',
  outOfStock: 'Out of Stock',
  reserveInStore: 'Reserve in Store',
  inStock: 'In Stock',
  preOrder: 'Pre-order',
  preOrderButton: 'Pre-order',
  comingSoon: 'Coming soon',
  reviewsSuffix: 'reviews',
  skuLabel: 'SKU:',
  articleLabel: 'Article:',
  defaultSku: '2024-156-1',
  defaultArticle: 'OF-KW-156-BRG',
  // `%count%`, not `{count}`.
  bonusHeading: 'Earn %count% bonus points',
  bonusBody: 'Redeemable on your next order. Join Kekimoro Rewards for free.',
  colorLabel: 'Color:',
  outOfStockTitle: ' — Out of stock',
  sizeLabel: 'Size',
  sizeError: 'Please select a size',
  sizeGuide: 'Size Guide',
  storeAvailableIn: 'Available in store in',
  storeStockSuffix: '· S, M in stock today',
  defaultCities: ['London', 'Paris', 'Berlin', 'Madrid', 'Rome'] as const,
} as const;
