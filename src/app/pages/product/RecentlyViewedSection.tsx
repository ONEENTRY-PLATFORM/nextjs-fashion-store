'use client'
import { useState, useEffect, useRef } from 'react';
import { ProductCard, type Product } from '../../components/ProductCard';
import { RECENTLY_VIEWED_LABELS as L } from '../../data/productPageLabels';

const RV_PER_ROW = 5;

interface RecentlyViewedSectionProps {
  products: Product[];
  accentColor: string;
}

export function RecentlyViewedSection({ products, accentColor }: RecentlyViewedSectionProps) {
  const [rowsShown, setRowsShown] = useState(1);
  const [mounted, setMounted] = useState(false);
  const sentinelRef = useRef<HTMLDivElement>(null);

  useEffect(() => { setMounted(true); }, []);

  const productsLength = products.length;
  useEffect(() => {
    const sentinel = sentinelRef.current;
    if (!sentinel) return;
    const observer = new IntersectionObserver(
      (entries) => {
        if (entries[0].isIntersecting) {
          setRowsShown(r => {
            const maxRows = Math.ceil(productsLength / RV_PER_ROW);
            return r < maxRows ? r + 1 : r;
          });
        }
      },
      { threshold: 0.1 }
    );
    observer.observe(sentinel);
    return () => observer.disconnect();
  }, [productsLength]);

  if (!mounted || products.length === 0) return null;

  const visibleProducts = products.slice(0, rowsShown * RV_PER_ROW);

  return (
    <div className="border-t border-gray-100 py-12 px-4 lg:px-8 bg-gray-50">
      <div className="max-w-screen-2xl mx-auto">
        <div className="mb-6">
          <p className="text-xs tracking-[0.3em] uppercase text-gray-400 mb-1">{L.eyebrow}</p>
          <h2 className="tracking-widest uppercase text-[clamp(1rem,2vw,1.25rem)] font-bold">{L.heading}</h2>
        </div>
        {/* Flex-wrap (not CSS grid) so empty trailing slots in the last row
            don't claim space and show up as dangling vertical stripes when
            the row isn't full. Per-cell right border draws the inter-card
            divider only between real products. */}
        <div className="flex flex-wrap">
          {visibleProducts.map(p => (
            <div
              key={p.id}
              className="w-1/2 md:w-1/3 lg:w-1/5 bg-white border-r border-gray-200 last:border-r-0"
            >
              <ProductCard product={p} accentColor={accentColor} />
            </div>
          ))}
        </div>
        {rowsShown * RV_PER_ROW < products.length && (
          <div ref={sentinelRef} className="h-8" />
        )}
      </div>
    </div>
  );
}
