'use client';
import { Eye, Heart, ShoppingBag } from 'lucide-react';
import Image from 'next/image';
import React, { useCallback, useEffect, useRef, useState } from 'react';
import { createPortal } from 'react-dom';

import CmsImage from '@/app/components/ui/CmsImage';
import { ColorSwatchButton } from '@/app/components/ui/ColorSwatchButton';
import { ACCENT_WOMEN } from '@/app/constants/colors';
import { TIMINGS } from '@/app/constants/timings';
import { useCart } from '@/app/context/CartContext';
import { useCatalogAccent } from '@/app/context/CatalogAccentContext';
import { useQuickView } from '@/app/context/QuickViewContext';
import { useWishlist } from '@/app/context/WishlistContext';
import { useMounted } from '@/app/hooks/useMounted';
import { hexToColorName as colorName } from '@/app/utils/colorNames';
import { stripTrailingZeros } from '@/app/utils/formatPrice';
import { Link } from '@/lib/i18n/navigation';
import { useDict, useT } from '@/lib/oneentry/labels/DictContext';

export const PRODUCT_CARD_LABELS = {
  addToCart: 'Add to Cart',
  added: 'Added!',
} as const;

export const PRODUCT_CARD_ARIA_LABELS = {
  addToWishlist: 'Add to wishlist',
} as const;

export const PRODUCT_CARD_VIEW_LABELS = {
  quickView: 'Quick View',
  outOfStock: 'Out of Stock',
  colorSwatchOutOfStockSuffix: ' (out of stock)',
} as const;

/** Seeds for products that arrive without a brand or a size list — data, not copy. */
export const PRODUCT_CARD_DEFAULTS = {
  defaultBrand: 'Kekimoro',
  clothingSizes: ['XS', 'S', 'M', 'L', 'XL', 'XXL'] as const,
} as const;

export interface ProductSpec {
  /** Stable row identifier — match on this, never on the editable `label`. */
  key?: string;
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
  /** Per-color images (same index as colors). */
  colorImages?: string[];
  /** Blur data URI per image URL, for `next/image`'s `blurDataURL`. Keyed by URL so it stays correct however `colorImages` is sliced or reordered. */
  imageBlurs?: Record<string, string>;
  /** Per-color stock status (same index as colors). */
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
  /** Insulation filler — surfaced from OE `insulation_17` and consumed by the Insulation filter group on catalog pages. */
  insulation?: string;
  /** Care instructions — surfaced from OE `careinstructions_18` and consumed by the Care Instructions filter group on catalog pages. */
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
  /** Gender taxonomy: 'W' (women), 'M' (men), 'U' (unisex). */
  gender?: 'W' | 'M' | 'U' | '';
  /** All linked variants in the same title-group. */
  variants?: ProductVariant[];
  /** Product-level numeric stock. */
  stock?: number;
  /** OE availability status (`in_stock` | `out_of_stock` | `coming_soon` | `preorder` | ...). */
  statusIdentifier?: string;
}

export interface ProductVariant {
  id: string;
  colors: string[];
  sizes: string[];
  price: string;
  salePrice?: string;
  sku: string;
  image: string;
  images: string[];
  inStock: boolean;
  /** Numeric stock forwarded from OE when the tenant tracks quantities. */
  stock?: number;
  /** OE variant availability status. */
  statusIdentifier?: string;
}

interface ProductCardProps {
  product: Product;
  accentColor?: string;
  priority?: boolean;
}

