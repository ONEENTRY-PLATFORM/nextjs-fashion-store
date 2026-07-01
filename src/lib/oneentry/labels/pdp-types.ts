export const PDP_SET_MARKERS = [
  'product_card_delivery_returns',
  'product_card_actions',
  'special_offers_product_card',
  'special-offers-bundle-product-card',
  'customer-reviews',
  'reserve_in_store',
  'earn_360_bonus_points',
  'size-guide',
] as const;

export type PdpSetMarker = (typeof PDP_SET_MARKERS)[number];

export type PdpSystemTexts = Record<PdpSetMarker, Record<string, string>>;
