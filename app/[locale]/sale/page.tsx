import type { Metadata } from 'next';
import { Suspense } from 'react';

import { JsonLd } from '@/app/components/system/JsonLd';
import { SCHEMA_BREADCRUMBS as BC, SEO, SITE_URL } from '@/app/data/seoData';
import { SalePage } from '@/app/pages/SalePage';
import { loadPageBlocksByUrl } from '@/lib/oneentry/blocks/page-blocks';
import { adaptCatalogProductToUiProduct, saleCategoryFor } from '@/lib/oneentry/catalog/adapt';
import { withCmsSeo } from '@/lib/oneentry/catalog/page-seo';
import { loadProducts } from '@/lib/oneentry/catalog/products';
import { loadSalePage } from '@/lib/oneentry/catalog/sale-page';

/** Title/description/keywords/canonical come from the OE `sale` page when an editor filled them. */
export async function generateMetadata(): Promise<Metadata> {
  return withCmsSeo('sale', SEO.sale);
}

// CMS content changes only when an admin edits it, so this is ISR, never `force-dynamic` (MCP `performance`).
export const dynamic = 'force-static';
export const revalidate = 60;

const breadcrumb = {
  '@context': 'https://schema.org',
  '@type': 'BreadcrumbList',
  itemListElement: [
    { '@type': 'ListItem', position: 1, name: BC.home, item: SITE_URL },
    { '@type': 'ListItem', position: 2, name: BC.sale, item: `${SITE_URL}/sale` },
  ],
};

export default async function Page() {
  const [products, cmsPage, pageBlocks] = await Promise.all([
    loadProducts({ tags: ['Sale'], limit: 200 }),
    // Full page-level attributes (top banner + footer promo + countdown).
    loadSalePage(),
    // OE-attached blocks for the `sale` page.
    loadPageBlocksByUrl('sale'),
  ]);
  const saleEndsAt = cmsPage?.saleEndsAt ?? null;
  // The full feed ships to the client.
  const initialProducts =
    products.items.length > 0
      ? products.items.map((p) => ({ ...adaptCatalogProductToUiProduct(p), category: saleCategoryFor(p) }))
      : undefined;
  return (
    <>
      <JsonLd data={breadcrumb} />
      {/* SalePage reads `?gender=` via useSearchParams — without this
          boundary the whole route silently reverts to dynamic rendering. */}
      <Suspense fallback={null}>
        <SalePage
          initialProducts={initialProducts}
          saleEndsAt={saleEndsAt ?? undefined}
          pageBlocks={pageBlocks}
          cmsPage={cmsPage}
        />
      </Suspense>
    </>
  );
}
