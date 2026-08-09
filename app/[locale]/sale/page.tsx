import type { Metadata } from 'next';
import { Suspense } from 'react';

import { JsonLd } from '../../../src/app/components/system/JsonLd';
import { SCHEMA_BREADCRUMBS as BC, SEO, SITE_URL } from '../../../src/app/data/seoData';
import { SalePage } from '../../../src/app/pages/SalePage';
import { loadPageBlocksByUrl } from '../../../src/lib/oneentry/blocks/page-blocks';
import { adaptCatalogProductToUiProduct, saleCategoryFor } from '../../../src/lib/oneentry/catalog/adapt';
import { withCmsSeo } from '../../../src/lib/oneentry/catalog/page-seo';
import { loadProducts } from '../../../src/lib/oneentry/catalog/products';
import { loadSalePage } from '../../../src/lib/oneentry/catalog/sale-page';

/**
 * Title/description/keywords/canonical come from the OE `sale` page when an
 *  editor filled them; `SEO.sale` stays as the offline fallback.
 */
export async function generateMetadata(): Promise<Metadata> {
  return withCmsSeo('sale', SEO.sale);
}

// CMS content changes only when an admin edits it, so this is ISR, never
// `force-dynamic` (MCP `performance`). `force-static` makes the build fail
// loudly if anything in the tree slips back into dynamic rendering instead of
// silently degrading. Gender scoping (`?gender=`) is applied in the browser —
// see `SalePage`.
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
    // Cached with 60s revalidate — admin edits surface without redeploy.
    loadSalePage(),
    // OE-attached blocks for the `sale` page. Rendered via `<PageBlocksRenderer>`
    // inside SalePage. Empty when admin hasn't attached anything.
    loadPageBlocksByUrl('sale'),
  ]);
  const saleEndsAt = cmsPage?.saleEndsAt ?? null;
  // The full feed ships to the client; `SalePage` narrows it to the active
  // gender from `?gender=`. The adapter already stamps `gender` with the OE
  // attribute or, when blank, the category path (`/women/…` vs `/men/…`).
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
