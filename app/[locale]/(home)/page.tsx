import type { Metadata } from 'next';

import { JsonLd } from '@/app/components/system/JsonLd';
import { OFFER_CATALOGUE, ORG_SCHEMA_COPY, SEO, SITE_URL } from '@/app/data/seoData';
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
import { getSiteSettings } from '@/lib/oneentry/dictionary';
import type { SiteSettings } from '@/lib/oneentry/site-settings';

/** Title/description/keywords/canonical come from the OE `home` page when an editor filled them. */
export async function generateMetadata(): Promise<Metadata> {
  return withCmsSeo('home', SEO.home);
}

// ISR route: homepage HTML is cached for 5 min, then a background revalidation refreshes it.
export const revalidate = 300;

/** `Organization` JSON-LD for the storefront. */
function buildOrganizationSchema(flagship: Store | undefined, settings: SiteSettings) {
  const { brand, commerce, currency, org, socials } = settings;
  return {
    '@context': 'https://schema.org',
    '@type': org.schemaType,
    name: brand.siteName,
    url: SITE_URL,
    logo: `${SITE_URL}/og-image.jpg`,
    description: brand.siteDescription,
    sameAs: Object.values(socials),
    areaServed: [commerce.deliveryCountry, ...org.areaServed],
    priceRange: org.priceRange,
    currenciesAccepted: currency.code,
    paymentAccepted: org.paymentAccepted,
    knowsAbout: [...org.knowsAbout],
    contactPoint: {
      '@type': 'ContactPoint',
      telephone: flagship?.phone ?? '',
      contactType: ORG_SCHEMA_COPY.contactType,
      areaServed: commerce.deliveryCountry,
      availableLanguage: org.availableLanguage,
    },
    address: {
      '@type': 'PostalAddress',
      streetAddress: flagship?.address ?? '',
      addressLocality: flagship?.city ?? '',
      postalCode: flagship?.postcode ?? '',
      addressCountry: commerce.deliveryCountry,
    },
    hasOfferCatalog: {
      '@type': 'OfferCatalog',
      name: `${brand.siteName} ${ORG_SCHEMA_COPY.collectionsSuffix}`,
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
        commerce.deliveryCountry,
        commerce.freeShippingThreshold,
        commerce.returnWindowDays,
      ),
    },
  };
}

/** `WebSite` JSON-LD. */
function buildWebsiteSchema(siteName: string) {
  return {
    '@context': 'https://schema.org',
    '@type': 'WebSite',
    name: siteName,
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
}

export default async function Page() {
  // The slider loaders wrap their body in `unstable_cache`, where root params are unreadable.
  const lang = await currentCmsLocale();
  const [heroSlides, promoItems, discountBanner, categorySection, pageBlocks, stores, siteSettings] = await Promise.all(
    [
      loadHeroSlides(lang),
      loadHomepageCollections(lang),
      loadDiscountBanner(lang),
      loadCategorySection(lang),
      // Drive the homepage's middle sections from whatever blocks the admin has attached to the OE Home page (id=1).
      loadPageBlocksById(HOME_PAGE_ID),
      loadStores(),
      getSiteSettings(lang),
    ],
  );
  const flagship = stores.find((s) => s.isflagship) ?? stores[0];
  const organizationSchema = buildOrganizationSchema(flagship, siteSettings);

  // Temporary marker order override — OE admin currently has blocks in a different sequence; remove this re-sort once the order is fixed in OE.
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
      <JsonLd data={buildWebsiteSchema(siteSettings.brand.siteName)} />
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
