/**
 * Site-wide settings an editor owns: brand identity, commerce terms, social
 * profiles, structured-data facts, the referral programme, the theme palette
 * and the share-image copy.
 *
 * These used to be TypeScript constants in `src/app/data/seoData.ts`, which
 * meant the numbers Google reads (free-delivery threshold, return window,
 * delivery lead time) lived in a deploy while the rules a shopper actually
 * meets at checkout lived in OneEntry — two sources that drift apart silently.
 * They now come from the OE attribute set `site_settings`, with the shipped
 * literals kept as {@link SITE_SETTINGS_FALLBACK} so Storybook, unit tests and
 * a CMS outage still render.
 *
 * The origin (`SITE_URL`) is deliberately **not** here: canonicals and
 * `robots.txt` must not be repointable from a content panel, and both are built
 * before any CMS read. It stays deployment-owned in `seoData.ts`.
 *
 * This module is pure on purpose — it takes an already-loaded dictionary rather
 * than fetching one, so it is safe to import from Client Components. The server
 * helper that pairs it with a fetch is `getSiteSettings()` in `./dictionary`.
 */

import type { Dictionary } from './dictionary';

/** Editable brand identity. */
export interface SiteBrandSettings {
  siteName: string;
  siteDescription: string;
  twitterHandle: string;
}

/** Currency pair applied to every rendered price. */
export interface SiteCurrencySettings {
  code: string;
  symbol: string;
}

/**
 * Commerce terms advertised to shoppers and crawlers. These describe the
 * offer; the money actually charged still comes from OE's own order preview.
 */
export interface SiteCommerceSettings {
  freeShippingThreshold: number;
  standardShippingPrice: number;
  returnWindowDays: number;
  deliveryCountry: string;
  deliveryMinDays: number;
  deliveryMaxDays: number;
}

/** Structured-data facts about the organisation. */
export interface SiteOrgSettings {
  schemaType: string;
  priceRange: string;
  paymentAccepted: string;
  areaServed: string[];
  knowsAbout: string[];
  availableLanguage: string;
}

/**
 * Referral programme configuration. `enabled` is derived: a zero credit means
 * there is nothing to advertise, so the account section renders as a plain
 * share-your-link tool instead of promising a reward nobody pays out.
 */
export interface SiteReferralSettings {
  creditAmount: number;
  minPurchase: number;
  creditExpiryMonths: number;
  enabled: boolean;
}

/** Brand palette, published to CSS custom properties by the root layout. */
export interface SiteThemeSettings {
  accentWomen: string;
  accentMen: string;
  sale: string;
  bannerBg: string;
  buy: string;
  buyHover: string;
  saleYellow: string;
}

/** Installed-app metadata. */
export interface SitePwaSettings {
  shortName: string;
  categories: string[];
}

/** Copy rendered into the generated Open Graph banner. */
export interface SiteOgSettings {
  brand: string;
  subLabel: string;
  tagline: string;
  imageAlt: string;
}

/** Everything the `site_settings` set controls. */
export interface SiteSettings {
  brand: SiteBrandSettings;
  currency: SiteCurrencySettings;
  commerce: SiteCommerceSettings;
  /** Network → profile URL. Networks the editor blanked out are absent. */
  socials: Record<string, string>;
  org: SiteOrgSettings;
  referral: SiteReferralSettings;
  theme: SiteThemeSettings;
  pwa: SitePwaSettings;
  og: SiteOgSettings;
}

/**
 * The copy that ships in the bundle. Every field is what the storefront
 * rendered before the settings moved into the CMS, so an unreachable OE is
 * visually a no-op.
 */
