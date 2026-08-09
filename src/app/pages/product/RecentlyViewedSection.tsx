'use client';
import { useEffect, useRef, useState } from 'react';

import { useDict } from '../../../lib/oneentry/labels/DictContext';
import { type Product, ProductCard } from '../../components/product/ProductCard';
import { RECENTLY_VIEWED_LABELS as L_FALLBACK } from '../../data/productPageLabels';
import { useMounted } from '../../hooks/useMounted';

const RV_PER_ROW = 5;

interface RecentlyViewedSectionProps {
  products: Product[];
  accentColor: string;
}

export function RecentlyViewedSection({ products, accentColor }: RecentlyViewedSectionProps) {
  const L = useDict('product_card_actions_recently_viewed_', L_FALLBACK);
  const [rowsShown, setRowsShown] = useState(1);
  const mounted = useMounted();
  const sentinelRef = useRef<HTMLDivElement>(null);

  const productsLength = products.length;
  useEffect(() => {
    const sentinel = sentinelRef.current;
    if (!sentinel) return;
    const observer = new IntersectionObserver(
      (entries) => {
        if (entries[0].isIntersecting) {
          setRowsShown((r) => {
            const maxRows = Math.ceil(productsLength / RV_PER_ROW);
            return r < maxRows ? r + 1 : r;
          });
        }
      },
      { threshold: 0.1 },
    );
    observer.observe(sentinel);
    return () => observer.disconnect();
  }, [productsLength]);

  if (!mounted || products.length === 0) return null;

  const visibleProducts = products.slice(0, rowsShown * RV_PER_ROW);

  return (
    <div className="border-t border-gray-100 bg-gray-50 px-4 py-12 lg:px-8">
      <div className="mx-auto max-w-384">
        <div className="mb-6">
          <p className="mb-1 text-xs tracking-[0.3em] text-gray-400 uppercase">{L.eyebrow}</p>
          <h2 className="text-[clamp(1rem,2vw,1.25rem)] font-bold tracking-widest uppercase">{L.heading}</h2>
        </div>
        {/* Flex-wrap (not CSS grid) so empty trailing slots in the last row
            don't claim space and show up as dangling vertical stripes when
            the row isn't full. Per-cell right border draws the inter-card
            divider only between real products. */}
        <div className="flex flex-wrap">
          {visibleProducts.map((p) => (
            <div key={p.id} className="w-1/2 border-r border-gray-200 bg-white last:border-r-0 md:w-1/3 lg:w-1/5">
              <ProductCard product={p} accentColor={accentColor} />
            </div>
          ))}
        </div>
        {rowsShown * RV_PER_ROW < products.length && <div ref={sentinelRef} className="h-8" />}
      </div>
    </div>
  );
}
