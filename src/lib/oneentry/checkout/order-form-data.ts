/** Turn the delivery step's handoff payload into the order's `formData`. Field markers are looked up by attribute type in the CMS form, never hardcoded. */
import type { IOrdersFormData } from 'oneentry/types';

import { fieldByRole, type FieldRole, soleFieldOfType } from '@/lib/oneentry/forms/field-lookup';
import type { FormContent } from '@/lib/oneentry/forms/form-content';

import type { CheckoutMethod } from './forms';
import { slotWindow } from './slot-window';

/** Contact details a guest supplies for pickup methods. */
export interface GuestContactPayload {
  fullName?: string;
  phone?: string;
  email?: string;
}

/** Address a home delivery is sent to. */
export interface HomeAddressPayload {
  fullName?: string;
  phone?: string;
  line1?: string;
  city?: string;
  postcode?: string;
  instructions?: string;
}

/** What the delivery step writes to `sessionStorage['oe_checkout_payload']`. */
export interface CheckoutHandoffPayload {
  storage: CheckoutMethod;
  isGuest: boolean;
  guestContact?: GuestContactPayload | null;
  homeAddress?: HomeAddressPayload | null;
  /** OE page id of the pickup store. */
  storeId?: string | number | null;
  /** OE page id of the parcel locker. */
  lockerId?: string | number | null;
  deliveryDate?: string;
  deliverySlot?: string;
  /** The `delivery_method` option the shopper picked, as authored in the admin panel. */
  deliveryMethodValue?: string;
}

/** Either the assembled body, or a refusal naming what the form did not provide. */
export type BuildOrderFormDataResult =
  { ok: true; formData: IOrdersFormData[] } | { ok: false; missing: 'method' | 'interval' | 'pickupPoint' };

/** Strip spaces so a formatted phone fits OE's 15-character cap. */
const compactPhone = (v: string | undefined): string => (v ?? '').replace(/\s+/g, '');

/** Append one role-tagged `string` field, if the form has that role at all. */
function pushRole(into: IOrdersFormData[], form: FormContent | undefined, role: FieldRole, value: string): void {
  const field = fieldByRole(form, role);
  if (!field || value === '') return;
  into.push({ marker: field.marker, type: field.type, value });
}

/** Assemble the `formData` array for one order. */
export function buildOrderFormData(
  payload: CheckoutHandoffPayload,
  form: FormContent | undefined,
  now: () => Date = () => new Date(),
): BuildOrderFormDataResult {
  const methodField = soleFieldOfType(form, 'list');
  const intervalField = soleFieldOfType(form, 'timeInterval');
  // Store and locker are both `entity` fields living in different forms, so one lookup serves either branch.
  const pickupPointField = soleFieldOfType(form, 'entity');
  const formData: IOrdersFormData[] = [];

  if (payload.storage === 'home') {
    if (!methodField) return { ok: false, missing: 'method' };
    if (!intervalField) return { ok: false, missing: 'interval' };
    formData.push({
      marker: methodField.marker,
      type: methodField.type,
      // The option the shopper picked, carried across in the payload.
      value: [payload.deliveryMethodValue || (methodField.options.find((o) => o.value === 'home')?.value ?? '')],
    });
    // OE `timeInterval` expects an array of [fromISO, toISO] tuples.
    const dayIso = (payload.deliveryDate ?? now().toISOString()).slice(0, 10);
    const [fromIso, toIso] = slotWindow(payload.deliverySlot, dayIso);
    formData.push({ marker: intervalField.marker, type: intervalField.type, value: [[fromIso, toIso]] });

    // An authed shopper's address is already on their profile; only guests send one with the order.
    if (payload.isGuest && payload.homeAddress) {
      const address = payload.homeAddress;
      pushRole(formData, form, 'fullName', address.fullName ?? payload.guestContact?.fullName ?? '');
      pushRole(formData, form, 'phone', compactPhone(address.phone ?? payload.guestContact?.phone));
      pushRole(formData, form, 'line1', address.line1 ?? '');
      pushRole(formData, form, 'city', address.city ?? '');
      pushRole(formData, form, 'postcode', address.postcode ?? '');
      pushRole(formData, form, 'instructions', address.instructions ?? '');
    }
    return { ok: true, formData };
  }

  if (!pickupPointField) return { ok: false, missing: 'pickupPoint' };
  const pageId = payload.storage === 'store_pickup' ? payload.storeId : payload.lockerId;
  formData.push({
    marker: pickupPointField.marker,
    type: pickupPointField.type,
    // An `entity` field takes an array of ids on form data; wrap to keep it valid.
    value: [String(pageId ?? '')],
  });

  if (payload.isGuest && payload.guestContact) {
    const contact = payload.guestContact;
    pushRole(formData, form, 'fullName', contact.fullName ?? '');
    pushRole(formData, form, 'phone', compactPhone(contact.phone));
    pushRole(formData, form, 'email', contact.email ?? '');
  }
  return { ok: true, formData };
}
