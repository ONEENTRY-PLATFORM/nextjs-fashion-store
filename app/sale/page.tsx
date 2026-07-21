import type { Metadata } from 'next';
import { SEO, SITE_URL, SCHEMA_BREADCRUMBS as BC } from '../../src/app/data/seoData';
import { SalePage } from '../../src/app/pages/SalePage';
import { JsonLd } from '../../src/app/components/JsonLd';
import { loadSalePageSystemTexts } from '../../src/lib/oneentry/labels/sale-page-labels';
import { SalePageLabelsProvider } from '../../src/lib/oneentry/labels/SalePageLabelsContext';
import { loadProducts } from '../../src/lib/oneentry/catalog/products';
import { adaptCatalogProductToUiProduct, saleCategoryFor } from '../../src/lib/oneentry/catalog/adapt';
import { loadPageBlocksByUrl } from '../../src/lib/oneentry/blocks/page-blocks';
import { loadSalePage } from '../../src/lib/oneentry/catalog/sale-page';

export const metadata: Metadata = SEO.sale;

export const dynamic = 'force-dynamic';

const breadcrumb = {
  '@context': 'https://schema.org',
  '@type': 'BreadcrumbList',
  itemListElement: [
    { '@type': 'ListItem', position: 1, name: BC.home, item: SITE_URL },
    { '@type': 'ListItem', position: 2, name: BC.sale, item: `${SITE_URL}/sale` },
  ],
};

interface Props { searchParams: Promise<{ gender?: string }> }

export default async function Page({ searchParams }: Props) {
  const { gender } = await searchParams;
  const genderFilter: 'W' | 'M' | null =
    gender === 'men' ? 'M' : gender === 'women' ? 'W' : null;
  const [labels, products, cmsPage, pageBlocks] = await Promise.all([
    loadSalePageSystemTexts(),
    loadProducts({ tags: ['Sale'], limit: 200 }),
    // Full page-level attributes (top banner + footer promo + countdown).
    // Cached with 60s revalidate — admin edits surface without redeploy.
    loadSalePage(),
    // OE-attached blocks for the `sale` page. Rendered via `<PageBlocksRenderer>`
    // inside SalePage. Empty when admin hasn't attached anything.
    loadPageBlocksByUrl('sale'),
  ]);
  const saleEndsAt = cmsPage?.saleEndsAt ?? null;
  // Prefer the OE `gender` attribute; fall back to the OE category path
  // (`/women/...` vs `/men/...`) when the merchant left the flag blank.
  const matchGender = (p: typeof products.items[number]) => {
    if (!genderFilter) return true;
    if (p.gender === 'U') return true;
    if (p.gender === genderFilter) return true;
    if (!p.gender) {
      const catToken = genderFilter === 'W' ? '/women/' : '/men/';
      return p.categories.some((c) => c.toLowerCase().includes(catToken));
    }
    return false;
  };
  const filteredItems = products.items.filter(matchGender);
  const initialProducts = filteredItems.length > 0
    ? filteredItems.map((p) => ({ ...adaptCatalogProductToUiProduct(p), category: saleCategoryFor(p) }))
    : undefined;
  return (
    <>
      <JsonLd data={breadcrumb} />
      <SalePageLabelsProvider data={labels}>
        <SalePage initialProducts={initialProducts} saleEndsAt={saleEndsAt ?? undefined} gender={genderFilter} pageBlocks={pageBlocks} cmsPage={cmsPage} />
      </SalePageLabelsProvider>
    </>
  );
}
