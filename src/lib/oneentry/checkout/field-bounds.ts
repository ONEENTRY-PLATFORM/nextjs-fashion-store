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
 *
 * Which attribute holds which bound is asked of the form too: every address and
 * contact attribute carries a `field_role`, so this file names no markers at
 * all. It used to carry a table of them, and that table had a silent failure
 * mode — rename one marker in the admin panel and its bound simply disappeared.
 */
import type { CheckoutBounds, FieldBounds } from '@/app/utils/schemas';
import { fieldByRole, type FieldRole } from '@/lib/oneentry/forms/field-lookup';
import type { FormContent } from '@/lib/oneentry/forms/form-content';

import { CHECKOUT_ORDER_FORMS, SAVED_ADDRESS_FORM } from './forms';

/** Read one role's length bounds; `undefined` when the form or role is absent. */
function boundsOf(form: FormContent | undefined, role: FieldRole): FieldBounds | undefined {
  const limits = fieldByRole(form, role)?.limits;
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
  const contactForm =
    method === 'locker' ? forms[CHECKOUT_ORDER_FORMS.locker.guest] : forms[CHECKOUT_ORDER_FORMS.store_pickup.guest];

  return {
    address: {
      fullName: boundsOf(addressForm, 'fullName'),
      phone: boundsOf(addressForm, 'phone'),
      line1: boundsOf(addressForm, 'line1'),
      city: boundsOf(addressForm, 'city'),
      postcode: boundsOf(addressForm, 'postcode'),
      instructions: boundsOf(addressForm, 'instructions'),
    },
    guestContact: {
      fullName: boundsOf(contactForm, 'fullName'),
      phone: boundsOf(contactForm, 'phone'),
    },
  };
}
