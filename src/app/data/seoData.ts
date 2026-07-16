import type { Metadata } from 'next';

// ─── Site-wide defaults ────────────────────────────────────────────────────
export const SITE_NAME = 'Kekimoro';
export const SITE_DESCRIPTION =
  'Premium fashion for men and women. Curated collections, fast worldwide delivery and easy returns.';
export const SITE_URL = 'https://oneentry-fashion.com';
const BASE = SITE_URL;

// ─── Currency & Twitter handle ─────────────────────────────────────────────
// Kept in sync with `currencyConfig.ts` — SEO / JSON-LD used to advertise
// GBP while the storefront actually formatted every price with `$` (USD),
// which trips Google Merchant / Facebook Catalog feed validation. Align
// to what the shopper actually sees.
export const CURRENCY = 'USD';
export const TWITTER_HANDLE = '@KekimoroFashion';

// ─── Shipping & returns ────────────────────────────────────────────────────
export const FREE_SHIPPING_THRESHOLD = 50;   // $50+ = free delivery
export const RETURN_WINDOW_DAYS = 28;
export const DELIVERY_COUNTRY = 'GB';
export const DELIVERY_MIN_DAYS = 2;
export const DELIVERY_MAX_DAYS = 5;

// ─── Offer catalogue (used in Organization schema + llms.txt) ─────────────
export const OFFER_CATALOGUE = [
  { name: "Women's Clothing", url: '/women/clothing' },
  { name: "Women's Shoes",    url: '/women/shoes' },
  { name: "Women's Bags",     url: '/women/bags' },
  { name: "Women's Accessories", url: '/women/accessories' },
  { name: "Men's Clothing",   url: '/men/clothing' },
  { name: "Men's Shoes",      url: '/men/shoes' },
  { name: "Men's Bags",       url: '/men/bags' },
  { name: "Men's Accessories", url: '/men/accessories' },
  { name: 'Sale – up to 70% off', url: '/sale' },
  { name: 'New Arrivals',     url: '/new' },
] as const;

// ─── Organisation contact & social data ───────────────────────────────────
export const ORG_SOCIALS = {
  instagram: 'https://www.instagram.com/oneentryfashion',
  twitter:   'https://www.twitter.com/KekimoroFashion',
  facebook:  'https://www.facebook.com/oneentryfashion',
  youtube:   'https://www.youtube.com/@oneentryfashion',
  tiktok:    'https://www.tiktok.com/@oneentryfashion',
  pinterest: 'https://www.pinterest.com/oneentryfashion',
};

// ─── Shared OpenGraph image ────────────────────────────────────────────────
export const OG_IMAGE = {
  url: '/og-image.jpg',
  width: 1200,
  height: 630,
  alt: 'Kekimoro – Premium clothing, shoes and accessories',
};

// ─── PWA manifest copy ─────────────────────────────────────────────────────
export const PWA_MANIFEST_COPY = {
  shortName: 'Kekimoro',
  categories: ['shopping', 'fashion', 'lifestyle'] as string[],
} as const;

// ─── OG image rendered banner copy ─────────────────────────────────────────
export const OG_IMAGE_COPY = {
  brand: 'Kekimoro',
  subLabel: 'FASHION',
  tagline: 'Premium Collections · Men & Women',
} as const;

// ─── Schema.org day name mapping ──────────────────────────────────────────
export const SCHEMA_DAYS = {
  monThruSat: 'Mon – Sat',
  monThruSatHyphen: 'Mon - Sat',
  monday: 'Monday',
  tuesday: 'Tuesday',
  wednesday: 'Wednesday',
  thursday: 'Thursday',
  friday: 'Friday',
  saturday: 'Saturday',
  sunday: 'Sunday',
  bankHolidays: 'Bank Holidays',
} as const;

// ─── Store schema name template ───────────────────────────────────────────
export const STORE_SCHEMA_NAME = {
  prefix: 'Kekimoro',
  separator: '—',
} as const;

