/** Copy shared by this feature's components, overlaid by the OneEntry dictionary at render time. */

export const PRODUCT_BREADCRUMB_LABELS = {
  // Visible breadcrumb segments — `Home` is the only static one; the rest are derived from each product's OE category path at runtime.
  home: 'Home',
  back: 'Back',
  youMayAlsoLike: 'You May Also Like',
  viewAll: 'View All',
} as const;
