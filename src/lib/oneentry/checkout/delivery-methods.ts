import { unstable_cache } from 'next/cache';

import { DELIVERY_PERKS, PICKUP_PERKS } from '@/app/data/checkoutConfig';
import {
  DELIVERY_METHOD_HOME_LABELS,
  DELIVERY_METHOD_LOCKER_LABELS,
  DELIVERY_METHOD_STORE_LABELS,
} from '@/app/data/checkoutLabels';
import { REVALIDATE_STORES } from '@/lib/isr';
import { CHECKOUT_ORDER_FORMS } from '@/lib/oneentry/checkout/forms';
import { currentCmsLocale } from '@/lib/oneentry/current-locale';
import { fieldsOfType, soleFieldOfType } from '@/lib/oneentry/forms/field-lookup';
import type { FormFieldOption } from '@/lib/oneentry/forms/form-content';
import { loadFormContent } from '@/lib/oneentry/forms/placeholders';
import type { Lang } from '@/lib/oneentry/system-text';

/** The order form that carries the method picker and its copy. */
const DELIVERY_METHOD_FORM = CHECKOUT_ORDER_FORMS.home.authed;

/**
 * Per-method copy: what the delivery-picker radios render.
 *
 *  Titles/subtitles/values come from OE
 *  `Forms.getFormByMarker('checkout_home_delivery')` → the `delivery_method`
 *  attribute's `listTitles`, so the marketing team can edit them without a code
 *  change.
 *
 *  `value` is the option's submitted value — it travels into the order's
 *  `delivery_method` form data at "Place Order". It is read from the form
 *  rather than hardcoded because the admin panel owns it: an editor who renames
 *  the option would otherwise have every order rejected with
 *  `required values are missing or incorrect: delivery_method`.
 *
 *  Perks/hint come from the same attribute's `additionalFields`:
 *   - home_free_delivery / home_partial_purchase / home_in-home-fitting
 *   - store_pickup_free / store_pickup_partial_purchase / store_pickup_fitting_room
 *   - locaer_text  ← typo preserved as-is in the OE admin panel
 */
export interface DeliveryMethodInfo {
  home: { title: string; subtitle: string; value: string; perks: string[] };
  store: { title: string; subtitle: string; value: string; perks: string[] };
  locker: { title: string; subtitle: string; value: string; pinHint: string };
}

/**
 * Fallback copy — used verbatim when OE is unavailable or the form was edited
 *  without one of the fields. Keeps the picker readable in every degraded state.
 *
 *  The `value`s mirror the tenant's current option list. They only ever apply
 *  when the form did not load at all, in which case the order would fail on the
 *  missing form long before the value mattered.
 */
const FALLBACK: DeliveryMethodInfo = {
  home: {
    title: DELIVERY_METHOD_HOME_LABELS.title,
    subtitle: DELIVERY_METHOD_HOME_LABELS.subtitle,
    value: 'courier',
    perks: DELIVERY_PERKS.map((p) => p.text),
  },
  store: {
    title: DELIVERY_METHOD_STORE_LABELS.title,
    subtitle: DELIVERY_METHOD_STORE_LABELS.subtitle,
    value: 'pickup',
    perks: PICKUP_PERKS.map((p) => p.text),
  },
  locker: {
    title: DELIVERY_METHOD_LOCKER_LABELS.title,
    subtitle: DELIVERY_METHOD_LOCKER_LABELS.subtitle,
    value: 'locker',
    pinHint: DELIVERY_METHOD_LOCKER_LABELS.pinHint,
  },
};

type RawListItem = { value?: unknown; title?: unknown; extended?: { value?: unknown } | null };
type RawDeliveryMethodAttr = {
  marker?: unknown;
  listTitles?: RawListItem[];
};

const asString = (v: unknown): string => (typeof v === 'string' ? v : '');

/**
 * Compact one option into the copy a radio card renders.
 *
 * @param option   - Option from the `delivery_method` attribute, or `undefined`
 *                   when the admin listed fewer methods than the UI shows.
 * @param fallback - Shipped copy for that card.
 * @returns Title, subtitle (`extended.value`) and submitted value.
 */
const toMethodCopy = (
  option: FormFieldOption | undefined,
  fallback: { title: string; subtitle: string; value: string },
): { title: string; subtitle: string; value: string } => {
  if (!option) return fallback;
  return {
    title: option.title || fallback.title,
    subtitle: option.extended || fallback.subtitle,
    value: option.value || fallback.value,
  };
};

/**
 * Perk lines an admin attached to the delivery-method attribute, grouped by the
 * card they belong to.
 *
 * Grouping is by marker prefix rather than by an enumerated list of markers, so
 * an editor who adds a fourth perk sees it on the storefront without a deploy —
 * and so the tenant's misspelled locker key (`locaer_text`) needs no mention in
 * the code. Anything that is neither a `home` nor a `store` line is the locker
 * hint, which is the only other copy the attribute carries.
 *
 * @param fields - The attribute's `additionalFields`, flattened.
 * @returns Home perks, store perks, and the locker hint, in marker order.
 */
const groupPerks = (fields: Record<string, string>): { home: string[]; store: string[]; lockerHint: string } => {
  const home: string[] = [];
  const store: string[] = [];
  const other: string[] = [];
  for (const marker of Object.keys(fields).sort()) {
    const value = fields[marker];
    if (!value) continue;
    if (marker.startsWith('home')) home.push(value);
    else if (marker.startsWith('store')) store.push(value);
    else other.push(value);
  }
  return { home, store, lockerHint: other[0] ?? '' };
};

