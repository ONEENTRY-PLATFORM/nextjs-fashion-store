import { ChevronLeft, ChevronRight } from 'lucide-react';
import { useRef } from 'react';

import { type Product, ProductCard } from '@/app/components/product/ProductCard';
import { ACCENT_WOMEN as ACCENT } from '@/app/constants/colors';
import { CAROUSEL_LABELS } from '@/app/data/commonLabels';
import { useT } from '@/lib/oneentry/labels/DictContext';

export function RecommendationsCarousel({ products }: { products: Product[] }) {
  const scrollRef = useRef<HTMLDivElement>(null);
  const aPrevious = useT('interface_controls_carousel_previous', CAROUSEL_LABELS.previous);
  const aNext = useT('interface_controls_carousel_next', CAROUSEL_LABELS.next);

  const scroll = (dir: 'left' | 'right') => {
    if (!scrollRef.current) return;
    const amount = scrollRef.current.clientWidth * 0.75;
    scrollRef.current.scrollBy({ left: dir === 'right' ? amount : -amount, behavior: 'smooth' });
  };

  return (
    <div className="relative">
      <button
        onClick={() => scroll('left')}
        className="absolute top-1/2 -left-5 z-10 flex size-10 -translate-y-8 items-center justify-center rounded-none border border-black bg-white transition-colors hover:bg-black hover:text-white"
        aria-label={aPrevious}
      >
        <ChevronLeft size={18} />
      </button>
      <button
        onClick={() => scroll('right')}
        className="absolute top-1/2 -right-5 z-10 flex size-10 -translate-y-8 items-center justify-center rounded-none border border-black bg-white transition-colors hover:bg-black hover:text-white"
        aria-label={aNext}
      >
        <ChevronRight size={18} />
      </button>

      <div ref={scrollRef} className="scrollbar-hide flex snap-x snap-mandatory gap-0 overflow-x-auto">
        {products.map((p) => (
          <div key={p.id} className="w-1/4 min-w-50 shrink-0 snap-start border-r border-b border-white">
            <ProductCard product={p} accentColor={ACCENT} />
          </div>
        ))}
      </div>
    </div>
  );
}
