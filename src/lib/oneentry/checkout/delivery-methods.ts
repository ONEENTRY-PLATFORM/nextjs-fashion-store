import { unstable_cache } from 'next/cache';
import { getApi, isError } from '../index';
import { DEFAULT_LOCALE } from '../locale';
import type { Lang } from '../system-text';
import { REVALIDATE_STORES } from '../../isr';
import {
  DELIVERY_METHOD_HOME_LABELS,
  DELIVERY_METHOD_STORE_LABELS,
  DELIVERY_METHOD_LOCKER_LABELS,
} from '../../../app/data/checkoutLabels';
import { DELIVERY_PERKS, PICKUP_PERKS } from '../../../app/data/checkoutConfig';

/** Per-method copy: what the delivery-picker radios render.
 *
 *  Titles/subtitles come from OE `Forms.getFormByMarker('checkout_home_delivery')`
 *  → `delivery_method.listTitles[value=courier|pickup|locker]`, so the marketing
 *  team can edit them without a code change.
 *
 *  Perks/hint come from the same attribute's `additionalFields`:
 *   - home_free_delivery / home_partial_purchase / home_in-home-fitting
 *   - store_pickup_free / store_pickup_partial_purchase / store_pickup_fitting_room
 *   - locaer_text  ← typo preserved as-is in the OE admin panel
 */
export interface DeliveryMethodInfo {
  home:   { title: string; subtitle: string; perks: string[] };
  store:  { title: string; subtitle: string; perks: string[] };
  locker: { title: string; subtitle: string; pinHint: string };
}

/** Fallback copy — used verbatim when OE is unavailable or the form was edited
 *  without one of the fields. Keeps the picker readable in every degraded state. */
const FALLBACK: DeliveryMethodInfo = {
  home: {
    title: DELIVERY_METHOD_HOME_LABELS.title,
    subtitle: DELIVERY_METHOD_HOME_LABELS.subtitle,
    perks: DELIVERY_PERKS.map((p) => p.text),
  },
  store: {
    title: DELIVERY_METHOD_STORE_LABELS.title,
    subtitle: DELIVERY_METHOD_STORE_LABELS.subtitle,
    perks: PICKUP_PERKS.map((p) => p.text),
  },
  locker: {
    title: DELIVERY_METHOD_LOCKER_LABELS.title,
    subtitle: DELIVERY_METHOD_LOCKER_LABELS.subtitle,
    pinHint: DELIVERY_METHOD_LOCKER_LABELS.pinHint,
  },
};

type RawListItem = { value?: unknown; title?: unknown; extended?: { value?: unknown } | null };
type RawAddlField = { value?: unknown };
type RawDeliveryMethodAttr = {
  marker?: unknown;
  listTitles?: RawListItem[];
  additionalFields?: Record<string, RawAddlField>;
};

const asString = (v: unknown): string => (typeof v === 'string' ? v : '');

const pickListItem = (items: RawListItem[] | undefined, value: string) => {
  if (!Array.isArray(items)) return null;
  return items.find((it) => asString(it?.value) === value) ?? null;
};

const readAddl = (fields: Record<string, RawAddlField> | undefined, key: string): string =>
  asString(fields?.[key]?.value);

/** Compact one list item into `{ title, subtitle }` — subtitle lives in `extended.value`. */
const toTitleSub = (
  item: RawListItem | null,
  fallback: { title: string; subtitle: string },
): { title: string; subtitle: string } => {
  if (!item) return fallback;
  return {
    title: asString(item.title) || fallback.title,
    subtitle: asString(item.extended?.value) || fallback.subtitle,
  };
};

/** Compact a list of admin-provided perk strings, dropping empties. */
const perks = (fields: Record<string, RawAddlField> | undefined, keys: string[]): string[] => {
  const out: string[] = [];
  for (const k of keys) {
    const v = readAddl(fields, k);
    if (v) out.push(v);
  }
  return out;
};

/** OE-authored post-order copy for the confirmation page. Reads
 *  `checkout_home_delivery.localizeInfos.successMessage` — the one line the
 *  admin panel offers for "order placed" UX. Returns `null` when the field is
 *  empty, OE errors, or the SDK throws so the confirmation page can fall back
 *  to its literal heading. */
export const loadCheckoutSuccessMessage = unstable_cache(
  async (lang: Lang = DEFAULT_LOCALE): Promise<string | null> => {
    try {
      const form = await getApi().Forms.getFormByMarker('checkout_home_delivery', lang);
      if (isError(form)) return null;
      const li = (form as { localizeInfos?: { successMessage?: unknown } }).localizeInfos;
      const msg = asString(li?.successMessage);
      return msg.length > 0 ? msg : null;
    } catch {
      return null;
    }
  },
  ['oe-checkout-success-message'],
  { revalidate: REVALIDATE_STORES, tags: ['oe-forms'] },
);

export const loadDeliveryMethodInfo = unstable_cache(
  async (lang: Lang = DEFAULT_LOCALE): Promise<DeliveryMethodInfo> => {
    try {
      const form = await getApi().Forms.getFormByMarker('checkout_home_delivery', lang);
      if (isError(form)) return FALLBACK;
      const attrs = (form as { attributes?: unknown[] }).attributes;
      if (!Array.isArray(attrs)) return FALLBACK;
      const deliveryAttr = attrs.find(
        (a): a is RawDeliveryMethodAttr => typeof a === 'object' && a !== null && (a as { marker?: unknown }).marker === 'delivery_method',
      );
      if (!deliveryAttr) return FALLBACK;
      const list = deliveryAttr.listTitles;
      const addl = deliveryAttr.additionalFields;
      const home = toTitleSub(pickListItem(list, 'courier'), FALLBACK.home);
      const store = toTitleSub(pickListItem(list, 'pickup'), FALLBACK.store);
      const locker = toTitleSub(pickListItem(list, 'locker'), FALLBACK.locker);
      // Home perks: free / partial / fitting. Fall back on the whole set if
      // the admin left the fields blank so the card doesn't render bare.
      const homePerks = perks(addl, ['home_free_delivery', 'home_partial_purchase', 'home_in-home-fitting']);
      const storePerks = perks(addl, ['store_pickup_free', 'store_pickup_partial_purchase', 'store_pickup_fitting_room']);
      // OE misspells this key as `locaer_text` — kept verbatim, changing the
      // key on the admin side would be a coordinated content-team task.
      const lockerHint = readAddl(addl, 'locaer_text') || FALLBACK.locker.pinHint;
      return {
        home:   { ...home,   perks: homePerks.length > 0 ? homePerks : FALLBACK.home.perks },
        store:  { ...store,  perks: storePerks.length > 0 ? storePerks : FALLBACK.store.perks },
        locker: { ...locker, pinHint: lockerHint },
      };
    } catch {
      return FALLBACK;
    }
  },
  ['oe-delivery-method-info'],
  // Same TTL as stores — both are admin-editable copy that rarely changes.
  { revalidate: REVALIDATE_STORES, tags: ['oe-forms'] },
);
