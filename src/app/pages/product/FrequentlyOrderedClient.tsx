'use client'
import { RecommendationsCarousel } from './RecommendationsCarousel';
import { PRODUCT_BREADCRUMB_LABELS as PB } from '../../data/productPageLabels';
import { useProductCardT } from '../../../lib/oneentry/labels/ProductCardLabelsContext';
import type { Product } from '../../components/ProductCard';

/**
 * Client wrapper for the "You May Also Like" carousel. Lives in its own file
 * so the server component can `await` OE without bringing the whole client
 * tree into scope.
 */
export function FrequentlyOrderedClient({
  products,
  title,
  categoryViewAllHref,
}: {
  products: Product[];
  title?: string;
  categoryViewAllHref: string;
}) {
  const lYouMayAlsoLike = useProductCardT('product-card-you_may_also_like', PB.youMayAlsoLike);
  const lViewAll        = useProductCardT('product-card-view_all',          PB.viewAll);
  return (
    <div className="py-12 border-t border-b border-black">
      <div className="px-4 lg:px-12">
        <div className="flex items-center justify-between mb-6">
          <h2 className="tracking-[0.15em] uppercase text-[1.1rem] font-bold">
            {title?.trim() || lYouMayAlsoLike}
          </h2>
          <a
            href={categoryViewAllHref}
            className="text-xs tracking-widest uppercase underline hover:text-gray-500 transition-colors"
          >
            {lViewAll}
          </a>
        </div>
        <RecommendationsCarousel products={products} />
      </div>
    </div>
  );
}
