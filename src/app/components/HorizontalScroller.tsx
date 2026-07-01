'use client'
import React, { useEffect, useState, useCallback } from 'react';
import { ChevronLeft, ChevronRight } from 'lucide-react';
import { useDragScroll } from '../hooks/useDragScroll';
import { HORIZONTAL_SCROLLER_LABELS as L } from '../data/commonLabels';

interface HorizontalScrollerProps {
  children: React.ReactNode;
  /** Step in % of container width for arrow clicks. Default 0.75 = 75%. */
  scrollFraction?: number;
  className?: string;
}

/**
 * Horizontal scrolling container with:
 *   • drag-to-scroll on desktop
 *   • left / right arrow buttons that hide at the ends
 * Used by WomenCollection / MenCollection / NewArrivals carousels.
 */
export function HorizontalScroller({
  children,
  scrollFraction = 0.75,
  className = '',
}: HorizontalScrollerProps) {
  const drag = useDragScroll();
  const [canScrollLeft, setCanScrollLeft] = useState(false);
  const [canScrollRight, setCanScrollRight] = useState(true);

  const updateArrows = useCallback(() => {
    const el = drag.ref.current;
    if (!el) return;
    setCanScrollLeft(el.scrollLeft > 2);
    setCanScrollRight(el.scrollLeft < el.scrollWidth - el.clientWidth - 2);
  }, [drag.ref]);

  useEffect(() => { updateArrows(); }, [updateArrows]);

  const scrollLeft = () => {
    drag.ref.current?.scrollBy({ left: -(drag.ref.current.clientWidth * scrollFraction), behavior: 'smooth' });
  };
  const scrollRight = () => {
    drag.ref.current?.scrollBy({ left: drag.ref.current.clientWidth * scrollFraction, behavior: 'smooth' });
  };

  const arrowClass = (visible: boolean) =>
    `absolute top-1/2 -translate-y-1/2 z-10 flex items-center justify-center w-10 h-10 bg-white shadow-md border border-gray-200 hover:bg-black hover:text-white hover:border-black transition-all duration-200 focus-visible:outline-none rounded-full ${
      visible ? 'opacity-100 pointer-events-auto' : 'opacity-0 pointer-events-none'
    }`;

  return (
    <div className="relative">
      <button
        onClick={scrollLeft}
        aria-label={L.scrollLeft}
        className={`left-2 ${arrowClass(canScrollLeft)}`}
      >
        <ChevronLeft size={18} />
      </button>

      <button
        onClick={scrollRight}
        aria-label={L.scrollRight}
        className={`right-2 ${arrowClass(canScrollRight)}`}
      >
        <ChevronRight size={18} />
      </button>

      <div
        ref={drag.ref}
        className={`flex overflow-x-auto scrollbar-hide border-t border-white select-none cursor-grab ${className}`}
        onScroll={updateArrows}
        onMouseDown={drag.onMouseDown}
        onMouseMove={drag.onMouseMove}
        onMouseUp={drag.onMouseUp}
        onMouseLeave={drag.onMouseLeave}
      >
        {children}
      </div>
    </div>
  );
}
