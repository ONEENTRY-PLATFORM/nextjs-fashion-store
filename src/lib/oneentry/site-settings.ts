/** Site-wide settings an editor owns: brand identity, commerce terms, social profiles, structured-data facts, the referral programme, the theme palette and the share-image copy. */

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

/** Commerce terms advertised to shoppers and crawlers. */
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

/** Referral programme configuration. */
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
  /** Network → profile URL. */
  socials: Record<string, string>;
  org: SiteOrgSettings;
  referral: SiteReferralSettings;
  theme: SiteThemeSettings;
  pwa: SitePwaSettings;
  og: SiteOgSettings;
}

/** The copy that ships in the bundle. */
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

/** Read a number. */
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

/** Read a hex colour. */
function color(dict: Dictionary | null | undefined, key: string, fallback: string): string {
  const raw = str(dict, key, fallback);
  return /^#(?:[0-9a-f]{3}|[0-9a-f]{6})$/i.test(raw) ? raw : fallback;
}

/** Turn a loaded dictionary into typed settings. */
export function parseSiteSettings(dict: Dictionary | null | undefined): SiteSettings {
  const F = SITE_SETTINGS_FALLBACK;

  const socials: Record<string, string> = {};
  for (const network of SOCIAL_NETWORKS) {
    // A blank field is how an editor removes a network, so — unlike every other field here — an empty value must NOT fall back to the shipped URL.
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

/** The CSS custom properties the theme palette publishes. */
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
