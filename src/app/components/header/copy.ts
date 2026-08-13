import { ACCOUNT_HREF, STORE_LOCATIONS_HREF } from '@/app/data/headerConfig';

/** Header copy, overlaid from the OE `header` set as `header_<snake_case_key>`. */
export const HEADER_COPY = {
  logoAlt: 'KEKIMORO',
  search: 'Search',
  searchPlaceholderMobile: 'Search...',
  supportPhone: '+44 20 7946 0958',
  defaultRegion: 'Europe',
  storeLocations: 'Store Locations',
  myAccount: 'My Account',
  ariaOpenMenu: 'Open menu',
  ariaCloseMenu: 'Close menu',
  ariaMainNavigation: 'Main navigation',
  ariaToggleSearch: 'Toggle search',
  ariaSearchDesktop: 'Search products',
  ariaSearchMobile: 'Search products',
  ariaAccount: 'My account',
  ariaWishlist: 'Wishlist',
  ariaBag: 'Shopping bag',
} as const;

/** Drawer footer links — copy from {@link HEADER_COPY}, routing from `headerConfig`. */
export const MOBILE_FOOTER_LINKS = [
  { labelKey: 'header_my_account', fallbackLabel: HEADER_COPY.myAccount, href: ACCOUNT_HREF, iconType: 'user' },
  {
    labelKey: 'header_store_locations',
    fallbackLabel: HEADER_COPY.storeLocations,
    href: STORE_LOCATIONS_HREF,
    iconType: 'map-pin',
  },
] as const;

/** Rendered by a `.map()`, so it stays a list and is read with `useList`. */
export const HEADER_REGIONS = ['Europe', 'United Kingdom', 'United States', 'Australia'];