// ─── BreadcrumbList JSON-LD labels (used by app/*/page.tsx) ───────────────
export const SCHEMA_BREADCRUMBS = {
  home: 'Home',
  sale: 'Sale',
  newArrivals: 'New Arrivals',
  stores: 'Store Locator',
  favorites: 'Wishlist',
  cart: 'Shopping Bag',
  account: 'My Account',
  productsFallback: 'Products',
} as const;

// ─── Product page metadata copy ───────────────────────────────────────────
export const PRODUCT_META_COPY = {
  fallbackDescription: 'Premium quality fashion item.',
  shippingNote: 'Free delivery on orders over $50.',
  keywordBuyOnline: 'buy online',
  twitterPriceLabel: 'Price',
  twitterAvailLabel: 'Availability',
  outOfStock: 'Out of Stock',
  inStock: 'In Stock',
  specCompositionLabel: 'Composition',
  specMaterialLabel: 'Material',
  displaySymbol: '$',
  pricedAsTpl: (sale: string | number | undefined, price: string | number) =>
    sale ? `$${sale} (was $${price})` : `$${price}`,
  buyTpl: (name: string, brand: string, price: string) => `Buy ${name} by ${brand} for ${price}.`,
  notFoundTitleTpl: (siteName: string) => `Product Not Found | ${siteName}`,
} as const;

// ─── Organization JSON-LD content ──────────────────────────────────────────
export const ORG_SCHEMA_COPY = {
  schemaType: 'ClothingStore',
  areaServed: ['IE', 'EU'] as const,
  priceRange: '$$',
  paymentAccepted: 'Credit Card, Debit Card, PayPal',
  knowsAbout: [
    "Women's Fashion", "Men's Fashion",
    'Premium Clothing', 'Designer Bags', 'Luxury Shoes',
    'Fashion Accessories',
  ] as const,
  contactType: 'customer service',
  availableLanguage: 'English',
  collectionsSuffix: 'Collections',
  shippingDescriptionTpl: (country: string, threshold: number, returnDays: number) =>
    `Free ${country} delivery over $${threshold}. ${returnDays}-day returns.`,
} as const;

// ─── Helper: canonical + og:url for a given path ──────────────────────────
function pageUrl(path: string) {
  return `${BASE}${path}`;
}

// ─── Page-level SEO data ───────────────────────────────────────────────────