function ProductCardInner({ product, accentColor: accentProp, priority = false }: ProductCardProps) {
  const CVL = useDict('interface_controls_view_', PRODUCT_CARD_VIEW_LABELS);
  const contextAccent = useCatalogAccent();
  const accentColor = accentProp ?? contextAccent ?? ACCENT_WOMEN;
  const { toggleItem, isWishlisted } = useWishlist();
  const { addItem: addToCart } = useCart();
  const { openQuickView, isOpen: isQuickViewOpen } = useQuickView();
  // CTA labels: `add_to_cart_cta` lives in the `product-card` set, while the post-click "Added" copy and "Quick View" labels live in the dedicated `product_card_actions` set on OE.
  const lAddToCart = useT('product-card_add_to_cart_cta', PRODUCT_CARD_LABELS.addToCart);
  const lAdded = useT('added', PRODUCT_CARD_LABELS.added);
  const lQuickView = useT('quick_view', CVL.quickView);
  const aAddToWishlist = useT('product-card-aria_add_to_wishlist', PRODUCT_CARD_ARIA_LABELS.addToWishlist);
  const mounted = useMounted();
  const wishlisted = mounted && isWishlisted(product.id);
  // JS-controlled hover state instead of Tailwind `group-hover:` for the image zoom + action-strip reveal.
  const [isHovered, setIsHovered] = useState(false);
  // Short cooldown that blocks the hover-scale from re-applying immediately after the QuickView modal closes.
  const [suppressHoverScale, setSuppressHoverScale] = useState(false);
  // Suppressed during render, not in an effect: an effect would show one scaled frame first.
  const [prevQuickViewOpen, setPrevQuickViewOpen] = useState(false);
  if (isQuickViewOpen !== prevQuickViewOpen) {
    setPrevQuickViewOpen(isQuickViewOpen);
    if (isQuickViewOpen) {
      setIsHovered(false);
      setSuppressHoverScale(true);
    }
  }
  useEffect(() => {
    if (isQuickViewOpen) return;
    // Modal closed: keep suppression active until the shopper actually moves the pointer (any direction).
    const onInteract = () => setSuppressHoverScale(false);
    document.addEventListener('pointermove', onInteract, { once: true });
    document.addEventListener('pointerdown', onInteract, { once: true });
    return () => {
      document.removeEventListener('pointermove', onInteract);
      document.removeEventListener('pointerdown', onInteract);
    };
  }, [isQuickViewOpen]);
  const showHoverScale = isHovered && !suppressHoverScale;
  const [selectedColor, setSelectedColor] = useState(0);
  const [selectedSize, setSelectedSize] = useState<string | null>(null);

  // Pick the variant whose color matches the current swatch, and — if a size is chosen — also matches that size.
  const activeVariant =
    product.variants?.find((v) => {
      const colorHex = product.colors?.[selectedColor];
      if (!colorHex) return false;
      const hasColor = v.colors.includes(colorHex);
      if (!hasColor) return false;
      return selectedSize ? v.sizes.includes(selectedSize) : true;
    }) ?? product.variants?.find((v) => v.colors.includes(product.colors?.[selectedColor] ?? ''));

  // Per-color image & stock — guard against out-of-bounds index.
  const safeColorIdx = selectedColor < (product.colors?.length ?? 0) ? selectedColor : 0;
  const variantImage = activeVariant?.image;
  const candidateImage = variantImage || product.colorImages?.[safeColorIdx] || product.image;
  const activeImage = candidateImage || '/icons/ui/bag-placeholder.svg';
  /** LQIP for whichever image ended up active. */
  const activeBlur = product.imageBlurs?.[activeImage];
  const activePrice = activeVariant?.price ?? product.price;
  // Prefer the picked variant's own sale price when it has one.
  const activeSalePrice = activeVariant?.salePrice ?? product.salePrice;
  const activeSku = activeVariant?.sku || product.id;
  // When OE returns no picture for the product we skip Next/Image entirely and render the placeholder directly.
  const hasRealImage = Boolean(candidateImage);
  const activeColorOOS = product.colorStock ? product.colorStock[safeColorIdx] === false : false;
  const outOfStock = product.inStock === false || activeColorOOS;
  // Load state is stored together with the src it belongs to, so switching colour variants invalidates it during render — no effect has to reset it.
  const [imgState, setImgState] = useState<{ src: string; loaded: boolean; error: boolean }>({
    src: activeImage,
    loaded: false,
    error: false,
  });
  const imgLoaded = imgState.src === activeImage && imgState.loaded;
  const imgError = imgState.src === activeImage && imgState.error;
  const imgRef = useRef<HTMLImageElement | null>(null);
  // `<img>` `onLoad` doesn't fire when the browser served the image straight from HTTP cache before React attached the event listener (very common after route navigation).
  const attachImg = useCallback(
    (el: HTMLImageElement | null) => {
      imgRef.current = el;
      if (el && el.complete && el.naturalWidth > 0) {
        setImgState({ src: activeImage, loaded: true, error: false });
      }
    },
    [activeImage],
  );
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
    // Parse the display-formatted price (e.g. "$35") into a number for cart math.
    const parsePrice = (s?: string) => parseFloat(String(s ?? '').replace(/[^\d.]/g, '')) || 0;
    // Prefer variant.salePrice → variant.price → family salePrice → family price so the cart stores the SAME number the price block above shows.
    const priceNumber = parsePrice(activeSalePrice ?? activePrice);
    const originalPriceNumber = activeSalePrice
      ? parsePrice(activeVariant?.salePrice ? activeVariant.price : product.price)
      : undefined;
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
    // Per-colour thumbnail: prefer the linked variant's image, then the parallel `colorImages` array, then the current active image as a last resort.
    const colorImages = product.colors.map(
      (c, i) => product.variants?.find((v) => v.colors.includes(c))?.image || product.colorImages?.[i] || activeImage,
    );
    toggleItem({
      id: product.id,
      name: product.name,
      brand: product.brand ?? PRODUCT_CARD_DEFAULTS.defaultBrand,
      price: product.price,
      salePrice: product.salePrice,
      image: activeImage,
      colors: product.colors,
      colorImages,
      colorStock: product.colorStock,
      sizes: product.sizes ?? [...PRODUCT_CARD_DEFAULTS.clothingSizes].slice(0, 5),
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

  // Carry the shopper's picked colour/size into the PDP URL so it opens on the same variant they were previewing on the card.
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
      className="group relative flex cursor-pointer flex-col bg-white"
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
    >
      {/* Image Container */}
      <div
        suppressHydrationWarning
        className={`relative aspect-3/4 overflow-hidden bg-[#f2f1ef] ${
          // With an LQIP there is already something to look at, so the grey pulse would only fight the blur-up.
          hasRealImage && !imgLoaded && !imgError && !activeBlur ? 'animate-pulse' : ''
        }`}
      >
        {imgError || !hasRealImage ? (
          <div
            className={`flex size-full items-center justify-center bg-[#f2f1ef] ${suppressHoverScale ? 'transition-none' : 'transition-transform duration-500'} ${showHoverScale ? 'scale-105' : ''} ${outOfStock ? 'opacity-60 grayscale' : ''}`}
          >
            <Image src="/icons/ui/bag-placeholder.svg" alt="" width={48} height={48} unoptimized />
          </div>
        ) : (
          <div
            className={`absolute inset-0 transition-opacity duration-500 ${
              // Without an LQIP the cell stays blank until `onLoad`; with one the blur itself is the placeholder, so it must be visible from paint.
              imgLoaded || activeBlur ? 'opacity-100' : 'opacity-0'
            }`}
          >
            <CmsImage
              ref={attachImg}
              src={activeImage}
              blur={activeBlur}
              alt={product.brand ? `${product.name} by ${product.brand}` : product.name}
              fill
              sizes="(max-width: 640px) 50vw, (max-width: 1024px) 33vw, 25vw"
              className={`object-cover object-top ${suppressHoverScale ? 'transition-none' : 'transition-transform duration-500'} ${showHoverScale ? 'scale-105' : ''} ${outOfStock ? 'opacity-60 grayscale' : ''}`}
              onLoad={() => setImgState({ src: activeImage, loaded: true, error: false })}
              onError={() => setImgState({ src: activeImage, loaded: false, error: true })}
              priority={priority}
            />
          </div>
        )}

        {/* Out of Stock overlay */}
        {outOfStock && (
          <div className="pointer-events-none absolute inset-0 flex items-end justify-center pb-4">
            <span className="bg-black/70 px-3 py-1.5 text-xs font-semibold tracking-[0.15em] text-white uppercase">
              {CVL.outOfStock}
            </span>
          </div>
        )}

        {/* Label / Badge */}
        {(product.label || product.badge) && (
          <div className="absolute top-3 left-3">
            <span
              className={`px-2 py-1 text-xs font-medium tracking-wider text-white uppercase ${
                product.label === 'SALE' ? 'bg-(--sale)' : 'bg-black'
              }`}
            >
              {product.label || product.badge}
            </span>
          </div>
        )}

        {/* Wishlist Button */}
        <button
          onClick={handleWishlist}
          className="absolute top-3 right-3 flex size-8 items-center justify-center bg-white/90 transition-all duration-200 hover:bg-white"
          aria-label={aAddToWishlist}
        >
          {/* `style` rather than the `fill`/`stroke` attributes: the accent is
              a `var()` reference to the CMS palette, and custom properties are
              only reliably resolved in a CSS declaration — a presentation
              attribute holding `var()` is not honoured everywhere. */}
          <Heart
            size={16}
            className="transition-colors duration-200"
            style={{ fill: wishlisted ? accentColor : 'none', stroke: wishlisted ? accentColor : '#000' }}
          />
        </button>

        {/* Quick View Overlay */}
        {/* NOTE: Do not use Tailwind `translate-y-full` here. Tailwind 4 compiles
            it to the CSS `translate` property, which — after a hover→QV-open→close
            cycle on a card — leaves a stale cached layout box on the sibling image
            wrapper, shifting it ~64px up and revealing the beige card background at
            the bottom of the image. Animate opacity + pointer-events only. */}
        {!outOfStock && (
          <div
            className={`absolute inset-x-0 bottom-0 z-10 flex flex-col gap-2 p-4 transition-opacity duration-300 ${
              isHovered ? 'pointer-events-auto opacity-100' : 'pointer-events-none opacity-0'
            }`}
          >
            {/* Add to Cart — hidden when product has multiple colors or sizes */}
            {product.colors.length <= 1 && (!product.sizes || product.sizes.length <= 1) && (
              <button
                onClick={handleAddToCart}
                className={`flex w-full items-center justify-center gap-2 py-2 text-xs tracking-widest text-white uppercase transition-colors duration-200 focus-visible:outline-none ${
                  addedToCart ? 'bg-primary-men' : 'bg-black hover:bg-primary-women'
                }`}
              >
                <ShoppingBag size={14} />
                {addedToCart ? lAdded : lAddToCart}
              </button>
            )}
            <button
              onClick={handleQuickView}
              className="flex w-full items-center justify-center gap-2 bg-white/95 py-2 text-xs font-medium tracking-widest text-black uppercase transition-all duration-200 hover:bg-white"
            >
              <Eye size={14} />
              {lQuickView}
            </button>
          </div>
        )}
      </div>

      {/* Product Info — flexible height so the size row can render without
          clipping when a product has multiple linked variants. */}
      <div className="flex min-h-24 flex-col overflow-hidden p-4">
        {/* Title with tooltip */}
        <div className="relative mb-1">
          <h3
            ref={titleRef}
            className="truncate text-sm font-normal text-black"
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
          {showTooltip &&
            typeof document !== 'undefined' &&
            createPortal(
              <div
                className="pointer-events-none fixed z-99999 max-w-65 -translate-y-full bg-black px-3 py-2 text-xs leading-snug tracking-wide whitespace-normal text-white shadow-lg"
                style={{ left: tooltipPos.x, top: tooltipPos.y - 8 }}
              >
                {product.name}
                <span className="absolute top-full left-3 size-0 border-x-[5px] border-t-[5px] border-x-transparent border-t-black" />
              </div>,
              document.body,
            )}
        </div>

        {/* Price — variant salePrice takes precedence over family so the
            strike-through pair is consistent for the currently picked
            variant (matches PDP behaviour). */}
        <div className="mb-2 flex items-center gap-2">
          {activeSalePrice ? (
            <>
              <span className="text-sm font-medium text-primary-men">{stripTrailingZeros(activeSalePrice)}</span>
              <span className="text-xs text-gray-400 line-through">
                {stripTrailingZeros(activeVariant?.salePrice ? activeVariant.price : product.price)}
              </span>
            </>
          ) : (
            <span className="text-sm font-medium text-black">{stripTrailingZeros(activePrice)}</span>
          )}
        </div>

        {/* Color Swatches */}
        {product.colors.length > 0 && (
          <div className="mt-auto flex items-center gap-2">
            {product.colors.slice(0, 4).map((color, idx) => {
              const isOOS =
                product.inStock === false || (product.colorStock ? product.colorStock[idx] === false : false);
              const isActive = selectedColor === idx;
              return (
                <ColorSwatchButton
                  key={`${color}-${idx}`}
                  color={color}
                  active={isActive}
                  outOfStock={isOOS}
                  label={`${colorName(color)}${isOOS ? CVL.colorSwatchOutOfStockSuffix : ''}`}
                  onClick={(e) => {
                    e.preventDefault();
                    e.stopPropagation();
                    if (!isOOS) {
                      setSelectedColor(idx);
                      setSelectedSize(null);
                    }
                  }}
                />
              );
            })}
            {product.colors.length > 4 && (
              <span className="ml-1 text-xs text-gray-500">+{product.colors.length - 4}</span>
            )}
          </div>
        )}

        {/* Size chips — only for products with linked variants; picking a
            size flips the card to the matching variant (image / price / SKU). */}
        {product.variants && product.variants.length > 1 && product.sizes && product.sizes.length > 0 && (
          <div className="mt-2 flex flex-wrap items-center gap-1">
            {product.sizes.slice(0, 6).map((size, idx) => {
              const active = selectedSize === size;
              const currentColorHex = product.colors?.[selectedColor];
              const isAvailable = product.variants?.some(
                (v) =>
                  v.sizes.includes(size) &&
                  (currentColorHex ? v.colors.includes(currentColorHex) : true) &&
                  v.inStock !== false,
              );
              return (
                <button
                  key={`${size}-${idx}`}
                  onClick={(e) => {
                    e.preventDefault();
                    e.stopPropagation();
                    if (!isAvailable) return;
                    setSelectedSize(active ? null : size);
                  }}
                  disabled={!isAvailable}
                  className={`min-w-7 border px-1.5 py-0.5 text-[10px] leading-none tracking-wide uppercase transition-colors ${
                    active
                      ? 'border-black bg-black text-white'
                      : isAvailable
                        ? 'border-gray-300 bg-white text-gray-700 hover:border-black'
                        : 'cursor-not-allowed border-gray-100 bg-gray-50 text-gray-300 line-through'
                  }`}
                >
                  {size}
                </button>
              );
            })}
            {product.sizes.length > 6 && (
              <span className="ml-1 text-[10px] text-gray-500">+{product.sizes.length - 6}</span>
            )}
          </div>
        )}
      </div>
    </Link>
  );
}

export const ProductCard = React.memo(ProductCardInner);
