'use client';
import Image from 'next/image';
import React from 'react';

import { useDict, useT } from '../../../lib/oneentry/labels/DictContext';
import { SPECIAL_OFFERS_LABELS } from '../../data/productPageLabels';
import type { SpecialOffer } from '../../data/specialOffers';

interface ProductSpecialOffersProps {
  offers: SpecialOffer[];
  onAddBundle: (offerId: string) => void;
}

export function ProductSpecialOffers({ offers, onAddBundle }: ProductSpecialOffersProps) {
  const L = useDict('special_offers_', SPECIAL_OFFERS_LABELS);
  const lLimited = useT('lable', L.limitedTime);
  const lBundle = useT('bundle-lable', L.bundleBadge);
  const lBundlePrice = useT('bundle-price', L.bundlePrice);
  const lCompleteCta = useT('complete-the-look-cta', L.completeLook);
  if (offers.length === 0) return null;

  return (
    <div
      className="mb-6"
      data-block-identifier="special_offers"
      data-block-kind="bought_together"
      data-block-title={L.sectionTitle}
    >
      <div className="mb-3 flex items-center justify-between">
        <span className="text-xs font-bold tracking-[0.15em] uppercase">{L.sectionTitle}</span>
        <span className="rounded-sm bg-(--sale) px-2 py-0.5 text-xs font-semibold tracking-widest text-white uppercase">
          {lLimited}
        </span>
      </div>
      <div className="space-y-3">
        {offers.map((offer) => (
          <div key={offer.id} className="rounded-lg border border-gray-200 p-4">
            <div className="mb-3 flex items-center gap-2">
              <span className="rounded-sm bg-black px-1.5 py-0.5 text-xs text-[10px] font-semibold tracking-widest text-white uppercase">
                {lBundle}
              </span>
              <span className="text-xs font-semibold">{offer.title}</span>
            </div>
            <div className="flex gap-3">
              {offer.products.map((p, j) => (
                <React.Fragment key={j}>
                  <div
                    className="group/prod flex min-w-0 flex-1 cursor-pointer gap-2.5"
                    onClick={() => window.open(`/product/${p.id}`, '_blank')}
                  >
                    <div className="relative h-17 w-13 shrink-0 overflow-hidden rounded-sm">
                      <Image
                        src={p.image}
                        alt={p.name}
                        fill
                        sizes="52px"
                        className="object-cover transition-transform duration-300 group-hover/prod:scale-105"
                      />
                    </div>
                    <div className="flex h-17 min-w-0 flex-col justify-between">
                      <p className="line-clamp-2 text-xs leading-snug font-medium group-hover/prod:underline">
                        {p.name}
                      </p>
                      <div>
                        <p className="text-xs leading-none text-gray-400 line-through">{p.originalPrice}</p>
                        <p className="text-sm leading-tight font-bold text-(--sale)">{p.salePrice}</p>
                      </div>
                    </div>
                  </div>
                  {j === 0 && <div className="flex shrink-0 items-center text-lg font-light text-gray-300">+</div>}
                </React.Fragment>
              ))}
            </div>
            <div className="mt-3 flex items-center justify-between border-t border-gray-100 pt-3">
              <div>
                <p className="text-xs text-gray-400">{lBundlePrice}</p>
                <div className="flex items-baseline gap-2">
                  <span className="text-sm font-bold">{offer.bundlePrice}</span>
                  <span className="text-xs font-medium text-green-600">{offer.savings}</span>
                </div>
              </div>
              <button
                onClick={() => onAddBundle(offer.id)}
                className="rounded-md bg-black px-4 py-2 text-xs font-semibold tracking-[0.12em] text-white uppercase transition-opacity hover:opacity-80"
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
