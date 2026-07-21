import type { Metadata } from 'next';
import { SEO, SITE_URL, SCHEMA_BREADCRUMBS as BC } from '../../src/app/data/seoData';
import { NewArrivalsPage } from '../../src/app/pages/NewArrivalsPage';
import { JsonLd } from '../../src/app/components/JsonLd';
import { loadNewArrivalsPageSystemTexts } from '../../src/lib/oneentry/labels/new-arrivals-page-labels';
import { NewArrivalsPageLabelsProvider } from '../../src/lib/oneentry/labels/NewArrivalsPageLabelsContext';
import { loadProducts } from '../../src/lib/oneentry/catalog/products';
import { adaptCatalogProductToUiProduct, newArrivalCategoryFor } from '../../src/lib/oneentry/catalog/adapt';
import { loadPageBlocksByUrl } from '../../src/lib/oneentry/blocks/page-blocks';
import { loadNewArrivalsPage } from '../../src/lib/oneentry/catalog/new-arrivals-page';

export const metadata: Metadata = SEO.newArrivals;

export const dynamic = 'force-dynamic';

const breadcrumb = {
  '@context': 'https://schema.org',
  '@type': 'BreadcrumbList',
  itemListElement: [
    { '@type': 'ListItem', position: 1, name: BC.home, item: SITE_URL },
    { '@type': 'ListItem', position: 2, name: BC.newArrivals, item: `${SITE_URL}/new` },
  ],
};

interface Props { searchParams: Promise<{ gender?: string }> }

export default async function Page({ searchParams }: Props) {
  const { gender } = await searchParams;
  const genderFilter: 'W' | 'M' | null =
    gender === 'men' ? 'M' : gender === 'women' ? 'W' : null;
  const [labels, products, cmsPage, pageBlocks] = await Promise.all([
    loadNewArrivalsPageSystemTexts(),
    loadProducts({ tags: ['New'], limit: 200 }),
    // Page-level attributes (top hero + footer editorial). Cached 60s so
    // admin edits surface without redeploy.
    loadNewArrivalsPage(),
    // OE-attached blocks for the `new` page. Empty when admin hasn't attached
    // anything — safe fallback, nothing renders.
    loadPageBlocksByUrl('new'),
  ]);
  // Scope to the currently active gender (from `?gender=` in the header).
  // Prefer the OE `gender` attribute when set; fall back to the OE category
  // path (`/women/...` vs `/men/...`) because some tenants leave the flag
  // blank but still root products under a gendered category. Unisex (`U` in
  // OE, or a top-level `/home2/` path) stays visible in both feeds.
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
    ? filteredItems.map((p) => ({ ...adaptCatalogProductToUiProduct(p), category: newArrivalCategoryFor(p) }))
    : undefined;
  return (
    <>
      <JsonLd data={breadcrumb} />
      <NewArrivalsPageLabelsProvider data={labels}>
        <NewArrivalsPage initialProducts={initialProducts} pageBlocks={pageBlocks} cmsPage={cmsPage} />
      </NewArrivalsPageLabelsProvider>
    </>
  );
}
