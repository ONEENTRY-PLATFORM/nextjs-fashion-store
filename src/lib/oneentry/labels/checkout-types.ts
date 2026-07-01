export const CHECKOUT_SET_MARKERS = [
  'checkout_cart',
  'checkout_delivery',
  'checkout_payment',
  'checkout_confirmed',
  'checkout_modal',
] as const;

export type CheckoutSetMarker = (typeof CHECKOUT_SET_MARKERS)[number];

export type CheckoutSystemTexts = Record<CheckoutSetMarker, Record<string, string>>;
