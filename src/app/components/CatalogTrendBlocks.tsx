'use client'
import { type TrendBlock } from './CatalogTemplate';
import { BANNER_BG } from '../constants/colors';
import { useCatalogAccent } from '../context/CatalogAccentContext';
import { CATALOG_TREND_BLOCKS_LABELS as L, CATALOG_VIEW_LABELS as CVL } from '../data/commonLabels';
import { ImageWithFallback } from './ImageWithFallback';

interface CatalogTrendBlocksProps {
  trendBlocks: TrendBlock[];
}

export function CatalogTrendBlocks({ trendBlocks }: CatalogTrendBlocksProps) {
  const accentColor = useCatalogAccent();
  return (
    <div
      className="border-t border-gray-100 bg-white"
      style={{ '--accent': accentColor, '--banner-bg': BANNER_BG } as React.CSSProperties}
    >
      <div className="px-4 lg:px-8 pt-12 pb-6 bg-[var(--banner-bg)]">        <p className="text-xs tracking-[0.3em] uppercase text-gray-400 mb-1">{L.eyebrow}</p>
        <h2 className="tracking-widest uppercase text-[clamp(1rem,2vw,1.25rem)] font-bold">
          {L.heading}
        </h2>
      </div>
      <div className="grid gap-px bg-white grid-cols-4">
        {trendBlocks.map(trend => (
          <div key={trend.label} className="group flex flex-col bg-white cursor-pointer min-w-[160px]">
            <div className="relative overflow-hidden aspect-[3/4]">
              <ImageWithFallback
                src={trend.image}
                alt={trend.label}
                fill
                sizes="(max-width: 640px) 50vw, 25vw"
                className="object-cover object-center transition-transform duration-500 group-hover:scale-105"
              />
              {trend.tag && (
                <div className="absolute top-3 left-3">
                  <span className="px-2 py-1 text-white text-xs tracking-wider uppercase rounded-none text-[10px] font-bold bg-[var(--accent)]">
                    {trend.tag}
                  </span>
                </div>
              )}
            </div>
            <div className="px-3 pt-3 pb-4 bg-white flex-1 flex flex-col justify-between min-h-[72px]">
              <p className="text-xs tracking-widest uppercase text-black font-bold truncate">
                {trend.label}
              </p>
              <p className="text-xs text-gray-400 mt-1 tracking-wider group-hover:text-black transition-colors">
                {CVL.shopNowArrow}
              </p>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