export const SITE_SETTINGS_FALLBACK: SiteSettings = {
  brand: {
    siteName: 'Kekimoro',
    siteDescription:
      'Premium fashion for men and women. Curated collections, fast worldwide delivery and easy returns.',
    twitterHandle: '@KekimoroFashion',
  },
  currency: { code: 'USD', symbol: '$' },
  commerce: {
    freeShippingThreshold: 50,
    standardShippingPrice: 3.99,
    returnWindowDays: 28,
    deliveryCountry: 'GB',
    deliveryMinDays: 2,
    deliveryMaxDays: 5,
  },
  socials: {
    instagram: 'https://www.instagram.com/oneentryfashion',
    twitter: 'https://www.twitter.com/KekimoroFashion',
    facebook: 'https://www.facebook.com/oneentryfashion',
    youtube: 'https://www.youtube.com/@oneentryfashion',
    tiktok: 'https://www.tiktok.com/@oneentryfashion',
    pinterest: 'https://www.pinterest.com/oneentryfashion',
  },
  org: {
    schemaType: 'ClothingStore',
    priceRange: '$$',
    paymentAccepted: 'Credit Card, Debit Card, PayPal',
    areaServed: ['IE', 'EU'],
    knowsAbout: [
      "Women's Fashion",
      "Men's Fashion",
      'Premium Clothing',
      'Designer Bags',
      'Luxury Shoes',
      'Fashion Accessories',
    ],
    availableLanguage: 'English',
  },
  referral: { creditAmount: 0, minPurchase: 0, creditExpiryMonths: 0, enabled: false },
  theme: {
    accentWomen: '#F88A8A',
    accentMen: '#DA1E1E',
    sale: '#DA1E1E',
    bannerBg: '#E4E8EE',
    buy: '#16A34A',
    buyHover: '#15803D',
    saleYellow: '#FFE066',
  },
  pwa: { shortName: 'Kekimoro', categories: ['shopping', 'fashion', 'lifestyle'] },
  og: {
    brand: 'Kekimoro',
    subLabel: 'FASHION',
    tagline: 'Premium Collections · Men & Women',
    imageAlt: 'Kekimoro – Premium clothing, shoes and accessories',
  },
};

/** Marker prefix every attribute in the set shares. */
const P = 'site_settings_';

/** Networks rendered in structured data, in the order they are published. */
const SOCIAL_NETWORKS = ['instagram', 'twitter', 'facebook', 'youtube', 'tiktok', 'pinterest'] as const;

/** Read a trimmed string, or the fallback when the marker is blank/missing. */
function str(dict: Dictionary | null | undefined, key: string, fallback: string): string {
  const raw = dict?.[P + key];
  if (typeof raw !== 'string') return fallback;
  const trimmed = raw.trim();
  return trimmed.length > 0 ? trimmed : fallback;
}

/**
 * Read a number. A field an editor filled with prose ("free!") is not a
 * number, and silently coercing it to `NaN` would print `$NaN` on the offer —
 * so anything unparseable keeps the shipped value.
 */
function num(dict: Dictionary | null | undefined, key: string, fallback: number): number {
  const raw = dict?.[P + key];
  if (typeof raw !== 'string') return fallback;
  const parsed = Number(raw.trim().replace(',', '.'));
  return Number.isFinite(parsed) ? parsed : fallback;
}

/** Read a comma-separated list, trimming blanks. */
function list(dict: Dictionary | null | undefined, key: string, fallback: string[]): string[] {
  const raw = dict?.[P + key];
  if (typeof raw !== 'string') return fallback;
  const parts = raw
    .split(',')
    .map((s) => s.trim())
    .filter(Boolean);
  return parts.length > 0 ? parts : fallback;
}

/**
 * Read a hex colour. Anything that is not `#rgb` / `#rrggbb` is rejected: the
 * value goes straight into a CSS custom property, and a malformed one would
 * silently drop the declaration and leave the element unstyled.
 */
function color(dict: Dictionary | null | undefined, key: string, fallback: string): string {
  const raw = str(dict, key, fallback);
  return /^#(?:[0-9a-f]{3}|[0-9a-f]{6})$/i.test(raw) ? raw : fallback;
}

/**
 * Turn a loaded dictionary into typed settings.
 *
 * Pure and total: every field falls back independently, so a set that an editor
 * has half-filled yields shipped copy for the rest rather than blanks.
 *
 * @param   dict - Flat `marker → value` map, or `null` when no CMS is reachable.
 * @returns        Fully populated settings.
 */
