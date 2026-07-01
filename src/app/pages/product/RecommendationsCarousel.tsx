import { useRef } from 'react';
import { ChevronLeft, ChevronRight } from 'lucide-react';
import { ProductCard, type Product } from '../../components/ProductCard';

import { ACCENT_WOMEN as ACCENT } from '../../constants/colors';
import { CAROUSEL_LABELS } from '../../data/commonLabels';

export function RecommendationsCarousel({ products }: { products: Product[] }) {
  const scrollRef = useRef<HTMLDivElement>(null);

  const scroll = (dir: 'left' | 'right') => {
    if (!scrollRef.current) return;
    const amount = scrollRef.current.clientWidth * 0.75;
    scrollRef.current.scrollBy({ left: dir === 'right' ? amount : -amount, behavior: 'smooth' });
  };

  return (
    <div className="relative">
      <button
        onClick={() => scroll('left')}
        className="absolute -left-5 top-1/2 -translate-y-8 z-10 w-10 h-10 bg-white border border-black flex items-center justify-center hover:bg-black hover:text-white transition-colors rounded-none"
        aria-label={CAROUSEL_LABELS.previous}
      >
        <ChevronLeft size={18} />
      </button>
      <button
        onClick={() => scroll('right')}
        className="absolute -right-5 top-1/2 -translate-y-8 z-10 w-10 h-10 bg-white border border-black flex items-center justify-center hover:bg-black hover:text-white transition-colors rounded-none"
        aria-label={CAROUSEL_LABELS.next}
      >
        <ChevronRight size={18} />
      </button>

      <div
        ref={scrollRef}
        className="flex gap-0 overflow-x-auto scrollbar-hide snap-x snap-mandatory"
      >
        {products.map(p => (
          <div
            key={p.id}
            className="flex-shrink-0 border-r border-b border-white w-1/4 min-w-[200px] snap-start"
          >
            <ProductCard product={p} accentColor={ACCENT} />
          </div>
        ))}
      </div>
    </div>
  );
}
