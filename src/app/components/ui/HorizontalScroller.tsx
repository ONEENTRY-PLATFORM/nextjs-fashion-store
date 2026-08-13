'use client';
import { ChevronLeft, ChevronRight } from 'lucide-react';
import React, { useCallback, useEffect, useRef, useState } from 'react';

import { HORIZONTAL_SCROLLER_LABELS as L } from '@/app/components/ui/copy';
import { useDragScroll } from '@/app/hooks/useDragScroll';
import { useT } from '@/lib/oneentry/labels/DictContext';

interface HorizontalScrollerProps {
  children: React.ReactNode;
  /** Step in % of container width for arrow clicks. */
  scrollFraction?: number;
  className?: string;
}

/** Horizontal scrolling container with: • drag-to-scroll on desktop • left / right arrow buttons that hide at the ends Used by WomenCollection / MenCollection / NewArrivals carousels. */
export function HorizontalScroller({ children, scrollFraction = 0.75, className = '' }: HorizontalScrollerProps) {
  const scrollerRef = useRef<HTMLDivElement>(null);
  const drag = useDragScroll(scrollerRef);
  const [canScrollLeft, setCanScrollLeft] = useState(false);
  const [canScrollRight, setCanScrollRight] = useState(true);

  /** Recompute arrow visibility from a live element. */
  const measure = useCallback((el: HTMLDivElement | null) => {
    if (!el) return;
    setCanScrollLeft(el.scrollLeft > 2);
    setCanScrollRight(el.scrollLeft < el.scrollWidth - el.clientWidth - 2);
  }, []);

  // Callback ref: the first measurement happens when the node attaches, in the commit phase.
  const attachScroller = useCallback(
    (el: HTMLDivElement | null) => {
      scrollerRef.current = el;
      measure(el);
    },
    [measure],
  );

  // Viewport changes can reveal or hide the overflow without any scrolling, so re-measure on resize.
  useEffect(() => {
    const onResize = () => measure(scrollerRef.current);
    window.addEventListener('resize', onResize);
    return () => window.removeEventListener('resize', onResize);
  }, [measure]);

  const lScrollLeft = useT('interface_controls_scroll_left', L.scrollLeft);
  const lScrollRight = useT('interface_controls_scroll_right', L.scrollRight);

  const scrollBy = (direction: 1 | -1) => {
    const el = scrollerRef.current;
    if (!el) return;
    el.scrollBy({ left: direction * el.clientWidth * scrollFraction, behavior: 'smooth' });
  };

  const arrowClass = (visible: boolean) =>
    `absolute top-1/2 -translate-y-1/2 z-10 flex items-center justify-center w-10 h-10 bg-white shadow-md border border-gray-200 hover:bg-black hover:text-white hover:border-black transition-all duration-200 focus-visible:outline-none rounded-full ${
      visible ? 'opacity-100 pointer-events-auto' : 'opacity-0 pointer-events-none'
    }`;

  return (
    <div className="relative">
      <button onClick={() => scrollBy(-1)} aria-label={lScrollLeft} className={`left-2 ${arrowClass(canScrollLeft)}`}>
        <ChevronLeft size={18} />
      </button>

      <button onClick={() => scrollBy(1)} aria-label={lScrollRight} className={`right-2 ${arrowClass(canScrollRight)}`}>
        <ChevronRight size={18} />
      </button>

      <div
        ref={attachScroller}
        className={`scrollbar-hide flex cursor-grab overflow-x-auto border-t border-white select-none ${className}`}
        onScroll={(e) => measure(e.currentTarget)}
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
