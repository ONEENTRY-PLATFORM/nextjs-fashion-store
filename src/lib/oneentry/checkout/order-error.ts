/** Make OneEntry's order-rejection messages readable. */
import type { FormContent } from '@/lib/oneentry/forms/form-content';

/** Attribute marker → the label the shopper saw above that input. */
export type OrderFieldLabels = Record<string, string>;

/** Markers OE lists after the colon, comma-separated. */
const MARKER = /[a-z][a-z0-9_-]{3,}/gi;

/** Collect every loaded form's attribute labels into one marker → label table. */
export function buildOrderFieldLabels(forms: Array<FormContent | undefined | null>): OrderFieldLabels {
  const out: OrderFieldLabels = {};
  for (const form of forms) {
    for (const field of form?.fields ?? []) {
      if (field.title) out[field.marker] = field.title;
    }
  }
  return out;
}

/** Rewrite an OE order error so it names the field the shopper filled in. */
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
