'use client'
import Link from 'next/link';
import { ChevronRight } from 'lucide-react';
import { ProductCard, type Product } from './ProductCard';
import { HorizontalScroller } from './HorizontalScroller';
import { SECTION_TITLES } from '../data/sectionTitles';
import { CATALOG_VIEW_LABELS as CVL } from '../data/commonLabels';
import { ACCENT_WOMEN as WOMEN_COLOR } from '../constants/colors';
import type { SectionChrome } from '../../lib/oneentry/blocks/section-chrome';

/** `chrome` carries the OE block's own eyebrow / view-all link; the
 *  `SECTION_TITLES` entry is the offline fallback for each field. */
export function WomenCollection({ products = [], title, chrome }: { products?: Product[]; title?: string; chrome?: SectionChrome } = {}) {
  if (products.length === 0) return null;
  const heading = title?.trim() || SECTION_TITLES.newArrivals.title;
  const eyebrow = chrome?.eyebrow ?? SECTION_TITLES.newArrivals.eyebrow;
  const viewAllHref = chrome?.viewAllHref ?? SECTION_TITLES.newArrivals.viewAllHref;
  const viewAllLabel = chrome?.viewAllLabel ?? CVL.viewAll;

  return (
    <section
      className="w-full font-[Inter,sans-serif]"
      style={{ '--accent': WOMEN_COLOR } as React.CSSProperties}
    >
      {/* Section Header */}
      <div className="flex items-center justify-between px-4 lg:px-8 mb-6 max-w-screen-2xl mx-auto">
        <div>
          <p className="text-xs tracking-widest uppercase mb-1 text-[var(--accent)]">{eyebrow}</p>
          <h2 className="text-[clamp(1.5rem,3vw,2rem)] font-semibold leading-tight tracking-[0.04em] uppercase">{heading}</h2>
        </div>
        <Link href={viewAllHref} className="group flex items-center gap-1 text-xs tracking-widest uppercase font-medium border-b border-black pb-0.5">
          {viewAllLabel} <span className="inline-flex transition-transform duration-200 group-hover:translate-x-1"><ChevronRight size={14} /></span>
        </Link>
      </div>

      <HorizontalScroller>
        {products.map((product) => (
          <div key={product.id} className="flex-shrink-0 w-1/2 md:w-1/3 lg:w-1/5 border-r border-b border-white">
            <ProductCard product={product} accentColor={WOMEN_COLOR} />
          </div>
        ))}
      </HorizontalScroller>
    </section>
  );
}
