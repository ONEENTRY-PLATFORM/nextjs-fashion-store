/**
 * Copy shared by this feature's components, overlaid by the OneEntry
 * dictionary at render time — see `src/lib/oneentry/labels/dict.ts`.
 */

// ─── History section ────────────────────────────────────────────────────────
export const HISTORY_LABELS = {
  title: 'Purchase History',
  eyebrow: 'Transaction Record',
  bannerHeading: 'Your Orders',
  totalOrders: 'Total Orders',
  delivered: 'Delivered',
  totalSpent: 'Total Spent',
  filterAll: 'All',
  emptyText: 'No orders match this filter.',
  rowOrder: 'Order',
  rowDate: 'Date',
  rowItems: 'Items',
  rowTotal: 'Total',
  itemSingular: 'item',
  itemPlural: 'items',
  trackPrefix: 'Order',
  trackHeading: 'Track Your Parcel',
  trackCarrierLabel: 'Carrier',
  trackCarrierName: 'Royal Mail Tracked',
  trackingNumber: 'Tracking Number',
  copy: 'Copy',
  trackInstructions:
    'To track your parcel, visit the Royal Mail website and enter your tracking number, ' +
    'or click the button below to open the tracking page directly.',
  trackCta: 'Track on Royal Mail',
  reorder: 'Reorder',
  reorderDone: 'Done',
  orderTotal: 'Order Total',
  itemSize: 'Size',
  itemColourPrefix: 'Colour:',
  itemQtyPrefix: 'Qty:',
  trackingPrefix: 'Tracking:',
  viewBtn: 'View',
  trackTitleTpl: (trackingNo: string) => `Track: ${trackingNo}`,
  statuses: {
    delivered: 'Delivered',
    shipped: 'Shipped',
    processing: 'Processing',
    cancelled: 'Cancelled',
    returned: 'Returned',
  } as const,
} as const;
