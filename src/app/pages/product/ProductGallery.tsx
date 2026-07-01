import { useState, useRef, useCallback } from 'react';
import Image from 'next/image';
import { ChevronLeft, ChevronRight, ZoomIn } from 'lucide-react';
import { FullscreenViewer } from './FullscreenViewer';
import { PRODUCT_GALLERY_LABELS } from '../../data/productPageLabels';
import { useProductCardT } from '../../../lib/oneentry/labels/ProductCardLabelsContext';

export function ProductGallery({ images, productName }: { images: string[]; productName: string }) {
  // OE products occasionally come back with empty image URLs (placeholder
  // entries while admin is filling in pictures). next/image throws when
  // `src=""`, so drop empties up front.
  const safeImages = images.filter((src): src is string => typeof src === 'string' && src.length > 0);
  const [selected, setSelected] = useState(0);
  const [fullscreen, setFullscreen] = useState(false);
  const [zooming, setZooming] = useState(false);
  const [zoomPos, setZoomPos] = useState({ x: 50, y: 50 });
  const mainRef = useRef<HTMLDivElement>(null);
  const lZoomHint = useProductCardT('product-card-click_to_zoom', PRODUCT_GALLERY_LABELS.zoomHint);

  if (safeImages.length === 0) return null;
  const safeSelected = Math.min(selected, safeImages.length - 1);

  const handleMouseMove = useCallback((e: React.MouseEvent<HTMLDivElement>) => {
    if (!mainRef.current) return;
    const rect = mainRef.current.getBoundingClientRect();
    const x = Math.min(100, Math.max(0, ((e.clientX - rect.left) / rect.width) * 100));
    const y = Math.min(100, Math.max(0, ((e.clientY - rect.top) / rect.height) * 100));
    setZoomPos({ x, y });
  }, []);

  return (
    <>
      <div className="flex flex-col lg:flex-row gap-3 w-full">
        <div className="flex lg:flex-col gap-2 order-2 lg:order-1 overflow-x-auto lg:overflow-x-visible scrollbar-hide min-w-[72px]">
          {safeImages.map((img, i) => (
            <button
              key={i}
              onClick={() => setSelected(i)}
              className={`relative flex-shrink-0 overflow-hidden transition-all duration-150 w-[72px] aspect-[3/4] ${
                safeSelected === i
                  ? 'outline outline-2 outline-black outline-offset-1'
                  : 'outline outline-[1.5px] outline-[#e5e5e5] outline-offset-0'
              }`}
            >
              <Image
                src={img}
                alt={`${productName} thumbnail ${i + 1}`}
                fill
                sizes="72px"
                className="object-cover object-[center_top]"
              />
            </button>
          ))}
        </div>

        <div className="flex-1 order-1 lg:order-2 relative">
          <div
            ref={mainRef}
            className="relative overflow-hidden group aspect-[3/4] cursor-zoom-in"
            onMouseEnter={() => setZooming(true)}
            onMouseLeave={() => setZooming(false)}
            onMouseMove={handleMouseMove}
            onDoubleClick={() => setFullscreen(true)}
            onClick={() => setFullscreen(true)}
          >
            <Image
              src={safeImages[safeSelected]}
              alt={`${productName} – photo ${safeSelected + 1}`}
              fill
              sizes="(max-width: 1024px) 100vw, 58vw"
              className={`object-cover transition-transform duration-100 select-none object-[center_top] ${
                zooming ? 'scale-[1.8]' : 'scale-100'
              }`}
              style={{ transformOrigin: `${zoomPos.x}% ${zoomPos.y}%` }}
              draggable={false}
            />

            {safeSelected > 0 && (
              <button
                onClick={e => { e.stopPropagation(); setSelected(s => s - 1); }}
                className="absolute left-3 top-1/2 -translate-y-1/2 w-9 h-9 bg-white/90 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity hover:bg-white rounded-none"
              >
                <ChevronLeft size={18} />
              </button>
            )}
            {safeSelected < safeImages.length - 1 && (
              <button
                onClick={e => { e.stopPropagation(); setSelected(s => s + 1); }}
                className="absolute right-3 top-1/2 -translate-y-1/2 w-9 h-9 bg-white/90 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity hover:bg-white rounded-none"
              >
                <ChevronRight size={18} />
              </button>
            )}

            <div className="absolute bottom-3 right-3 w-8 h-8 bg-white/80 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity">
              <ZoomIn size={14} />
            </div>

            <div className="absolute bottom-3 left-1/2 -translate-x-1/2 flex gap-1.5 lg:hidden">
              {safeImages.map((_img, i) => (
                <span
                  key={i}
                  className={`block w-1.5 h-1.5 rounded-full transition-colors ${
                    safeSelected === i ? 'bg-black' : 'bg-black/30'
                  }`}
                />
              ))}
            </div>
          </div>

          <p className="hidden lg:block text-xs text-gray-400 text-center mt-1.5 tracking-[0.05em]">
            {lZoomHint}
          </p>
        </div>
      </div>

      {fullscreen && (
        <FullscreenViewer images={safeImages} startIndex={safeSelected} onClose={() => setFullscreen(false)} productName={productName} />
      )}
    </>
  );
}
