/**
 * Header configuration.
 *
 * Only two kinds of thing live here:
 *  - **Routing / styling** — hrefs and accent colours. Application wiring, not
 *    copy; a content editor must not be able to break navigation from the
 *    admin panel.
 *  - **Shared or structural fallbacks** — a string reused by several
 *    components, or a list rendered by a `.map()`.
 *
 * One-off copy is NOT here: its offline fallback is passed inline at the
 * `useHeaderT` call site, so the OE key and its fallback sit together.
 *
 * Live values come from the OE `header` system-text set; languages come from
 * the project's active locales (`Locales.getLocales()`).
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
export { ACCENT_MEN as MEN_COLOR, ACCENT_WOMEN as WOMEN_COLOR } from '@/app/constants/colors';

// ── Shared fallbacks (used by more than one component) ───────────────────────
/** `header_logo_alt` — Header, Footer and the mobile drawer all render it. */
export const LOGO_ALT = 'KEKIMORO';
/** `header_support_phone` — top bar and mobile drawer. */
export const SUPPORT_PHONE = '+44 20 7946 0958';
/** `interface_controls` → `search` — desktop placeholder, shared with search UI. */
export const SEARCH_PLACEHOLDER = 'Search';

// ── Structural fallbacks (rendered by a map) ─────────────────────────────────
/** `header_regions` — comma-separated in OE. */
export const HEADER_REGIONS = ['Europe', 'United Kingdom', 'United States', 'Australia'];

/** Shown when the CMS returns no locales at all, so the switcher is never blank. */
export const FALLBACK_LANGUAGE_LABEL = 'EN';

export interface MobileFooterLink {
  /** OE key for the label; the component resolves it through `useHeaderT`. */
  labelKey: string;
  fallbackLabel: string;
  href: string;
  iconType: 'user' | 'map-pin';
}

export const MOBILE_FOOTER_LINKS: MobileFooterLink[] = [
  { labelKey: 'header_my_account', fallbackLabel: 'My Account', href: ACCOUNT_HREF, iconType: 'user' },
  {
    labelKey: 'header_store_locations',
    fallbackLabel: 'Store Locations',
    href: STORE_LOCATIONS_HREF,
    iconType: 'map-pin',
  },
];
