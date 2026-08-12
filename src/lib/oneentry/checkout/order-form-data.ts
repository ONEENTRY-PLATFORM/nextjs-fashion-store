/**
 * Turn the delivery step's handoff payload into the order's `formData`.
 *
 * Field markers are read from the CMS form the order is filed into, not written
 * down here: the method picker is that form's only `list` attribute, the
 * delivery window its only `timeInterval`, and the pickup point (store or
 * locker — both reference an OE page) its only `entity`. The address and
 * contact inputs, which are all `string` and have no structural tell, are found
 * by the `field_role` an editor tagged them with. Renaming any marker in the
 * admin panel therefore keeps working, where a shipped marker table would
 * silently stop matching and surface as OE rejecting the order.
 *
 * Pure and free of React so the wire shape can be asserted directly.
 */
import type { IOrdersFormData } from 'oneentry/dist/orders/ordersInterfaces';

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
  /**
   * The `delivery_method` option the shopper picked, as authored in the admin
   * panel — the order-storage marker of the method. Carried from the delivery
   * step so this side never has to guess what OE calls a courier delivery.
   */
  deliveryMethodValue?: string;
}

/**
 * Either the assembled body, or a refusal naming what the form did not provide.
 *
 * The refusal matters: submitting anyway would post a body OE is certain to
 * reject, and its rejection names a raw attribute marker under the Place Order
 * button — a dead end for the shopper.
 */
export type BuildOrderFormDataResult =
  { ok: true; formData: IOrdersFormData[] } | { ok: false; missing: 'method' | 'interval' | 'pickupPoint' };

/** Strip spaces so a formatted phone fits OE's 15-character cap. */
const compactPhone = (v: string | undefined): string => (v ?? '').replace(/\s+/g, '');

/**
 * Append one role-tagged `string` field, if the form has that role at all.
 *
 * A role the form does not carry is skipped rather than guessed at: sending an
 * invented marker earns a rejection naming it, which helps nobody.
 *
 * @param into  - Body being assembled.
 * @param form  - Form the order is filed into.
 * @param role  - Role to look up.
 * @param value - Value to send; empty values are dropped, since OE measures an
 *                empty string against the attribute's own length rules.
 */
function pushRole(into: IOrdersFormData[], form: FormContent | undefined, role: FieldRole, value: string): void {
  const field = fieldByRole(form, role);
  if (!field || value === '') return;
  into.push({ marker: field.marker, type: field.type, value });
}

/**
 * Assemble the `formData` array for one order.
 *
 * @param payload - The delivery step's handoff payload.
 * @param form    - The loaded CMS form the order is filed into; `undefined`
 *                  when it never loaded, which fails the build rather than
 *                  guessing markers.
 * @param now     - Clock for the delivery-date fallback, injectable for tests.
 * @returns The body, or a refusal naming the field that could not be resolved.
 */
export function buildOrderFormData(
  payload: CheckoutHandoffPayload,
  form: FormContent | undefined,
  now: () => Date = () => new Date(),
): BuildOrderFormDataResult {
  const methodField = soleFieldOfType(form, 'list');
  const intervalField = soleFieldOfType(form, 'timeInterval');
  // Store and locker are both `entity` fields living in different forms, so one
  // lookup serves either branch.
  const pickupPointField = soleFieldOfType(form, 'entity');
  const formData: IOrdersFormData[] = [];

  if (payload.storage === 'home') {
    if (!methodField) return { ok: false, missing: 'method' };
    if (!intervalField) return { ok: false, missing: 'interval' };
    formData.push({
      marker: methodField.marker,
      type: methodField.type,
      // The option the shopper picked, carried across in the payload. The
      // fallback re-derives it from the form by the same rule the picker used:
      // an option's value is its order-storage marker.
      value: [payload.deliveryMethodValue || (methodField.options.find((o) => o.value === 'home')?.value ?? '')],
    });
    // OE `timeInterval` expects an array of [fromISO, toISO] tuples. Slots
    // loaded from OE carry an `HHMM-HHMM` id (see `delivery-schedule.ts`); the
    // shipped fallback list still uses the legacy morning/afternoon/evening
    // names. `slotWindow` decodes both — reading only the legacy names
    // collapsed every OE-configured slot onto the 09:00–13:00 default, so an
    // evening pick was filed as a morning delivery.
    const dayIso = (payload.deliveryDate ?? now().toISOString()).slice(0, 10);
    const [fromIso, toIso] = slotWindow(payload.deliverySlot, dayIso);
    formData.push({ marker: intervalField.marker, type: intervalField.type, value: [[fromIso, toIso]] });

    // An authed shopper's address is already on their profile; only guests send
    // one with the order.
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
    // An `entity` field takes an array of ids on form data; wrap to keep it
    // valid. The locker used to travel as a 1-based index into a hardcoded
    // array — offset by one because OE reads a literal 0 as "missing" — which
    // made that array's order part of the wire contract.
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
