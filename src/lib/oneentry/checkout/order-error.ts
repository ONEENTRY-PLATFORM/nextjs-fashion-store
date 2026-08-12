/**
 * Make OneEntry's order-rejection messages readable.
 *
 * When a form value fails OE's own validators the API answers with
 * `required values are missing or incorrect: checkout_home_guest_address_line1`
 * — an internal attribute marker, rendered verbatim under the Place Order
 * button. The shopper has no way to map that back to a field, and the field in
 * question lives on the *previous* step.
 *
 * The storefront mirrors OE's limits client-side (see `field-bounds.ts`), so
 * this path should now be rare; it still fires when an editor tightens a rule
 * the storefront doesn't model (a regex, a `list` value, a store entity id).
 */

/** Attribute marker → the label the shopper saw above that input. */
const FIELD_LABELS: Record<string, string> = {
  // Home delivery — guest
  checkout_home_guest_full_name: 'Full Name',
  checkout_home_guest_phone: 'Phone',
  checkout_home_guest_address_line1: 'Address Line 1',
  checkout_home_guest_city: 'City',
  checkout_home_guest_post_code: 'Postal Code',
  checkout_home_guest_special_instrations: 'Special Instructions',
  // Store pickup — guest
  checkout_store_pickup_guest_store: 'Pickup store',
  checkout_store_pickup_guest_full_name: 'Full Name',
  checkout_store_pickup_guest_phone: 'Phone',
  checkout_store_pickup_guest_email: 'Email',
  // Parcel locker — guest
  checkout_locker_guest_pickup_point: 'Pickup point',
  checkout_locker_guest_full_name: 'Full Name',
  checkout_locker_guest_phone: 'Phone',
  checkout_locker_guest_email: 'Email',
  // Authed
  checkout_store_pickup_select_store: 'Pickup store',
  checkout_locker_pickup_point: 'Pickup point',
  delivery_method: 'Delivery method',
  delivery_method_guest: 'Delivery method',
  'delivery_date-time': 'Delivery date & time',
  'delivery_date-time_guest': 'Delivery date & time',
};

/** Markers OE lists after the colon, comma-separated. */
const MARKER = /[a-z][a-z0-9_-]{3,}/gi;

/**
 * Rewrite an OE order error so it names the field the shopper filled in.
 *
 * @param message  - Raw `error` string from `createOrderAction`.
 * @param hint     - Sentence appended when at least one marker was recognised,
 *                   pointing back at the step that owns the field.
 * @returns The message with known markers replaced by their field labels, plus
 *          the hint. Unrecognised messages are returned unchanged.
 */
export function explainOrderError(message: string, hint: string): string {
  if (!message) return message;
  let matched = false;
  const rewritten = message.replace(MARKER, (token) => {
    const label = FIELD_LABELS[token];
    if (!label) return token;
    matched = true;
    return `“${label}”`;
  });
  return matched ? `${rewritten}. ${hint}` : message;
}
