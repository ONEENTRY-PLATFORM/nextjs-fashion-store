import { getSystemSet, readSystemValue, type Lang } from '../system-text';
import { CHECKOUT_SET_MARKERS, type CheckoutSystemTexts } from './checkout-types';
import { DEFAULT_LOCALE } from '../locale';
export { CHECKOUT_SET_MARKERS } from './checkout-types';
export type { CheckoutSetMarker, CheckoutSystemTexts } from './checkout-types';

export async function loadCheckoutSystemTexts(
  lang: Lang = DEFAULT_LOCALE,
): Promise<CheckoutSystemTexts> {
  const entries = await Promise.all(
    CHECKOUT_SET_MARKERS.map(async (marker) => {
      const schema = await getSystemSet(marker, lang);
      const dict: Record<string, string> = {};
      for (const [key, item] of Object.entries(schema)) {
        const v = readSystemValue(item, lang);
        if (typeof v === 'string' && v.length > 0) dict[key] = v;
      }
      return [marker, dict] as const;
    }),
  );
  return Object.fromEntries(entries) as CheckoutSystemTexts;
}
