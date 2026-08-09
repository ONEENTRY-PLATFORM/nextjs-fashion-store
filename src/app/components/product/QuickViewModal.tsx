'use client';
import { ChevronDown, Heart, X } from 'lucide-react';
import Image from 'next/image';
import { useEffect, useState } from 'react';

import { ACCENT_WOMEN, BUY_GREEN, BUY_GREEN_HOVER, SALE_COLOR } from '@/app/constants/colors';
import { useAuth } from '@/app/context/AuthContext';
import { useCart } from '@/app/context/CartContext';
import { useQuickView } from '@/app/context/QuickViewContext';
import { useWishlist } from '@/app/context/WishlistContext';
import { SIZE_DROPDOWN_LABELS } from '@/app/data/commonLabels';
import { PRODUCT_ACTION_LABELS, PRODUCT_REVIEWS_LABELS, QUICK_VIEW_LABELS } from '@/app/data/productPageLabels';
import { useFocusTrap } from '@/app/hooks/useFocusTrap';
import { StarRating } from '@/app/pages/product/StarRating';
import { WriteReviewModal } from '@/app/pages/product/WriteReviewModal';
import { canReviewProduct } from '@/app/utils/review-eligibility';
import { useRouter } from '@/lib/i18n/navigation';
import { getProductReviewSummary } from '@/lib/oneentry/catalog/reviews-actions';
import { useDict } from '@/lib/oneentry/labels/DictContext';

import { QuickViewSizeGuide } from './QuickViewSizeGuide';

