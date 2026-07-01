import { useState, useRef, useEffect } from 'react';
import Image from 'next/image';
import { createPortal } from 'react-dom';
import { ChevronLeft, ChevronRight, X } from 'lucide-react';
import { FULLSCREEN_VIEWER_LABELS as L } from '../../data/productPageLabels';

interface FullscreenViewerProps {
  images: string[];
  startIndex: number;
  onClose: () => void;
  productName: string;
}

export function FullscreenViewer({ images, startIndex, onClose, productName }: FullscreenViewerProps) {
  const [current, setCurrent] = useState(startIndex);
  const containerRef = useRef<HTMLDivElement>(null);
  const wheelLock = useRef(false);
  const wheelUnlockTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    return () => { if (wheelUnlockTimer.current) clearTimeout(wheelUnlockTimer.current); };
  }, []);

  useEffect(() => {
    document.body.style.overflow = 'hidden';
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
      if (e.key === 'ArrowLeft') setCurrent(c => Math.max(0, c - 1));
      if (e.key === 'ArrowRight') setCurrent(c => Math.min(images.length - 1, c + 1));
    };
    window.addEventListener('keydown', onKey);
    return () => { window.removeEventListener('keydown', onKey); document.body.style.overflow = ''; };
  }, [images.length, onClose]);

  useEffect(() => {
    const el = containerRef.current;
    if (!el) return;
    const onWheel = (e: WheelEvent) => {
      e.preventDefault();
      if (wheelLock.current) return;
      wheelLock.current = true;
      if (wheelUnlockTimer.current) clearTimeout(wheelUnlockTimer.current);
      wheelUnlockTimer.current = setTimeout(() => { wheelLock.current = false; }, 400);
      if (e.deltaY > 0) setCurrent(c => Math.min(images.length - 1, c + 1));
      else setCurrent(c => Math.max(0, c - 1));
    };
    el.addEventListener('wheel', onWheel, { passive: false });
    return () => el.removeEventListener('wheel', onWheel);
  }, [images.length]);

  return createPortal(
    <div ref={containerRef} className="fixed inset-0 flex z-[99999] bg-[#111]">
      <div className="flex flex-col gap-2 py-6 px-3 overflow-y-auto scrollbar-hide w-[88px] bg-[#1a1a1a] flex-shrink-0">
        {images.map((img, i) => (
          <button
            key={i}
            onClick={() => setCurrent(i)}
            className={`relative flex-shrink-0 overflow-hidden transition-all duration-150 focus-visible:outline-none w-16 aspect-[3/4] outline-2 outline-offset-2 ${
              current === i ? 'opacity-100 outline-white' : 'opacity-45 outline-transparent'
            }`}
          >
            <Image src={img} alt={`${productName} – photo ${i + 1}`} fill sizes="64px" className="object-cover object-[center_top]" />
          </button>
        ))}
      </div>

      <div className="flex-1 flex flex-col min-w-0">
        <div className="flex items-center justify-between px-6 py-4 flex-shrink-0">
          <span className="text-white/50 text-sm">{L.photoPositionTpl(current, images.length)}</span>
          <button
            onClick={onClose}
            className="flex items-center justify-center bg-white text-black hover:bg-gray-200 transition-colors focus-visible:outline-none w-10 h-10 rounded-full"
            aria-label={L.closeAria}
          >
            <X size={18} strokeWidth={2} />
          </button>
        </div>

        <div className="flex-1 flex items-center justify-center relative px-16 min-h-0" onClick={onClose}>
          <Image
            src={images[current]}
            alt={L.photoAltTpl(productName, current, images.length)}
            fill
            sizes="100vw"
            className="object-contain select-none"
            onClick={e => e.stopPropagation()}
          />
          {current > 0 && (
            <button
              onClick={e => { e.stopPropagation(); setCurrent(c => c - 1); }}
              className="absolute left-4 top-1/2 -translate-y-1/2 w-10 h-10 flex items-center justify-center text-white bg-white/10 hover:bg-white/25 transition-colors focus-visible:outline-none"
            >
              <ChevronLeft size={22} />
            </button>
          )}
          {current < images.length - 1 && (
            <button
              onClick={e => { e.stopPropagation(); setCurrent(c => c + 1); }}
              className="absolute right-4 top-1/2 -translate-y-1/2 w-10 h-10 flex items-center justify-center text-white bg-white/10 hover:bg-white/25 transition-colors focus-visible:outline-none"
            >
              <ChevronRight size={22} />
            </button>
          )}
        </div>
      </div>
    </div>,
    document.body
  );
}
