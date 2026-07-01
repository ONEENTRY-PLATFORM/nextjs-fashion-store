import type { Metadata } from 'next';
import { SEO } from '../../src/app/data/seoData';
import { FavoritesPage } from '../../src/app/pages/FavoritesPage';
import { loadFavoritesPageSystemTexts } from '../../src/lib/oneentry/labels/favorites-page-labels';
import { FavoritesPageLabelsProvider } from '../../src/lib/oneentry/labels/FavoritesPageLabelsContext';
import { loadProducts } from '../../src/lib/oneentry/catalog/products';
import { adaptCatalogProductToUiProduct } from '../../src/lib/oneentry/catalog/adapt';

export const metadata: Metadata = SEO.favorites;

export const dynamic = 'force-dynamic';

export default async function Page() {
  const [labels, recommended, trending] = await Promise.all([
    loadFavoritesPageSystemTexts(),
    loadProducts({ tags: ['New'], limit: 12 }),
    loadProducts({ tags: ['Bestseller'], limit: 12 }),
  ]);
  return (
    <FavoritesPageLabelsProvider data={labels}>
      <FavoritesPage
        recommended={recommended.items.map(adaptCatalogProductToUiProduct)}
        trending={trending.items.map(adaptCatalogProductToUiProduct)}
      />
    </FavoritesPageLabelsProvider>
  );
}
