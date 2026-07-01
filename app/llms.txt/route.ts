import {
  SITE_NAME, SITE_URL, SITE_DESCRIPTION,
  ORG_SOCIALS, CURRENCY,
  FREE_SHIPPING_THRESHOLD, RETURN_WINDOW_DAYS,
  DELIVERY_MIN_DAYS, DELIVERY_MAX_DAYS,
  OFFER_CATALOGUE,
} from '../../src/app/data/seoData';
import { LLMS_TXT_COPY as L } from '../../src/app/data/llmsTextLabels';
import { PRODUCT_CATALOG } from '../../src/app/data/productCatalog';
import { loadStores } from '../../src/lib/oneentry/catalog/stores';
import { INFO_PAGE_META } from '../../src/app/data/infoPages';

export const dynamic = 'force-static';

export async function GET() {
  const productCount = Object.keys(PRODUCT_CATALOG).length;
  const stores = await loadStores();
  const storeCities = [...new Set(stores.map((s) => s.city))].join(', ');

  const content = `# ${SITE_NAME}

> ${SITE_DESCRIPTION}

${L.brandIntroTpl(SITE_NAME, CURRENCY, FREE_SHIPPING_THRESHOLD, RETURN_WINDOW_DAYS)}

${L.sectionShopCategories}

${OFFER_CATALOGUE.map((c) => `- [${c.name}](${SITE_URL}${c.url})`).join('\n')}

${L.sectionProductCatalogue}

${L.catalogueNoteTpl(productCount)}

${L.individualProductPagesLabel} \`${SITE_URL}/product/{id}\`
${L.sitemapLabel} [${SITE_URL}/sitemap.xml](${SITE_URL}/sitemap.xml)

${L.sectionDelivery}

${L.deliveryBullets.free(FREE_SHIPPING_THRESHOLD)}
${L.deliveryBullets.standard(DELIVERY_MIN_DAYS, DELIVERY_MAX_DAYS)}
${L.deliveryBullets.returns(RETURN_WINDOW_DAYS)}
${L.deliveryBullets.returnMethods}

${L.sectionStores}

${L.storesIntroTpl(SITE_NAME, stores.length, storeCities)}

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
