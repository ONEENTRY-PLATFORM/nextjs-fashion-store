'use client';

import { ChevronRight } from 'lucide-react';

import { type Product, ProductCard } from '@/app/components/product/ProductCard';
import { HorizontalScroller } from '@/app/components/ui/HorizontalScroller';
import { ACCENT_MEN as MEN_COLOR } from '@/app/constants/colors';
import { Link } from '@/lib/i18n/navigation';
import type { SectionChrome } from '@/lib/oneentry/blocks/section-chrome';

/** Section chrome used when the OE block carries none of its own. `viewAllHref` is routing, not copy. */
export const MEN_COLLECTION_SECTION = {
  eyebrow: 'Collection',
  title: 'Best Sellers',
  viewAllHref: '/men/clothing?chip=Best+Sellers',
  viewAllLabel: 'View All',
} as const;

/** `chrome` carries the OE block's own eyebrow / view-all link. */
export function MenCollection({
  products = [],
  title,
  chrome,
}: { products?: Product[]; title?: string; chrome?: SectionChrome } = {}) {
  if (products.length === 0) return null;
  const heading = title?.trim() || MEN_COLLECTION_SECTION.title;
  const eyebrow = chrome?.eyebrow ?? MEN_COLLECTION_SECTION.eyebrow;
  const viewAllHref = chrome?.viewAllHref ?? MEN_COLLECTION_SECTION.viewAllHref;
  const viewAllLabel = chrome?.viewAllLabel ?? MEN_COLLECTION_SECTION.viewAllLabel;

  return (
    <section className="w-full font-sans" style={{ '--accent': MEN_COLOR } as React.CSSProperties}>
      {/* Section Header */}
      <div className="mx-auto mb-6 flex max-w-384 items-center justify-between px-4 lg:px-8">
        <div>
          <p className="mb-1 text-xs tracking-widest text-accent uppercase">{eyebrow}</p>
          <h2 className="text-[clamp(1.5rem,3vw,2rem)] leading-tight font-semibold tracking-[0.04em] uppercase">
            {heading}
          </h2>
        </div>
        <Link
          href={viewAllHref}
          className="group flex items-center gap-1 border-b border-black pb-0.5 text-xs font-medium tracking-widest uppercase"
        >
          {viewAllLabel}{' '}
          <span className="inline-flex transition-transform duration-200 group-hover:translate-x-1">
            <ChevronRight size={14} />
          </span>
        </Link>
      </div>

      <HorizontalScroller>
        {products.map((product) => (
          <div key={product.id} className="w-1/2 shrink-0 border-r border-b border-white md:w-1/3 lg:w-1/5">
            <ProductCard product={product} accentColor={MEN_COLOR} />
          </div>
        ))}
      </HorizontalScroller>
    </section>
  );
}
