'use client';
import { type RefObject, useCallback, useMemo, useRef } from 'react';

/** Mouse handlers to spread onto the scrollable element. */
export interface DragScrollHandlers {
  onMouseDown: (e: React.MouseEvent) => void;
  onMouseMove: (e: React.MouseEvent) => void;
  onMouseUp: () => void;
  onMouseLeave: () => void;
}

/** Adds desktop "drag to scroll" behaviour to a horizontally scrollable container. */
export function useDragScroll(ref: RefObject<HTMLDivElement | null>): DragScrollHandlers {
  const dragging = useRef(false);
  const startX = useRef(0);
  const scrollStart = useRef(0);

  const onMouseDown = useCallback(
    (e: React.MouseEvent) => {
      dragging.current = true;
      startX.current = e.pageX;
      scrollStart.current = ref.current?.scrollLeft ?? 0;
      if (ref.current) ref.current.style.cursor = 'grabbing';
    },
    [ref],
  );

  const onMouseMove = useCallback(
    (e: React.MouseEvent) => {
      if (!dragging.current || !ref.current) return;
      e.preventDefault();
      ref.current.scrollLeft = scrollStart.current - (e.pageX - startX.current);
    },
    [ref],
  );

  const stopDrag = useCallback(() => {
    dragging.current = false;
    if (ref.current) ref.current.style.cursor = 'grab';
  }, [ref]);

  return useMemo(
    () => ({ onMouseDown, onMouseMove, onMouseUp: stopDrag, onMouseLeave: stopDrag }),
    [onMouseDown, onMouseMove, stopDrag],
  );
}
