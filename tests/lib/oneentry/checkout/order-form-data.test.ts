import { describe, expect, it } from 'vitest';

import { buildOrderFormData, type CheckoutHandoffPayload } from '@/lib/oneentry/checkout/order-form-data';
import type { FormAttributeContent, FormContent } from '@/lib/oneentry/forms/form-content';
import { EMPTY_FORM_CONTENT, NO_FIELD_LIMITS } from '@/lib/oneentry/forms/form-content';

function field(
  over: Partial<FormAttributeContent> & { marker: string; type: string; role?: string },
): FormAttributeContent {
  const { role, ...rest } = over;
  return {
    position: 1,
    isVisible: true,
    title: '',
    placeholder: '',
    // `field_role` is how an editor marks what a `string` attribute is for.
    fields: role ? { field_role: role } : {},
    options: [],
    limits: NO_FIELD_LIMITS,
    ...rest,
  };
}

function form(fields: FormAttributeContent[]): FormContent {
  return {
    ...EMPTY_FORM_CONTENT,
    attributes: Object.fromEntries(fields.map((f) => [f.marker, f])),
    fields,
  };
}

const METHOD_OPTIONS = [
  { title: 'Home', value: 'home', extended: '', entityId: null, depth: null, parentId: null },
  { title: 'Pickup', value: 'store_pickup', extended: '', entityId: null, depth: null, parentId: null },
];

/** Markers here are deliberately non-production, to prove nothing matches on them. */
const HOME_FORM = form([
  field({ marker: 'renamed_method', type: 'list', options: METHOD_OPTIONS }),
  field({ marker: 'renamed_window', type: 'timeInterval', position: 2 }),
  field({ marker: 'renamed_name', type: 'string', position: 3, role: 'fullName' }),
  field({ marker: 'renamed_phone', type: 'string', position: 4, role: 'phone' }),
  field({ marker: 'renamed_street', type: 'string', position: 5, role: 'line1' }),
  field({ marker: 'renamed_town', type: 'string', position: 6, role: 'city' }),
  field({ marker: 'renamed_zip', type: 'string', position: 7, role: 'postcode' }),
  field({ marker: 'renamed_notes', type: 'string', position: 8, role: 'instructions' }),
]);

const LOCKER_FORM = form([
  field({ marker: 'renamed_pickup_point', type: 'entity' }),
  field({ marker: 'renamed_name', type: 'string', position: 2, role: 'fullName' }),
  field({ marker: 'renamed_phone', type: 'string', position: 3, role: 'phone' }),
  field({ marker: 'renamed_email', type: 'string', position: 4, role: 'email' }),
]);

const HOME_PAYLOAD: CheckoutHandoffPayload = {
  storage: 'home',
  isGuest: false,
  deliveryDate: '2026-08-20T00:00:00.000Z',
  deliverySlot: '1700-2100',
  deliveryMethodValue: 'home',
};

const CLOCK = () => new Date('2026-08-12T09:00:00.000Z');

