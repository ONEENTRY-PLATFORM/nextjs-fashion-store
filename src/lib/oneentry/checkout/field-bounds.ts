/**
 * Map the OE checkout forms' `validators` onto the storefront's Zod schemas.
 *
 * The delivery step writes into one of four OE forms depending on auth state
 * and delivery method, and each one carries its own `stringMin` / `stringMax`
 * per field. Those are enforced when the order is POSTed — a shopper who typed
 * a 9-character street line used to sail through the delivery step and get
 * `required values are missing or incorrect: checkout_home_guest_address_line1`
 * back from OE at "Place Order", with no way to tell which field to fix.
 *
 * Mirroring the numbers here keeps the check at the input that owns it, and
 * keeps the source of truth in the admin panel rather than in a constant the
 * editor can't see.
 */
import type { CheckoutBounds, FieldBounds } from '@/app/utils/schemas';
import type { FormContent } from '@/lib/oneentry/forms/form-content';

import { CHECKOUT_ORDER_FORMS, SAVED_ADDRESS_FORM } from './forms';

/**
 * Attribute markers of the address fields, per OE form.
 *
 * The last marker table left in checkout, and it is on borrowed time. Every
 * other field is now found by what it is — the method picker is the order
 * form's only `list` attribute, the store its only `entity` — but the address
 * inputs are six interchangeable `string` attributes that nothing structural
 * tells apart. Naming them here is a stopgap with a known failure mode: rename
 * one in the admin panel and its bound silently disappears, leaving the shopper
 * to discover the limit at "Place Order".
 *
 * It goes away when the address inputs are rendered from the form's own field
 * list instead of from a fixed layout — at which point the marker never has to
 * be spoken at all.
 */
const ADDRESS_MARKERS = {
  /** `checkout_home_delivery_guest` — the guest home-delivery order form. */
  guest: {
    fullName: 'checkout_home_guest_full_name',
    phone: 'checkout_home_guest_phone',
    line1: 'checkout_home_guest_address_line1',
    city: 'checkout_home_guest_city',
    postcode: 'checkout_home_guest_post_code',
    // OE marker keeps the admin panel's typo.
    instructions: 'checkout_home_guest_special_instrations',
  },
  /** `user_addresses` — the signed-in shopper's saved-address form. */
  authed: {
    fullName: 'user_addresses_recipient_name',
    phone: 'user_addresses_recipient_phone',
    line1: 'user_addresses_line_1',
    city: 'user_addresses_city',
    postcode: 'user_addresses_post_code',
    instructions: 'user_addresses_special_instructions',
  },
} as const;

/** Contact-field markers on the two guest pickup forms. */
const CONTACT_MARKERS = {
  store: { fullName: 'checkout_store_pickup_guest_full_name', phone: 'checkout_store_pickup_guest_phone' },
  locker: { fullName: 'checkout_locker_guest_full_name', phone: 'checkout_locker_guest_phone' },
} as const;

/** Read one attribute's length bounds; `undefined` when the form isn't loaded. */
function boundsOf(form: FormContent | undefined, marker: string): FieldBounds | undefined {
  const limits = form?.attributes?.[marker]?.limits;
  if (!limits) return undefined;
  if (limits.min == null && limits.max == null) return undefined;
  return { min: limits.min, max: limits.max, trim: limits.trim };
}

export interface BuildCheckoutBoundsInput {
  /** Drives which form the order will be filed under. */
  isLoggedIn: boolean;
  /** Delivery method selected on the step. */
  method: 'home' | 'store' | 'locker';
  /** Loaded OE form content, keyed by form marker. */
  forms: Record<string, FormContent | undefined>;
}

/**
 * Bounds for the fields the delivery step is currently showing.
 *
 * Guests writing a home delivery are checked against
 * `checkout_home_delivery_guest`; signed-in shoppers against `user_addresses`
 * (their address is saved there, then referenced by the order). Guest contact
 * fields follow the pickup form that matches the chosen method.
 *
 * @param input             - Auth state, delivery method, and the loaded forms.
 * @param input.isLoggedIn  - Whether the shopper has a session.
 * @param input.method      - Delivery method selected on the step.
 * @param input.forms       - Loaded OE form content, keyed by form marker.
 * @returns Bounds to hand to `useSchemas`. Empty for anything OE didn't bound.
 */
export function buildCheckoutBounds({ isLoggedIn, method, forms }: BuildCheckoutBoundsInput): CheckoutBounds {
  const addressForm = isLoggedIn ? forms[SAVED_ADDRESS_FORM] : forms[CHECKOUT_ORDER_FORMS.home.guest];
  const addressMarkers = isLoggedIn ? ADDRESS_MARKERS.authed : ADDRESS_MARKERS.guest;
  const contactForm =
    method === 'locker' ? forms[CHECKOUT_ORDER_FORMS.locker.guest] : forms[CHECKOUT_ORDER_FORMS.store_pickup.guest];
  const contactMarkers = method === 'locker' ? CONTACT_MARKERS.locker : CONTACT_MARKERS.store;

  return {
    address: {
      fullName: boundsOf(addressForm, addressMarkers.fullName),
      phone: boundsOf(addressForm, addressMarkers.phone),
      line1: boundsOf(addressForm, addressMarkers.line1),
      city: boundsOf(addressForm, addressMarkers.city),
      postcode: boundsOf(addressForm, addressMarkers.postcode),
      instructions: boundsOf(addressForm, addressMarkers.instructions),
    },
    guestContact: {
      fullName: boundsOf(contactForm, contactMarkers.fullName),
      phone: boundsOf(contactForm, contactMarkers.phone),
    },
  };
}
