'use client'
import Link from 'next/link';
import { ChevronRight } from 'lucide-react';
import { ProductCard, type Product } from './ProductCard';
import { HorizontalScroller } from './HorizontalScroller';
import { SECTION_TITLES } from '../data/sectionTitles';
import { ACCENT_WOMEN } from '../constants/colors';

export function NewArrivals({ products = [], title }: { products?: Product[]; title?: string } = {}) {
  if (products.length === 0) return null;
  const heading = title?.trim() || SECTION_TITLES.sale.title;

  return (
    <section className="w-full">
      {/* Section Header */}
      <div className="flex items-center justify-between px-4 lg:px-8 mb-6 max-w-screen-2xl mx-auto">
        <div>
          <h2 className="uppercase tracking-[0.04em]">{heading}</h2>
          <p className="text-xs text-gray-500 tracking-wider mt-1">{SECTION_TITLES.sale.subtitle}</p>
        </div>
        <Link href={SECTION_TITLES.sale.viewAllHref} className="group flex items-center gap-1 text-xs tracking-widest uppercase font-medium border-b border-black pb-0.5">
          View All <span className="inline-flex transition-transform duration-200 group-hover:translate-x-1"><ChevronRight size={14} /></span>
        </Link>
      </div>

      <HorizontalScroller>
        {products.map((product) => (
          <div key={product.id} className="flex-shrink-0 w-1/2 md:w-1/3 lg:w-1/4 border-r border-b border-white">
            <ProductCard product={product} accentColor={ACCENT_WOMEN} />
          </div>
        ))}
      </HorizontalScroller>
    </section>
  );
}
