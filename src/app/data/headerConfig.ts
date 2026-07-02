export const HEADER_REGIONS = ['Europe', 'United Kingdom', 'United States', 'Australia'];

export const HEADER_LANGUAGES = ['EN', 'DE', 'FR', 'IT', 'ES'];

export const SUPPORT_PHONE = '+44 20 7946 0958';

// ── Default selected labels ──────────────────────────────────────────────────
export const DEFAULT_REGION_LABEL = 'Europe';
export const DEFAULT_LANGUAGE_LABEL = 'EN';

// ── Gender accent colours ─────────────────────────────────────────────────────
export { ACCENT_WOMEN as WOMEN_COLOR, ACCENT_MEN as MEN_COLOR } from '../constants/colors';

// ── Logo ─────────────────────────────────────────────────────────────────────
export const LOGO_ALT = 'KEKIMORO';

// ── Search ───────────────────────────────────────────────────────────────────
export const SEARCH_PLACEHOLDER = 'Search';
export const SEARCH_PLACEHOLDER_MOBILE = 'Search...';

// ── Navigation hrefs ─────────────────────────────────────────────────────────
export const STORE_LOCATIONS_LABEL = 'Store Locations';
export const STORE_LOCATIONS_HREF = '/stores';
export const ACCOUNT_HREF = '/account';
export const WISHLIST_HREF = '/favorites';

export const GENDER_NAV_HREFS: Record<string, string> = {
  women: '/women/clothing',
  men: '/men/clothing',
};

// ── Mobile footer links ───────────────────────────────────────────────────────
interface MobileFooterLink {
  label: string;
  href: string;
  iconType: 'user' | 'map-pin';
}

export const MOBILE_FOOTER_LINKS: MobileFooterLink[] = [
  { label: 'My Account', href: ACCOUNT_HREF, iconType: 'user' },
  { label: STORE_LOCATIONS_LABEL, href: STORE_LOCATIONS_HREF, iconType: 'map-pin' },
];

// ── Aria labels ───────────────────────────────────────────────────────────────
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
