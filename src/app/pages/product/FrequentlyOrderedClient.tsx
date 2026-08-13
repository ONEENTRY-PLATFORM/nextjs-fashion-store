'use client';
import type { Product } from '@/app/components/product/ProductCard';
import { useT } from '@/lib/oneentry/labels/DictContext';

import { RecommendationsCarousel } from './RecommendationsCarousel';

export const FREQUENTLY_ORDERED_LABELS = {
  youMayAlsoLike: 'You May Also Like',
  viewAll: 'View All',
} as const;

const PB = FREQUENTLY_ORDERED_LABELS;

/** Client wrapper for the "You May Also Like" carousel. */
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
