/**
 * Which OneEntry form each checkout flow writes into.
 *
 * These are *form* markers, not field markers: they address the resource, the
 * way a table name does. Everything inside a form — field order, labels,
 * placeholders, option lists, length limits — is read from the form itself, so
 * this file is the only place checkout names anything in the CMS.
 *
 * Guests file into a `_guest` twin of every order form, which carries its own
 * (stricter) validators; the storage marker gets the same suffix server-side in
 * `createOrderAction`.
 */

/** Delivery methods, named by their OE order-storage marker. */
export type CheckoutMethod = 'home' | 'store_pickup' | 'locker';

/** Order form per delivery method, per auth state. */
export const CHECKOUT_ORDER_FORMS: Record<CheckoutMethod, { authed: string; guest: string }> = {
  home: { authed: 'checkout_home_delivery', guest: 'checkout_home_delivery_guest' },
  store_pickup: { authed: 'checkout_store_pickup', guest: 'checkout_store_pickup_guest' },
  locker: { authed: 'checkout_locker', guest: 'checkout_locker_guest' },
};

/**
 * Where a signed-in shopper's addresses live.
 *
 * Authed home-delivery orders carry no address fields of their own — the
 * address is saved here first and the order references the profile — so this
 * form is what bounds the delivery step's address inputs for them.
 */
export const SAVED_ADDRESS_FORM = 'user_addresses';

/**
 * The order form for one flow.
 *
 * @param method     - Delivery method the shopper picked.
 * @param isGuest    - Whether the order is filed anonymously.
 * @returns The OE form marker to load.
 */
export function orderFormMarker(method: CheckoutMethod, isGuest: boolean): string {
  return isGuest ? CHECKOUT_ORDER_FORMS[method].guest : CHECKOUT_ORDER_FORMS[method].authed;
}

/**
 * Every form the checkout steps read — both auth variants plus saved
 * addresses. Route shells load these into `FormPlaceholdersProvider` so client
 * components can resolve any field they need without a second round trip.
 */
export const CHECKOUT_FORM_MARKERS: string[] = [
  SAVED_ADDRESS_FORM,
  ...Object.values(CHECKOUT_ORDER_FORMS).flatMap((f) => [f.authed, f.guest]),
];
