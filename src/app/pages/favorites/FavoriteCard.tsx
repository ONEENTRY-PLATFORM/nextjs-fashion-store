'use client';
import { AlertTriangle, Eye, Heart, ShoppingBag } from 'lucide-react';
import React, { useEffect, useRef, useState } from 'react';

import { ColorSwatchButton } from '@/app/components/ui/ColorSwatchButton';
import { ImageWithFallback } from '@/app/components/ui/ImageWithFallback';
import { ACCENT_WOMEN as ACCENT } from '@/app/constants/colors';
import { TIMINGS } from '@/app/constants/timings';
import { useCart } from '@/app/context/CartContext';
import { useQuickView } from '@/app/context/QuickViewContext';
import { useWishlist, type WishlistItem } from '@/app/context/WishlistContext';
import { extractCmsProductId } from '@/app/data/cms-product-id-map';
import { fillTokens } from '@/app/utils/fillTokens';
import { useRouter } from '@/lib/i18n/navigation';
import { useDict, useT } from '@/lib/oneentry/labels/DictContext';

export const FAVORITE_CARD_LABELS = {
  badgeSale: 'SALE',
  priceDrop: 'Price Drop',
  outOfStock: 'Out of Stock',
  removeFromFavourites: 'Remove from favourites',
  addToCart: 'Add to Cart',
  addedToCart: 'Added!',
  sizeLabel: 'Size',
} as const;

export const FAVORITE_CARD_VIEW_LABELS = {
  quickView: 'Quick View',
  /** `%index%` — 1-based swatch position. */
  colorSwatch: 'Color %index%',
  colorSwatchOutOfStockSuffix: ' (out of stock)',
} as const;

const FCL = FAVORITE_CARD_LABELS;

