'use client'
import { useRef } from 'react';

/**
 * Adds desktop "drag to scroll" behaviour to a horizontally scrollable container.
 * Spread the returned handlers + ref onto the element.
 */
export function useDragScroll() {
  const ref = useRef<HTMLDivElement>(null);
  const dragging = useRef(false);
  const startX = useRef(0);
  const scrollStart = useRef(0);

  const onMouseDown = (e: React.MouseEvent) => {
    dragging.current = true;
    startX.current = e.pageX;
    scrollStart.current = ref.current?.scrollLeft ?? 0;
    if (ref.current) ref.current.style.cursor = 'grabbing';
  };
  const onMouseMove = (e: React.MouseEvent) => {
    if (!dragging.current || !ref.current) return;
    e.preventDefault();
    ref.current.scrollLeft = scrollStart.current - (e.pageX - startX.current);
  };
  const stopDrag = () => {
    dragging.current = false;
    if (ref.current) ref.current.style.cursor = 'grab';
  };

  return { ref, onMouseDown, onMouseMove, onMouseUp: stopDrag, onMouseLeave: stopDrag };
}
