import { describe, expect, it } from 'vitest';

import { VALIDATION_MESSAGES } from '@/app/data/validationMessages';
import { createSchemas } from '@/app/utils/schemas';
import { buildCheckoutBounds } from '@/lib/oneentry/checkout/field-bounds';
import type { FormContent } from '@/lib/oneentry/forms/form-content';

/** Minimal `FormContent` carrying just the limits under test. */
function form(limits: Record<string, { min?: number | null; max?: number | null }>): FormContent {
  return {
    title: '',
    titleForSite: '',
    successMessage: '',
    unsuccessMessage: '',
    attributes: Object.fromEntries(
      Object.entries(limits).map(([marker, { min = null, max = null }]) => [
        marker,
        { title: '', fields: {}, options: [], limits: { required: true, min, max, email: false } },
      ]),
    ),
  };
}

const GUEST_HOME = form({
  checkout_home_guest_full_name: { min: 2, max: 60 },
  checkout_home_guest_phone: { min: 9, max: 15 },
  checkout_home_guest_address_line1: { min: 10, max: 100 },
  checkout_home_guest_city: { min: 2, max: 20 },
  checkout_home_guest_post_code: { min: 5, max: 10 },
  checkout_home_guest_special_instrations: { max: 200 },
});

const SAVED_ADDRESSES = form({
  user_addresses_recipient_name: { min: 1, max: 50 },
  user_addresses_line_1: {},
});

describe('buildCheckoutBounds', () => {
  it('reads the guest home form when the shopper has no session', () => {
    const bounds = buildCheckoutBounds({
      isLoggedIn: false,
      method: 'home',
      forms: { checkout_home_delivery_guest: GUEST_HOME },
    });
    expect(bounds.address?.line1).toEqual({ min: 10, max: 100 });
    expect(bounds.address?.postcode).toEqual({ min: 5, max: 10 });
  });

  it('reads user_addresses for a signed-in shopper', () => {
    const bounds = buildCheckoutBounds({
      isLoggedIn: true,
      method: 'home',
      forms: { user_addresses: SAVED_ADDRESSES, checkout_home_delivery_guest: GUEST_HOME },
    });
    expect(bounds.address?.fullName).toEqual({ min: 1, max: 50 });
    // `user_addresses_line_1` is unbounded in OE — no bound must leak in from
    // the guest form.
    expect(bounds.address?.line1).toBeUndefined();
  });

  it('picks the contact form matching the delivery method', () => {
    const forms = {
      checkout_store_pickup_guest: form({ checkout_store_pickup_guest_phone: { min: 9, max: 15 } }),
      checkout_locker_guest: form({ checkout_locker_guest_phone: { min: 7, max: 30 } }),
    };
    expect(buildCheckoutBounds({ isLoggedIn: false, method: 'store', forms }).guestContact?.phone).toEqual({
      min: 9,
      max: 15,
    });
    expect(buildCheckoutBounds({ isLoggedIn: false, method: 'locker', forms }).guestContact?.phone).toEqual({
      min: 7,
      max: 30,
    });
  });

  it('yields no bounds when the forms were not loaded', () => {
    const bounds = buildCheckoutBounds({ isLoggedIn: false, method: 'home', forms: {} });
    expect(bounds.address?.line1).toBeUndefined();
    expect(bounds.guestContact?.phone).toBeUndefined();
  });
});

describe('createSchemas with OE bounds', () => {
  const bounds = buildCheckoutBounds({
    isLoggedIn: false,
    method: 'home',
    forms: { checkout_home_delivery_guest: GUEST_HOME },
  });
  const { addressSchema } = createSchemas(VALIDATION_MESSAGES, bounds);
  const valid = {
    fullName: 'Ivan Guest',
    phone: '+44 20 7946 0000',
    line1: '12 Baker Street',
    city: 'London',
    postcode: 'SW1A 1AA',
    instructions: '',
  };

  it('accepts an address OE would accept', () => {
    expect(addressSchema.safeParse(valid).success).toBe(true);
  });

  it('rejects a street line shorter than OE allows, on the line1 field', () => {
    // This is the exact input that used to reach OE and come back as
    // `required values are missing or incorrect: checkout_home_guest_address_line1`.
    const result = addressSchema.safeParse({ ...valid, line1: 'Baker st' });
    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.error.issues[0].path).toEqual(['line1']);
      expect(result.error.issues[0].message).toContain('10');
    }
  });

  it('rejects a city longer than OE allows', () => {
    expect(addressSchema.safeParse({ ...valid, city: 'A'.repeat(21) }).success).toBe(false);
  });

  it('measures the phone the way it is sent — spaces stripped', () => {
    // 9 digits with spaces is 12 characters raw; OE sees the compacted value.
    expect(addressSchema.safeParse({ ...valid, phone: '+44 1 2 3 4' }).success).toBe(false);
    expect(addressSchema.safeParse({ ...valid, phone: '+44 207 946 0000' }).success).toBe(true);
  });

  it('leaves an empty optional instructions field alone', () => {
    expect(addressSchema.safeParse({ ...valid, instructions: '' }).success).toBe(true);
    expect(addressSchema.safeParse({ ...valid, instructions: 'x'.repeat(201) }).success).toBe(false);
  });

  it('applies no extra bounds when OE handed none down', () => {
    const { addressSchema: unbounded } = createSchemas(VALIDATION_MESSAGES);
    expect(unbounded.safeParse({ ...valid, line1: 'Baker st' }).success).toBe(true);
  });
});
