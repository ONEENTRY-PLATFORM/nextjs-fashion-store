import { ChevronLeft, ChevronRight, ZoomIn } from 'lucide-react';
import Image from 'next/image';
import { useCallback, useRef, useState } from 'react';

import CmsImage from '@/app/components/ui/CmsImage';
import { useT } from '@/lib/oneentry/labels/DictContext';

import { FullscreenViewer } from './FullscreenViewer';

// ─── ProductGallery ─────────────────────────────────────────────────────────
export const PRODUCT_GALLERY_LABELS = {
  zoomHint: 'Click to zoom · Double-click for fullscreen',
} as const;

export function ProductGallery({
  images,
  productName,
  imageBlurs,
}: {
  images: string[];
  productName: string;
  /** Blur data URI per image URL. */
  imageBlurs?: Record<string, string>;
}) {
  // OE products occasionally come back with empty image URLs (placeholder entries while admin is filling in pictures).
  const safeImages = images.filter((src): src is string => typeof src === 'string' && src.length > 0);
  const [selected, setSelected] = useState(0);
  const [fullscreen, setFullscreen] = useState(false);
  const [zooming, setZooming] = useState(false);
  const [zoomPos, setZoomPos] = useState({ x: 50, y: 50 });
  const mainRef = useRef<HTMLDivElement>(null);
  const lZoomHint = useT('product-card-click_to_zoom', PRODUCT_GALLERY_LABELS.zoomHint);

  const handleMouseMove = useCallback((e: React.MouseEvent<HTMLDivElement>) => {
    if (!mainRef.current) return;
    const rect = mainRef.current.getBoundingClientRect();
    const x = Math.min(100, Math.max(0, ((e.clientX - rect.left) / rect.width) * 100));
    const y = Math.min(100, Math.max(0, ((e.clientY - rect.top) / rect.height) * 100));
    setZoomPos({ x, y });
  }, []);

  // No usable pictures on the variant AND no fallback wired up upstream.
  if (safeImages.length === 0) {
    return (
      <div className="flex w-full flex-col gap-3 lg:flex-row">
        <div className="relative flex-1">
          <div className="relative flex aspect-3/4 items-center justify-center overflow-hidden bg-[#f2f1ef]">
            <Image
              src="/icons/ui/bag-placeholder.svg"
              alt={productName}
              width={80}
              height={80}
              unoptimized
              className="opacity-70"
            />
          </div>
        </div>
      </div>
    );
  }
  const safeSelected = Math.min(selected, safeImages.length - 1);

  return (
    <>
      <div className="flex w-full flex-col gap-3 lg:flex-row">
        <div className="scrollbar-hide order-2 flex min-w-18 gap-2 overflow-x-auto lg:order-1 lg:flex-col lg:overflow-x-visible">
          {safeImages.map((img, i) => (
            <button
              key={i}
              onClick={() => setSelected(i)}
              className={`relative aspect-3/4 w-18 shrink-0 overflow-hidden transition-all duration-150 ${
                safeSelected === i
                  ? 'outline-2 outline-offset-1 outline-black'
                  : 'outline-[1.5px] outline-offset-0 outline-[#e5e5e5]'
              }`}
            >
              <CmsImage
                src={img}
                blur={imageBlurs?.[img]}
                alt={`${productName} thumbnail ${i + 1}`}
                fill
                sizes="72px"
                className="object-cover object-[center_top]"
              />
            </button>
          ))}
        </div>

        <div className="relative order-1 flex-1 lg:order-2">
          <div
            ref={mainRef}
            className="group relative aspect-3/4 cursor-zoom-in overflow-hidden"
            onMouseEnter={() => setZooming(true)}
            onMouseLeave={() => setZooming(false)}
            onMouseMove={handleMouseMove}
            onDoubleClick={() => setFullscreen(true)}
            onClick={() => setFullscreen(true)}
          >
            <CmsImage
              src={safeImages[safeSelected]}
              blur={imageBlurs?.[safeImages[safeSelected]]}
              alt={`${productName} – photo ${safeSelected + 1}`}
              // No class here contains "gallery", so the specs' `[class*="gallery"] img` locator matched nothing.
              data-testid="pdp-gallery-main-image"
              fill
              sizes="(max-width: 1024px) 100vw, 58vw"
              className={`object-cover object-[center_top] transition-transform duration-100 select-none ${
                zooming ? 'scale-1.8' : 'scale-100'
              }`}
              style={{ transformOrigin: `${zoomPos.x}% ${zoomPos.y}%` }}
              draggable={false}
            />

            {safeSelected > 0 && (
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  setSelected((s) => s - 1);
                }}
                className="absolute top-1/2 left-3 flex size-9 -translate-y-1/2 items-center justify-center rounded-none bg-white/90 opacity-0 transition-opacity group-hover:opacity-100 hover:bg-white"
              >
                <ChevronLeft size={18} />
              </button>
            )}
            {safeSelected < safeImages.length - 1 && (
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  setSelected((s) => s + 1);
                }}
                className="absolute top-1/2 right-3 flex size-9 -translate-y-1/2 items-center justify-center rounded-none bg-white/90 opacity-0 transition-opacity group-hover:opacity-100 hover:bg-white"
              >
                <ChevronRight size={18} />
              </button>
            )}

            <div className="absolute right-3 bottom-3 flex size-8 items-center justify-center bg-white/80 opacity-0 transition-opacity group-hover:opacity-100">
              <ZoomIn size={14} />
            </div>

            <div className="absolute bottom-3 left-1/2 flex -translate-x-1/2 gap-1.5 lg:hidden">
              {safeImages.map((_img, i) => (
                <span
                  key={i}
                  className={`block size-1.5 rounded-full transition-colors ${
                    safeSelected === i ? 'bg-black' : 'bg-black/30'
                  }`}
                />
              ))}
            </div>
          </div>

          <p className="mt-1.5 hidden text-center text-xs tracking-wider text-gray-400 lg:block">{lZoomHint}</p>
        </div>
      </div>

      {fullscreen && (
        <FullscreenViewer
          images={safeImages}
          startIndex={safeSelected}
          onClose={() => setFullscreen(false)}
          productName={productName}
          imageBlurs={imageBlurs}
        />
      )}
    </>
  );
}
