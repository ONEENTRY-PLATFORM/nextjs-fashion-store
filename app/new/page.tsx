import { Suspense } from 'react';
import { withCmsSeo } from '../../src/lib/oneentry/catalog/page-seo';
import type { Metadata } from 'next';
import { SEO, SITE_URL, SCHEMA_BREADCRUMBS as BC } from '../../src/app/data/seoData';
import { NewArrivalsPage } from '../../src/app/pages/NewArrivalsPage';
import { JsonLd } from '../../src/app/components/system/JsonLd';
import { loadNewArrivalsPageSystemTexts } from '../../src/lib/oneentry/labels/new-arrivals-page-labels';
import { NewArrivalsPageLabelsProvider } from '../../src/lib/oneentry/labels/NewArrivalsPageLabelsContext';
import { loadProducts } from '../../src/lib/oneentry/catalog/products';
import { adaptCatalogProductToUiProduct, newArrivalCategoryFor } from '../../src/lib/oneentry/catalog/adapt';
import { loadPageBlocksByUrl } from '../../src/lib/oneentry/blocks/page-blocks';
import { loadNewArrivalsPage } from '../../src/lib/oneentry/catalog/new-arrivals-page';

/** Title/description/keywords/canonical come from the OE `new` page when an
 *  editor filled them; `SEO.newArrivals` stays as the offline fallback. */
export async function generateMetadata(): Promise<Metadata> {
  return withCmsSeo('new', SEO.newArrivals);
}

// CMS content changes only when an admin edits it, so this is ISR, never
// `force-dynamic` (MCP `performance`). `force-static` makes the build fail
// loudly if anything in the tree slips back into dynamic rendering instead of
// silently degrading. Gender scoping (`?gender=`) is applied in the browser —
// see `NewArrivalsPage`.
export const dynamic = 'force-static';
export const revalidate = 60;

const breadcrumb = {
  '@context': 'https://schema.org',
  '@type': 'BreadcrumbList',
  itemListElement: [
    { '@type': 'ListItem', position: 1, name: BC.home, item: SITE_URL },
    { '@type': 'ListItem', position: 2, name: BC.newArrivals, item: `${SITE_URL}/new` },
  ],
};

export default async function Page() {
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
  // The full feed ships to the client; `NewArrivalsPage` narrows it to the
  // active gender from `?gender=`. The adapter already stamps `gender` with
  // the OE attribute or, when that is blank, the category path
  // (`/women/…` vs `/men/…`), so no extra data is needed for the scope.
  const initialProducts = products.items.length > 0
    ? products.items.map((p) => ({ ...adaptCatalogProductToUiProduct(p), category: newArrivalCategoryFor(p) }))
    : undefined;
  return (
    <>
      <JsonLd data={breadcrumb} />
      <NewArrivalsPageLabelsProvider data={labels}>
        {/* NewArrivalsPage reads `?gender=` via useSearchParams — without this
            boundary the whole route silently reverts to dynamic rendering. */}
        <Suspense fallback={null}>
          <NewArrivalsPage initialProducts={initialProducts} pageBlocks={pageBlocks} cmsPage={cmsPage} />
        </Suspense>
      </NewArrivalsPageLabelsProvider>
    </>
  );
}