describe('buildOrderFormData — home delivery', () => {
  it('takes the method and window markers from the form, whatever they are called', () => {
    const built = buildOrderFormData(HOME_PAYLOAD, HOME_FORM, CLOCK);

    expect(built.ok).toBe(true);
    if (!built.ok) return;
    expect(built.formData.map((e) => e.marker)).toEqual(['renamed_method', 'renamed_window']);
  });

  it('submits the option value the shopper picked', () => {
    const built = buildOrderFormData(HOME_PAYLOAD, HOME_FORM, CLOCK);

    if (!built.ok) throw new Error('expected a body');
    expect(built.formData[0].value).toEqual(['home']);
  });

  it('decodes the picked slot into the exact window it names', () => {
    const built = buildOrderFormData(HOME_PAYLOAD, HOME_FORM, CLOCK);

    if (!built.ok) throw new Error('expected a body');
    expect(built.formData[1].value).toEqual([['2026-08-20T17:00:00.000Z', '2026-08-20T21:00:00.000Z']]);
  });

  it('refuses to build when the form carries no method field', () => {
    const built = buildOrderFormData(HOME_PAYLOAD, form([field({ marker: 'w', type: 'timeInterval' })]), CLOCK);

    expect(built).toEqual({ ok: false, missing: 'method' });
  });

  it('refuses to build when the form never loaded', () => {
    expect(buildOrderFormData(HOME_PAYLOAD, undefined, CLOCK)).toEqual({ ok: false, missing: 'method' });
  });

  it('sends no address for a signed-in shopper — theirs is on the profile', () => {
    const built = buildOrderFormData({ ...HOME_PAYLOAD, homeAddress: { line1: '12 Baker Street' } }, HOME_FORM, CLOCK);

    if (!built.ok) throw new Error('expected a body');
    expect(built.formData).toHaveLength(2);
  });

  it('sends the guest address under the markers the form tagged, with the phone compacted', () => {
    const built = buildOrderFormData(
      {
        ...HOME_PAYLOAD,
        isGuest: true,
        homeAddress: {
          fullName: 'Test User',
          phone: '+44 207 946 0000',
          line1: '12 Baker Street',
          city: 'London',
          postcode: 'W1A 1AA',
        },
      },
      HOME_FORM,
      CLOCK,
    );

    if (!built.ok) throw new Error('expected a body');
    const byMarker = Object.fromEntries(built.formData.map((e) => [e.marker, e.value]));
    // The markers come from `field_role`, so these are the fixture's names —
    // nothing here matches a production marker.
    expect(byMarker.renamed_phone).toBe('+442079460000');
    expect(byMarker.renamed_town).toBe('London');
    expect(byMarker.renamed_street).toBe('12 Baker Street');
    // Optional and empty — an empty string would trip OE's own length check.
    expect(byMarker).not.toHaveProperty('renamed_notes');
  });

  it('skips a role the form does not carry rather than inventing a marker', () => {
    const withoutPostcode = form([
      field({ marker: 'm', type: 'list', options: METHOD_OPTIONS }),
      field({ marker: 'w', type: 'timeInterval', position: 2 }),
      field({ marker: 'c', type: 'string', position: 3, role: 'city' }),
    ]);

    const built = buildOrderFormData(
      { ...HOME_PAYLOAD, isGuest: true, homeAddress: { city: 'London', postcode: 'W1A 1AA' } },
      withoutPostcode,
      CLOCK,
    );

    if (!built.ok) throw new Error('expected a body');
    expect(built.formData.map((e) => e.marker)).toEqual(['m', 'w', 'c']);
  });
});

describe('buildOrderFormData — pickup points', () => {
  it('sends the locker as an entity reference to its OE page', () => {
    const built = buildOrderFormData({ storage: 'locker', isGuest: false, lockerId: 561 }, LOCKER_FORM, CLOCK);

    if (!built.ok) throw new Error('expected a body');
    expect(built.formData).toEqual([{ marker: 'renamed_pickup_point', type: 'entity', value: ['561'] }]);
  });

  it('sends the store the same way — one entity field serves both', () => {
    const built = buildOrderFormData(
      { storage: 'store_pickup', isGuest: false, storeId: 169 },
      form([field({ marker: 'renamed_store', type: 'entity' })]),
      CLOCK,
    );

    if (!built.ok) throw new Error('expected a body');
    expect(built.formData[0]).toEqual({ marker: 'renamed_store', type: 'entity', value: ['169'] });
  });

  it('refuses to build when the form has no entity field to reference', () => {
    const built = buildOrderFormData({ storage: 'locker', isGuest: false, lockerId: 561 }, form([]), CLOCK);

    expect(built).toEqual({ ok: false, missing: 'pickupPoint' });
  });

  it('appends guest contact details under the markers that form tagged', () => {
    const built = buildOrderFormData(
      {
        storage: 'locker',
        isGuest: true,
        lockerId: 561,
        guestContact: { fullName: 'Test User', phone: '+44 207 946 0000', email: 'test@example.com' },
      },
      LOCKER_FORM,
      CLOCK,
    );

    if (!built.ok) throw new Error('expected a body');
    expect(built.formData.map((e) => e.marker)).toEqual([
      'renamed_pickup_point',
      'renamed_name',
      'renamed_phone',
      'renamed_email',
    ]);
  });
});
