import type { Metadata } from 'next';

import { SEO } from '../../../src/app/data/seoData';
import { FavoritesPage } from '../../../src/app/pages/FavoritesPage';
import { loadPageBlocksByUrl } from '../../../src/lib/oneentry/blocks/page-blocks';
import { adaptCatalogProductToUiProduct } from '../../../src/lib/oneentry/catalog/adapt';
import { withCmsSeo } from '../../../src/lib/oneentry/catalog/page-seo';
import { loadProducts } from '../../../src/lib/oneentry/catalog/products';

/**
 * Title/description/keywords/canonical come from the OE `favorites` page when an
 *  editor filled them; `SEO.favorites` stays as the offline fallback.
 */
export async function generateMetadata(): Promise<Metadata> {
  return withCmsSeo('favorites', SEO.favorites);
}

// Everything on this page is public CMS content — the shopper's own wishlist
// hydrates client-side from OE. So it is ISR, not `force-dynamic`
// (MCP `performance`); `force-static` fails the build loudly if anything in
// the tree reintroduces a dynamic API.
export const dynamic = 'force-static';
export const revalidate = 60;

export default async function Page() {
  const [recommended, trending, pageBlocks] = await Promise.all([
    // Bigger server-side slice because the client-side gender scoping
    // (Recommended/Trending are filtered by the shopper's preferred gender)
    // will drop up to half the items on a mixed-gender tenant.
    loadProducts({ tags: ['New'], limit: 30 }),
    loadProducts({ tags: ['Bestseller'], limit: 30 }),
    // OE-attached blocks for the `favorites` page. Empty when nothing is
    // attached — safe fallback.
    loadPageBlocksByUrl('favorites'),
  ]);
  return (
    <FavoritesPage
      recommended={recommended.items.map(adaptCatalogProductToUiProduct)}
      trending={trending.items.map(adaptCatalogProductToUiProduct)}
      pageBlocks={pageBlocks}
    />
  );
}