export function FavoriteCard({ item: rawItem }: { item: WishlistItem }) {
  const CVL = useDict('interface_controls_view_', FAVORITE_CARD_VIEW_LABELS);
  const item = rawItem;

  const { removeItem, updateSelection } = useWishlist();
  const { addItem: addToCart } = useCart();
  const { openQuickView } = useQuickView();
  const router = useRouter();
  const lAddToCart = useT('product-card_add_to_cart_cta', FCL.addToCart);
  // Wishlist-specific badges live in the OE `favorites_page` set alongside the rest of the page copy; `FAVORITE_CARD_LABELS` is the offline fallback.
  const lPriceDrop = useT('favorite_card_price_drop', FCL.priceDrop);
  const lOutOfStock = useT('favorite_card_out_of_stock', FCL.outOfStock);
  const lSizeLabel = useT('favorite_card_size', FCL.sizeLabel);
  const lAdded = useT('product-card-added', FCL.addedToCart);
  const lQuickView = useT('interface_controls_view_quick_view', CVL.quickView);
  const aRemove = useT('product-card-aria_remove_from_favourites', FCL.removeFromFavourites);
  const initColorIdx = item.selectedColor ? Math.max(0, item.colors.indexOf(item.selectedColor)) : 0;
  const [selectedColor, setSelectedColor] = useState(initColorIdx);
  const [addedToCart, setAddedToCart] = useState(false);
  const [cartHovered, setCartHovered] = useState(false);
  const [hovered, setHovered] = useState(false);
  const [removing, setRemoving] = useState(false);
  const [showTooltip, setShowTooltip] = useState(false);
  const longPressTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const addedToCartTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const removingTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const tooltipTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    return () => {
      if (addedToCartTimerRef.current) clearTimeout(addedToCartTimerRef.current);
      if (removingTimerRef.current) clearTimeout(removingTimerRef.current);
      if (tooltipTimerRef.current) clearTimeout(tooltipTimerRef.current);
    };
  }, []);

  const handleAddToCart = (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    // Forward `originalPrice` so the cart line renders the same strike-through UX as the catalog / PDP for sale items.
    const parsePrice = (s?: string) => parseFloat(String(s ?? '').replace(/[^0-9.]/g, '')) || 0;
    const priceNumber = parsePrice(item.salePrice ?? item.price);
    const originalPrice = item.salePrice ? parsePrice(item.price) : undefined;
    // Use a clean numeric id so `productsForPreview` / `syncCart` / `createOrder` all see the same OE productId.
    const cmsId = extractCmsProductId(item.id);
    const cartId = cmsId !== null ? String(cmsId) : item.id;
    addToCart({
      id: cartId,
      name: item.name,
      price: priceNumber,
      ...(originalPrice !== undefined && { originalPrice }),
      image: item.image,
      size: item.selectedSize ?? item.sizes[0] ?? 'M',
      color: item.colors[selectedColor] ?? '',
      quantity: 1,
      brand: item.brand ?? '',
      sku: cartId,
    });
    if (addedToCartTimerRef.current) clearTimeout(addedToCartTimerRef.current);
    setAddedToCart(true);
    addedToCartTimerRef.current = setTimeout(() => setAddedToCart(false), TIMINGS.ADDED_TO_CART_DISPLAY);
  };

  const handleRemove = (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (removingTimerRef.current) clearTimeout(removingTimerRef.current);
    setRemoving(true);
    removingTimerRef.current = setTimeout(() => removeItem(item.id), 250);
  };

  const handleTouchStart = () => {
    longPressTimer.current = setTimeout(() => setShowTooltip(true), 500);
  };
  const handleTouchEnd = () => {
    if (longPressTimer.current) clearTimeout(longPressTimer.current);
    if (tooltipTimerRef.current) clearTimeout(tooltipTimerRef.current);
    tooltipTimerRef.current = setTimeout(() => setShowTooltip(false), TIMINGS.TOOLTIP_HIDE);
  };

  const handleCardClick = () => {
    const qs = new URLSearchParams();
    const colorHex = item.colors[selectedColor];
    if (colorHex) qs.set('color', colorHex);
    if (item.selectedSize) qs.set('size', item.selectedSize);
    const query = qs.toString();
    router.push(`/product/${item.id}${query ? `?${query}` : ''}`);
  };

  const handleQuickView = (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    openQuickView({
      id: item.id,
      name: item.name,
      brand: item.brand,
      price: item.price,
      salePrice: item.salePrice,
      image: item.image,
      colors: item.colors,
      sizes: item.sizes,
      badge: item.badge,
    });
  };

  return (
    <div
      className={`group relative flex cursor-pointer flex-col bg-white font-sans outline-1 outline-white transition-[opacity,transform] duration-250 ${
        removing ? 'scale-0.97 opacity-0' : 'scale-100 opacity-100'
      }`}
      onClick={handleCardClick}
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
    >
      <div className="relative aspect-3/4 overflow-hidden">
        <ImageWithFallback
          src={item.colorImages?.[selectedColor] || item.image}
          alt={item.name}
          fill
          sizes="(max-width: 640px) 50vw, 25vw"
          grayscale={!item.inStock}
          className={`object-cover object-[center_top] transition-transform duration-500 ${
            !item.inStock ? 'opacity-60 grayscale' : ''
          } ${hovered ? 'scale-105' : 'scale-100'}`}
        />

        <div className="absolute top-3 left-3 flex flex-col gap-1.5">
          {item.badge && (
            <span
              className={`rounded-none px-2 py-1 text-xs font-medium tracking-wider text-white uppercase ${
                item.badge === 'SALE' ? 'bg-(--sale)' : 'bg-black'
              }`}
            >
              {item.badge}
            </span>
          )}
          {item.priceAlert && (
            <span className="flex items-center gap-1 rounded-none bg-[#FFF3CD] px-2 py-1 text-xs tracking-wider text-[#856404] uppercase">
              <AlertTriangle size={10} />
              {lPriceDrop}
            </span>
          )}
          {!item.inStock && (
            <span className="rounded-none bg-[#666] px-2 py-1 text-xs tracking-wider text-white uppercase">
              {lOutOfStock}
            </span>
          )}
        </div>

        <button
          onClick={handleRemove}
          className="absolute top-3 right-3 flex size-8 items-center justify-center rounded-none bg-white/90 transition-all duration-200 hover:bg-white focus-visible:outline-none"
          aria-label={aRemove}
        >
          <Heart size={16} style={{ fill: ACCENT, stroke: ACCENT }} className="transition-colors duration-200" />
        </button>

        {item.inStock && (
          <div
            className={`absolute inset-x-0 bottom-0 flex flex-col gap-2 p-3 transition-all duration-300 ${
              hovered ? 'translate-y-0 opacity-100' : 'translate-y-full opacity-0'
            }`}
          >
            <button
              onMouseEnter={() => setCartHovered(true)}
              onMouseLeave={() => setCartHovered(false)}
              onClick={handleAddToCart}
              className={`flex w-full items-center justify-center gap-2 rounded-none py-2 text-xs font-medium tracking-widest text-white uppercase transition-colors duration-200 focus-visible:outline-none ${
                addedToCart ? 'bg-(--sale)' : cartHovered ? 'bg-accent' : 'bg-black'
              }`}
            >
              <ShoppingBag size={14} />
              {addedToCart ? lAdded : lAddToCart}
            </button>
            <button
              onClick={handleQuickView}
              className="flex w-full items-center justify-center gap-2 rounded-none bg-white/95 py-2 text-xs font-medium tracking-widest text-black uppercase transition-all duration-200 hover:bg-white focus-visible:outline-none"
            >
              <Eye size={14} />
              {lQuickView}
            </button>
          </div>
        )}
      </div>

      <div className="flex min-h-24 flex-col p-4">
        <div className="relative mb-1">
          <h3
            className="truncate text-sm font-normal text-black"
            onMouseEnter={() => setShowTooltip(true)}
            onMouseLeave={() => setShowTooltip(false)}
            onTouchStart={handleTouchStart}
            onTouchEnd={handleTouchEnd}
            onTouchCancel={handleTouchEnd}
          >
            {item.name}
          </h3>
          {showTooltip && (
            <div className="leading-1.4 pointer-events-none absolute bottom-full left-0 z-9999 mb-2 max-w-65 bg-black px-3 py-2 text-xs tracking-wide whitespace-normal text-white shadow-[0_4px_12px_rgba(0,0,0,0.25)]">
              {item.name}
              <span className="absolute top-full left-3 size-0 border-x-[5px] border-t-[5px] border-x-transparent border-t-black" />
            </div>
          )}
        </div>

        <div className="mb-1 flex items-center gap-2">
          {item.salePrice ? (
            <>
              <span className="text-sm font-medium text-(--sale)">{item.salePrice}</span>
              <span className="text-xs text-gray-400 line-through">{item.price}</span>
            </>
          ) : (
            <span className="text-sm font-medium text-black">{item.price}</span>
          )}
        </div>

        {item.colors.length > 0 && (
          <div className="mt-auto flex items-center gap-2">
            {item.colors.slice(0, 4).map((color, idx) => {
              const isActive = selectedColor === idx;
              const isOOS = !item.inStock || (item.colorStock ? item.colorStock[idx] === false : false);
              return (
                <ColorSwatchButton
                  key={color}
                  color={color}
                  active={isActive}
                  outOfStock={isOOS}
                  label={`${fillTokens(CVL.colorSwatch, { index: idx + 1 })}${isOOS ? CVL.colorSwatchOutOfStockSuffix : ''}`}
                  onClick={(e) => {
                    e.preventDefault();
                    e.stopPropagation();
                    if (!isOOS) {
                      setSelectedColor(idx);
                      updateSelection(item.id, item.colors[idx]);
                    }
                  }}
                />
              );
            })}
            {item.colors.length > 4 && <span className="ml-1 text-xs text-gray-500">+{item.colors.length - 4}</span>}
          </div>
        )}

        {item.selectedSize && (
          <div className="mt-1.5">
            <span className="text-xs tracking-wide text-gray-500">
              {lSizeLabel}: <span className="font-medium text-black">{item.selectedSize}</span>
            </span>
          </div>
        )}
      </div>
    </div>
  );
}
