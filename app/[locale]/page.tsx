import type { Metadata } from 'next';

import { JsonLd } from '@/app/components/system/JsonLd';
import {
  CURRENCY,
  DELIVERY_COUNTRY,
  FREE_SHIPPING_THRESHOLD,
  OFFER_CATALOGUE,
  ORG_SCHEMA_COPY,
  ORG_SOCIALS,
  RETURN_WINDOW_DAYS,
  SEO,
  SITE_DESCRIPTION,
  SITE_NAME,
  SITE_URL,
} from '@/app/data/seoData';
import type { Store } from '@/app/data/stores';
import { HomePage } from '@/app/pages/HomePage';
import { loadCategorySection } from '@/lib/oneentry/blocks/category-section';
import { loadDiscountBanner } from '@/lib/oneentry/blocks/discount-banner';
import { loadHeroSlides } from '@/lib/oneentry/blocks/hero-slides';
import { loadHomepageCollections } from '@/lib/oneentry/blocks/homepage-collections';
import { HOME_PAGE_ID, loadPageBlocksById } from '@/lib/oneentry/blocks/page-blocks';
import { withCmsSeo } from '@/lib/oneentry/catalog/page-seo';
import { loadStores } from '@/lib/oneentry/catalog/stores';
import { currentCmsLocale } from '@/lib/oneentry/current-locale';

/**
 * Title/description/keywords/canonical come from the OE `home` page when an
 *  editor filled them; `SEO.home` stays as the offline fallback.
 */
export async function generateMetadata(): Promise<Metadata> {
  return withCmsSeo('home', SEO.home);
}

// ISR route: homepage HTML is cached for 5 min, then a background
// revalidation refreshes it. Individual SDK reads are memoised in
// `unstable_cache` within `loadHeroSlides` / `loadHomepageCollections` /
// `loadDiscountBanner` / `loadCategorySection` / `loadStores` /
// `loadBlockWithProducts` — those honour `ISR_HOME_TTL_SEC` env for
// per-loader TTL tuning (see `src/lib/isr.ts`).
//
// This value MUST be a literal (or a locally-defined const of a literal).
// Next.js statically analyses route segment config at build time and
// rejects imported / re-exported / computed values with "Invalid segment
// configuration export detected".
export const revalidate = 300;

function buildOrganizationSchema(flagship: Store | undefined) {
  return {
    '@context': 'https://schema.org',
    '@type': ORG_SCHEMA_COPY.schemaType,
    name: SITE_NAME,
    url: SITE_URL,
    logo: `${SITE_URL}/og-image.jpg`,
    description: SITE_DESCRIPTION,
    sameAs: Object.values(ORG_SOCIALS),
    areaServed: [DELIVERY_COUNTRY, ...ORG_SCHEMA_COPY.areaServed],
    priceRange: ORG_SCHEMA_COPY.priceRange,
    currenciesAccepted: CURRENCY,
    paymentAccepted: ORG_SCHEMA_COPY.paymentAccepted,
    knowsAbout: [...ORG_SCHEMA_COPY.knowsAbout],
    contactPoint: {
      '@type': 'ContactPoint',
      telephone: flagship?.phone ?? '',
      contactType: ORG_SCHEMA_COPY.contactType,
      areaServed: DELIVERY_COUNTRY,
      availableLanguage: ORG_SCHEMA_COPY.availableLanguage,
    },
    address: {
      '@type': 'PostalAddress',
      streetAddress: flagship?.address ?? '',
      addressLocality: flagship?.city ?? '',
      postalCode: flagship?.postcode ?? '',
      addressCountry: DELIVERY_COUNTRY,
    },
    hasOfferCatalog: {
      '@type': 'OfferCatalog',
      name: `${SITE_NAME} ${ORG_SCHEMA_COPY.collectionsSuffix}`,
      itemListElement: OFFER_CATALOGUE.map((c) => ({
        '@type': 'OfferCatalog',
        name: c.name,
        url: `${SITE_URL}${c.url}`,
      })),
    },
    potentialAction: {
      '@type': 'BuyAction',
      target: `${SITE_URL}/women/clothing`,
      description: ORG_SCHEMA_COPY.shippingDescriptionTpl(
        DELIVERY_COUNTRY,
        FREE_SHIPPING_THRESHOLD,
        RETURN_WINDOW_DAYS,
      ),
    },
  };
}

const websiteSchema = {
  '@context': 'https://schema.org',
  '@type': 'WebSite',
  name: SITE_NAME,
  url: SITE_URL,
  potentialAction: {
    '@type': 'SearchAction',
    target: {
      '@type': 'EntryPoint',
      urlTemplate: `${SITE_URL}/women/clothing?q={search_term_string}`,
    },
    'query-input': 'required name=search_term_string',
  },
};

export default async function Page() {
  // The slider loaders wrap their body in `unstable_cache`, where root params
  // are unreadable — so they cannot resolve the route locale themselves and it
  // has to be passed in. It also keys their cache entry per language.
  const lang = await currentCmsLocale();
  const [heroSlides, promoItems, discountBanner, categorySection, pageBlocks, stores] = await Promise.all([
    loadHeroSlides(lang),
    loadHomepageCollections(lang),
    loadDiscountBanner(lang),
    loadCategorySection(lang),
    // Drive the homepage's middle sections from whatever blocks the admin has
    // attached to the OE Home page (id=1). Each marker is resolved to a block
    // detail + product list, ordered by `position`. Adding/removing blocks in
    // OE admin reshuffles the page without code changes.
    loadPageBlocksById(HOME_PAGE_ID),
    loadStores(),
  ]);
  const flagship = stores.find((s) => s.isflagship) ?? stores[0];
  const organizationSchema = buildOrganizationSchema(flagship);

  // Temporary marker order override — OE admin currently has blocks in a
  // different sequence; remove this re-sort once the order is fixed in OE.
  // Note: `homepage_new_arrivals` and `homepage_best_sellers` map to the
  // Women's / Men's collection carousels respectively, so both render
  // before the Sale block.
  const HOMEPAGE_MARKER_ORDER = [
    'hero_slider',
    'category_section',
    'homepage_new_arrivals',
    'promo_block', // "блок с четырьмя большими фото"
    'homepage_sale',
    'homepage_best_sellers',
    'discount_banner',
  ];
  const orderedPageBlocks = pageBlocks.slice().sort((a, b) => {
    const ai = HOMEPAGE_MARKER_ORDER.indexOf(a.marker);
    const bi = HOMEPAGE_MARKER_ORDER.indexOf(b.marker);
    if (ai === -1 && bi === -1) return 0;
    if (ai === -1) return 1;
    if (bi === -1) return -1;
    return ai - bi;
  });

  return (
    <>
      <JsonLd data={organizationSchema} />
      <JsonLd data={websiteSchema} />
      <HomePage
        initialHeroSlides={heroSlides}
        initialPromoItems={promoItems}
        initialDiscountBanner={discountBanner}
        initialCategorySection={categorySection}
        pageBlocks={orderedPageBlocks}
      />
    </>
  );
}
