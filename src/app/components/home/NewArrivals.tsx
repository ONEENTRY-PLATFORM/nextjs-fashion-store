'use client';

import { ChevronRight } from 'lucide-react';

import { type Product, ProductCard } from '@/app/components/product/ProductCard';
import { HorizontalScroller } from '@/app/components/ui/HorizontalScroller';
import { ACCENT_WOMEN } from '@/app/constants/colors';
import { Link } from '@/lib/i18n/navigation';
import type { SectionChrome } from '@/lib/oneentry/blocks/section-chrome';

/** Section chrome used when the OE block carries none of its own. `viewAllHref` is routing, not copy. */
export const NEW_ARRIVALS_SECTION = {
  title: 'Sale',
  subtitle: 'Best prices – shop the sale now',
  viewAllHref: '/sale',
  viewAllLabel: 'View All',
} as const;

/** `chrome` carries the OE block's own subtitle / view-all link. */
export function NewArrivals({
  products = [],
  title,
  chrome,
}: { products?: Product[]; title?: string; chrome?: SectionChrome } = {}) {
  if (products.length === 0) return null;
  const heading = title?.trim() || NEW_ARRIVALS_SECTION.title;
  const subtitle = chrome?.subtitle ?? NEW_ARRIVALS_SECTION.subtitle;
  const viewAllHref = chrome?.viewAllHref ?? NEW_ARRIVALS_SECTION.viewAllHref;
  const viewAllLabel = chrome?.viewAllLabel ?? NEW_ARRIVALS_SECTION.viewAllLabel;

  return (
    <section className="w-full">
      {/* Section Header */}
      <div className="mx-auto mb-6 flex max-w-384 items-center justify-between px-4 lg:px-8">
        <div>
          <h2 className="tracking-[0.04em] uppercase">{heading}</h2>
          <p className="mt-1 text-xs tracking-wider text-gray-500">{subtitle}</p>
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
          <div key={product.id} className="w-1/2 shrink-0 border-r border-b border-white md:w-1/3 lg:w-1/4">
            <ProductCard product={product} accentColor={ACCENT_WOMEN} />
          </div>
        ))}
      </HorizontalScroller>
    </section>
  );
}
