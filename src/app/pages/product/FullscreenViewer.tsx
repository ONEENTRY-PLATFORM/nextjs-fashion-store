import { ChevronLeft, ChevronRight, X } from 'lucide-react';
import { useEffect, useRef, useState } from 'react';
import { createPortal } from 'react-dom';

import CmsImage from '@/app/components/ui/CmsImage';
import { FULLSCREEN_VIEWER_LABELS as L_FALLBACK } from '@/app/data/productPageLabels';
import { useDict } from '@/lib/oneentry/labels/DictContext';

interface FullscreenViewerProps {
  images: string[];
  startIndex: number;
  onClose: () => void;
  productName: string;
  /** Blur data URI per image URL, forwarded from the gallery. */
  imageBlurs?: Record<string, string>;
}

export function FullscreenViewer({ images, startIndex, onClose, productName, imageBlurs }: FullscreenViewerProps) {
  const L = useDict('product_card_actions_viewer_', L_FALLBACK);
  const [current, setCurrent] = useState(startIndex);
  const containerRef = useRef<HTMLDivElement>(null);
  const wheelLock = useRef(false);
  const wheelUnlockTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    return () => {
      if (wheelUnlockTimer.current) clearTimeout(wheelUnlockTimer.current);
    };
  }, []);

  useEffect(() => {
    document.body.style.overflow = 'hidden';
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
      if (e.key === 'ArrowLeft') setCurrent((c) => Math.max(0, c - 1));
      if (e.key === 'ArrowRight') setCurrent((c) => Math.min(images.length - 1, c + 1));
    };
    window.addEventListener('keydown', onKey);
    return () => {
      window.removeEventListener('keydown', onKey);
      document.body.style.overflow = '';
    };
  }, [images.length, onClose]);

  useEffect(() => {
    const el = containerRef.current;
    if (!el) return;
    const onWheel = (e: WheelEvent) => {
      e.preventDefault();
      if (wheelLock.current) return;
      wheelLock.current = true;
      if (wheelUnlockTimer.current) clearTimeout(wheelUnlockTimer.current);
      wheelUnlockTimer.current = setTimeout(() => {
        wheelLock.current = false;
      }, 400);
      if (e.deltaY > 0) setCurrent((c) => Math.min(images.length - 1, c + 1));
      else setCurrent((c) => Math.max(0, c - 1));
    };
    el.addEventListener('wheel', onWheel, { passive: false });
    return () => el.removeEventListener('wheel', onWheel);
  }, [images.length]);

  return createPortal(
    <div ref={containerRef} className="fixed inset-0 z-99999 flex bg-[#111]">
      <div className="scrollbar-hide flex w-22 shrink-0 flex-col gap-2 overflow-y-auto bg-[#1a1a1a] px-3 py-6">
        {images.map((img, i) => (
          <button
            key={i}
            onClick={() => setCurrent(i)}
            className={`relative aspect-3/4 w-16 shrink-0 overflow-hidden outline-2 outline-offset-2 transition-all duration-150 focus-visible:outline-none ${
              current === i ? 'opacity-100 outline-white' : 'opacity-45 outline-transparent'
            }`}
          >
            <CmsImage
              src={img}
              blur={imageBlurs?.[img]}
              alt={`${productName} – photo ${i + 1}`}
              fill
              sizes="64px"
              className="object-cover object-[center_top]"
            />
          </button>
        ))}
      </div>

      <div className="flex min-w-0 flex-1 flex-col">
        <div className="flex shrink-0 items-center justify-between px-6 py-4">
          <span className="text-sm text-white/50">{L.photoPositionTpl(current, images.length)}</span>
          <button
            onClick={onClose}
            className="flex size-10 items-center justify-center rounded-full bg-white text-black transition-colors hover:bg-gray-200 focus-visible:outline-none"
            aria-label={L.closeAria}
          >
            <X size={18} strokeWidth={2} />
          </button>
        </div>

        <div className="relative flex min-h-0 flex-1 items-center justify-center px-16" onClick={onClose}>
          <CmsImage
            src={images[current]}
            blur={imageBlurs?.[images[current]]}
            alt={L.photoAltTpl(productName, current, images.length)}
            fill
            sizes="100vw"
            className="object-contain select-none"
            onClick={(e) => e.stopPropagation()}
          />
          {current > 0 && (
            <button
              onClick={(e) => {
                e.stopPropagation();
                setCurrent((c) => c - 1);
              }}
              className="absolute top-1/2 left-4 flex size-10 -translate-y-1/2 items-center justify-center bg-white/10 text-white transition-colors hover:bg-white/25 focus-visible:outline-none"
            >
              <ChevronLeft size={22} />
            </button>
          )}
          {current < images.length - 1 && (
            <button
              onClick={(e) => {
                e.stopPropagation();
                setCurrent((c) => c + 1);
              }}
              className="absolute top-1/2 right-4 flex size-10 -translate-y-1/2 items-center justify-center bg-white/10 text-white transition-colors hover:bg-white/25 focus-visible:outline-none"
            >
              <ChevronRight size={22} />
            </button>
          )}
        </div>
      </div>
    </div>,
    document.body,
  );
}
