import type { Metadata } from 'next';
import { Suspense } from 'react';

import { JsonLd } from '@/app/components/system/JsonLd';
import { SCHEMA_BREADCRUMBS as BC, SEO, SITE_URL } from '@/app/data/seoData';
import { NewArrivalsPage } from '@/app/pages/NewArrivalsPage';
import { loadPageBlocksByUrl } from '@/lib/oneentry/blocks/page-blocks';
import { adaptCatalogProductToUiProduct, newArrivalCategoryFor } from '@/lib/oneentry/catalog/adapt';
import { loadNewArrivalsPage } from '@/lib/oneentry/catalog/new-arrivals-page';
import { withCmsSeo } from '@/lib/oneentry/catalog/page-seo';
import { loadProducts } from '@/lib/oneentry/catalog/products';

/** Title/description/keywords/canonical come from the OE `new` page when an editor filled them. */
export async function generateMetadata(): Promise<Metadata> {
  return withCmsSeo('new', SEO.newArrivals);
}

// CMS content changes only when an admin edits it, so this is ISR, never `force-dynamic` (MCP `performance`).
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
  const [products, cmsPage, pageBlocks] = await Promise.all([
    loadProducts({ tags: ['New'], limit: 200 }),
    // Page-level attributes (top hero + footer editorial).
    loadNewArrivalsPage(),
    // OE-attached blocks for the `new` page.
    loadPageBlocksByUrl('new'),
  ]);
  // The full feed ships to the client.
  const initialProducts =
    products.items.length > 0
      ? products.items.map((p) => ({ ...adaptCatalogProductToUiProduct(p), category: newArrivalCategoryFor(p) }))
      : undefined;
  return (
    <>
      <JsonLd data={breadcrumb} />
      {/* NewArrivalsPage reads `?gender=` via useSearchParams — without this
          boundary the whole route silently reverts to dynamic rendering. */}
      <Suspense fallback={null}>
        <NewArrivalsPage initialProducts={initialProducts} pageBlocks={pageBlocks} cmsPage={cmsPage} />
      </Suspense>
    </>
  );
}
