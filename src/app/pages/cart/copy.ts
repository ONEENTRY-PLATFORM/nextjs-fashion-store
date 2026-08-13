/** Copy shared by this feature's components, overlaid by the OneEntry dictionary at render time. */

export const CART_LINE_LABELS = {
  sizeLabel: 'Size',
  qtyLabel: 'Qty',
  colorPrefix: 'Color:',
  skuPrefix: 'SKU:',
  sizePrefix: 'Size:',
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