export function QuickViewModal() {
  const PR = useDict('customer_reviews_', PRODUCT_REVIEWS_LABELS);
  const PA = useDict('product_card_actions_', PRODUCT_ACTION_LABELS);
  const L = useDict('quick_view_', QUICK_VIEW_LABELS);
  const { isOpen, product, initialColorIndex, closeQuickView } = useQuickView();
  const { addItem, openMiniCart } = useCart();
  const { toggleItem, isWishlisted } = useWishlist();
  const { isLoggedIn, openLoginModal, user } = useAuth();
  const router = useRouter();
  const [selectedImage, setSelectedImage] = useState(0);
  const [selectedColor, setSelectedColor] = useState<number | null>(null);
  const [selectedSize, setSelectedSize] = useState<string | null>(null);
  const [expandedSection, setExpandedSection] = useState<string | null>(null);
  const [showSizeGuide, setShowSizeGuide] = useState(false);
  const [errors, setErrors] = useState<{ color?: boolean; size?: boolean }>({});
  const [buyBtnHovered, setBuyBtnHovered] = useState(false);
  const [reviewSummary, setReviewSummary] = useState<{ count: number; avg: number | null } | null>(null);
  const [showWriteReview, setShowWriteReview] = useState(false);
  const [showPurchaseNotice, setShowPurchaseNotice] = useState(false);
  const trapRef = useFocusTrap(isOpen, closeQuickView);

  useEffect(() => {
    if (!showSizeGuide) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setShowSizeGuide(false);
    };
    document.addEventListener('keydown', onKey);
    return () => document.removeEventListener('keydown', onKey);
  }, [showSizeGuide]);

  // Reset the picker when the modal opens (or swaps product). Done during
  // render via React's "adjust state when a prop changes" pattern so the
  // first painted frame already shows the new product's defaults; an effect
  // would flash the previous product's selection for one frame and is the
  // cascading-render pattern the lint rule rejects.
  const openKey = isOpen ? `${product?.id ?? ''}:${initialColorIndex ?? ''}` : null;
  // Starts at `null` ("closed"), so a modal that is already open on the
  // first render still gets its defaults applied.
  const [prevOpenKey, setPrevOpenKey] = useState<string | null>(null);
  if (openKey !== prevOpenKey) {
    setPrevOpenKey(openKey);
    if (openKey !== null) {
      setSelectedColor(initialColorIndex ?? null);
      const productSizes = product?.sizes;
      setSelectedSize(productSizes && productSizes.length === 1 ? productSizes[0] : null);
      setErrors({});
      setShowWriteReview(false);
      setShowPurchaseNotice(false);
      setReviewSummary(null);
    }
  }

  useEffect(() => {
    if (!isOpen) return;
    document.body.style.overflow = 'hidden';
    return () => {
      document.body.style.overflow = '';
    };
  }, [isOpen]);

  // Fetch the real review summary (count + avg) when the modal opens for a
  // new product. Reset first so a stale summary from the previous product
  // doesn't briefly flash. `product.id` is a string on the UI Product shape;
  // OE reviews key on the numeric product id.
  useEffect(() => {
    if (!isOpen || !product) return;
    const productId = Number(product.id);
    if (!Number.isFinite(productId) || productId <= 0) return;
    let cancelled = false;
    getProductReviewSummary(productId)
      .then((s) => {
        if (!cancelled) setReviewSummary(s);
      })
      .catch(() => {
        if (!cancelled) setReviewSummary({ count: 0, avg: null });
      });
    return () => {
      cancelled = true;
    };
  }, [isOpen, product]);

  if (!isOpen || !product) return null;

  // Find the linked variant matching the current color + (optional) size. When
  // no exact match is available we fall back to a colors-only match so the
  // shopper always sees the picked colour reflected in image + price.
  const activeVariant =
    product.variants?.find((v) => {
      const colorHex = selectedColor !== null ? product.colors[selectedColor] : undefined;
      if (!colorHex) return false;
      const hasColor = v.colors.includes(colorHex);
      if (!hasColor) return false;
      return selectedSize ? v.sizes.includes(selectedSize) : true;
    }) ??
    (selectedColor !== null
      ? product.variants?.find((v) => v.colors.includes(product.colors[selectedColor]))
      : undefined);

  const activePrice = activeVariant?.price ?? product.price;
  // Prefer the variant's own sale — otherwise the strike-through pair
  // would mix variant.price ("was") with family salePrice ("now") for a
  // completely different variant. Adapter only forwards
  // `variant.salePrice` when `variant.salePrice < variant.price`, so
  // falling through to family salePrice is a display-only trade-off.
  const activeSalePrice = activeVariant?.salePrice ?? product.salePrice;
  // Prefer the variant's own gallery so the picked colour matches the images.
  const productImages = activeVariant?.images?.length
    ? activeVariant.images
    : product.galleryImages?.length
      ? product.galleryImages
      : [product.image];

  // Badges are opt-in: only render when the underlying data actually supports
  // them. `label` comes from OE's Label attribute (adapter forwards it as-is);
  // `LOW IN STOCK` shows only when we have a numeric stock < 5 for the picked
  // variant (or the product itself). Tenants that track availability via
  // `statusIdentifier` leave `stock` undefined and get no low-stock badge —
  // matching PDP behaviour where we don't invent a threshold from thin air.
  const activeStock = activeVariant?.stock ?? product.stock;
  const showLowStock = typeof activeStock === 'number' && activeStock > 0 && activeStock < 5;
  const showLabelBadge = !!product.label;

  // Resolve the OE availability status for the row above the price. Prefer
  // the active variant's own status (colour-specific `preorder` etc.) and
  // fall back to the product-level flag. Mirrors PDP's stock-copy tree:
  //   out_of_stock → "Out of Stock"  (grey)
  //   coming_soon  → "Coming soon"   (grey)
  //   preorder     → "Pre-order"     (amber)
  //   else         → "In Stock"      (green)
  const productIsOOS = product.inStock === false;
  const stockStatus = activeVariant?.statusIdentifier ?? product.statusIdentifier;
  const isComingSoon = !productIsOOS && stockStatus === 'coming_soon';
  const isPreOrder = !productIsOOS && stockStatus === 'preorder';
  const stockLabel = productIsOOS
    ? PA.outOfStock
    : isComingSoon
      ? PA.comingSoon
      : isPreOrder
        ? PA.preOrder
        : PA.inStock;
  const stockClassName =
    productIsOOS || isComingSoon ? 'text-[#8B8B8B]' : isPreOrder ? 'text-[#B8860B]' : 'text-[#2E8B57]';

  const wishlisted = isWishlisted(product.id);

  const handleWishlist = () => {
    // Per-colour thumbnail: prefer the variant image, then the parallel
    // colorImages array, then the parent image.
    const colorImages = product.colors.map(
      (c, i) => product.variants?.find((v) => v.colors.includes(c))?.image || product.colorImages?.[i] || product.image,
    );
    toggleItem({
      id: product.id,
      name: product.name,
      brand: product.brand ?? L.defaultBrand,
      price: product.price,
      salePrice: product.salePrice,
      image: product.colorImages?.[selectedColor ?? 0] ?? product.image,
      colors: product.colors,
      colorImages,
      colorStock: product.colorStock,
      sizes: product.sizes ?? [...SIZE_DROPDOWN_LABELS.clothingSizes].slice(0, 5),
      badge: product.badge ?? product.label,
      inStock: product.inStock !== false,
      selectedColor: selectedColor !== null ? product.colors[selectedColor] : undefined,
      selectedSize: selectedSize ?? undefined,
    });
  };

  const handleViewFullDetails = () => {
    closeQuickView();
    // Preserve both colour and size on the PDP URL so the shopper lands
    // exactly on the variant they were previewing here.
    const params = new URLSearchParams();
    const hex = selectedColor !== null ? product.colors[selectedColor] : undefined;
    if (hex) params.set('color', hex);
    if (selectedSize) params.set('size', selectedSize);
    const qs = params.toString();
    router.push(`/product/${product.id}${qs ? `?${qs}` : ''}`);
  };

  const toggleSection = (section: string) => {
    setExpandedSection(expandedSection === section ? null : section);
  };

  const sizes = product.sizes || [...SIZE_DROPDOWN_LABELS.clothingSizes];

  // "N reviews" — jump to the existing reviews block on the PDP. No auth
  // needed to read reviews, so we always navigate.
  const goToReviews = () => {
    closeQuickView();
    router.push(`/product/${product.id}#reviews`);
  };

  // "Be the first to review" — writing is gated twice:
  //   1. Session required — unauthed shoppers get the login modal (which
  //      also offers register).
  //   2. Delivered order for THIS product — reviews should only come from
  //      real customers, so signed-in shoppers who never received the item
  //      see an inline notice under the rating row instead of the write
  //      modal.
  const startWriteReview = () => {
    if (!isLoggedIn) {
      closeQuickView();
      openLoginModal();
      return;
    }
    const productId = Number(product.id);
    if (!canReviewProduct(user?.oeOrders, productId)) {
      setShowPurchaseNotice(true);
      return;
    }
    setShowPurchaseNotice(false);
    setShowWriteReview(true);
  };

  // Rebuilt from the flat `sectionNTitle` / `sectionNContent` keys so every
  // string routes through the dictionary.
  const sections = [1, 2, 3, 4].map((n) => ({
    title: L[`section${n}Title` as keyof typeof L] as string,
    content: L[`section${n}Content` as keyof typeof L] as string,
  }));

  return (
    <div
      className="fixed inset-0 z-200 flex items-center justify-center"
      style={
        {
          '--sale': SALE_COLOR,
          '--accent': ACCENT_WOMEN,
          '--buy': BUY_GREEN,
          '--buy-hover': BUY_GREEN_HOVER,
        } as React.CSSProperties
      }
    >
      {/* Backdrop */}
      <div className="absolute inset-0 bg-black/60" onClick={closeQuickView} />

      {showSizeGuide && <QuickViewSizeGuide onClose={() => setShowSizeGuide(false)} />}

      {/* Write-review modal (stacked on top of QuickView). Only rendered
          for logged-in shoppers — unauthed ones get the login modal via
          `startWriteReview` instead. On close we refetch the summary so a
          just-submitted review flips the row from "Be the first" to a real
          count on the next render. */}
      {showWriteReview && (
        <WriteReviewModal
          onClose={() => {
            setShowWriteReview(false);
            const productId = Number(product.id);
            if (Number.isFinite(productId) && productId > 0) {
              getProductReviewSummary(productId)
                .then((s) => setReviewSummary(s))
                .catch(() => {
                  /* keep existing summary on failure */
                });
            }
          }}
          productId={Number(product.id)}
        />
      )}

      {/* Modal Container */}
      <div
        ref={trapRef}
        role="dialog"
        aria-modal="true"
        aria-labelledby="quick-view-title"
        className="relative mx-4 flex max-h-[90vh] w-full max-w-6xl flex-col overflow-hidden bg-white md:flex-row"
      >
        {/* Close Button */}
        <button
          onClick={closeQuickView}
          className="absolute top-4 right-4 z-10 flex size-10 items-center justify-center bg-white/90 transition-colors hover:bg-white"
          aria-label={L.closeLabel}
        >
          <X size={20} />
        </button>

        {/* Left Column - Images */}
        <div className="flex w-full flex-col bg-gray-50 md:w-1/2">
          {/* Main Image */}
          <div className="relative flex flex-1 items-center justify-center overflow-hidden p-8">
            <Image
              src={productImages[selectedImage] ?? product.image}
              alt={product.name}
              fill
              sizes="(max-width: 768px) 100vw, 50vw"
              className="object-contain"
            />
          </div>

          {/* Thumbnail Gallery */}
          <div className="flex gap-2 border-t border-gray-200 bg-white p-4">
            {productImages.map((img, idx) => (
              <button
                key={idx}
                onClick={() => setSelectedImage(idx)}
                className={`relative aspect-3/4 flex-1 overflow-hidden transition-all ${
                  selectedImage === idx ? 'ring-2 ring-black' : 'opacity-60 hover:opacity-100'
                }`}
              >
                <Image
                  src={img}
                  alt={`${L.thumbnailAltPrefix} ${idx + 1}`}
                  fill
                  sizes="15vw"
                  className="object-cover"
                />
              </button>
            ))}
          </div>
        </div>

        {/* Right Column - Details */}
        <div className="flex w-full flex-col overflow-y-auto md:w-1/2">
          <div className="flex-1 p-8">
            {/* Brand */}
            <div className="mb-2 text-xs tracking-widest text-gray-500 uppercase">
              {product.brand || L.defaultBrand}
            </div>

            {/* Product Name */}
            <h2 id="quick-view-title" className="mb-3 text-2xl font-semibold">
              {product.name}
            </h2>

            {/* Rating row — mirrors the PDP sub-title style. Always shows
                the 5-star strip (empty when count === 0), the "N reviews"
                link, a thin divider and the stock status. Zero-review case
                is auth-gated: guests get the login modal (which offers
                register), authed shoppers get the write-review modal. */}
            <div className="mb-4 flex h-5 items-center gap-3">
              {reviewSummary === null ? (
                <span className="inline-block h-3 w-40 animate-pulse rounded-sm bg-gray-100" aria-hidden="true" />
              ) : (
                <>
                  <StarRating rating={reviewSummary.avg ?? 0} size={14} />
                  <button
                    onClick={reviewSummary.count === 0 ? startWriteReview : goToReviews}
                    className="text-xs text-gray-500 underline transition-colors hover:text-black"
                  >
                    {reviewSummary.count} {L.reviewsSuffix}
                  </button>
                  <span className="text-xs text-gray-300">|</span>
                  <span className={`text-xs font-medium ${stockClassName}`}>{stockLabel}</span>
                </>
              )}
            </div>

            {/* Purchase-required notice — shown when a signed-in shopper
                clicks the review CTA on a product they haven't received
                (no delivered / done order in `oeOrders`). Auto-dismisses
                with the modal close. */}
            {showPurchaseNotice && (
              <p role="status" className="mb-4 text-xs leading-relaxed text-[#B8860B]">
                {PR.purchaseRequired}
              </p>
            )}

            {/* Price — variant salePrice takes precedence over family so
                the strike-through pair is consistent for the currently
                picked variant (matches ProductCard / PDP). Runtime guard
                on numeric `sale < original` so a family fallback with a
                broken adapter contract (or a rule that priced the family
                sale at or above the variant "was") can never render a
                "-0%" strike pair. Prices ride as formatted strings
                (`"$65.00"`) on the UI `Product` shape, so parse the
                leading number before comparing — a string compare here
                is lexicographic and `"$100.00" < "$90.00"` is true. */}
            <div className="mb-4 flex items-center gap-3">
              {(() => {
                const originalPriceRef = activeVariant?.salePrice ? activeVariant.price : product.price;
                const parseAmount = (s: string | undefined): number => parseFloat(s?.match(/[\d.]+/)?.[0] ?? '0') || 0;
                const showSale =
                  activeSalePrice !== undefined && parseAmount(activeSalePrice) < parseAmount(originalPriceRef);
                return showSale ? (
                  <>
                    <span className="text-2xl font-semibold text-primary-men">{activeSalePrice}</span>
                    <span className="text-lg text-gray-400 line-through">{originalPriceRef}</span>
                  </>
                ) : (
                  <span className="text-2xl font-semibold">{activePrice}</span>
                );
              })()}
            </div>

            {/* Badges */}
            {(showLabelBadge || showLowStock) && (
              <div className="mb-6 flex gap-2">
                {showLabelBadge && (
                  <span className="bg-black px-3 py-1 text-xs tracking-wider text-white uppercase">
                    {product.label}
                  </span>
                )}
                {showLowStock && (
                  <span className="bg-primary-men px-3 py-1 text-xs tracking-wider text-white uppercase">
                    {L.badgeLowStock}
                  </span>
                )}
              </div>
            )}

            {/* Color Selector */}
            <div className="mb-6">
              <div className="mb-3 flex items-center gap-2 text-sm font-medium">
                {L.colorLabel}
                {selectedColor !== null ? (
                  <span className="font-normal text-gray-600">{L.colorSelected}</span>
                ) : (
                  <span className={`font-normal ${errors.color ? 'text-(--sale)' : 'text-gray-400'}`}>
                    {L.colorNotSelected}
                  </span>
                )}
              </div>
              <div
                className={`flex items-center gap-3 p-2 outline transition-colors ${
                  errors.color ? 'outline-(--sale)' : 'outline-transparent'
                }`}
              >
                {product.colors.map((color, idx) => {
                  const isColorOOS = product.colorStock?.[idx] === false;
                  return (
                    <button
                      key={color}
                      onClick={() => {
                        if (!isColorOOS) {
                          setSelectedColor(idx);
                          setSelectedSize(sizes.length === 1 ? sizes[0] : null);
                          setSelectedImage(0);
                          setErrors((e) => ({ ...e, color: false }));
                        }
                      }}
                      disabled={isColorOOS}
                      aria-disabled={isColorOOS}
                      className={`relative size-8 border border-gray-300 transition-all ${
                        isColorOOS
                          ? 'cursor-not-allowed opacity-40'
                          : selectedColor === idx
                            ? 'ring-2 ring-black ring-offset-2'
                            : 'hover:scale-110'
                      }`}
                      style={{ backgroundColor: color }}
                      aria-label={`${L.colorAriaPrefix} ${idx + 1}${isColorOOS ? ` ${L.colorOutOfStockAria}` : ''}`}
                      // Specs used to select these through `aria-label*="Color"`,
                      // which works only while `colorAriaPrefix` stays the
                      // English "Color" — an OE label override would silently
                      // empty the locator instead of failing.
                      data-testid="color-swatch"
                    >
                      {isColorOOS && (
                        <span className="pointer-events-none absolute inset-0 bg-[linear-gradient(to_bottom_right,transparent_calc(50%-0.5px),rgba(0,0,0,0.5)_calc(50%-0.5px),rgba(0,0,0,0.5)_calc(50%+0.5px),transparent_calc(50%+0.5px))]" />
                      )}
                    </button>
                  );
                })}
              </div>
              {errors.color && <p className="mt-1.5 text-xs text-(--sale)">{L.colorError}</p>}
            </div>

            {/* Size Selector */}
            <div className="mb-6">
              <div className="mb-3 flex items-center justify-between">
                <div className="flex items-center gap-2 text-sm font-medium">
                  {L.sizeLabel}
                  {errors.size && <span className="text-xs font-normal text-(--sale)">{L.sizeError}</span>}
                </div>
                <button
                  onClick={() => setShowSizeGuide(true)}
                  className="text-xs text-gray-600 underline hover:text-black"
                >
                  {L.sizeGuideCta}
                </button>
              </div>
              <div
                className={`grid grid-cols-3 gap-2 p-2 outline transition-colors ${
                  errors.size ? 'outline-(--sale)' : 'outline-transparent'
                }`}
              >
                {sizes.map((size) => {
                  const currentColorHex = selectedColor !== null ? product.colors[selectedColor] : undefined;
                  const variantForSize = product.variants?.some(
                    (v) =>
                      v.sizes.includes(size) &&
                      (currentColorHex ? v.colors.includes(currentColorHex) : true) &&
                      v.inStock !== false,
                  );
                  // When the product ships variant metadata, drive per-size
                  // availability off it. Otherwise fall back to the global
                  // stock flag so legacy products still render sensibly.
                  const isSizeOOS =
                    product.variants && product.variants.length > 0 ? !variantForSize : product.inStock === false;
                  return (
                    <button
                      key={size}
                      onClick={() => {
                        if (!isSizeOOS) {
                          setSelectedSize(size);
                          setErrors((e) => ({ ...e, size: false }));
                        }
                      }}
                      disabled={isSizeOOS}
                      aria-disabled={isSizeOOS}
                      data-testid="quickview-size-chip"
                      aria-pressed={selectedSize === size}
                      className={`py-3 text-sm font-medium transition-all ${
                        isSizeOOS
                          ? 'cursor-not-allowed bg-gray-100 text-gray-400 line-through'
                          : selectedSize === size
                            ? 'bg-black text-white'
                            : 'border border-gray-300 bg-white hover:border-black'
                      }`}
                    >
                      {size}
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Action Buttons */}
            <div className="mb-6 flex flex-col gap-3">
              <button
                onClick={handleViewFullDetails}
                className="w-full border-2 border-black bg-white py-4 text-sm font-medium tracking-wider text-black uppercase transition-colors hover:bg-black hover:text-white"
              >
                {L.viewFullDetails}
              </button>
              <div className="flex gap-3">
                <button
                  onClick={() => {
                    const hasColors = product.colors && product.colors.length > 0;
                    const colorErr = Boolean(hasColors) && selectedColor === null;
                    // Compared inline (not via a `sizeErr` const) so TS narrows
                    // `selectedSize` to a string for the `addItem` payload.
                    if (colorErr || selectedSize === null) {
                      setErrors({ color: colorErr, size: selectedSize === null });
                      return;
                    }
                    // Use the variant-aware sale price so the cart stores
                    // the same number the price block above shows.
                    // `originalPrice` is only set when there's a
                    // strike-through UX pair — variant's own strike takes
                    // precedence over the family strike.
                    const cartPrice = parseFloat((activeSalePrice ?? activePrice).match(/[\d.]+/)?.[0] ?? '0') || 0;
                    const originalPriceSource = activeVariant?.salePrice ? activeVariant.price : product.price;
                    const originalPriceRaw = activeSalePrice
                      ? parseFloat(originalPriceSource.match(/[\d.]+/)?.[0] ?? '0') || 0
                      : undefined;
                    const stockLimit = activeVariant?.stock ?? product.stock;
                    addItem({
                      id: activeVariant?.id ?? `${product.id}-quick`,
                      name: product.name,
                      brand: product.brand ?? '',
                      sku: activeVariant?.sku || product.id,
                      color: selectedColor !== null ? (product.colors?.[selectedColor] ?? '') : '',
                      size: selectedSize,
                      quantity: 1,
                      price: cartPrice,
                      ...(originalPriceRaw !== undefined && { originalPrice: originalPriceRaw }),
                      image: productImages[selectedImage] ?? product.image,
                      ...(stockLimit !== undefined && { stockLimit }),
                    });
                    closeQuickView();
                    // Used to jump straight to /checkout/delivery, but with
                    // guest checkout disabled that path is blocked by a
                    // sign-in modal. Instead just show the mini cart so the
                    // shopper can keep browsing or proceed when ready.
                    openMiniCart();
                  }}
                  className={`flex-1 py-4 text-sm font-medium tracking-wider text-white uppercase transition-colors ${
                    buyBtnHovered ? 'bg-(--buy-hover)' : 'bg-(--buy)'
                  }`}
                  onMouseEnter={() => setBuyBtnHovered(true)}
                  onMouseLeave={() => setBuyBtnHovered(false)}
                >
                  {PA.addToCart}
                </button>
                <button
                  onClick={handleWishlist}
                  className={`flex w-14 items-center justify-center border-2 transition-colors ${
                    wishlisted ? 'border-accent bg-[#fff5f5]' : 'border-black bg-white'
                  }`}
                  aria-label={wishlisted ? L.wishlistRemove : L.wishlistAdd}
                >
                  <Heart
                    size={18}
                    fill={wishlisted ? ACCENT_WOMEN : 'none'}
                    stroke={wishlisted ? ACCENT_WOMEN : '#000'}
                  />
                </button>
              </div>
            </div>

            {/* Expandable Sections */}
            <div className="border-t border-gray-200">
              {sections.map((section) => (
                <div key={section.title} className="border-b border-gray-200">
                  <button
                    onClick={() => toggleSection(section.title)}
                    className="flex w-full items-center justify-between py-4 text-left transition-colors hover:bg-gray-50"
                  >
                    <span className="text-sm font-medium">{section.title}</span>
                    <ChevronDown
                      size={18}
                      className={`transition-transform duration-200 ${
                        expandedSection === section.title ? 'rotate-180' : ''
                      }`}
                    />
                  </button>
                  {expandedSection === section.title && (
                    <div className="px-1 pb-4 text-sm leading-relaxed text-gray-600">{section.content}</div>
                  )}
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
