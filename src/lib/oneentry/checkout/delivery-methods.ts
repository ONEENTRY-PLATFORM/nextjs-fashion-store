import { unstable_cache } from 'next/cache';

import { DELIVERY_PERKS, type ParcelLocker, PICKUP_PERKS } from '@/app/data/checkoutConfig';
import {
  DELIVERY_METHOD_HOME_LABELS,
  DELIVERY_METHOD_LOCKER_LABELS,
  DELIVERY_METHOD_STORE_LABELS,
} from '@/app/pages/checkout/copy';
import { REVALIDATE_STORES } from '@/lib/isr';
import { CHECKOUT_ORDER_FORMS, type CheckoutMethod } from '@/lib/oneentry/checkout/forms';
import { currentCmsLocale } from '@/lib/oneentry/current-locale';
import { selectableEntityOptions, soleFieldOfType } from '@/lib/oneentry/forms/field-lookup';
import type { FormFieldOption } from '@/lib/oneentry/forms/form-content';
import { loadFormContent } from '@/lib/oneentry/forms/placeholders';
import type { Lang } from '@/lib/oneentry/system-text';

/** The order form that carries the method picker and its copy. */
const DELIVERY_METHOD_FORM = CHECKOUT_ORDER_FORMS.home.authed;

/** Per-method copy: what the delivery-picker radios render. */
export interface DeliveryMethodInfo {
  home: { title: string; subtitle: string; value: string; perks: string[] };
  store: { title: string; subtitle: string; value: string; perks: string[] };
  locker: { title: string; subtitle: string; value: string; pinHint: string };
}

/** Fallback copy — used verbatim when OE is unavailable or the form was edited without one of the fields. */
const FALLBACK: DeliveryMethodInfo = {
  home: {
    title: DELIVERY_METHOD_HOME_LABELS.title,
    subtitle: DELIVERY_METHOD_HOME_LABELS.subtitle,
    value: 'home',
    perks: DELIVERY_PERKS.map((p) => p.text),
  },
  store: {
    title: DELIVERY_METHOD_STORE_LABELS.title,
    subtitle: DELIVERY_METHOD_STORE_LABELS.subtitle,
    value: 'store_pickup',
    perks: PICKUP_PERKS.map((p) => p.text),
  },
  locker: {
    title: DELIVERY_METHOD_LOCKER_LABELS.title,
    subtitle: DELIVERY_METHOD_LOCKER_LABELS.subtitle,
    value: 'locker',
    pinHint: DELIVERY_METHOD_LOCKER_LABELS.pinHint,
  },
};

/** Compact one option into the copy a radio card renders. */
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

/** Perk lines an admin attached to the delivery-method attribute, grouped by the card they belong to. */
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

/** OE-authored post-order copy for the confirmation page. `lang` is an explicit argument so it forms part of the `unstable_cache` key. */
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

/** Checkout success message for the current route's locale. */
export async function loadCheckoutSuccessMessage(langArg?: Lang): Promise<string | null> {
  return loadCheckoutSuccessMessageCached(langArg ?? (await currentCmsLocale()));
}

/** Parcel-locker pick-up points, read from the locker order form. `lang` is an explicit argument so it forms part of the `unstable_cache` key. */
const loadParcelLockersCached = unstable_cache(
  async (lang: Lang): Promise<ParcelLocker[]> => {
    try {
      const form = await loadFormContent(CHECKOUT_ORDER_FORMS.locker.authed, lang);
      const field = soleFieldOfType(form, 'entity');
      return selectableEntityOptions(field)
        .filter((o) => o.title.trim().length > 0)
        .map((o) => ({ oeId: o.entityId, name: o.title.trim() }));
    } catch {
      return [];
    }
  },
  ['oe-parcel-lockers'],
  { revalidate: REVALIDATE_STORES, tags: ['oe-forms'] },
);

/** Parcel-locker options for the current route's locale. */
export async function loadParcelLockers(langArg?: Lang): Promise<ParcelLocker[]> {
  return loadParcelLockersCached(langArg ?? (await currentCmsLocale()));
}

/** `lang` is an explicit argument so it forms part of the `unstable_cache` key. */
const loadDeliveryMethodInfoCached = unstable_cache(
  async (lang: Lang): Promise<DeliveryMethodInfo> => {
    try {
      const form = await loadFormContent(DELIVERY_METHOD_FORM, lang);
      // The order form carries exactly one `list` attribute and that is the method picker.
      const methodField = soleFieldOfType(form, 'list');
      if (!methodField) return FALLBACK;
      // Each card is matched to its option by the order-storage marker the option submits — the same string that names the storage and the order form.
      const optionFor = (method: CheckoutMethod) => methodField.options.find((o) => o.value === method);
      const home = toMethodCopy(optionFor('home'), FALLBACK.home);
      const store = toMethodCopy(optionFor('store_pickup'), FALLBACK.store);
      const locker = toMethodCopy(optionFor('locker'), FALLBACK.locker);
      const perkLines = groupPerks(methodField.fields);
      return {
        // Fall back on the whole shipped set if the admin left the fields blank so a card never renders bare.
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

/** Delivery-method copy for the current route's locale. */
export async function loadDeliveryMethodInfo(langArg?: Lang): Promise<DeliveryMethodInfo> {
  return loadDeliveryMethodInfoCached(langArg ?? (await currentCmsLocale()));
}
