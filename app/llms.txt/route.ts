import {
  SITE_NAME, SITE_URL, SITE_DESCRIPTION,
  ORG_SOCIALS, CURRENCY,
  FREE_SHIPPING_THRESHOLD, RETURN_WINDOW_DAYS,
  DELIVERY_MIN_DAYS, DELIVERY_MAX_DAYS,
  OFFER_CATALOGUE,
} from '../../src/app/data/seoData';
import { LLMS_TXT_COPY, LLMS_TXT_PREFIX } from '../../src/app/data/llmsTextLabels';
import { fillTokens } from '../../src/app/utils/fillTokens';
import { getDictionary } from '../../src/lib/oneentry/dictionary';
import { mergeDict } from '../../src/lib/oneentry/labels/dict';
import { loadProducts } from '../../src/lib/oneentry/catalog/products';
import { loadStores } from '../../src/lib/oneentry/catalog/stores';
import { INFO_PAGE_META } from '../../src/app/data/infoPages';
import { DEFAULT_LOCALE } from '../../src/lib/oneentry/locale';

export const dynamic = 'force-static';

export async function GET() {
  // Pull the aggregated OE catalog for an accurate SKU count — variants are
  // collapsed so a "product family" counts once, matching what the shopper sees.
  const oeCatalog = await loadProducts({ unique: true, limit: 5000 });
  // Route Handlers have no `[locale]` segment, so the locale is passed
  // explicitly; `LLMS_TXT_COPY` stays the fallback for anything unset in OE.
  const L = mergeDict(await getDictionary(DEFAULT_LOCALE), LLMS_TXT_PREFIX, LLMS_TXT_COPY);
  const productCount = oeCatalog.total;
  // Route Handlers sit outside `app/[locale]` and cannot read root params, so
  // the locale is passed explicitly. `/llms.txt` is a single canonical document
  // describing the storefront, so the default locale is the right one.
  const stores = await loadStores(DEFAULT_LOCALE);
  const storeCities = [...new Set(stores.map((s) => s.city))].join(', ');

  const content = `# ${SITE_NAME}

> ${SITE_DESCRIPTION}

${fillTokens(L.brandIntro, { site: SITE_NAME, currency: CURRENCY, threshold: FREE_SHIPPING_THRESHOLD, returnDays: RETURN_WINDOW_DAYS })}

${L.sectionShopCategories}

${OFFER_CATALOGUE.map((c) => `- [${c.name}](${SITE_URL}${c.url})`).join('\n')}

${L.sectionProductCatalogue}

${fillTokens(L.catalogueNote, { count: productCount })}

${L.individualProductPagesLabel} \`${SITE_URL}/product/{id}\`
${L.sitemapLabel} [${SITE_URL}/sitemap.xml](${SITE_URL}/sitemap.xml)

${L.sectionDelivery}

${fillTokens(L.deliveryFree, { threshold: FREE_SHIPPING_THRESHOLD })}
${fillTokens(L.deliveryStandard, { min: DELIVERY_MIN_DAYS, max: DELIVERY_MAX_DAYS })}
${fillTokens(L.deliveryReturns, { days: RETURN_WINDOW_DAYS })}
${L.deliveryReturnMethods}

${L.sectionStores}

${fillTokens(L.storesIntro, { site: SITE_NAME, count: stores.length, cities: storeCities })}

${stores.map((s) => `- **${s.name}** — ${s.address}, ${s.city} ${s.postcode} · [Map](${s.mapUrl})`).join('\n')}

${L.storeDetailsLink} [${SITE_URL}/stores](${SITE_URL}/stores)

${L.sectionInfo}

${Object.entries(INFO_PAGE_META)
  .map(([slug, meta]) => `- [${meta.title}](${SITE_URL}/info/${slug})`)
  .join('\n')}

${L.sectionSocial}

${Object.entries(ORG_SOCIALS)
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
      'Cache-Control': 'public, max-age=86400, stale-while-revalidate=3600',
    },
  });
}
