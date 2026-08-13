import { cache } from 'react';

import { configureCurrency } from '@/app/data/currencyConfig';

import { currentCmsLocale } from './current-locale';
import { parseSiteSettings, type SiteSettings } from './site-settings';
import { getSystemSet, type Lang, readSystemValue, type SystemSchema } from './system-text';

/** The storefront's UI-text dictionary: every attribute marker the CMS knows, flattened to `marker → value`. Copy lives as each attribute's `initialValue`. */
export type Dictionary = Record<string, string>;

/** Every attribute set the storefront reads copy from. */
export const DICTIONARY_SET_MARKERS = [
  // Site-wide settings.
  'site_settings',
  // Layout chrome and shared UI
  'header',
  'footer',
  'form_messages',
  'llms_txt',
  'interface_controls',
  'product-card',
  'system_pages',
  // Auth
  'sign_in',
  'create_account',
  // Catalog and content pages
  'catalog_page',
  'info_page',
  'info_section',
  'new_arrivals_page',
  'sale_page',
  'favorites_page',
  // Product detail
  'product_card_delivery_returns',
  'product_card_actions',
  // Added with the quick-view accordion copy — the set did not exist before, so that screen rendered its shipped English fallbacks in every locale.
  'quick_view',
  'special_offers_product_card',
  'special-offers-bundle-product-card',
  'customer-reviews',
  'reserve_in_store',
  'earn_360_bonus_points',
  'size-guide',
  // Bag and checkout
  'your_bag',
  'checkout_cart',
  'checkout_delivery',
  'checkout_payment',
  'checkout_confirmed',
  'checkout_modal',
  // Account
  'user_account',
  'user_account_silver_status',
  'user_account_wishlist',
  'user_account_feedback',
  'user_account_personal_data_consent',
  'subscription_management',
  'users_edit_password',
  'user_addresses_system',
  'my_orders',
  'my_bonuses',
  'service_maintenance',
  'purchase_history',
  'waiting_list',
  // Stores
  'store_location',
  'store_pages',
] as const;

/** Flatten one OE attribute-set schema to `marker → value`, dropping empties. */
function flattenSet(schema: SystemSchema, lang: Lang): Dictionary {
  const out: Dictionary = {};
  for (const [key, item] of Object.entries(schema)) {
    const value = readSystemValue(item, lang);
    if (typeof value === 'string' && value.length > 0) out[key] = value;
  }
  return out;
}

/** Load the whole dictionary. */
export const getDictionary = cache(async (langArg?: Lang): Promise<Dictionary> => {
  const lang = langArg ?? (await currentCmsLocale());
  const sets = await Promise.all(
    DICTIONARY_SET_MARKERS.map(async (marker) => flattenSet(await getSystemSet(marker, lang), lang)),
  );

  const dict: Dictionary = {};
  for (const set of sets) {
    for (const [key, value] of Object.entries(set)) {
      // First writer wins.
      if (dict[key] === undefined) {
        dict[key] = value;
      } else if (process.env.NODE_ENV !== 'production' && dict[key] !== value) {
        console.warn(`[oneentry] duplicate dictionary marker "${key}" with differing values — keeping the first.`);
      }
    }
  }
  return dict;
});

/** Resolve one marker against a dictionary, falling back to the shipped copy. */
export function translate(dict: Dictionary | null | undefined, marker: string, fallback: string): string {
  const v = dict?.[marker];
  return typeof v === 'string' && v.length > 0 ? v : fallback;
}

/** Server-side settings read: the `site_settings` slice of the dictionary, parsed into typed values. */
export const getSiteSettings = cache(async (lang?: Lang): Promise<SiteSettings> => {
  const settings = parseSiteSettings(await getDictionary(lang));
  configureCurrency(settings.currency);
  return settings;
});
