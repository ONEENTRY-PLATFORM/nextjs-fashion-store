/**
 * Cart-page UI labels. Editable content (not validation messages or aria-labels).
 */
export const MINI_CART_LABELS = {
  heading: 'Your Bag',
  emptyTitle: 'Your bag is empty',
  emptyCta: 'Continue Shopping',
  subtotal: 'Subtotal',
  shippingNote: 'Shipping & discounts calculated at checkout',
  checkout: 'Checkout',
  viewFullCart: 'View Full Cart',
  bundleLabel: 'Special Offer Bundle',
  closeLabel: 'Close cart',
  // Summary + gift rows. Word prefixes rather than `{x}` templates: OE drops
  // the whole set when a value contains braces (see HARDCODED_TEXTS §0).
  sizePrefix: 'Size',
  qtyPrefix: 'Qty',
  freeGift: 'Free gift',
  free: 'Free',
  loyaltyDiscount: 'Loyalty discount',
  promoPrefix: 'Promo',
  total: 'Total',
  appliedAtCheckout: 'Applied at checkout',
} as const;

export const CART_ROW_LABELS = {
  wishlist: 'Wishlist',
  remove: 'Remove',
  removeWishlist: 'Move to wishlist',
  removeItem: 'Remove item',
  bundleLabel: 'Special Offer Bundle',
  bundleRemoveable: '· Items can only be removed together',
  bundleRemove: 'Remove Bundle',
  bundleQuantityNote: 'Quantity applies to entire bundle',
  bundleTotal: 'Bundle total',
  bundleSavePrefix: 'Save',
} as const;

export const CART_PAGE_LABELS = {
  pageTitle: 'Shopping Cart',
  itemSingular: 'item',
  itemPlural: 'items',

  // Empty state
  emptyTitle: 'Your cart is empty',
  emptyCta: 'Start Shopping',
  emptyCtaHref: '/women/clothing',

  // Bulk controls
  selectAll: 'Select All',
  /** Pattern: "Remove Selected (N)" */
  removeSelectedPrefix: 'Remove Selected',

  // Order summary
  orderSummary: 'Order Summary',
  subtotal: 'Subtotal',
  itemsDiscount: 'Items discount',
  promo: 'Promo',
  delivery: 'Delivery',
  deliveryFree: 'Free',
  total: 'Total',
  /** "You'll earn N pts with this order" — only N is dynamic. */
  loyaltyEarnTemplate: 'with this order',
  loyaltyEarnPrefix: "You'll earn",
  loyaltyEarnSuffix: 'pts',

  // Promo
  promoCheckboxLabel: 'I have a promo code',
  promoPlaceholder: 'Enter code',
  promoApplyButton: 'Apply',
  promoAppliedPrefix: '✓ Promo applied',
  promoAppliedFallback: 'discount',
  promoInvalidError: 'Invalid promo code',

  // Gift rows + summary lines that had no dictionary entry.
  freeGift: 'Free gift',
  qtyPrefix: 'Qty',
  giftFree: 'Free',
  loyaltyDiscount: 'Loyalty discount',
  promoRemove: 'Remove',

  // Footer CTA
  proceedToCheckout: 'Proceed to Checkout',
  trustNote: 'Secure checkout · Free returns · 30-day guarantee',
} as const;

/** Toast shown when OE reports cart lines that went out of stock. */
export const CART_UNAVAILABLE_LABELS = {
  removedPrefix: 'Removed from your bag:',
  removedSuffix: '— no longer available.',
  itemSingular: 'item',
  itemPlural: 'items',
  dismiss: 'Dismiss notice',
} as const;