export const SEO: Record<string, Metadata> = {
  // ── Homepage ────────────────────────────────────────────────────────────
  home: {
    title: `${SITE_NAME} | Premium Women's & Men's Clothing`,
    description:
      "Shop the latest fashion from Kekimoro. Women's and men's clothing, shoes, bags and accessories. Free delivery on orders over $50.",
    keywords:
      'fashion, clothing, women clothing, men clothing, shoes, bags, accessories, Kekimoro, online fashion store',
    alternates: { canonical: pageUrl('/') },
    openGraph: {
      title: `${SITE_NAME} | Premium Women's & Men's Clothing`,
      description:
        "Shop the latest fashion from Kekimoro. Women's and men's clothing, shoes, bags and accessories.",
      type: 'website',
      url: pageUrl('/'),
      images: [OG_IMAGE],
    },
    twitter: {
      card: 'summary_large_image',
      title: `${SITE_NAME} | Premium Women's & Men's Clothing`,
      description:
        "Shop the latest fashion from Kekimoro. Women's and men's clothing, shoes, bags and accessories.",
      images: [OG_IMAGE.url],
    },
    robots: { index: true, follow: true },
  },

  // ── Women ────────────────────────────────────────────────────────────────
  womenClothing: {
    title: `Women's Clothing | Dresses, Tops & Coats | ${SITE_NAME}`,
    description:
      "Browse Kekimoro women's clothing: dresses, tops, coats, blazers, jeans and more. New season styles with free delivery over $50.",
    keywords:
      'women clothing, dresses, tops, coats, blazers, jeans, women fashion, Kekimoro women',
    alternates: { canonical: pageUrl('/women/clothing') },
    openGraph: {
      title: `Women's Clothing | ${SITE_NAME}`,
      description:
        "Browse the latest women's clothing at Kekimoro – dresses, tops, coats, blazers and more.",
      type: 'website',
      url: pageUrl('/women/clothing'),
      images: [OG_IMAGE],
    },
    twitter: {
      card: 'summary_large_image',
      title: `Women's Clothing | ${SITE_NAME}`,
      description: "Browse the latest women's clothing at Kekimoro.",
      images: [OG_IMAGE.url],
    },
    robots: { index: true, follow: true },
  },

  womenShoes: {
    title: `Women's Shoes | Boots, Heels & Trainers | ${SITE_NAME}`,
    description:
      "Discover Kekimoro women's shoes: ankle boots, heels, trainers, sandals and ballet flats. Timeless styles for every occasion.",
    keywords:
      'women shoes, boots, heels, trainers, sandals, ballet flats, women footwear, Kekimoro shoes',
    alternates: { canonical: pageUrl('/women/shoes') },
    openGraph: {
      title: `Women's Shoes | ${SITE_NAME}`,
      description:
        "Discover women's shoes at Kekimoro – boots, heels, trainers, sandals and more.",
      type: 'website',
      url: pageUrl('/women/shoes'),
      images: [OG_IMAGE],
    },
    twitter: {
      card: 'summary_large_image',
      title: `Women's Shoes | ${SITE_NAME}`,
      description: "Discover women's shoes at Kekimoro.",
      images: [OG_IMAGE.url],
    },
    robots: { index: true, follow: true },
  },

  womenBags: {
    title: `Women's Bags | Handbags, Totes & Clutches | ${SITE_NAME}`,
    description:
      "Shop Kekimoro women's bags: handbags, shoulder bags, totes, clutches and bucket bags. Premium leather and sustainable materials.",
    keywords:
      'women bags, handbags, totes, clutches, shoulder bags, leather bags, Kekimoro bags',
    alternates: { canonical: pageUrl('/women/bags') },
    openGraph: {
      title: `Women's Bags | ${SITE_NAME}`,
      description:
        "Shop women's bags at Kekimoro – handbags, totes, clutches and more.",
      type: 'website',
      url: pageUrl('/women/bags'),
      images: [OG_IMAGE],
    },
    twitter: {
      card: 'summary_large_image',
      title: `Women's Bags | ${SITE_NAME}`,
      description: "Shop women's bags at Kekimoro.",
      images: [OG_IMAGE.url],
    },
    robots: { index: true, follow: true },
  },

  womenAccessories: {
    title: `Women's Accessories | Jewellery & Scarves | ${SITE_NAME}`,
    description:
      "Complete your look with Kekimoro women's accessories: jewellery, scarves, sunglasses, belts and hats. Stylish finishing touches for every outfit.",
    keywords:
      'women accessories, jewellery, scarves, sunglasses, belts, hats, women fashion accessories, Kekimoro accessories',
    alternates: { canonical: pageUrl('/women/accessories') },
    openGraph: {
      title: `Women's Accessories | ${SITE_NAME}`,
      description:
        "Shop women's accessories at Kekimoro – jewellery, scarves, sunglasses and more.",
      type: 'website',
      url: pageUrl('/women/accessories'),
      images: [OG_IMAGE],
    },
    twitter: {
      card: 'summary_large_image',
      title: `Women's Accessories | ${SITE_NAME}`,
      description: "Shop women's accessories at Kekimoro.",
      images: [OG_IMAGE.url],
    },
    robots: { index: true, follow: true },
  },

  // ── Men ──────────────────────────────────────────────────────────────────
  menClothing: {
    title: `Men's Clothing | Suits & Outerwear | ${SITE_NAME}`,
    description:
      "Shop Kekimoro men's clothing: suits, shirts, jeans, outerwear, knitwear and casualwear. Premium quality with tailored fits.",
    keywords:
      'men clothing, suits, shirts, jeans, outerwear, knitwear, men fashion, Kekimoro men',
    alternates: { canonical: pageUrl('/men/clothing') },
    openGraph: {
      title: `Men's Clothing | ${SITE_NAME}`,
      description:
        "Shop men's clothing at Kekimoro – suits, shirts, jeans, outerwear and more.",
      type: 'website',
      url: pageUrl('/men/clothing'),
      images: [OG_IMAGE],
    },
    twitter: {
      card: 'summary_large_image',
      title: `Men's Clothing | ${SITE_NAME}`,
      description: "Shop men's clothing at Kekimoro.",
      images: [OG_IMAGE.url],
    },
    robots: { index: true, follow: true },
  },

  menShoes: {
    title: `Men's Shoes | Boots, Trainers & Loafers | ${SITE_NAME}`,
    description:
      "Discover Kekimoro men's shoes: leather boots, trainers, loafers, derby shoes and sandals. Premium craftsmanship for every occasion.",
    keywords:
      'men shoes, leather boots, trainers, loafers, derby shoes, men footwear, Kekimoro men shoes',
    alternates: { canonical: pageUrl('/men/shoes') },
    openGraph: {
      title: `Men's Shoes | ${SITE_NAME}`,
      description:
        "Discover men's shoes at Kekimoro – boots, trainers, loafers and more.",
      type: 'website',
      url: pageUrl('/men/shoes'),
      images: [OG_IMAGE],
    },
    twitter: {
      card: 'summary_large_image',
      title: `Men's Shoes | ${SITE_NAME}`,
      description: "Discover men's shoes at Kekimoro.",
      images: [OG_IMAGE.url],
    },
    robots: { index: true, follow: true },
  },

  menBags: {
    title: `Men's Bags | Briefcases & Backpacks | ${SITE_NAME}`,
    description:
      "Shop Kekimoro men's bags: leather briefcases, backpacks, holdalls, messenger bags and laptop bags. Built to last.",
    keywords:
      'men bags, briefcases, backpacks, holdalls, messenger bags, laptop bags, Kekimoro men bags',
    alternates: { canonical: pageUrl('/men/bags') },
    openGraph: {
      title: `Men's Bags | ${SITE_NAME}`,
      description:
        "Shop men's bags at Kekimoro – briefcases, backpacks, holdalls and more.",
      type: 'website',
      url: pageUrl('/men/bags'),
      images: [OG_IMAGE],
    },
    twitter: {
      card: 'summary_large_image',
      title: `Men's Bags | ${SITE_NAME}`,
      description: "Shop men's bags at Kekimoro.",
      images: [OG_IMAGE.url],
    },
    robots: { index: true, follow: true },
  },

  menAccessories: {
    title: `Men's Accessories | Wallets & Belts | ${SITE_NAME}`,
    description:
      "Shop Kekimoro men's accessories: leather wallets, belts, watches, scarves, cufflinks and sunglasses. The perfect finishing touch.",
    keywords:
      'men accessories, wallets, belts, watches, scarves, cufflinks, men fashion accessories, Kekimoro accessories',
    alternates: { canonical: pageUrl('/men/accessories') },
    openGraph: {
      title: `Men's Accessories | ${SITE_NAME}`,
      description:
        "Shop men's accessories at Kekimoro – wallets, belts, watches and more.",
      type: 'website',
      url: pageUrl('/men/accessories'),
      images: [OG_IMAGE],
    },
    twitter: {
      card: 'summary_large_image',
      title: `Men's Accessories | ${SITE_NAME}`,
      description: "Shop men's accessories at Kekimoro.",
      images: [OG_IMAGE.url],
    },
    robots: { index: true, follow: true },
  },

  // ── Special sections ─────────────────────────────────────────────────────
  sale: {
    title: `Sale | Up to 70% Off Fashion | ${SITE_NAME}`,
    description:
      "Shop Kekimoro sale: up to 70% off women's and men's clothing, shoes, bags and accessories. Limited time offers – don't miss out.",
    keywords:
      'fashion sale, discount clothing, sale dresses, sale shoes, sale bags, Kekimoro sale, up to 70 off',
    alternates: { canonical: pageUrl('/sale') },
    openGraph: {
      title: `Sale – Up to 70% Off | ${SITE_NAME}`,
      description:
        "Up to 70% off women's and men's fashion at Kekimoro. Limited time only.",
      type: 'website',
      url: pageUrl('/sale'),
      images: [OG_IMAGE],
    },
    twitter: {
      card: 'summary_large_image',
      title: `Sale – Up to 70% Off | ${SITE_NAME}`,
      description: 'Up to 70% off fashion at Kekimoro.',
      images: [OG_IMAGE.url],
    },
    robots: { index: true, follow: true },
  },

  newArrivals: {
    title: `New Arrivals | Latest Fashion | ${SITE_NAME}`,
    description:
      'Discover the latest new arrivals at Kekimoro. Fresh styles in clothing, shoes, bags and accessories for women and men. Updated weekly.',
    keywords:
      'new arrivals, new clothing, new season fashion, latest styles, new collection, Kekimoro new',
    alternates: { canonical: pageUrl('/new') },
    openGraph: {
      title: `New Arrivals | ${SITE_NAME}`,
      description:
        'Discover the latest new arrivals at Kekimoro – clothing, shoes, bags and accessories.',
      type: 'website',
      url: pageUrl('/new'),
      images: [OG_IMAGE],
    },
    twitter: {
      card: 'summary_large_image',
      title: `New Arrivals | ${SITE_NAME}`,
      description: 'Discover the latest new arrivals at Kekimoro.',
      images: [OG_IMAGE.url],
    },
    robots: { index: true, follow: true },
  },

  stores: {
    title: `Store Locator | Find Us Near You | ${SITE_NAME}`,
    description:
      'Find your nearest Kekimoro store. Locations in London, Manchester, Birmingham, Edinburgh and Brighton with opening hours and contact details.',
    keywords:
      'Kekimoro stores, fashion store locator, London fashion, clothing store near me, Kekimoro locations',
    alternates: { canonical: pageUrl('/stores') },
    openGraph: {
      title: `Store Locator | ${SITE_NAME}`,
      description:
        'Find your nearest Kekimoro store – London, Manchester, Birmingham, Edinburgh and Brighton.',
      type: 'website',
      url: pageUrl('/stores'),
      images: [OG_IMAGE],
    },
    twitter: {
      card: 'summary_large_image',
      title: `Store Locator | ${SITE_NAME}`,
      description: 'Find your nearest Kekimoro store.',
      images: [OG_IMAGE.url],
    },
    robots: { index: true, follow: true },
  },

  // ── User/transactional pages (noindex) ────────────────────────────────────
  cart: {
    title: `Shopping Bag | ${SITE_NAME}`,
    description: 'Your Kekimoro shopping bag. Review your items and proceed to checkout.',
    robots: { index: false, follow: false },
  },

  favorites: {
    title: `Wishlist | ${SITE_NAME}`,
    description: 'Your Kekimoro wishlist. Save your favourite items and share them with friends.',
    robots: { index: false, follow: false },
  },

  account: {
    title: `My Account | ${SITE_NAME}`,
    description: 'Manage your Kekimoro account: orders, addresses, payment methods and preferences.',
    robots: { index: false, follow: false },
  },

  checkoutDelivery: {
    title: `Delivery Details | Checkout | ${SITE_NAME}`,
    description: 'Enter your delivery details to complete your Kekimoro order.',
    robots: { index: false, follow: false },
  },

  checkoutPayment: {
    title: `Payment | Checkout | ${SITE_NAME}`,
    description: 'Choose your payment method to complete your Kekimoro order.',
    robots: { index: false, follow: false },
  },

  checkoutConfirmation: {
    title: `Order Confirmed | ${SITE_NAME}`,
    description: 'Thank you for your order! Your Kekimoro purchase has been confirmed.',
    robots: { index: false, follow: false },
  },

  filterSystemDownload: {
    title: `Download Filter System | ${SITE_NAME}`,
    description: 'Download the Kekimoro advanced product filter system.',
    robots: { index: false, follow: false },
  },

  notFound: {
    title: `Page Not Found | ${SITE_NAME}`,
    description: 'Sorry, the page you are looking for could not be found.',
    robots: { index: false, follow: false },
  },
};
