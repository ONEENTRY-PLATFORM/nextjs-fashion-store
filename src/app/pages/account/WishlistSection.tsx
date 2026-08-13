'use client';
import { Eye, Heart, ShoppingBag } from 'lucide-react';
import React, { useEffect, useRef, useState } from 'react';

import { CATALOG_VIEW_LABELS } from '@/app/components/catalog/copy';
import { PRODUCT_CARD_ARIA_LABELS, PRODUCT_CARD_LABELS } from '@/app/components/product/copy';
import { ColorSwatchButton } from '@/app/components/ui/ColorSwatchButton';
import { ImageWithFallback } from '@/app/components/ui/ImageWithFallback';
import { SALE_COLOR } from '@/app/constants/colors';
import { TIMINGS } from '@/app/constants/timings';
import { useCart } from '@/app/context/CartContext';
import { useWishlist, type WishlistItem } from '@/app/context/WishlistContext';
import { fillTokens } from '@/app/utils/fillTokens';
import { useRouter } from '@/lib/i18n/navigation';
import { useDict, useT } from '@/lib/oneentry/labels/DictContext';

import { ACCENT, SectionTitle } from './shared';

export const WISHLIST_DYNAMIC_ARIA = {
  quickViewPrefix: 'Quick view',
} as const;

// ─── Wishlist section ───────────────────────────────────────────────────────
export const WISHLIST_LABELS = {
  title: 'Wishlist',
  emptyText: 'Your wishlist is empty',
  emptyCta: 'Browse Collection',
  emptyCtaHref: '/women/clothing',
  saleBadge: 'SALE',
} as const;

export function WishlistSection() {
  const WL = useDict('user_account_wishlist_', WISHLIST_LABELS);
  const { items, removeItem } = useWishlist();
  const inStockItems = items.filter((i) => i.inStock);
  const title = useT('user_account_wishlist_title', WL.title);

  return (
    <div style={{ '--sale': SALE_COLOR, '--accent': ACCENT } as React.CSSProperties}>
      <SectionTitle title={title} />
      {inStockItems.length === 0 ? (
        <div className="py-16 text-center">
          <Heart size={48} strokeWidth={1} className="mx-auto mb-3 text-gray-300" />
          <p className="text-sm text-gray-400">{WL.emptyText}</p>
        </div>
      ) : (
        <div className="grid grid-cols-2 gap-px bg-white sm:grid-cols-3">
          {inStockItems.map((item) => (
            <WishlistCard key={item.id} item={item} onRemove={() => removeItem(item.id)} />
          ))}
        </div>
      )}
    </div>
  );
}

