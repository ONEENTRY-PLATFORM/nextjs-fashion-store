'use client';
import { ChevronRight } from 'lucide-react';
import Image from 'next/image';

import { BANNER_BG } from '@/app/constants/colors';
import { Link } from '@/lib/i18n/navigation';
import { useDict } from '@/lib/oneentry/labels/DictContext';

import { type CrossSellCategory } from './CatalogTemplate';

export const CATALOG_CROSS_SELL_LABELS = {
  shopNowArrow: 'Shop now →',
  viewAll: 'View All',
  viewAllPrefix: 'View All',
} as const;

interface CatalogCrossSellProps {
  crossSell: {
    title: string;
    subtitle: string;
    href: string;
    categories: CrossSellCategory[];
  };
}

export function CatalogCrossSell({ crossSell }: CatalogCrossSellProps) {
  const CVL = useDict('interface_controls_view_', CATALOG_CROSS_SELL_LABELS);
  return (
    <div className="border-t border-gray-100 bg-white" style={{ '--banner-bg': BANNER_BG } as React.CSSProperties}>
      <div className="flex items-end justify-between bg-(--banner-bg) px-4 pt-12 pb-6 lg:px-8">
        <div>
          <p className="mb-1 text-xs tracking-[0.3em] text-gray-400 uppercase">{crossSell.subtitle}</p>
          <h2 className="text-[clamp(1rem,2vw,1.25rem)] font-bold tracking-widest uppercase">{crossSell.title}</h2>
        </div>
        <Link
          href={crossSell.href}
          className="hidden items-center gap-1 text-xs tracking-widest text-gray-500 uppercase transition-colors hover:text-black md:flex"
        >
          {CVL.viewAll} <ChevronRight size={11} />
        </Link>
      </div>
      <div
        className="scrollbar-hide grid gap-px overflow-x-auto bg-white"
        style={{ gridTemplateColumns: `repeat(${crossSell.categories.length}, 1fr)` }}
      >
        {crossSell.categories.map((cat) => (
          <Link
            key={cat.label}
            href={cat.href ?? crossSell.href}
            className="group flex min-w-40 cursor-pointer flex-col bg-white no-underline outline-1 outline-white"
          >
            <div className="relative aspect-3/4 overflow-hidden">
              <Image
                src={cat.image}
                alt={cat.label}
                fill
                sizes="(max-width: 640px) 50vw, 25vw"
                className="object-cover object-center transition-transform duration-500 group-hover:scale-105"
              />
            </div>
            <div className="flex min-h-18 flex-1 flex-col justify-between bg-white px-3 pt-3 pb-4">
              <p className="truncate text-xs font-bold tracking-widest text-black uppercase">{cat.label}</p>
              <p className="mt-1 text-xs tracking-wider text-gray-400 transition-colors group-hover:text-black">
                {CVL.shopNowArrow}
              </p>
            </div>
          </Link>
        ))}
      </div>
      <Link
        href={crossSell.href}
        className="flex items-center justify-center gap-1 py-5 text-xs tracking-widest text-gray-500 uppercase transition-colors hover:text-black md:hidden"
      >
        {CVL.viewAllPrefix} {crossSell.title} <ChevronRight size={11} />
      </Link>
    </div>
  );
}
