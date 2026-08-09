'use client';
import { useT } from '../../../lib/oneentry/labels/DictContext';
import type { Product } from '../../components/product/ProductCard';
import { PRODUCT_BREADCRUMB_LABELS as PB } from '../../data/productPageLabels';
import { RecommendationsCarousel } from './RecommendationsCarousel';

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
  const lYouMayAlsoLike = useT('product-card-you_may_also_like', PB.youMayAlsoLike);
  const lViewAll = useT('product-card-view_all', PB.viewAll);
  return (
    <div className="border-y border-black py-12">
      <div className="px-4 lg:px-12">
        <div className="mb-6 flex items-center justify-between">
          <h2 className="text-[1.1rem] font-bold tracking-[0.15em] uppercase">{title?.trim() || lYouMayAlsoLike}</h2>
          <a
            href={categoryViewAllHref}
            className="text-xs tracking-widest uppercase underline transition-colors hover:text-gray-500"
          >
            {lViewAll}
          </a>
        </div>
        <RecommendationsCarousel products={products} />
      </div>
    </div>
  );
}
