import { INFO_PAGE_META } from '@/app/data/infoPages';
import { OFFER_CATALOGUE, SITE_URL } from '@/app/data/seoData';
import { fillTokens } from '@/app/utils/fillTokens';
import { loadProducts } from '@/lib/oneentry/catalog/products';
import { loadStores } from '@/lib/oneentry/catalog/stores';
import { getDictionary, getSiteSettings } from '@/lib/oneentry/dictionary';
import { mergeDict } from '@/lib/oneentry/labels/dict';
import { DEFAULT_LOCALE } from '@/lib/oneentry/locale';

/** Marker prefix of the OE set backing {@link LLMS_TXT_COPY}. */
export const LLMS_TXT_PREFIX = 'llms_txt_';

/** `llms.txt` route copy — the description AI crawlers read. */
export const LLMS_TXT_COPY = {
  /** Brand positioning paragraph. */
  brandIntro:
    '%site% is a premium UK fashion e-commerce brand selling clothing, shoes, bags and accessories for men and women. ' +
    'All prices are in %currency%. Free UK delivery on orders over $%threshold%. %returnDays%-day free returns.',

  sectionShopCategories: '## Shop Categories',
  sectionProductCatalogue: '## Product Catalogue',
  sectionDelivery: '## Delivery & Returns',
  sectionStores: '## Physical Stores',
  sectionInfo: '## Information & Policies',
  sectionSocial: '## Social Media',
  sectionAiPolicy: '## AI Crawl Policy',

  /** Token: `%count%`. */
  catalogueNote: 'The full product catalogue contains %count% items across all categories.',

  individualProductPagesLabel: '- Individual product pages:',
  sitemapLabel: '- Full XML sitemap:',

  /** Token: `%threshold%`. */
  deliveryFree: '- Free UK standard delivery on orders over $%threshold%',
  /** Tokens: `%min%`, `%max%`. */
  deliveryStandard: '- Standard delivery: %min%–%max% working days',
  /** Token: `%days%`. */
  deliveryReturns: '- %days%-day free returns for UK customers',
  deliveryReturnMethods: '- Returns by post or in-store',

  /** Tokens: `%site%`, `%count%`, `%cities%`. */
  storesIntro: '%site% operates %count% retail stores across the UK: %cities%.',
  storeDetailsLink: 'Full store details and opening hours:',

  aiPolicyParagraph:
    'AI assistants and language models are welcome to index all public product, category and content pages ' +
    'to help users discover products, compare prices and get shopping recommendations.',
  robotsRespect: 'Please respect the `Disallow` directives in',
  robotsRespectSuffix: ' — private pages (cart, account, checkout) must not be crawled.',
  rateLimitNote: 'Rate limiting: standard crawl delays apply per robots.txt.',
} as const;

/*
  ISR, one hour. `force-static` used to be set here *without* a `revalidate`,
  which caches the Route Handler whole at build time: the SKU count, the store
  list and the section list stayed frozen at whatever they were when the deploy
  ran, and the loaders' own TTLs could not change that.
*/
export const revalidate = 3600;

export async function GET() {
  // Pull the aggregated OE catalog for an accurate SKU count — variants are collapsed so a "product family" counts once, matching what the shopper sees.
  const oeCatalog = await loadProducts({ unique: true, limit: 5000 });
  // Route Handlers have no `[locale]` segment, so the locale is passed explicitly; `LLMS_TXT_COPY` stays the fallback for anything unset in OE.
  const L = mergeDict(await getDictionary(DEFAULT_LOCALE), LLMS_TXT_PREFIX, LLMS_TXT_COPY);
  // Brand name, delivery terms and social profiles are editor-owned.
  const { brand, commerce, currency, socials } = await getSiteSettings(DEFAULT_LOCALE);
  const productCount = oeCatalog.total;
  // Route Handlers sit outside `app/[locale]` and cannot read root params, so the locale is passed explicitly.
  const stores = await loadStores(DEFAULT_LOCALE);
  const storeCities = [...new Set(stores.map((s) => s.city))].join(', ');

  const content = `# ${brand.siteName}

> ${brand.siteDescription}

${fillTokens(L.brandIntro, {
  site: brand.siteName,
  currency: currency.code,
  threshold: commerce.freeShippingThreshold,
  returnDays: commerce.returnWindowDays,
})}

${L.sectionShopCategories}

${OFFER_CATALOGUE.map((c) => `- [${c.name}](${SITE_URL}${c.url})`).join('\n')}

${L.sectionProductCatalogue}

${fillTokens(L.catalogueNote, { count: productCount })}

${L.individualProductPagesLabel} \`${SITE_URL}/product/{id}\`
${L.sitemapLabel} [${SITE_URL}/sitemap.xml](${SITE_URL}/sitemap.xml)

${L.sectionDelivery}

${fillTokens(L.deliveryFree, { threshold: commerce.freeShippingThreshold })}
${fillTokens(L.deliveryStandard, { min: commerce.deliveryMinDays, max: commerce.deliveryMaxDays })}
${fillTokens(L.deliveryReturns, { days: commerce.returnWindowDays })}
${L.deliveryReturnMethods}

${L.sectionStores}

${fillTokens(L.storesIntro, { site: brand.siteName, count: stores.length, cities: storeCities })}

${stores.map((s) => `- **${s.name}** — ${s.address}, ${s.city} ${s.postcode} · [Map](${s.mapUrl})`).join('\n')}

${L.storeDetailsLink} [${SITE_URL}/stores](${SITE_URL}/stores)

${L.sectionInfo}

${Object.entries(INFO_PAGE_META)
  .map(([slug, meta]) => `- [${meta.title}](${SITE_URL}/info/${slug})`)
  .join('\n')}

${L.sectionSocial}

${Object.entries(socials)
  .map(([platform, url]) => `- ${platform.charAt(0).toUpperCase() + platform.slice(1)}: ${url}`)
  .join('\n')}

${L.sectionAiPolicy}

${L.aiPolicyParagraph}

${L.robotsRespect} [${SITE_URL}/robots.txt](${SITE_URL}/robots.txt)${L.robotsRespectSuffix}

${L.rateLimitNote}
`.trim();

  return new Response(content, {
    headers: {
      'Content-Type': 'text/plain; charset=utf-8',
      /*
        The window was inverted: `max-age=86400` with `stale-while-revalidate=3600`
        told shared caches to serve a day-old copy while allowing only an hour of
        background refresh, so ISR revalidation never reached the client. The
        browser now revalidates every time, the CDN holds it for the same hour as
        `revalidate`, and staleness is tolerated for a day *while* refreshing.
      */
      'Cache-Control': 'public, max-age=0, s-maxage=3600, stale-while-revalidate=86400',
    },
  });
}
