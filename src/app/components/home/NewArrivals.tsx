'use client'

import { ChevronRight } from 'lucide-react';
import { ProductCard, type Product } from '../product/ProductCard';
import { HorizontalScroller } from '../ui/HorizontalScroller';
import { SECTION_TITLES } from '../../data/sectionTitles';
import { CATALOG_VIEW_LABELS as CVL } from '../../data/commonLabels';
import { ACCENT_WOMEN } from '../../constants/colors';
import type { SectionChrome } from '../../../lib/oneentry/blocks/section-chrome';
import { Link } from '../../../lib/i18n/navigation';

/** `chrome` carries the OE block's own subtitle / view-all link; the
 *  `SECTION_TITLES` entry is the offline fallback for each field. */
export function NewArrivals({ products = [], title, chrome }: { products?: Product[]; title?: string; chrome?: SectionChrome } = {}) {
  if (products.length === 0) return null;
  const heading = title?.trim() || SECTION_TITLES.sale.title;
  const subtitle = chrome?.subtitle ?? SECTION_TITLES.sale.subtitle;
  const viewAllHref = chrome?.viewAllHref ?? SECTION_TITLES.sale.viewAllHref;
  const viewAllLabel = chrome?.viewAllLabel ?? CVL.viewAll;

  return (
    <section className="w-full">
      {/* Section Header */}
      <div className="flex items-center justify-between px-4 lg:px-8 mb-6 max-w-384 mx-auto">
        <div>
          <h2 className="uppercase tracking-[0.04em]">{heading}</h2>
          <p className="text-xs text-gray-500 tracking-wider mt-1">{subtitle}</p>
        </div>
        <Link href={viewAllHref} className="group flex items-center gap-1 text-xs tracking-widest uppercase font-medium border-b border-black pb-0.5">
          {viewAllLabel} <span className="inline-flex transition-transform duration-200 group-hover:translate-x-1"><ChevronRight size={14} /></span>
        </Link>
      </div>

      <HorizontalScroller>
        {products.map((product) => (
          <div key={product.id} className="shrink-0 w-1/2 md:w-1/3 lg:w-1/4 border-r border-b border-white">
            <ProductCard product={product} accentColor={ACCENT_WOMEN} />
          </div>
        ))}
      </HorizontalScroller>
    </section>
  );
}
