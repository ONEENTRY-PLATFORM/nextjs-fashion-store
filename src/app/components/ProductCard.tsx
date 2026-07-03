'use client'
import React, { useState, useEffect, useRef, useCallback } from 'react';
import { ACCENT_WOMEN } from '../constants/colors';
import { TIMINGS } from '../constants/timings';
import { useCatalogAccent } from '../context/CatalogAccentContext';
import Image from 'next/image';
import { createPortal } from 'react-dom';
import { Heart, ShoppingBag, Eye } from 'lucide-react';
import Link from 'next/link';
import { useWishlist } from '../context/WishlistContext';
import { useCart } from '../context/CartContext';
import { useQuickView } from '../context/QuickViewContext';
import { PRODUCT_CARD_ARIA_LABELS, PRODUCT_CARD_LABELS, SIZE_DROPDOWN_LABELS, CATALOG_VIEW_LABELS as CVL } from '../data/commonLabels';
import { QUICK_VIEW_LABELS } from '../data/productPageLabels';
import { hexToColorName as colorName } from '../utils/colorNames';
import { stripTrailingZeros } from '../utils/formatPrice';
import { ColorSwatchButton } from './ColorSwatchButton';
import { useProductCardT } from '../../lib/oneentry/labels/ProductCardLabelsContext';
import { usePdpT } from '../../lib/oneentry/labels/PdpLabelsContext';

export interface ProductSpec {
  label: string;
  value: string;
}

export interface ProductReview {
  id: number;
  author: string;
  rating: number;
  date: string;
  title: string;
  body: string;
  size: string;
  helpful: number;
  verified: boolean;
}

export interface Product {
  id: string;
  name: string;
  brand?: string;
  price: string;
  salePrice?: string;
  image: string;
  label?: string;
  colors: string[];
  /** Per-color images (same index as colors). Falls back to product.image if missing. */
  colorImages?: string[];
  /** Per-color stock status (same index as colors). undefined = in stock. */
  colorStock?: boolean[];
  sizes?: string[];
  badge?: string;
  inStock?: boolean;
  /** Filter fields — common */
  clothingType?: string;
  bagType?: string;
  shoeType?: string;
  accessoryType?: string;
  bagSize?: string;
  season?: string;
  material?: string;
  style?: string;
  brandCountry?: string;
  materialOrigin?: string;
  materialFinish?: string;
  /** Clothing filters */
  fit?: string;
  collar?: string;
  neckline?: string;
  sleeve?: string;
  hood?: string;
  pockets?: string;
  silhouette?: string;
  liningMaterial?: string;
  /** Bag filters */
  upperMaterial?: string;
  strapWidth?: string;
  frame?: string;
  /** Shoe filters */
  technologies?: string;
  insoleMaterial?: string;
  heelWidth?: string;
  soleMaterial?: string;
  closureType?: string;
  toeShape?: string;
  heelCounter?: string;
  soleConstruction?: string;
  stitchType?: string;
  /** Accessory filters */
  outerMaterial?: string;
  /** Clothing product details (array, e.g. ['Print', 'Embroidery']) */
  productDetails?: string[];
  /** Insulation filler — surfaced from OE `insulation_17` and consumed by the
   *  Insulation filter group on catalog pages. */
  insulation?: string;
  /** Care instructions — surfaced from OE `careinstructions_18` and consumed
   *  by the Care Instructions filter group on catalog pages. */
  careInstructions?: string[];
  /** Shoe measurements */
  heelHeight?: number;
  soleThickness?: number;
  shaftVolume?: number;
  shoeHeight?: number;
  /** Shoe misc */
  soleType?: string;
  /** Shoe width category */
  width?: string;
  /** Detail page fields */
  galleryImages?: string[];
  specs?: ProductSpec[];
  reviews?: ProductReview[];
  /** ID of the recommended-products block to show on the detail page */
  recommendedId?: string;
  /** ID of the special-offers group to show on the detail page */
  specialOffersId?: string;
  /** Gender taxonomy: 'W' (women), 'M' (men), 'U' (unisex). Empty when OE
   *  doesn't tag the product. Used by Recently Viewed / You May Also Like /
   *  trending carousels to keep recommendations gender-consistent. */
  gender?: 'W' | 'M' | 'U' | '';
  /** All linked variants in the same title-group. When present, clicking a
   *  color / size swatch in the card or QuickView swaps the displayed image,
   *  price, SKU, and stock to the matching variant. */
  variants?: ProductVariant[];
}

