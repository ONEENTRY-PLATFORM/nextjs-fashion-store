'use client'
import Image from 'next/image';
import Link from 'next/link';
import { ChevronRight } from 'lucide-react';
import { type CrossSellCategory } from './CatalogTemplate';
import { BANNER_BG } from '../constants/colors';
import { CATALOG_VIEW_LABELS as CVL } from '../data/commonLabels';

interface CatalogCrossSellProps {
  crossSell: {
    title: string;
    subtitle: string;
    href: string;
    categories: CrossSellCategory[];
  };
}

export function CatalogCrossSell({ crossSell }: CatalogCrossSellProps) {
  return (
    <div
      className="border-t border-gray-100 bg-white"
      style={{ '--banner-bg': BANNER_BG } as React.CSSProperties}
    >
      <div className="px-4 lg:px-8 pt-12 pb-6 flex items-end justify-between bg-[var(--banner-bg)]">
        <div>
          <p className="text-xs tracking-[0.3em] uppercase text-gray-400 mb-1">{crossSell.subtitle}</p>
          <h2 className="tracking-widest uppercase text-[clamp(1rem,2vw,1.25rem)] font-bold">
            {crossSell.title}
          </h2>
        </div>
        <Link href={crossSell.href}
          className="hidden md:flex items-center gap-1 text-xs tracking-widest uppercase text-gray-500 hover:text-black transition-colors">
          {CVL.viewAll} <ChevronRight size={11} />
        </Link>
      </div>
      <div className="grid gap-px bg-white overflow-x-auto scrollbar-hide"
        style={{ gridTemplateColumns: `repeat(${crossSell.categories.length}, 1fr)` }}>
        {crossSell.categories.map(cat => (
          <Link key={cat.label} href={cat.href ?? crossSell.href}
            className="group cursor-pointer no-underline bg-white flex flex-col outline outline-1 outline-white min-w-[160px]">
            <div className="relative overflow-hidden aspect-[3/4]">
              <Image src={cat.image} alt={cat.label} fill
                sizes="(max-width: 640px) 50vw, 25vw"
                className="object-cover object-center transition-transform duration-500 group-hover:scale-105" />
            </div>
            <div className="px-3 pt-3 pb-4 bg-white flex-1 flex flex-col justify-between min-h-[72px]">
              <p className="text-xs tracking-widest uppercase text-black font-bold whitespace-nowrap overflow-hidden text-ellipsis">
                {cat.label}
              </p>
              <p className="text-xs text-gray-400 mt-1 tracking-wider group-hover:text-black transition-colors">
                {CVL.shopNowArrow}
              </p>
            </div>
          </Link>
        ))}
      </div>
      <Link href={crossSell.href}
        className="md:hidden flex items-center justify-center gap-1 py-5 text-xs tracking-widest uppercase text-gray-500 hover:text-black transition-colors">
        {CVL.viewAllPrefix} {crossSell.title} <ChevronRight size={11} />
      </Link>
    </div>
  );
}
