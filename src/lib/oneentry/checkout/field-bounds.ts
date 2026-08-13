/** Map the OE checkout forms' `validators` onto the storefront's Zod schemas. */
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

/** Bounds for the fields the delivery step is currently showing. */
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
