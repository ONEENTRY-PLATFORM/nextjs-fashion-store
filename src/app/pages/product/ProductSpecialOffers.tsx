'use client'
import React from 'react';
import Image from 'next/image';
import type { SpecialOffer } from '../../data/specialOffers';
import { SPECIAL_OFFERS_LABELS as L } from '../../data/productPageLabels';
import { usePdpT } from '../../../lib/oneentry/labels/PdpLabelsContext';

interface ProductSpecialOffersProps {
  offers: SpecialOffer[];
  onAddBundle: (offerId: string) => void;
}

export function ProductSpecialOffers({ offers, onAddBundle }: ProductSpecialOffersProps) {
  const lLimited     = usePdpT('special_offers_product_card', 'lable',                 L.limitedTime);
  const lBundle      = usePdpT('special_offers_product_card', 'bundle-lable',          L.bundleBadge);
  const lBundlePrice = usePdpT('special_offers_product_card', 'bundle-price',          L.bundlePrice);
  const lCompleteCta = usePdpT('special_offers_product_card', 'complete-the-look-cta', L.completeLook);
  if (offers.length === 0) return null;

  return (
    <div
      className="mb-6"
      data-block-identifier="special_offers"
      data-block-kind="bought_together"
      data-block-title={L.sectionTitle}
    >
      <div className="flex items-center justify-between mb-3">
        <span className="text-xs tracking-[0.15em] uppercase font-bold">{L.sectionTitle}</span>
        <span className="text-xs px-2 py-0.5 text-white tracking-widest uppercase bg-[var(--sale)] rounded-sm font-semibold">
          {lLimited}
        </span>
      </div>
      <div className="space-y-3">
        {offers.map(offer => (
          <div key={offer.id} className="border border-gray-200 p-4 rounded-lg">
            <div className="flex items-center gap-2 mb-3">
              <span className="text-xs px-1.5 py-0.5 text-white tracking-widest uppercase bg-black rounded-sm font-semibold text-[10px]">
                {lBundle}
              </span>
              <span className="text-xs font-semibold">{offer.title}</span>
            </div>
            <div className="flex gap-3">
              {offer.products.map((p, j) => (
                <React.Fragment key={j}>
                  <div
                    className="flex gap-2.5 flex-1 min-w-0 cursor-pointer group/prod"
                    onClick={() => window.open(`/product/${p.id}`, '_blank')}
                  >
                    <div className="relative flex-shrink-0 overflow-hidden w-[52px] h-[68px] rounded-sm">
                      <Image
                        src={p.image}
                        alt={p.name}
                        fill
                        sizes="52px"
                        className="object-cover transition-transform duration-300 group-hover/prod:scale-105"
                      />
                    </div>
                    <div className="min-w-0 flex flex-col justify-between h-[68px]">
                      <p className="text-xs leading-snug line-clamp-2 group-hover/prod:underline font-medium">{p.name}</p>
                      <div>
                        <p className="text-xs text-gray-400 line-through leading-none">{p.originalPrice}</p>
                        <p className="text-sm leading-tight font-bold text-[var(--sale)]">{p.salePrice}</p>
                      </div>
                    </div>
                  </div>
                  {j === 0 && (
                    <div className="flex items-center flex-shrink-0 text-gray-300 text-lg font-light">+</div>
                  )}
                </React.Fragment>
              ))}
            </div>
            <div className="flex items-center justify-between mt-3 pt-3 border-t border-gray-100">
              <div>
                <p className="text-xs text-gray-400">{lBundlePrice}</p>
                <div className="flex items-baseline gap-2">
                  <span className="text-sm font-bold">{offer.bundlePrice}</span>
                  <span className="text-xs text-green-600 font-medium">{offer.savings}</span>
                </div>
              </div>
              <button
                onClick={() => onAddBundle(offer.id)}
                className="px-4 py-2 text-xs tracking-[0.12em] uppercase text-white hover:opacity-80 transition-opacity bg-black rounded-md font-semibold"
              >
                {lCompleteCta}
              </button>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
