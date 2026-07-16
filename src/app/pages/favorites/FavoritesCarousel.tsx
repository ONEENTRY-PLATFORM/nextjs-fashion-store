'use client'
import { useRef } from 'react';
import { ImageWithFallback } from '../../components/ImageWithFallback';
import { ChevronLeft, ChevronRight, ShoppingBag } from 'lucide-react';
import { HORIZONTAL_SCROLLER_LABELS, CATALOG_VIEW_LABELS as CVL } from '../../data/commonLabels';
import { useCart } from '../../context/CartContext';
import { hexToColorName } from '../../utils/colorNames';
import { extractCmsProductId } from '../../data/cms-product-id-map';

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
  const scrollRef = useRef<HTMLDivElement>(null);
  const { addItem, openMiniCart } = useCart();
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
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-sm tracking-[0.18em] uppercase font-bold">{title}</h3>
        <div className="flex items-center gap-2">
          <button
            onClick={() => scroll('left')}
            className="w-8 h-8 flex items-center justify-center focus-visible:outline-none hover:bg-gray-100 transition-colors border border-[#e5e7eb]"
            aria-label={HORIZONTAL_SCROLLER_LABELS.scrollLeft}
          >
            <ChevronLeft size={14} />
          </button>
          <button
            onClick={() => scroll('right')}
            className="w-8 h-8 flex items-center justify-center focus-visible:outline-none hover:bg-gray-100 transition-colors border border-[#e5e7eb]"
            aria-label={HORIZONTAL_SCROLLER_LABELS.scrollRight}
          >
            <ChevronRight size={14} />
          </button>
        </div>
      </div>
      <div
        ref={scrollRef}
        className="flex gap-4 overflow-x-auto scrollbar-hide pb-2 -mx-4 lg:-mx-8 px-4 lg:px-8 snap-x snap-mandatory"
      >
        {products.map(p => (
          <div key={p.id} className="flex-shrink-0 group cursor-pointer w-[200px] snap-start">
            <div className="relative overflow-hidden mb-4 aspect-[3/4]">
              <ImageWithFallback
                src={p.image}
                alt={p.name}
                fill
                sizes="200px"
                className="object-cover transition-transform duration-500 group-hover:scale-105"
              />
              <div className="absolute inset-x-0 bottom-0 p-2 transition-all duration-300 opacity-0 group-hover:opacity-100">
                <button
                  onClick={() => handleQuickAdd(p)}
                  className="w-full py-2 text-white text-xs tracking-widest uppercase flex items-center justify-center gap-1.5 focus-visible:outline-none bg-black"
                >
                  <ShoppingBag size={12} /> {CVL.quickAdd}
                </button>
              </div>
            </div>
            <p className="text-xs text-gray-400 tracking-widest uppercase mb-1">{p.brand}</p>
            <p className="text-xs leading-snug mb-1 line-clamp-2 font-medium">{p.name}</p>
            <div className="flex items-baseline gap-1.5">
              {p.salePrice
                ? <><span className="text-sm font-bold text-[var(--sale)]">{p.salePrice}</span><span className="text-xs text-gray-400 line-through">{p.price}</span></>
                : <span className="text-sm font-bold">{p.price}</span>}
            </div>
            <div className="flex gap-1 mt-1.5">
              {p.colors.slice(0, 4).map((c, i) => (
                <span
                  key={i}
                  className="w-3 h-3 flex-shrink-0 border border-[#e0e0e0]"
                  style={{ backgroundColor: c }}
                />
              ))}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
