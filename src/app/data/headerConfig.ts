/**
 * Header configuration.
 *
 * Split by ownership:
 *  - **Routing / styling** stays here for good — hrefs and accent colours are
 *    application wiring, not copy. A content editor must not be able to break
 *    navigation from the admin panel.
 *  - **Copy** lives in the OneEntry `header` system-text set; the constants
 *    below are only the offline fallback used when the CMS is unreachable.
 *    Keys are listed next to each value.
 *  - **Languages** are neither — they come from the project's active locales
 *    (`Locales.getLocales()`), so a language added in the admin panel shows up
 *    without a code change. See `src/lib/oneentry/locales.ts`.
 */

// ── Routing (code-owned) ─────────────────────────────────────────────────────
export const STORE_LOCATIONS_HREF = '/stores';
export const ACCOUNT_HREF = '/account';
export const WISHLIST_HREF = '/favorites';

export const GENDER_NAV_HREFS: Record<string, string> = {
  women: '/women/clothing',
  men: '/men/clothing',
};

// ── Gender accent colours (code-owned) ───────────────────────────────────────
export { ACCENT_WOMEN as WOMEN_COLOR, ACCENT_MEN as MEN_COLOR } from '../constants/colors';

// ── Copy fallbacks — live values come from the OE `header` set ───────────────
/** `header_regions` — comma-separated in OE. */
export const HEADER_REGIONS = ['Europe', 'United Kingdom', 'United States', 'Australia'];
/** `header_default_region` */
export const DEFAULT_REGION_LABEL = 'Europe';
/** `header_support_phone` */
export const SUPPORT_PHONE = '+44 20 7946 0958';
/** `header_logo_alt` */
export const LOGO_ALT = 'KEKIMORO';
/** `interface_controls` → `search` (already wired) */
export const SEARCH_PLACEHOLDER = 'Search';
/** `header_search_placeholder_mobile` */
export const SEARCH_PLACEHOLDER_MOBILE = 'Search...';
/** `header_store_locations` */
export const STORE_LOCATIONS_LABEL = 'Store Locations';
/** `header_my_account` */
export const MY_ACCOUNT_LABEL = 'My Account';

/**
 * Fallback shown when the CMS returns no locales at all. Mirrors
 * `DEFAULT_LOCALE`'s language so the switcher never renders empty.
 */
export const FALLBACK_LANGUAGE_LABEL = 'EN';

// ── Mobile drawer footer links ───────────────────────────────────────────────
export interface MobileFooterLink {
  /** OE key for the label; the component resolves it through `useHeaderT`. */
  labelKey: string;
  fallbackLabel: string;
  href: string;
  iconType: 'user' | 'map-pin';
}

export const MOBILE_FOOTER_LINKS: MobileFooterLink[] = [
  { labelKey: 'header_my_account', fallbackLabel: MY_ACCOUNT_LABEL, href: ACCOUNT_HREF, iconType: 'user' },
  { labelKey: 'header_store_locations', fallbackLabel: STORE_LOCATIONS_LABEL, href: STORE_LOCATIONS_HREF, iconType: 'map-pin' },
];

// ── Aria label fallbacks — OE keys are `header_aria_*` ───────────────────────
export const HEADER_ARIA_LABELS = {
  openMenu: 'Open menu',
  closeMenu: 'Close menu',
  toggleSearch: 'Toggle search',
  searchDesktop: 'Search products',
  searchMobile: 'Search products',
  account: 'My account',
  wishlist: 'Wishlist',
  bag: 'Shopping bag',
};

/** Maps each aria fallback to its OE key, so components stay declarative. */
export const HEADER_ARIA_KEYS = {
  openMenu: 'header_aria_open_menu',
  closeMenu: 'header_aria_close_menu',
  toggleSearch: 'header_aria_toggle_search',
  searchDesktop: 'header_aria_search_desktop',
  searchMobile: 'header_aria_search_mobile',
  account: 'header_aria_account',
  wishlist: 'header_aria_wishlist',
  bag: 'header_aria_bag',
} as const;