export interface ProductVariant {
  id: string;
  colors: string[];
  sizes: string[];
  price: string;
  sku: string;
  image: string;
  images: string[];
  inStock: boolean;
}

interface ProductCardProps {
  product: Product;
  accentColor?: string;
  priority?: boolean;
}

function ProductCardInner({ product, accentColor: accentProp, priority = false }: ProductCardProps) {
  const contextAccent = useCatalogAccent();
  const accentColor = accentProp ?? contextAccent ?? ACCENT_WOMEN;
  const { toggleItem, isWishlisted } = useWishlist();
  const { addItem: addToCart } = useCart();
  const { openQuickView } = useQuickView();
  // CTA labels: `add_to_cart_cta` lives in the `product-card` set, while the
  // post-click "Added" copy and "Quick View" labels live in the dedicated
  // `product_card_actions` set on OE.
  const lAddToCart = useProductCardT('product-card_add_to_cart_cta', PRODUCT_CARD_LABELS.addToCart);
  const lAdded     = usePdpT('product_card_actions', 'added',        PRODUCT_CARD_LABELS.added);
  const lQuickView = usePdpT('product_card_actions', 'quick_view',   CVL.quickView);
  const [mounted, setMounted] = useState(false);
  useEffect(() => { setMounted(true); }, []);
  const wishlisted = mounted && isWishlisted(product.id);
  const [isHovered, setIsHovered] = useState(false);
  const [selectedColor, setSelectedColor] = useState(0);
  const [selectedSize, setSelectedSize] = useState<string | null>(null);

  // Pick the variant whose color matches the current swatch, and — if a size
  // is chosen — also matches that size. Falls back to a colors-only match, so
  // clicking a color always finds *some* linked variant when one exists.
  const activeVariant = product.variants?.find((v) => {
    const colorHex = product.colors?.[selectedColor];
    if (!colorHex) return false;
    const hasColor = v.colors.includes(colorHex);
    if (!hasColor) return false;
    return selectedSize ? v.sizes.includes(selectedSize) : true;
  }) ?? product.variants?.find((v) => v.colors.includes(product.colors?.[selectedColor] ?? ''));

  // Per-color image & stock — guard against out-of-bounds index. Also coerce
  // any empty-string sources to the placeholder fallback below; an empty `src`
  // on <img> triggers a Next.js console error and reloads the document URL.
  const safeColorIdx = selectedColor < (product.colors?.length ?? 0) ? selectedColor : 0;
  const variantImage = activeVariant?.image;
  const candidateImage = variantImage || product.colorImages?.[safeColorIdx] || product.image;
  const activeImage = candidateImage || '/icons/ui/bag-placeholder.svg';
  const activePrice = activeVariant?.price ?? product.price;
  const activeSku = activeVariant?.sku || product.id;
  // When OE returns no picture for the product we skip Next/Image entirely
  // and render the placeholder directly — Next/Image with `fill` on a small
  // local SVG doesn't reliably fire onLoad, leaving the card stuck in the
  // animate-pulse state.
  const hasRealImage = Boolean(candidateImage);
  const activeColorOOS = product.colorStock ? product.colorStock[safeColorIdx] === false : false;
  const outOfStock = product.inStock === false || activeColorOOS;
  const [imgError, setImgError] = useState(false);
  const [imgLoaded, setImgLoaded] = useState(false);
  useEffect(() => { setImgError(false); setImgLoaded(false); }, [activeImage]);
  const [addedToCart, setAddedToCart] = useState(false);
  const [showTooltip, setShowTooltip] = useState(false);
  const [tooltipPos, setTooltipPos] = useState({ x: 0, y: 0 });
  const titleRef = useRef<HTMLHeadingElement>(null);

  const longPressTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const addedToCartTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const tooltipHideTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    return () => {
      if (addedToCartTimerRef.current) clearTimeout(addedToCartTimerRef.current);
      if (tooltipHideTimerRef.current) clearTimeout(tooltipHideTimerRef.current);
    };
  }, []);

  const handleAddToCart = (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    // Parse the display-formatted price (e.g. "$35") into a number for cart
    // math. When there's a sale price, keep the original as `originalPrice`.
    const parsePrice = (s?: string) => parseFloat(String(s ?? '').replace(/[^\d.]/g, '')) || 0;
    const priceNumber = parsePrice(activeVariant?.price ?? product.salePrice ?? product.price);
    const originalPriceNumber = product.salePrice ? parsePrice(product.price) : undefined;
    const activeColorHex = product.colors?.[safeColorIdx];
    addToCart({
      id: activeVariant?.id ?? product.id,
      name: product.name,
      brand: product.brand ?? '',
      color: activeColorHex ? colorName(activeColorHex) : '',
      sku: activeSku,
      size: selectedSize ?? product.sizes?.[0] ?? '',
      quantity: 1,
      price: priceNumber,
      ...(originalPriceNumber !== undefined && { originalPrice: originalPriceNumber }),
      image: activeImage,
    });
    if (addedToCartTimerRef.current) clearTimeout(addedToCartTimerRef.current);
    setAddedToCart(true);
    addedToCartTimerRef.current = setTimeout(() => setAddedToCart(false), TIMINGS.ADDED_TO_CART_DISPLAY);
  };

  const handleWishlist = (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    // Per-colour thumbnail: prefer the linked variant's image, then the
    // parallel `colorImages` array, then the current active image as a last
    // resort. Without this the favourites card is stuck showing the picture
    // of whichever colour was open when the shopper hit the heart icon.
    const colorImages = product.colors.map((c, i) =>
      product.variants?.find((v) => v.colors.includes(c))?.image
      || product.colorImages?.[i]
      || activeImage,
    );
    toggleItem({
      id: product.id,
      name: product.name,
      brand: product.brand ?? QUICK_VIEW_LABELS.defaultBrand,
      price: product.price,
      salePrice: product.salePrice,
      image: activeImage,
      colors: product.colors,
      colorImages,
      colorStock: product.colorStock,
      sizes: product.sizes ?? [...SIZE_DROPDOWN_LABELS.clothingSizes].slice(0, 5),
      badge: product.badge ?? product.label,
      inStock: product.inStock !== false,
      selectedColor: product.colors[selectedColor],
    });
  };

  const handleQuickView = (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    openQuickView(product, selectedColor);
  };

  const handleTouchStart = useCallback(() => {
    longPressTimer.current = setTimeout(() => setShowTooltip(true), TIMINGS.LONG_PRESS_TOOLTIP);
  }, []);

  const handleTouchEnd = useCallback(() => {
    if (longPressTimer.current) {
      clearTimeout(longPressTimer.current);
      longPressTimer.current = null;
    }
    if (tooltipHideTimerRef.current) clearTimeout(tooltipHideTimerRef.current);
    tooltipHideTimerRef.current = setTimeout(() => setShowTooltip(false), TIMINGS.TOOLTIP_HIDE);
  }, []);

  // Carry the shopper's picked colour/size into the PDP URL so it opens on
  // the same variant they were previewing on the card. Also carry `gender`
  // so the header's WOMEN/MEN toggle stays highlighted on the product page —
  // PDP paths (`/product/{id}`) don't include gender segment, so without
  // this hint the header falls back to its default (WOMEN).
  const cardHref = (() => {
    const params = new URLSearchParams();
    const hex = product.colors?.[safeColorIdx];
    if (hex) params.set('color', hex);
    if (selectedSize) params.set('size', selectedSize);
    if (product.gender === 'M') params.set('gender', 'men');
    else if (product.gender === 'W') params.set('gender', 'women');
    const qs = params.toString();
    return `/product/${product.id}${qs ? `?${qs}` : ''}`;
  })();

  return (
    <Link
      href={cardHref}
      className="relative flex flex-col bg-white group cursor-pointer"
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
    >
      {/* Image Container */}
      <div
        suppressHydrationWarning
        className={`relative overflow-hidden aspect-[3/4] bg-[#f2f1ef] ${
          hasRealImage && !imgLoaded && !imgError ? 'animate-pulse' : ''
        }`}
      >
        {imgError || !hasRealImage ? (
          <div className={`w-full h-full flex items-center justify-center bg-[#f2f1ef] transition-transform duration-500 group-hover:scale-105 ${outOfStock ? 'grayscale opacity-60' : ''}`}>
            <Image src="/icons/ui/bag-placeholder.svg" alt="" width={48} height={48} unoptimized />
          </div>
        ) : (
          <div className={`absolute inset-0 transition-opacity duration-500 ${imgLoaded ? 'opacity-100' : 'opacity-0'}`}>
            <Image
              src={activeImage}
              alt={product.brand ? `${product.name} by ${product.brand}` : product.name}
              fill
              sizes="(max-width: 640px) 50vw, (max-width: 1024px) 33vw, 25vw"
              className={`object-cover object-top transition-transform duration-500 group-hover:scale-105 ${outOfStock ? 'grayscale opacity-60' : ''}`}
              onLoad={() => setImgLoaded(true)}
              onError={() => setImgError(true)}
              priority={priority}
            />
          </div>
        )}

        {/* Out of Stock overlay */}
        {outOfStock && (
          <div className="absolute inset-0 flex items-end justify-center pb-4 pointer-events-none">
            <span className="px-3 py-1.5 text-xs tracking-[0.15em] uppercase font-semibold text-white bg-black/70">
              {CVL.outOfStock}
            </span>
          </div>
        )}

        {/* Label / Badge */}
        {(product.label || product.badge) && (
          <div className="absolute top-3 left-3">
            <span
              className={`px-2 py-1 text-white text-xs tracking-wider uppercase font-medium ${
                product.label === 'SALE' ? 'bg-primary-men' : 'bg-black'
              }`}
            >
              {product.label || product.badge}
            </span>
          </div>
        )}

        {/* Wishlist Button */}
        <button
          onClick={handleWishlist}
          className="absolute top-3 right-3 w-8 h-8 flex items-center justify-center bg-white/90 hover:bg-white transition-all duration-200"
          aria-label={PRODUCT_CARD_ARIA_LABELS.addToWishlist}
        >
          <Heart
            size={16}
            className="transition-colors duration-200"
            fill={wishlisted ? accentColor : 'none'}
            stroke={wishlisted ? accentColor : '#000'}
          />
        </button>

        {/* Quick View Overlay */}
        {!outOfStock && <div
          className={`absolute inset-x-0 bottom-0 flex flex-col gap-2 p-4 transition-all duration-300 ${
            isHovered ? 'translate-y-0 opacity-100' : 'translate-y-full opacity-0'
          }`}
        >
          {/* Add to Cart — hidden when product has multiple colors or sizes */}
          {product.colors.length <= 1 && (!product.sizes || product.sizes.length <= 1) && (
            <button
              onClick={handleAddToCart}
              className={`w-full py-2 text-xs tracking-widest uppercase text-white flex items-center justify-center gap-2 transition-colors duration-200 focus-visible:outline-none ${
                addedToCart
                  ? 'bg-primary-men'
                  : 'bg-black hover:bg-primary-women'
              }`}
            >
              <ShoppingBag size={14} />
              {addedToCart ? lAdded : lAddToCart}
            </button>
          )}
          <button
            onClick={handleQuickView}
            className="w-full py-2 text-xs tracking-widest uppercase font-medium bg-white/95 text-black flex items-center justify-center gap-2 hover:bg-white transition-all duration-200"
          >
            <Eye size={14} />
            {lQuickView}
          </button>
        </div>}
      </div>

      {/* Product Info — flexible height so the size row can render without
          clipping when a product has multiple linked variants. */}
      <div className="flex flex-col px-4 pt-4 pb-4 min-h-24 overflow-hidden">

        {/* Title with tooltip */}
        <div className="relative mb-1">
          <h3
            ref={titleRef}
            className="text-sm text-black font-normal truncate"
            onMouseEnter={() => {
              const rect = titleRef.current?.getBoundingClientRect();
              if (rect) setTooltipPos({ x: rect.left, y: rect.top });
              setShowTooltip(true);
            }}
            onMouseLeave={() => setShowTooltip(false)}
            onTouchStart={handleTouchStart}
            onTouchEnd={handleTouchEnd}
            onTouchCancel={handleTouchEnd}
          >
            {product.name}
          </h3>

          {/* Floating tooltip — portal to body to escape parent transforms */}
          {showTooltip && typeof document !== 'undefined' && createPortal(
            <div
              className="fixed px-3 py-2 bg-black text-white text-xs tracking-wide pointer-events-none whitespace-normal leading-snug shadow-lg -translate-y-full z-[99999] max-w-[260px]"
              style={{ left: tooltipPos.x, top: tooltipPos.y - 8 }}
            >
              {product.name}
              <span className="absolute left-3 top-full w-0 h-0 border-l-[5px] border-r-[5px] border-t-[5px] border-l-transparent border-r-transparent border-t-black" />
            </div>,
            document.body
          )}
        </div>

        {/* Price */}
        <div className="flex items-center gap-2 mb-2">
          {product.salePrice ? (
            <>
              <span className="text-sm font-medium text-primary-men">{stripTrailingZeros(product.salePrice)}</span>
              <span className="text-xs text-gray-400 line-through">{stripTrailingZeros(activePrice)}</span>
            </>
          ) : (
            <span className="text-sm text-black font-medium">{stripTrailingZeros(activePrice)}</span>
          )}
        </div>

        {/* Color Swatches */}
        {product.colors.length > 0 && (
          <div className="flex items-center gap-2 mt-auto">
            {product.colors.slice(0, 4).map((color, idx) => {
              const isOOS = product.inStock === false || (product.colorStock ? product.colorStock[idx] === false : false);
              const isActive = selectedColor === idx;
              return (
                <ColorSwatchButton
                  key={color}
                  color={color}
                  active={isActive}
                  outOfStock={isOOS}
                  label={`${colorName(color)}${isOOS ? CVL.colorSwatchOutOfStockSuffix : ''}`}
                  onClick={(e) => { e.preventDefault(); e.stopPropagation(); if (!isOOS) { setSelectedColor(idx); setSelectedSize(null); } }}
                />
              );
            })}
            {product.colors.length > 4 && (
              <span className="text-xs text-gray-500 ml-1">+{product.colors.length - 4}</span>
            )}
          </div>
        )}

        {/* Size chips — only for products with linked variants; picking a
            size flips the card to the matching variant (image / price / SKU). */}
        {product.variants && product.variants.length > 1 && product.sizes && product.sizes.length > 0 && (
          <div className="flex flex-wrap items-center gap-1 mt-2">
            {product.sizes.slice(0, 6).map((size) => {
              const active = selectedSize === size;
              const currentColorHex = product.colors?.[selectedColor];
              const isAvailable = product.variants?.some(
                (v) => v.sizes.includes(size) && (currentColorHex ? v.colors.includes(currentColorHex) : true) && v.inStock !== false,
              );
              return (
                <button
                  key={size}
                  onClick={(e) => {
                    e.preventDefault();
                    e.stopPropagation();
                    if (!isAvailable) return;
                    setSelectedSize(active ? null : size);
                  }}
                  disabled={!isAvailable}
                  className={`min-w-[28px] px-1.5 py-0.5 text-[10px] leading-none tracking-wide uppercase border transition-colors ${
                    active
                      ? 'bg-black text-white border-black'
                      : isAvailable
                      ? 'bg-white text-gray-700 border-gray-300 hover:border-black'
                      : 'bg-gray-50 text-gray-300 border-gray-100 cursor-not-allowed line-through'
                  }`}
                >
                  {size}
                </button>
              );
            })}
            {product.sizes.length > 6 && (
              <span className="text-[10px] text-gray-500 ml-1">+{product.sizes.length - 6}</span>
            )}
          </div>
        )}
      </div>
    </Link>
  );
}

export const ProductCard = React.memo(ProductCardInner);