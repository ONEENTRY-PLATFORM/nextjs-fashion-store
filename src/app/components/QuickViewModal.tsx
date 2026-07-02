'use client'
import { useState, useEffect } from 'react';
import { ACCENT_WOMEN, SALE_COLOR, BUY_GREEN, BUY_GREEN_HOVER } from '../constants/colors';
import Image from 'next/image';
import { X, ChevronDown, Star, Heart } from 'lucide-react';
import { useQuickView } from '../context/QuickViewContext';
import { useCart } from '../context/CartContext';
import { useWishlist } from '../context/WishlistContext';
import { useRouter } from 'next/navigation';
import { useFocusTrap } from '../hooks/useFocusTrap';
import { QuickViewSizeGuide } from './QuickViewSizeGuide';
import { QUICK_VIEW_LABELS as L, PRODUCT_ACTION_LABELS as PA } from '../data/productPageLabels';
import { SIZE_DROPDOWN_LABELS } from '../data/commonLabels';

export function QuickViewModal() {
  const { isOpen, product, initialColorIndex, closeQuickView } = useQuickView();
  const { addItem, openMiniCart } = useCart();
  const { toggleItem, isWishlisted } = useWishlist();
  const router = useRouter();
  const [selectedImage, setSelectedImage] = useState(0);
  const [selectedColor, setSelectedColor] = useState<number | null>(null);
  const [selectedSize, setSelectedSize] = useState<string | null>(null);
  const [expandedSection, setExpandedSection] = useState<string | null>(null);
  const [showSizeGuide, setShowSizeGuide] = useState(false);
  const [errors, setErrors] = useState<{ color?: boolean; size?: boolean }>({});
  const [buyBtnHovered, setBuyBtnHovered] = useState(false);
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
      setSelectedSize(null);
      setErrors({});
    } else {
      document.body.style.overflow = '';
    }
    return () => {
      document.body.style.overflow = '';
    };
  }, [isOpen, initialColorIndex]);

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
  // Prefer the variant's own gallery so the picked colour matches the images.
  const productImages = activeVariant?.images?.length
    ? activeVariant.images
    : product.galleryImages?.length
    ? product.galleryImages
    : [product.image];

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
  const rating = product.reviews
    ? product.reviews.reduce((s, r) => s + r.rating, 0) / product.reviews.length
    : 4.5;
  const reviewCount = product.reviews?.length ?? 127;

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

            {/* Rating */}
            <div className="flex items-center gap-2 mb-4">
              <div className="flex items-center gap-1">
                {[...Array(5)].map((_, i) => (
                  <Star
                    key={i}
                    size={14}
                    fill={i < Math.floor(rating) ? '#000' : 'none'}
                    stroke="#000"
                    strokeWidth={1.5}
                  />
                ))}
              </div>
              <span className="text-sm text-gray-600">({reviewCount} {L.reviewsSuffix})</span>
            </div>

            {/* Price */}
            <div className="flex items-center gap-3 mb-4">
              {product.salePrice ? (
                <>
                  <span className="text-2xl font-semibold text-primary-men">{product.salePrice}</span>
                  <span className="text-lg text-gray-400 line-through">{activePrice}</span>
                </>
              ) : (
                <span className="text-2xl font-semibold">{activePrice}</span>
              )}
            </div>

            {/* Badges */}
            <div className="flex gap-2 mb-6">
              <span className="px-3 py-1 bg-black text-white text-xs tracking-wider uppercase">
                {L.badgeNewIn}
              </span>
              <span className="px-3 py-1 bg-primary-men text-white text-xs tracking-wider uppercase">
                {L.badgeLowStock}
              </span>
            </div>

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
                      onClick={() => { if (!isColorOOS) { setSelectedColor(idx); setSelectedSize(null); setSelectedImage(0); setErrors(e => ({ ...e, color: false })); } }}
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
                    const cartPrice = parseFloat((product.salePrice ?? activePrice).match(/[\d.]+/)?.[0] ?? '0') || 0;
                    const originalPriceRaw = product.salePrice ? parseFloat(activePrice.match(/[\d.]+/)?.[0] ?? '0') || 0 : undefined;
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
