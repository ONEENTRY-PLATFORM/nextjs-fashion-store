'use client'
import { useState, useEffect } from 'react';
import { ACCENT_WOMEN, SALE_COLOR, BUY_GREEN, BUY_GREEN_HOVER } from '../constants/colors';
import Image from 'next/image';
import { X, ChevronDown, Heart } from 'lucide-react';
import { StarRating } from '../pages/product/StarRating';
import { useQuickView } from '../context/QuickViewContext';
import { useCart } from '../context/CartContext';
import { useWishlist } from '../context/WishlistContext';
import { useAuth } from '../context/AuthContext';
import { useRouter } from 'next/navigation';
import { useFocusTrap } from '../hooks/useFocusTrap';
import { QuickViewSizeGuide } from './QuickViewSizeGuide';
import { WriteReviewModal } from '../pages/product/WriteReviewModal';
import { QUICK_VIEW_LABELS as L, PRODUCT_ACTION_LABELS as PA, PRODUCT_REVIEWS_LABELS as PR } from '../data/productPageLabels';
import { SIZE_DROPDOWN_LABELS } from '../data/commonLabels';
import { getProductReviewSummary } from '../../lib/oneentry/catalog/reviews-actions';
import { canReviewProduct } from '../utils/review-eligibility';

export function QuickViewModal() {
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
    const onKey = (e: KeyboardEvent) => { if (e.key === 'Escape') setShowSizeGuide(false); };
    document.addEventListener('keydown', onKey);
    return () => document.removeEventListener('keydown', onKey);
  }, [showSizeGuide]);

  useEffect(() => {
    if (isOpen) {
      document.body.style.overflow = 'hidden';
      setSelectedColor(initialColorIndex ?? null);
      const productSizes = product?.sizes;
      setSelectedSize(productSizes && productSizes.length === 1 ? productSizes[0] : null);
      setErrors({});
      setShowWriteReview(false);
      setShowPurchaseNotice(false);
    } else {
      document.body.style.overflow = '';
    }
    return () => {
      document.body.style.overflow = '';
    };
  }, [isOpen, initialColorIndex, product]);

  // Fetch the real review summary (count + avg) when the modal opens for a
  // new product. Reset first so a stale summary from the previous product
  // doesn't briefly flash. `product.id` is a string on the UI Product shape;
  // OE reviews key on the numeric product id.
  useEffect(() => {
    if (!isOpen || !product) { setReviewSummary(null); return; }
    setReviewSummary(null);
    const productId = Number(product.id);
    if (!Number.isFinite(productId) || productId <= 0) return;
    let cancelled = false;
    getProductReviewSummary(productId).then((s) => {
      if (!cancelled) setReviewSummary(s);
    }).catch(() => {
      if (!cancelled) setReviewSummary({ count: 0, avg: null });
    });
    return () => { cancelled = true; };
  }, [isOpen, product]);

  if (!isOpen || !product) return null;

  // Find the linked variant matching the current color + (optional) size. When
  // no exact match is available we fall back to a colors-only match so the
  // shopper always sees the picked colour reflected in image + price.
  const activeVariant = product.variants?.find((v) => {
    const colorHex = selectedColor !== null ? product.colors[selectedColor] : undefined;
    if (!colorHex) return false;
    const hasColor = v.colors.includes(colorHex);
    if (!hasColor) return false;
    return selectedSize ? v.sizes.includes(selectedSize) : true;
  }) ?? (
    selectedColor !== null
      ? product.variants?.find((v) => v.colors.includes(product.colors[selectedColor]))
      : undefined
  );

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
  const stockClassName = productIsOOS || isComingSoon
    ? 'text-[#8B8B8B]'
    : isPreOrder
    ? 'text-[#B8860B]'
    : 'text-[#2E8B57]';

  const wishlisted = isWishlisted(product.id);

  const handleWishlist = () => {
    // Per-colour thumbnail: prefer the variant image, then the parallel
    // colorImages array, then the parent image.
    const colorImages = product.colors.map((c, i) =>
      product.variants?.find((v) => v.colors.includes(c))?.image
      || product.colorImages?.[i]
      || product.image,
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

  return (
    <div
      className="fixed inset-0 z-[200] flex items-center justify-center"
      style={{ '--sale': SALE_COLOR, '--accent': ACCENT_WOMEN, '--buy': BUY_GREEN, '--buy-hover': BUY_GREEN_HOVER } as React.CSSProperties}
    >
      {/* Backdrop */}
      <div
        className="absolute inset-0 bg-black/60"
        onClick={closeQuickView}
      />

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
                .catch(() => { /* keep existing summary on failure */ });
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
        className="relative bg-white w-full max-w-6xl mx-4 max-h-[90vh] overflow-hidden flex flex-col md:flex-row"
      >
        
        {/* Close Button */}
        <button
          onClick={closeQuickView}
          className="absolute top-4 right-4 z-10 w-10 h-10 flex items-center justify-center bg-white/90 hover:bg-white transition-colors"
          aria-label={L.closeLabel}
        >
          <X size={20} />
        </button>

        {/* Left Column - Images */}
        <div className="w-full md:w-1/2 bg-gray-50 flex flex-col">
          {/* Main Image */}
          <div className="flex-1 flex items-center justify-center p-8 overflow-hidden relative">
            <Image
              src={productImages[selectedImage] ?? product.image}
              alt={product.name}
              fill
              sizes="(max-width: 768px) 100vw, 50vw"
              className="object-contain"
            />
          </div>

          {/* Thumbnail Gallery */}
          <div className="flex gap-2 p-4 bg-white border-t border-gray-200">
            {productImages.map((img, idx) => (
              <button
                key={idx}
                onClick={() => setSelectedImage(idx)}
                className={`relative flex-1 aspect-[3/4] overflow-hidden transition-all ${
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
        <div className="w-full md:w-1/2 flex flex-col overflow-y-auto">
          <div className="p-8 flex-1">
            {/* Brand */}
            <div className="text-xs tracking-widest uppercase text-gray-500 mb-2">
              {product.brand || L.defaultBrand}
            </div>

            {/* Product Name */}
            <h2 id="quick-view-title" className="text-2xl font-semibold mb-3">
              {product.name}
            </h2>

            {/* Rating row — mirrors the PDP sub-title style. Always shows
                the 5-star strip (empty when count === 0), the "N reviews"
                link, a thin divider and the stock status. Zero-review case
                is auth-gated: guests get the login modal (which offers
                register), authed shoppers get the write-review modal. */}
            <div className="flex items-center gap-3 mb-4 h-5">
              {reviewSummary === null ? (
                <span className="inline-block w-40 h-3 bg-gray-100 animate-pulse rounded-sm" aria-hidden="true" />
              ) : (
                <>
                  <StarRating rating={reviewSummary.avg ?? 0} size={14} />
                  <button
                    onClick={reviewSummary.count === 0 ? startWriteReview : goToReviews}
                    className="text-xs text-gray-500 hover:text-black underline transition-colors"
                  >
                    {reviewSummary.count} {L.reviewsSuffix}
                  </button>
                  <span className="text-xs text-gray-300">|</span>
                  <span className={`text-xs font-medium ${stockClassName}`}>
                    {stockLabel}
                  </span>
                </>
              )}
            </div>

            {/* Purchase-required notice — shown when a signed-in shopper
                clicks the review CTA on a product they haven't received
                (no delivered / done order in `oeOrders`). Auto-dismisses
                with the modal close. */}
            {showPurchaseNotice && (
              <p role="status" className="mb-4 text-xs text-[#B8860B] leading-relaxed">
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
            <div className="flex items-center gap-3 mb-4">
              {(() => {
                const originalPriceRef = activeVariant?.salePrice
                  ? activeVariant.price
                  : product.price;
                const parseAmount = (s: string | undefined): number =>
                  parseFloat(s?.match(/[\d.]+/)?.[0] ?? '0') || 0;
                const showSale = activeSalePrice !== undefined
                  && parseAmount(activeSalePrice) < parseAmount(originalPriceRef);
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
              <div className="flex gap-2 mb-6">
                {showLabelBadge && (
                  <span className="px-3 py-1 bg-black text-white text-xs tracking-wider uppercase">
                    {product.label}
                  </span>
                )}
                {showLowStock && (
                  <span className="px-3 py-1 bg-primary-men text-white text-xs tracking-wider uppercase">
                    {L.badgeLowStock}
                  </span>
                )}
              </div>
            )}

            {/* Color Selector */}
            <div className="mb-6">
              <div className="text-sm font-medium mb-3 flex items-center gap-2">
                {L.colorLabel}
                {selectedColor !== null
                  ? <span className="font-normal text-gray-600">{L.colorSelected}</span>
                  : <span className={`font-normal ${errors.color ? 'text-[var(--sale)]' : 'text-gray-400'}`}>{L.colorNotSelected}</span>
                }
              </div>
              <div
                className={`flex items-center gap-3 p-2 transition-colors outline outline-2 ${
                  errors.color ? 'outline-[var(--sale)]' : 'outline-transparent'
                }`}
              >
                {product.colors.map((color, idx) => {
                  const isColorOOS = product.colorStock?.[idx] === false;
                  return (
                    <button
                      key={color}
                      onClick={() => { if (!isColorOOS) { setSelectedColor(idx); setSelectedSize(sizes.length === 1 ? sizes[0] : null); setSelectedImage(0); setErrors(e => ({ ...e, color: false })); } }}
                      disabled={isColorOOS}
                      aria-disabled={isColorOOS}
                      className={`relative w-8 h-8 transition-all border border-gray-300 ${
                        isColorOOS
                          ? 'opacity-40 cursor-not-allowed'
                          : selectedColor === idx
                          ? 'ring-2 ring-black ring-offset-2'
                          : 'hover:scale-110'
                      }`}
                      style={{ backgroundColor: color }}
                      aria-label={`${L.colorAriaPrefix} ${idx + 1}${isColorOOS ? ` ${L.colorOutOfStockAria}` : ''}`}
                    >
                      {isColorOOS && (
                        <span className="absolute inset-0 pointer-events-none bg-[linear-gradient(to_bottom_right,transparent_calc(50%_-_0.5px),rgba(0,0,0,0.5)_calc(50%_-_0.5px),rgba(0,0,0,0.5)_calc(50%_+_0.5px),transparent_calc(50%_+_0.5px))]" />
                      )}
                    </button>
                  );
                })}
              </div>
              {errors.color && (
                <p className="text-xs mt-1.5 text-[var(--sale)]">{L.colorError}</p>
              )}
            </div>

            {/* Size Selector */}
            <div className="mb-6">
              <div className="flex items-center justify-between mb-3">
                <div className="text-sm font-medium flex items-center gap-2">
                  {L.sizeLabel}
                  {errors.size && (
                    <span className="text-xs font-normal text-[var(--sale)]">{L.sizeError}</span>
                  )}
                </div>
                <button onClick={() => setShowSizeGuide(true)} className="text-xs text-gray-600 underline hover:text-black">
                  {L.sizeGuideCta}
                </button>
              </div>
              <div
                className={`grid grid-cols-3 gap-2 p-2 transition-colors outline outline-2 ${
                  errors.size ? 'outline-[var(--sale)]' : 'outline-transparent'
                }`}
              >
                {sizes.map((size) => {
                  const currentColorHex = selectedColor !== null ? product.colors[selectedColor] : undefined;
                  const variantForSize = product.variants?.some(
                    (v) => v.sizes.includes(size)
                      && (currentColorHex ? v.colors.includes(currentColorHex) : true)
                      && v.inStock !== false,
                  );
                  // When the product ships variant metadata, drive per-size
                  // availability off it. Otherwise fall back to the global
                  // stock flag so legacy products still render sensibly.
                  const isSizeOOS = product.variants && product.variants.length > 0
                    ? !variantForSize
                    : product.inStock === false;
                  return (
                    <button
                      key={size}
                      onClick={() => { if (!isSizeOOS) { setSelectedSize(size); setErrors(e => ({ ...e, size: false })); } }}
                      disabled={isSizeOOS}
                      aria-disabled={isSizeOOS}
                      className={`py-3 text-sm font-medium transition-all ${
                        isSizeOOS
                          ? 'bg-gray-100 text-gray-400 cursor-not-allowed line-through'
                          : selectedSize === size
                          ? 'bg-black text-white'
                          : 'bg-white border border-gray-300 hover:border-black'
                      }`}
                    >
                      {size}
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Action Buttons */}
            <div className="flex flex-col gap-3 mb-6">
              <button
                onClick={handleViewFullDetails}
                className="w-full py-4 text-sm tracking-wider uppercase font-medium border-2 border-black bg-white text-black hover:bg-black hover:text-white transition-colors"
              >
                {L.viewFullDetails}
              </button>
              <div className="flex gap-3">
                <button
                  onClick={() => {
                    const hasColors = product.colors && product.colors.length > 0;
                    const colorErr = hasColors && selectedColor === null;
                    const sizeErr = selectedSize === null;
                    if (colorErr || sizeErr) {
                      setErrors({ color: colorErr, size: sizeErr });
                      return;
                    }
                    // Use the variant-aware sale price so the cart stores
                    // the same number the price block above shows.
                    // `originalPrice` is only set when there's a
                    // strike-through UX pair — variant's own strike takes
                    // precedence over the family strike.
                    const cartPrice = parseFloat((activeSalePrice ?? activePrice).match(/[\d.]+/)?.[0] ?? '0') || 0;
                    const originalPriceSource = activeVariant?.salePrice ? activeVariant.price : product.price;
                    const originalPriceRaw = activeSalePrice ? parseFloat(originalPriceSource.match(/[\d.]+/)?.[0] ?? '0') || 0 : undefined;
                    const stockLimit = activeVariant?.stock ?? product.stock;
                    addItem({
                      id: activeVariant?.id ?? `${product.id}-quick`,
                      name: product.name,
                      brand: product.brand ?? '',
                      sku: activeVariant?.sku || product.id,
                      color: product.colors?.[selectedColor!] ?? '',
                      size: selectedSize!,
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
                  className={`flex-1 py-4 text-sm tracking-wider uppercase font-medium text-white transition-colors ${
                    buyBtnHovered ? 'bg-[var(--buy-hover)]' : 'bg-[var(--buy)]'
                  }`}
                  onMouseEnter={() => setBuyBtnHovered(true)}
                  onMouseLeave={() => setBuyBtnHovered(false)}
                >
                  {PA.addToCart}
                </button>
                <button
                  onClick={handleWishlist}
                  className={`w-14 flex items-center justify-center border-2 transition-colors ${
                    wishlisted ? 'border-[var(--accent)] bg-[#fff5f5]' : 'border-black bg-white'
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
              {L.sections.map((section) => (
                <div key={section.title} className="border-b border-gray-200">
                  <button
                    onClick={() => toggleSection(section.title)}
                    className="w-full flex items-center justify-between py-4 text-left hover:bg-gray-50 transition-colors"
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
                    <div className="pb-4 px-1 text-sm text-gray-600 leading-relaxed">
                      {section.content}
                    </div>
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