/**
 * OE-authored post-order copy for the confirmation page. Reads
 *  `checkout_home_delivery.localizeInfos.successMessage` — the one line the
 *  admin panel offers for "order placed" UX. Returns `null` when the field is
 *  empty, OE errors, or the SDK throws so the confirmation page can fall back
 *  to its literal heading.
 */
/**
 * `lang` is an explicit argument so it forms part of the `unstable_cache`
 *  key; root params are also unreadable inside a cached function.
 */
const loadCheckoutSuccessMessageCached = unstable_cache(
  async (lang: Lang): Promise<string | null> => {
    try {
      const form = await loadFormContent(DELIVERY_METHOD_FORM, lang);
      return form.successMessage.length > 0 ? form.successMessage : null;
    } catch {
      return null;
    }
  },
  ['oe-checkout-success-message'],
  { revalidate: REVALIDATE_STORES, tags: ['oe-forms'] },
);

/**
 * Checkout success message for the current route's locale.
 *
 * @param [langArg] - Explicit OE locale; defaults to the route's.
 * @returns Message, or `null` when the tenant has none.
 */
export async function loadCheckoutSuccessMessage(langArg?: Lang): Promise<string | null> {
  return loadCheckoutSuccessMessageCached(langArg ?? (await currentCmsLocale()));
}

/**
 * Parcel-locker pick-up points, read from the locker order form.
 *
 * The picker submits the selected *index*, so the order of the options is the
 * contract between the storefront and OE — which is exactly why the list has to
 * come from the form the order is filed into and not from anywhere else.
 *
 * The options are looked up by attribute type rather than by marker: whichever
 * field the locker form uses to name its pick-up points is the one that carries
 * them. Returns `[]` when the tenant has authored no options at all — the
 * tenant's current locker attribute is a bare `integer` with an empty
 * `listTitles` — in which case the caller keeps its local `PARCEL_LOCKERS`
 * fallback.
 */
/**
 * `lang` is an explicit argument so it forms part of the `unstable_cache`
 *  key; root params are also unreadable inside a cached function.
 */
const loadParcelLockersCached = unstable_cache(
  async (lang: Lang): Promise<string[]> => {
    try {
      const form = await loadFormContent(CHECKOUT_ORDER_FORMS.locker.authed, lang);
      for (const field of form.fields) {
        const names = field.options.map((o) => o.title.trim()).filter((s) => s.length > 0);
        if (names.length > 0) return names;
      }
      return [];
    } catch {
      return [];
    }
  },
  ['oe-parcel-lockers'],
  { revalidate: REVALIDATE_STORES, tags: ['oe-forms'] },
);

/**
 * Parcel-locker options for the current route's locale.
 *
 * @param [langArg] - Explicit OE locale; defaults to the route's.
 * @returns Locker labels, possibly empty.
 */
export async function loadParcelLockers(langArg?: Lang): Promise<string[]> {
  return loadParcelLockersCached(langArg ?? (await currentCmsLocale()));
}

/**
 * `lang` is an explicit argument so it forms part of the `unstable_cache`
 *  key; root params are also unreadable inside a cached function.
 */
const loadDeliveryMethodInfoCached = unstable_cache(
  async (lang: Lang): Promise<DeliveryMethodInfo> => {
    try {
      const form = await loadFormContent(DELIVERY_METHOD_FORM, lang);
      // The order form carries exactly one `list` attribute and that is the
      // method picker — matching on the type instead of on the marker keeps a
      // rename in the admin panel from silently emptying the picker.
      const methodField = soleFieldOfType(form, 'list');
      if (!methodField) return FALLBACK;
      // Card order follows the admin panel's option order, which is the one
      // surface where an editor expresses it. The three cards themselves are
      // fixed — each hosts a different sub-form (address / store / locker).
      const [homeOption, storeOption, lockerOption] = methodField.options;
      const home = toMethodCopy(homeOption, FALLBACK.home);
      const store = toMethodCopy(storeOption, FALLBACK.store);
      const locker = toMethodCopy(lockerOption, FALLBACK.locker);
      const perkLines = groupPerks(methodField.fields);
      return {
        // Fall back on the whole shipped set if the admin left the fields blank
        // so a card never renders bare.
        home: { ...home, perks: perkLines.home.length > 0 ? perkLines.home : FALLBACK.home.perks },
        store: { ...store, perks: perkLines.store.length > 0 ? perkLines.store : FALLBACK.store.perks },
        locker: { ...locker, pinHint: perkLines.lockerHint || FALLBACK.locker.pinHint },
      };
    } catch {
      return FALLBACK;
    }
  },
  ['oe-delivery-method-info'],
  // Same TTL as stores — both are admin-editable copy that rarely changes.
  { revalidate: REVALIDATE_STORES, tags: ['oe-forms'] },
);

/**
 * Delivery-method copy for the current route's locale.
 *
 * @param [langArg] - Explicit OE locale; defaults to the route's.
 * @returns Delivery method info, with shipped fallbacks.
 */
export async function loadDeliveryMethodInfo(langArg?: Lang): Promise<DeliveryMethodInfo> {
  return loadDeliveryMethodInfoCached(langArg ?? (await currentCmsLocale()));
}
