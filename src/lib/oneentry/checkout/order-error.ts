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
 *
 * The marker → label table is harvested from the checkout forms themselves —
 * every attribute already carries its shopper-facing label in
 * `localizeInfos.title`. A shipped table would go stale the moment an editor
 * renamed a marker or reworded a label, and it would go stale silently: the
 * message would fall back to naming the raw marker again.
 */
import type { FormContent } from '@/lib/oneentry/forms/form-content';

/** Attribute marker → the label the shopper saw above that input. */
export type OrderFieldLabels = Record<string, string>;

/** Markers OE lists after the colon, comma-separated. */
const MARKER = /[a-z][a-z0-9_-]{3,}/gi;

/**
 * Collect every loaded form's attribute labels into one marker → label table.
 *
 * @param forms - Loaded checkout forms; unloaded entries are skipped.
 * @returns Labels keyed by attribute marker. Attributes the admin left
 *          unlabelled are omitted, so their marker survives verbatim in the
 *          message rather than being replaced by an empty quote.
 */
export function buildOrderFieldLabels(forms: Array<FormContent | undefined | null>): OrderFieldLabels {
  const out: OrderFieldLabels = {};
  for (const form of forms) {
    for (const field of form?.fields ?? []) {
      if (field.title) out[field.marker] = field.title;
    }
  }
  return out;
}

/**
 * Rewrite an OE order error so it names the field the shopper filled in.
 *
 * @param message  - Raw `error` string from `createOrderAction`.
 * @param hint     - Sentence appended when at least one marker was recognised,
 *                   pointing back at the step that owns the field.
 * @param labels   - Marker → label table from {@link buildOrderFieldLabels}.
 *                   Empty when no form was loaded, in which case the message is
 *                   returned unchanged.
 * @returns The message with known markers replaced by their field labels, plus
 *          the hint. Unrecognised messages are returned unchanged.
 */
export function explainOrderError(message: string, hint: string, labels: OrderFieldLabels = {}): string {
  if (!message) return message;
  let matched = false;
  const rewritten = message.replace(MARKER, (token) => {
    const label = labels[token];
    if (!label) return token;
    matched = true;
    return `“${label}”`;
  });
  return matched ? `${rewritten}. ${hint}` : message;
}