export function WishlistCard({ item, onRemove }: { item: WishlistItem; onRemove: () => void }) {
  const CVL = useDict('interface_controls_view_', CATALOG_VIEW_LABELS);
  const WL = useDict('user_account_wishlist_', WISHLIST_LABELS);
  const router = useRouter();
  const lAddToCart = useT('product-card_add_to_cart_cta', PRODUCT_CARD_LABELS.addToCart);
  const { addItem: addToCart } = useCart();
  const initColorIdx = item.selectedColor ? Math.max(0, item.colors.indexOf(item.selectedColor)) : 0;
  const [isHovered, setIsHovered] = useState(false);
  const [selectedColor, setSelectedColor] = useState(initColorIdx);
  const [addedToCart, setAddedToCart] = useState(false);
  const [cartHovered, setCartHovered] = useState(false);
  const [showTooltip, setShowTooltip] = useState(false);
  const longPressTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const addedToCartTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const tooltipTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    return () => {
      if (longPressTimer.current) clearTimeout(longPressTimer.current);
      if (addedToCartTimerRef.current) clearTimeout(addedToCartTimerRef.current);
      if (tooltipTimerRef.current) clearTimeout(tooltipTimerRef.current);
    };
  }, []);

  const handleCardClick = () => {
    const qs = new URLSearchParams();
    if (item.colors[selectedColor]) qs.set('color', item.colors[selectedColor]);
    if (item.selectedSize) qs.set('size', item.selectedSize);
    const query = qs.toString();
    router.push(`/product/${item.id}${query ? `?${query}` : ''}`);
  };

  const handleAddToCart = (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (addedToCartTimerRef.current) clearTimeout(addedToCartTimerRef.current);
    addToCart({
      id: `${item.id}-wishlist`,
      name: item.name,
      brand: item.brand,
      sku: item.id,
      color: item.colors[selectedColor] ?? '',
      size: item.selectedSize ?? item.sizes?.[0] ?? 'M',
      quantity: 1,
      price: parseFloat((item.salePrice ?? item.price).replace(/[^0-9.]/g, '')) || 0,
      image: item.image,
    });
    setAddedToCart(true);
    addedToCartTimerRef.current = setTimeout(() => setAddedToCart(false), TIMINGS.ADDED_TO_CART_DISPLAY);
  };

  const handleTouchStart = () => {
    longPressTimer.current = setTimeout(() => setShowTooltip(true), 500);
  };
  const handleTouchEnd = () => {
    if (longPressTimer.current) clearTimeout(longPressTimer.current);
    if (tooltipTimerRef.current) clearTimeout(tooltipTimerRef.current);
    tooltipTimerRef.current = setTimeout(() => setShowTooltip(false), TIMINGS.TOOLTIP_HIDE);
  };

  const lSaleBadge = useT('user_account_wishlist_sale_badge', WL.saleBadge);
  const lAdded = useT('product-card-added', PRODUCT_CARD_LABELS.added);
  const aRemove = useT('product-card-aria_remove_from_wishlist', PRODUCT_CARD_ARIA_LABELS.removeFromWishlist);
  const aQuickView = useT('user_account_wishlist_quick_view_prefix', WISHLIST_DYNAMIC_ARIA.quickViewPrefix);
  const lQuickView = useT('interface_controls_view_quick_view', CVL.quickView);

  return (
    <div
      className="group relative flex cursor-pointer flex-col bg-white font-sans outline-1 outline-black"
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
      onClick={handleCardClick}
    >
      {/* Image */}
      <div className="relative aspect-3/4 overflow-hidden">
        <ImageWithFallback
          src={item.image}
          alt={item.name}
          fill
          sizes="(max-width: 640px) 50vw, 25vw"
          className={`object-cover object-[center_top] transition-transform duration-500 ${
            isHovered ? 'scale-105' : 'scale-100'
          }`}
        />

        {/* Sale badge */}
        {item.salePrice && (
          <div className="absolute top-3 left-3">
            <span className="rounded-none bg-(--sale) px-2 py-1 text-xs font-medium tracking-wider text-white uppercase">
              {lSaleBadge}
            </span>
          </div>
        )}

        {/* Remove from wishlist button — filled heart, matches ProductCard wishlist btn position */}
        <button
          onClick={(e) => {
            e.preventDefault();
            e.stopPropagation();
            onRemove();
          }}
          className="absolute top-3 right-3 flex size-8 items-center justify-center rounded-none bg-white/90 transition-all duration-200 hover:bg-white focus-visible:outline-none"
          aria-label={aRemove}
        >
          <Heart size={16} style={{ fill: ACCENT, stroke: ACCENT }} className="transition-colors duration-200" />
        </button>

        {/* Hover overlay — Add to Cart + Quick View */}
        <div
          className={`absolute inset-x-0 bottom-0 flex flex-col gap-2 p-3 transition-all duration-300 ${
            isHovered ? 'translate-y-0 opacity-100' : 'translate-y-full opacity-0'
          }`}
        >
          <button
            onMouseEnter={() => setCartHovered(true)}
            onMouseLeave={() => setCartHovered(false)}
            onClick={handleAddToCart}
            className={`flex w-full items-center justify-center gap-2 rounded-none py-2.5 text-xs font-medium tracking-widest text-white uppercase transition-colors duration-200 focus-visible:outline-none ${
              addedToCart ? 'bg-(--sale)' : cartHovered ? 'bg-accent' : 'bg-black'
            }`}
          >
            <ShoppingBag size={14} />
            {addedToCart ? lAdded : lAddToCart}
          </button>
          <button
            onClick={(e) => {
              e.stopPropagation();
              handleCardClick();
            }}
            className="flex w-full items-center justify-center gap-2 rounded-none bg-white/95 py-2.5 text-xs font-medium tracking-widest text-black uppercase transition-all duration-200 hover:bg-white"
            aria-label={`${aQuickView} ${item.name}`}
          >
            <Eye size={14} />
            {lQuickView}
          </button>
        </div>
      </div>

      {/* Info panel */}
      <div className="flex min-h-24 flex-col px-4 pt-3 pb-4">
        {/* Title with tooltip */}
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

        {/* Price */}
        <div className="mb-2.5 flex items-center gap-2">
          {item.salePrice ? (
            <>
              <span className="text-sm font-medium text-(--sale)">{item.salePrice}</span>
              <span className="text-xs text-gray-400 line-through">{item.price}</span>
            </>
          ) : (
            <span className="text-sm font-medium text-black">{item.price}</span>
          )}
        </div>

        {/* Color swatches */}
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
                    if (!isOOS) setSelectedColor(idx);
                  }}
                />
              );
            })}
            {item.colors.length > 4 && <span className="ml-1 text-xs text-gray-500">+{item.colors.length - 4}</span>}
          </div>
        )}

        {/* Selected size */}
        {item.selectedSize && (
          <div className="mt-1.5">
            <span className="text-xs tracking-wide text-gray-500">
              Size: <span className="font-medium text-black">{item.selectedSize}</span>
            </span>
          </div>
        )}
      </div>
    </div>
  );
}
