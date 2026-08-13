/** Which OneEntry form each checkout flow writes into. */

/** Delivery methods, named by their OE order-storage marker. */
export type CheckoutMethod = 'home' | 'store_pickup' | 'locker';

/** Order form per delivery method, per auth state. */
export const CHECKOUT_ORDER_FORMS: Record<CheckoutMethod, { authed: string; guest: string }> = {
  home: { authed: 'checkout_home_delivery', guest: 'checkout_home_delivery_guest' },
  store_pickup: { authed: 'checkout_store_pickup', guest: 'checkout_store_pickup_guest' },
  locker: { authed: 'checkout_locker', guest: 'checkout_locker_guest' },
};

/** Where a signed-in shopper's addresses live. */
export const SAVED_ADDRESS_FORM = 'user_addresses';

/** The order form for one flow. */
export function orderFormMarker(method: CheckoutMethod, isGuest: boolean): string {
  return isGuest ? CHECKOUT_ORDER_FORMS[method].guest : CHECKOUT_ORDER_FORMS[method].authed;
}

/** Every form the checkout steps read — both auth variants plus saved addresses. */
export const CHECKOUT_FORM_MARKERS: string[] = [
  SAVED_ADDRESS_FORM,
  ...Object.values(CHECKOUT_ORDER_FORMS).flatMap((f) => [f.authed, f.guest]),
];
