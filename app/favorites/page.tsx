import type { Metadata } from 'next';
import { SEO } from '../../src/app/data/seoData';
import { FavoritesPage } from '../../src/app/pages/FavoritesPage';
import { loadFavoritesPageSystemTexts } from '../../src/lib/oneentry/labels/favorites-page-labels';
import { FavoritesPageLabelsProvider } from '../../src/lib/oneentry/labels/FavoritesPageLabelsContext';
import { loadProducts } from '../../src/lib/oneentry/catalog/products';
import { adaptCatalogProductToUiProduct } from '../../src/lib/oneentry/catalog/adapt';
import { loadPageBlocksByUrl } from '../../src/lib/oneentry/blocks/page-blocks';

export const metadata: Metadata = SEO.favorites;

export const dynamic = 'force-dynamic';

export default async function Page() {
  const [labels, recommended, trending, pageBlocks] = await Promise.all([
    loadFavoritesPageSystemTexts(),
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
    <FavoritesPageLabelsProvider data={labels}>
      <FavoritesPage
        recommended={recommended.items.map(adaptCatalogProductToUiProduct)}
        trending={trending.items.map(adaptCatalogProductToUiProduct)}
        pageBlocks={pageBlocks}
      />
    </FavoritesPageLabelsProvider>
  );
}
