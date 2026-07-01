'use client'
import React, { useState, useRef, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { ImageWithFallback } from '../../components/ImageWithFallback';
import { useWishlist, type WishlistItem } from '../../context/WishlistContext';
import { useCart } from '../../context/CartContext';
import { useQuickView } from '../../context/QuickViewContext';
import { Heart, ShoppingBag, AlertTriangle, Eye } from 'lucide-react';
import { ACCENT_WOMEN as ACCENT } from '../../constants/colors';
import { TIMINGS } from '../../constants/timings';
import { PRODUCT_CARD_ARIA_LABELS, PRODUCT_CARD_LABELS, CATALOG_VIEW_LABELS as CVL } from '../../data/commonLabels';
import { FAVORITE_CARD_LABELS as FCL } from '../../data/favoritesLabels';
import { ColorSwatchButton } from '../../components/ColorSwatchButton';
import { useProductCardT } from '../../../lib/oneentry/labels/ProductCardLabelsContext';

export function FavoriteCard({ item: rawItem }: { item: WishlistItem }) {
  // The wishlist Redux item carries an `inStock` flag that's already populated
  // from OE during the cart/wishlist merge — no need to consult the legacy
  // local PRODUCT_CATALOG fallback anymore.
  const item = rawItem;

  const { removeItem, updateSelection } = useWishlist();
  const { addItem: addToCart } = useCart();
  const { openQuickView } = useQuickView();
  const router = useRouter();
  const lAddToCart = useProductCardT('product-card_add_to_cart_cta', PRODUCT_CARD_LABELS.addToCart);
  const initColorIdx = item.selectedColor
    ? Math.max(0, item.colors.indexOf(item.selectedColor))
    : 0;
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
    addToCart({
      id: `${item.id}-fav`,
      name: item.name,
      price: parseFloat((item.salePrice ?? item.price).replace(/[^0-9.]/g, '')) || 0,
      image: item.image,
      size: item.selectedSize ?? item.sizes[0] ?? 'M',
      color: item.colors[selectedColor] ?? '',
      quantity: 1,
      brand: item.brand ?? '',
      sku: item.id,
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
    openQuickView({ id: item.id, name: item.name, brand: item.brand, price: item.price, salePrice: item.salePrice, image: item.image, colors: item.colors, sizes: item.sizes, badge: item.badge });
  };

  return (
    <div
      className={`relative flex flex-col bg-white group cursor-pointer font-[Inter,sans-serif] outline outline-1 outline-white transition-[opacity,transform] duration-[250ms] ${
        removing ? 'opacity-0 scale-[0.97]' : 'opacity-100 scale-100'
      }`}
      onClick={handleCardClick}
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
    >
      <div className="relative overflow-hidden aspect-[3/4]">
        <ImageWithFallback
          src={item.image}
          alt={item.name}
          fill
          sizes="(max-width: 640px) 50vw, 25vw"
          grayscale={!item.inStock}
          className={`object-cover transition-transform duration-500 object-[center_top] ${
            !item.inStock ? 'grayscale opacity-60' : ''
          } ${hovered ? 'scale-105' : 'scale-100'}`}
        />

        <div className="absolute top-3 left-3 flex flex-col gap-1.5">
          {item.badge && (
            <span
              className={`px-2 py-1 text-white text-xs tracking-wider uppercase font-medium rounded-none ${
                item.badge === 'SALE' ? 'bg-[var(--sale)]' : 'bg-black'
              }`}
            >
              {item.badge}
            </span>
          )}
          {item.priceAlert && (
            <span className="px-2 py-1 text-xs tracking-wider uppercase flex items-center gap-1 bg-[#FFF3CD] text-[#856404] rounded-none">
              <AlertTriangle size={10} />
              {FCL.priceDrop}
            </span>
          )}
          {!item.inStock && (
            <span className="px-2 py-1 text-xs tracking-wider uppercase bg-[#666] text-white rounded-none">
              {FCL.outOfStock}
            </span>
          )}
        </div>

        <button
          onClick={handleRemove}
          className="absolute top-3 right-3 w-8 h-8 flex items-center justify-center bg-white/90 hover:bg-white transition-all duration-200 focus-visible:outline-none rounded-none"
          aria-label={PRODUCT_CARD_ARIA_LABELS.removeFromFavourites}
        >
          <Heart size={16} fill={ACCENT} stroke={ACCENT} className="transition-colors duration-200" />
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
              className={`w-full py-2 text-xs tracking-widest uppercase font-medium text-white flex items-center justify-center gap-2 focus-visible:outline-none rounded-none transition-colors duration-200 ${
                addedToCart ? 'bg-[var(--sale)]' : cartHovered ? 'bg-[var(--accent)]' : 'bg-black'
              }`}
            >
              <ShoppingBag size={14} />
              {addedToCart ? PRODUCT_CARD_LABELS.added : lAddToCart}
            </button>
            <button
              onClick={handleQuickView}
              className="w-full py-2 text-xs tracking-widest uppercase font-medium bg-white/95 text-black flex items-center justify-center gap-2 hover:bg-white transition-all duration-200 focus-visible:outline-none rounded-none"
            >
              <Eye size={14} />
              {CVL.quickView}
            </button>
          </div>
        )}
      </div>

      <div className="flex flex-col px-4 pt-4 pb-4 min-h-[96px]">
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

        <div className="flex items-center gap-2 mb-1">
          {item.salePrice ? (
            <>
              <span className="text-sm font-medium text-[var(--sale)]">{item.salePrice}</span>
              <span className="text-xs text-gray-400 line-through">{item.price}</span>
            </>
          ) : (
            <span className="text-sm text-black font-medium">{item.price}</span>
          )}
        </div>

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
                  onClick={(e) => { e.preventDefault(); e.stopPropagation(); if (!isOOS) { setSelectedColor(idx); updateSelection(item.id, item.colors[idx]); } }}
                />
              );
            })}
            {item.colors.length > 4 && (
              <span className="text-xs text-gray-500 ml-1">+{item.colors.length - 4}</span>
            )}
          </div>
        )}

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