export function parseSiteSettings(dict: Dictionary | null | undefined): SiteSettings {
  const F = SITE_SETTINGS_FALLBACK;

  const socials: Record<string, string> = {};
  for (const network of SOCIAL_NETWORKS) {
    // A blank field is how an editor removes a network, so — unlike every
    // other field here — an empty value must NOT fall back to the shipped URL.
    // Absent from the dictionary (no CMS at all) still does.
    const raw = dict?.[`${P}social_${network}`];
    const value = typeof raw === 'string' ? raw.trim() : undefined;
    if (value === undefined) {
      const shipped = F.socials[network];
      if (shipped) socials[network] = shipped;
    } else if (value.length > 0) {
      socials[network] = value;
    }
  }

  const creditAmount = num(dict, 'referral_credit_amount', F.referral.creditAmount);

  return {
    brand: {
      siteName: str(dict, 'site_name', F.brand.siteName),
      siteDescription: str(dict, 'site_description', F.brand.siteDescription),
      twitterHandle: str(dict, 'twitter_handle', F.brand.twitterHandle),
    },
    currency: {
      code: str(dict, 'currency_code', F.currency.code),
      symbol: str(dict, 'currency_symbol', F.currency.symbol),
    },
    commerce: {
      freeShippingThreshold: num(dict, 'free_shipping_threshold', F.commerce.freeShippingThreshold),
      standardShippingPrice: num(dict, 'standard_shipping_price', F.commerce.standardShippingPrice),
      returnWindowDays: num(dict, 'return_window_days', F.commerce.returnWindowDays),
      deliveryCountry: str(dict, 'delivery_country', F.commerce.deliveryCountry),
      deliveryMinDays: num(dict, 'delivery_min_days', F.commerce.deliveryMinDays),
      deliveryMaxDays: num(dict, 'delivery_max_days', F.commerce.deliveryMaxDays),
    },
    socials,
    org: {
      schemaType: str(dict, 'org_schema_type', F.org.schemaType),
      priceRange: str(dict, 'org_price_range', F.org.priceRange),
      paymentAccepted: str(dict, 'org_payment_accepted', F.org.paymentAccepted),
      areaServed: list(dict, 'org_area_served', F.org.areaServed),
      knowsAbout: list(dict, 'org_knows_about', F.org.knowsAbout),
      availableLanguage: str(dict, 'org_available_language', F.org.availableLanguage),
    },
    referral: {
      creditAmount,
      minPurchase: num(dict, 'referral_min_purchase', F.referral.minPurchase),
      creditExpiryMonths: num(dict, 'referral_credit_expiry_months', F.referral.creditExpiryMonths),
      enabled: creditAmount > 0,
    },
    theme: {
      accentWomen: color(dict, 'color_accent_women', F.theme.accentWomen),
      accentMen: color(dict, 'color_accent_men', F.theme.accentMen),
      sale: color(dict, 'color_sale', F.theme.sale),
      bannerBg: color(dict, 'color_banner_bg', F.theme.bannerBg),
      buy: color(dict, 'color_buy', F.theme.buy),
      buyHover: color(dict, 'color_buy_hover', F.theme.buyHover),
      saleYellow: color(dict, 'color_sale_yellow', F.theme.saleYellow),
    },
    pwa: {
      shortName: str(dict, 'pwa_short_name', F.pwa.shortName),
      categories: list(dict, 'pwa_categories', F.pwa.categories),
    },
    og: {
      brand: str(dict, 'og_brand', F.og.brand),
      subLabel: str(dict, 'og_sub_label', F.og.subLabel),
      tagline: str(dict, 'og_tagline', F.og.tagline),
      imageAlt: str(dict, 'og_image_alt', F.og.imageAlt),
    },
  };
}

/**
 * The CSS custom properties the theme palette publishes.
 *
 * Returned as a plain object so the root layout can hand it to `style` on
 * `<html>` — the palette then reaches Tailwind utilities and inline styles
 * alike, with no extra request and no flash of the shipped colours before the
 * CMS ones arrive.
 *
 * Every name is `--brand-` prefixed, and deliberately so: components already
 * publish short local aliases (`--accent`, `--sale`, `--banner-bg`) scoped to
 * their own subtree, and a global with the same name would make those
 * declarations reference themselves — a cyclic `var()` resolves to
 * guaranteed-invalid and drops the colour entirely.
 *
 * @param   theme - Resolved palette.
 * @returns         `--custom-property` → colour map.
 */
export function themeCssVariables(theme: SiteThemeSettings): Record<string, string> {
  return {
    '--brand-accent-women': theme.accentWomen,
    '--brand-accent-men': theme.accentMen,
    '--brand-sale': theme.sale,
    '--brand-banner-bg': theme.bannerBg,
    '--brand-buy': theme.buy,
    '--brand-buy-hover': theme.buyHover,
    '--brand-sale-yellow': theme.saleYellow,
  };
}
