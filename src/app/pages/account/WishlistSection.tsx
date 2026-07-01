'use client'
import React, { useState, useRef, useEffect } from 'react';
import { useWishlist, type WishlistItem } from '../../context/WishlistContext';
import { useRouter } from 'next/navigation';
import { ImageWithFallback } from '../../components/ImageWithFallback';
import { Heart, ShoppingBag, Eye } from 'lucide-react';
import { useCart } from '../../context/CartContext';
import { SectionTitle, ACCENT } from './shared';
import { SALE_COLOR } from '../../constants/colors';
import { TIMINGS } from '../../constants/timings';
import { ColorSwatchButton } from '../../components/ColorSwatchButton';
import { PRODUCT_CARD_ARIA_LABELS, WISHLIST_DYNAMIC_ARIA, PRODUCT_CARD_LABELS, CATALOG_VIEW_LABELS as CVL } from '../../data/commonLabels';
import { WISHLIST_LABELS as WL } from '../../data/accountLabels';
import { useT } from '../../../lib/oneentry/labels/AccountLabelsContext';
import { useProductCardT } from '../../../lib/oneentry/labels/ProductCardLabelsContext';

export function WishlistSection() {
  const { items, removeItem } = useWishlist();
  const inStockItems = items.filter(i => i.inStock);
  const title = useT('user_account_wishlist', 'user_account_wishlist_title', WL.title);

  return (
    <div
      style={{ '--sale': SALE_COLOR, '--accent': ACCENT } as React.CSSProperties}
    >
      <SectionTitle title={title} />
      {inStockItems.length === 0 ? (
        <div className="text-center py-16">
          <Heart size={48} strokeWidth={1} className="text-gray-300 mx-auto mb-3" />
          <p className="text-sm text-gray-400">{WL.emptyText}</p>
        </div>
      ) : (
        <div className="grid grid-cols-2 sm:grid-cols-3 gap-px bg-white">
          {inStockItems.map(item => (
            <WishlistCard
              key={item.id}
              item={item}
              onRemove={() => removeItem(item.id)}
            />
          ))}
        </div>
      )}
    </div>
  );
}

export function WishlistCard({
  item,
  onRemove,
}: {
  item: WishlistItem;
  onRemove: () => void;
}) {
  const router = useRouter();
  const lAddToCart = useProductCardT('product-card_add_to_cart_cta', PRODUCT_CARD_LABELS.addToCart);
  const { addItem: addToCart } = useCart();
  const initColorIdx = item.selectedColor
    ? Math.max(0, item.colors.indexOf(item.selectedColor))
    : 0;
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

  return (
    <div
      className="relative flex flex-col bg-white group cursor-pointer font-[Inter,sans-serif] outline outline-1 outline-black"
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
      onClick={handleCardClick}
    >
      {/* Image */}
      <div className="relative overflow-hidden aspect-[3/4]">
        <ImageWithFallback
          src={item.image}
          alt={item.name}
          fill
          sizes="(max-width: 640px) 50vw, 25vw"
          className={`object-cover transition-transform duration-500 object-[center_top] ${
            isHovered ? 'scale-105' : 'scale-100'
          }`}
        />

        {/* Sale badge */}
        {item.salePrice && (
          <div className="absolute top-3 left-3">
            <span className="px-2 py-1 text-white text-xs tracking-wider uppercase font-medium bg-[var(--sale)] rounded-none">
              SALE
            </span>
          </div>
        )}

        {/* Remove from wishlist button — filled heart, matches ProductCard wishlist btn position */}
        <button
          onClick={(e) => { e.preventDefault(); e.stopPropagation(); onRemove(); }}
          className="absolute top-3 right-3 w-8 h-8 flex items-center justify-center bg-white/90 hover:bg-white transition-all duration-200 focus-visible:outline-none rounded-none"
          aria-label={PRODUCT_CARD_ARIA_LABELS.removeFromWishlist}
        >
          <Heart size={16} fill={ACCENT} stroke={ACCENT} className="transition-colors duration-200" />
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
            className={`w-full py-2.5 text-xs tracking-widest uppercase font-medium text-white flex items-center justify-center gap-2 focus-visible:outline-none rounded-none transition-colors duration-200 ${
              addedToCart ? 'bg-[var(--sale)]' : cartHovered ? 'bg-[var(--accent)]' : 'bg-black'
            }`}
          >
            <ShoppingBag size={14} />
            {addedToCart ? PRODUCT_CARD_LABELS.added : lAddToCart}
          </button>
          <button
            onClick={(e) => { e.stopPropagation(); handleCardClick(); }}
            className="w-full py-2.5 text-xs tracking-widest uppercase font-medium bg-white/95 text-black flex items-center justify-center gap-2 hover:bg-white transition-all duration-200 rounded-none"
            aria-label={`${WISHLIST_DYNAMIC_ARIA.quickViewPrefix} ${item.name}`}
          >
            <Eye size={14} />
            {CVL.quickView}
          </button>
        </div>
      </div>

      {/* Info panel */}
      <div className="flex flex-col px-4 pt-3 pb-4 min-h-[96px]">

        {/* Title with tooltip */}
        <div className="relative mb-1">
          <h3
            className="text-sm text-black font-normal truncate"
            onMouseEnter={() => setShowTooltip(true)}
            onMouseLeave={() => setShowTooltip(false)}
            onTouchStart={handleTouchStart}
            onTouchEnd={handleTouchEnd}
            onTouchCancel={handleTouchEnd}
          >
            {item.name}
          </h3>
          {showTooltip && (
            <div className="absolute left-0 bottom-full mb-2 px-3 py-2 text-white text-xs tracking-wide pointer-events-none bg-black whitespace-normal z-[9999] max-w-[260px] leading-[1.4] shadow-[0_4px_12px_rgba(0,0,0,0.25)]">
              {item.name}
              <span className="absolute left-3 top-full w-0 h-0 border-l-[5px] border-l-transparent border-r-[5px] border-r-transparent border-t-[5px] border-t-black" />
            </div>
          )}
        </div>

        {/* Price */}
        <div className="flex items-center gap-2 mb-2.5">
          {item.salePrice ? (
            <>
              <span className="text-sm font-medium text-[var(--sale)]">{item.salePrice}</span>
              <span className="text-xs text-gray-400 line-through">{item.price}</span>
            </>
          ) : (
            <span className="text-sm text-black font-medium">{item.price}</span>
          )}
        </div>

        {/* Color swatches */}
        {item.colors.length > 0 && (
          <div className="flex items-center gap-2 mt-auto">
            {item.colors.slice(0, 4).map((color, idx) => {
              const isActive = selectedColor === idx;
              const isOOS = !item.inStock || (item.colorStock ? item.colorStock[idx] === false : false);
              return (
                <ColorSwatchButton
                  key={color}
                  color={color}
                  active={isActive}
                  outOfStock={isOOS}
                  label={`${CVL.colorSwatchTpl(idx + 1)}${isOOS ? CVL.colorSwatchOutOfStockSuffix : ''}`}
                  onClick={(e) => { e.preventDefault(); e.stopPropagation(); if (!isOOS) setSelectedColor(idx); }}
                />
              );
            })}
            {item.colors.length > 4 && (
              <span className="text-xs text-gray-500 ml-1">+{item.colors.length - 4}</span>
            )}
          </div>
        )}

        {/* Selected size */}
        {item.selectedSize && (
          <div className="mt-1.5">
            <span className="text-xs text-gray-500 tracking-wide">
              Size: <span className="font-medium text-black">{item.selectedSize}</span>
            </span>
          </div>
        )}
      </div>
    </div>
  );
}
