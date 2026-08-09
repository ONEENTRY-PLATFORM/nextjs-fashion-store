'use client';
import { ChevronLeft, ChevronRight, ShoppingBag } from 'lucide-react';
import { useRef } from 'react';

import { useDict, useT } from '../../../lib/oneentry/labels/DictContext';
import { ImageWithFallback } from '../../components/ui/ImageWithFallback';
import { useCart } from '../../context/CartContext';
import { extractCmsProductId } from '../../data/cms-product-id-map';
import { CATALOG_VIEW_LABELS, HORIZONTAL_SCROLLER_LABELS } from '../../data/commonLabels';
import { hexToColorName } from '../../utils/colorNames';

export interface CarouselProduct {
  id: string;
  name: string;
  brand?: string;
  price: string;
  salePrice?: string;
  image: string;
  colors: string[];
  sizes?: string[];
  stock?: number;
}

export function FavoritesCarousel({ title, products }: { title: string; products: CarouselProduct[] }) {
  const CVL = useDict('interface_controls_view_', CATALOG_VIEW_LABELS);
  const scrollRef = useRef<HTMLDivElement>(null);
  const { addItem, openMiniCart } = useCart();
  const aScrollLeft = useT('interface_controls_scroll_left', HORIZONTAL_SCROLLER_LABELS.scrollLeft);
  const aScrollRight = useT('interface_controls_scroll_right', HORIZONTAL_SCROLLER_LABELS.scrollRight);
  const scroll = (dir: 'left' | 'right') => {
    if (!scrollRef.current) return;
    scrollRef.current.scrollBy({ left: dir === 'left' ? -320 : 320, behavior: 'smooth' });
  };
  const handleQuickAdd = (p: CarouselProduct) => {
    // Cart stores prices as numbers — strip currency formatting first.
    // `originalPrice` is only set when there's an active sale (produces
    // the strike-through UX downstream).
    const parsePrice = (s?: string) => parseFloat(String(s ?? '').replace(/[^\d.]/g, '')) || 0;
    const priceNumber = parsePrice(p.salePrice ?? p.price);
    const originalPrice = p.salePrice ? parsePrice(p.price) : undefined;
    // Numeric cmsId keeps `productsForPreview` / `syncCart` in sync — the
    // helper strips any accidental UI suffix. Falls back to the raw id
    // string so downstream Redux still keys the cart entry.
    const cmsId = extractCmsProductId(p.id);
    const cartId = cmsId !== null ? String(cmsId) : p.id;
    const firstColorHex = p.colors?.[0];
    addItem({
      id: cartId,
      name: p.name,
      brand: p.brand ?? '',
      color: firstColorHex ? hexToColorName(firstColorHex) : '',
      sku: cartId,
      size: p.sizes?.[0] ?? '',
      quantity: 1,
      price: priceNumber,
      ...(originalPrice !== undefined && { originalPrice }),
      ...(typeof p.stock === 'number' && p.stock > 0 && { stockLimit: p.stock }),
      image: p.image,
    });
    openMiniCart();
  };

  return (
    <div>
      <div className="mb-4 flex items-center justify-between">
        <h3 className="text-sm font-bold tracking-[0.18em] uppercase">{title}</h3>
        <div className="flex items-center gap-2">
          <button
            onClick={() => scroll('left')}
            className="flex size-8 items-center justify-center border border-[#e5e7eb] transition-colors hover:bg-gray-100 focus-visible:outline-none"
            aria-label={aScrollLeft}
          >
            <ChevronLeft size={14} />
          </button>
          <button
            onClick={() => scroll('right')}
            className="flex size-8 items-center justify-center border border-[#e5e7eb] transition-colors hover:bg-gray-100 focus-visible:outline-none"
            aria-label={aScrollRight}
          >
            <ChevronRight size={14} />
          </button>
        </div>
      </div>
      <div
        ref={scrollRef}
        className="scrollbar-hide -mx-4 flex snap-x snap-mandatory gap-4 overflow-x-auto px-4 pb-2 lg:-mx-8 lg:px-8"
      >
        {products.map((p) => (
          <div key={p.id} className="group w-50 shrink-0 cursor-pointer snap-start">
            <div className="relative mb-4 aspect-3/4 overflow-hidden">
              <ImageWithFallback
                src={p.image}
                alt={p.name}
                fill
                sizes="200px"
                className="object-cover transition-transform duration-500 group-hover:scale-105"
              />
              <div className="absolute inset-x-0 bottom-0 p-2 opacity-0 transition-all duration-300 group-hover:opacity-100">
                <button
                  onClick={() => handleQuickAdd(p)}
                  className="flex w-full items-center justify-center gap-1.5 bg-black py-2 text-xs tracking-widest text-white uppercase focus-visible:outline-none"
                >
                  <ShoppingBag size={12} /> {CVL.quickAdd}
                </button>
              </div>
            </div>
            <p className="mb-1 text-xs tracking-widest text-gray-400 uppercase">{p.brand}</p>
            <p className="mb-1 line-clamp-2 text-xs leading-snug font-medium">{p.name}</p>
            <div className="flex items-baseline gap-1.5">
              {p.salePrice ? (
                <>
                  <span className="text-sm font-bold text-(--sale)">{p.salePrice}</span>
                  <span className="text-xs text-gray-400 line-through">{p.price}</span>
                </>
              ) : (
                <span className="text-sm font-bold">{p.price}</span>
              )}
            </div>
            <div className="mt-1.5 flex gap-1">
              {p.colors.slice(0, 4).map((c, i) => (
                <span key={i} className="size-3 shrink-0 border border-[#e0e0e0]" style={{ backgroundColor: c }} />
              ))}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
