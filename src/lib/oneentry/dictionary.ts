import { cache } from 'react';
import { currentCmsLocale } from './current-locale';
import { getSystemSet, readSystemValue, type Lang, type SystemSchema } from './system-text';

/**
 * The storefront's UI-text dictionary: every attribute marker the CMS knows,
 * flattened to `marker → value`.
 *
 * Copy lives as each attribute's `initialValue` — the field a content editor
 * fills in the admin panel's attribute-set editor. Markers are unique across
 * sets on this tenant (verified against the live project: 718 keys over the 41
 * sets below, zero collisions), so the sets are an admin-side grouping only and
 * callers never need to know which set a key came from. One lookup, one
 * namespace.
 *
 * Read it with `useT()` on the client or {@link getDictionary} on the server;
 * every call site supplies its own English fallback inline, so a CMS outage
 * degrades to the shipped copy rather than blank UI.
 */
export type Dictionary = Record<string, string>;

/**
 * Every attribute set the storefront reads copy from.
 *
 * This list is explicit rather than discovered because the public
 * `GET /api/content/attributes-sets` endpoint **ignores `offset`/`limit`** and
 * always returns the first 10 of the tenant's 90 sets — verified over raw HTTP
 * against `offset=10`, `limit=90` and `page=2`, all of which return the same
 * first page. Enumerating the tenant is therefore impossible from the public
 * API, and `getAttributeSetByMarker` per marker is the only complete path.
 *
 * The sets are fetched in parallel and each one is TTL-cached by
 * `getSystemSet`, so the cost is 42 concurrent requests once every five
 * minutes per server process, not per render.
 *
 * Note: `product_specs` and `server_errors` are deliberately absent. Both are
 * read server-side only — `loadProductSpecLabels` and `se()` call `getSystemSet`
 * directly — so shipping them in the client dictionary would send copy no
 * Client Component asks for.
 */
export const DICTIONARY_SET_MARKERS = [
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

/**
 * Load the whole dictionary. Server-side; pass it to `DictProvider` for client
 * components.
 *
 * Never throws — an unreachable CMS yields an empty dictionary and every call
 * site falls back to its inline English copy. Per-set caching and in-flight
 * de-duplication both live in `getSystemSet`, so calling this repeatedly within
 * a request (or across requests inside the TTL) costs nothing.
 *
 * With no argument the locale comes from the `[locale]` route segment via
 * {@link currentCmsLocale}; pass one explicitly from Server Actions and Route
 * Handlers, where root parameters are unavailable.
 * @param   {Lang}                 [lang] - OE locale code. Defaults to the route's.
 * @returns {Promise<Dictionary>}         Flat `marker → value` map.
 */
export const getDictionary = cache(
  async (langArg?: Lang): Promise<Dictionary> => {
    const lang = langArg ?? (await currentCmsLocale());
    const sets = await Promise.all(
      DICTIONARY_SET_MARKERS.map(async (marker) =>
        flattenSet(await getSystemSet(marker, lang), lang),
      ),
    );

    const dict: Dictionary = {};
    for (const set of sets) {
      for (const [key, value] of Object.entries(set)) {
        // First writer wins. Markers are unique tenant-wide today; a future
        // collision would be an admin-side mistake, so surface it in dev
        // rather than letting one screen silently reword another.
        if (dict[key] === undefined) {
          dict[key] = value;
        } else if (process.env.NODE_ENV !== 'production' && dict[key] !== value) {
          console.warn(
            `[oneentry] duplicate dictionary marker "${key}" with differing values — keeping the first.`,
          );
        }
      }
    }
    return dict;
  },
);

/**
 * Resolve one marker against a dictionary, falling back to the shipped copy.
 * @param   {Dictionary | null | undefined} dict     - Loaded dictionary, if any.
 * @param   {string}                        marker   - Attribute marker to read.
 * @param   {string}                        fallback - Inline English copy.
 * @returns {string}                                 The CMS value or `fallback`.
 */
export function translate(
  dict: Dictionary | null | undefined,
  marker: string,
  fallback: string,
): string {
  const v = dict?.[marker];
  return typeof v === 'string' && v.length > 0 ? v : fallback;
}
