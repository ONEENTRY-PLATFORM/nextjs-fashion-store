'use client';
import {
  Check,
  ChevronLeft,
  ChevronRight,
  Heart,
  MapPin,
  RotateCcw,
  Ruler,
  Shield,
  ShoppingBag,
  Store,
  Truck,
} from 'lucide-react';
import { notFound, useParams, useSearchParams } from 'next/navigation';
import React, { useEffect, useMemo, useRef, useState } from 'react';
import { useDispatch, useSelector } from 'react-redux';

import { PageBlocksRenderer } from '@/app/components/blocks/PageBlocksRenderer';
import { PRODUCT_ACTION_LABELS } from '@/app/components/product/copy';
import { ACCENT_WOMEN as ACCENT, SALE_COLOR } from '@/app/constants/colors';
import { useAuth } from '@/app/context/AuthContext';
import { useCart } from '@/app/context/CartContext';
import { useWishlist } from '@/app/context/WishlistContext';
import { CURRENCY } from '@/app/data/currencyConfig';
import { type CatalogProduct, hexToColorName } from '@/app/data/productCatalog';
import { type SpecialOffer } from '@/app/data/specialOffers';
import { useAnnounce } from '@/app/hooks/useAnnounce';
import { PRODUCT_BREADCRUMB_LABELS } from '@/app/pages/product/copy';
import type { AppDispatch, RootState } from '@/app/store';
import { recentlyViewedActions } from '@/app/store/recentlyViewedSlice';
import { strikeColor } from '@/app/utils/colorUtils';
import { fillTokens } from '@/app/utils/fillTokens';
import { trackActivity } from '@/app/utils/track-activity';
import { Link, useRouter } from '@/lib/i18n/navigation';
import { pushRecentlyViewedAction } from '@/lib/oneentry/auth/actions';
import type { PageBlock } from '@/lib/oneentry/blocks/page-blocks';
import type { CategoryBreadcrumb } from '@/lib/oneentry/catalog/products';
import { getProductsByIdsAction } from '@/lib/oneentry/catalog/products-action';
import { getProductReviewSummary } from '@/lib/oneentry/catalog/reviews-actions';
// PRODUCT_DEFAULTS (`PD`) now only holds admin-controllable copy fallbacks (`saveToWishlist`, `savedToWishlist`).
import { useDict, useT } from '@/lib/oneentry/labels/DictContext';
import { sanitizeHtml } from '@/lib/sanitize-html';

import { AccordionSection } from './product/AccordionSection';
import { ProductGallery } from './product/ProductGallery';
import { ProductShareDropdown } from './product/ProductShareDropdown';
import { ProductSpecialOffers } from './product/ProductSpecialOffers';
import { RecentlyViewedSection } from './product/RecentlyViewedSection';
import { ReserveInStoreModal, type ReserveStore } from './product/ReserveInStoreModal';
import { SizeGuideModal } from './product/SizeGuideModal';
import { StarRating } from './product/StarRating';
import { useProductPageUIState } from './product/useProductPageUIState';

// UI-copy fallbacks for OE system-text keys that don't have a product-data equivalent.
export const PRODUCT_DEFAULTS = {
  saveToWishlist: 'Save to Wishlist',
  savedToWishlist: 'Saved to Wishlist',
} as const;

const PD = PRODUCT_DEFAULTS;

// Product detail accordion section titles.
export const PRODUCT_ACCORDION_LABELS = {
  specificationsTitle: 'Product Specifications',
  descriptionTitle: 'Product Description',
  deliveryTitle: 'Delivery & Returns',
  careTitle: 'Care Instructions',
} as const;

const PA = PRODUCT_ACCORDION_LABELS;

/** Product detail page copy. */

// Quick delivery snippets, the "Incl.
export const PRODUCT_PRICE_NOTE = 'Incl. VAT · Free delivery from $100';

const DELIVERY_ICONS = {
  truck: <Truck size={14} />,
  return: <RotateCcw size={14} />,
  shield: <Shield size={14} />,
} as const;

/** Map common OE care-instruction phrases to their emoji symbol. */
const CARE_SYMBOL_MAP: Array<[RegExp, string]> = [
  [/hand\s*wash/i, '\u{1F9BA}'],
  [/machine\s*wash/i, '\u{1F9FA}'],
  [/no\s*tumble|do\s*not\s*tumble/i, '\u{1F6AB}'],
  [/iron/i, '♨'],
  [/bleach/i, '\u{1F9F4}'],
  [/dry\s*clean/i, '\u{1F9F9}'],
];
function careSymbolFor(text: string): string {
  const t = text.trim();
  for (const [pattern, sym] of CARE_SYMBOL_MAP) if (pattern.test(t)) return sym;
  return '\u{1F3F7}';
}

export function ProductDetailPage({
  initialProduct,
  categoryBreadcrumbs = [],
  reviewsSlot,
  recommendationsSlot,
  currentGender,
  bonusPoints,
  categoryViewAllHref = '/',
  productBlocks,
  reserveStores = [],
}: {
  initialProduct?: CatalogProduct;
  /** Breadcrumbs derived from the product's OE category path (e.g. `Women` → `Clothing` → `Costumes`). */
  categoryBreadcrumbs?: CategoryBreadcrumb[];
  /** Streamed customer-reviews block. */
  reviewsSlot?: React.ReactNode;
  /** Streamed "You May Also Like" carousel (OE `frequently_ordered_block`). */
  recommendationsSlot?: React.ReactNode;
  /** Gender taxonomy of the current product. */
  currentGender?: 'W' | 'M' | 'U' | '';
  /** Bonus points earned when purchasing this product, resolved server-side from the OE `purchase-of-goods` discount rule. */
  bonusPoints?: number;
  /** Href for the "View all in this category" link — derived from the product's OE `categories` path server-side. */
  categoryViewAllHref?: string;
  /** OE-attached product blocks (`Products.getProductBlockById`). */
  productBlocks?: PageBlock[];
  /** Real store list for the reserve-in-store modal, mapped from the OE store pages by the route. */
  reserveStores?: ReserveStore[];
} = {}) {
  const PB = useDict('product_card_breadcrumb_', PRODUCT_BREADCRUMB_LABELS);
  const router = useRouter();
  const lReviewsSuffix = useT('product-card-reviews', PRODUCT_ACTION_LABELS.reviewsSuffix);
  const lSizeGuide = useT('product-card-size-guide', PRODUCT_ACTION_LABELS.sizeGuide);
  const lAddToCart = useT('product-card_add_to_cart_cta', PRODUCT_ACTION_LABELS.addToCart);
  const lReserveInStore = useT('product-card_reserve_in_store_cta', PRODUCT_ACTION_LABELS.reserveInStore);
  const lSaveToWishlist = useT('product-card-save_to_wishlist_cta', PD.saveToWishlist);
  const lSavedToWishlist = useT('product-card-saved_to_wishlist_cta', PD.savedToWishlist);
  const lPriceNote = useT('product-card-vat', PRODUCT_PRICE_NOTE);
  // Static UI strings — wired through OE so admins can override copy without a code change.
  const lBonusHeading = useT('earn_360_bonus_points_title', PRODUCT_ACTION_LABELS.bonusHeading);
  const lBonusBody = useT('earn_360_bonus_points_text', PRODUCT_ACTION_LABELS.bonusBody);
  const lColorLabel = useT('product-card-color_label', PRODUCT_ACTION_LABELS.colorLabel);
  const lSizeLabel = useT('product-card-size_label', PRODUCT_ACTION_LABELS.sizeLabel);
  const lSizeError = useT('product-card-size_error', PRODUCT_ACTION_LABELS.sizeError);
  const lStoreAvailableIn = useT('product-card-available_in_store', PRODUCT_ACTION_LABELS.storeAvailableIn);
  const lStoreStockSuffix = useT('product-card-in_stock_today', PRODUCT_ACTION_LABELS.storeStockSuffix);
  const lStoreCitiesRaw = useT('product-card-store_cities', PRODUCT_ACTION_LABELS.defaultCities.join(','));
  const lOutOfStock = useT('product-card-out_of_stock', PRODUCT_ACTION_LABELS.outOfStock);
  const lOutOfStockTitle = useT('product-card-color_oos_title', PRODUCT_ACTION_LABELS.outOfStockTitle);
  const lInStock = useT('product-card-in_stock', PRODUCT_ACTION_LABELS.inStock);
  const lPreOrder = useT('product-card-pre_order', PRODUCT_ACTION_LABELS.preOrder);
  const lPreOrderButton = useT('product-card-pre_order_button', PRODUCT_ACTION_LABELS.preOrderButton);
  const lAddedToCart = useT('product-card-added_to_cart', PRODUCT_ACTION_LABELS.addedToCart);
  const aAnnounceAdded = useT('product-card-announce_added_to_cart', PRODUCT_ACTION_LABELS.announceAddedToCart);
  const lComingSoon = useT('product-card-coming_soon', PRODUCT_ACTION_LABELS.comingSoon);
  const lSkuPrefix = useT('product-card-sku_label', PRODUCT_ACTION_LABELS.skuLabel);
  const lArticlePrefix = useT('product-card-article_label', PRODUCT_ACTION_LABELS.articleLabel);
  const lSpecsTitle = useT('product-card-accordion_specs', PA.specificationsTitle);
  const lDescriptionTitle = useT('product-card-accordion_description', PA.descriptionTitle);
  const lDeliveryTitle = useT('product-card-accordion_delivery', PA.deliveryTitle);
  const lCareTitle = useT('product-card-accordion_care', PA.careTitle);
  const lFreeDelivery = useT('product-card_free_delivery', '');
  const lFreeReturns = useT('product-card_free_returns', '');
  const lSecureCheckout = useT('product-card_secure_checkout', '');
  const deliverySnippets = [
    { iconKey: 'truck' as const, text: lFreeDelivery },
    { iconKey: 'return' as const, text: lFreeReturns },
    { iconKey: 'shield' as const, text: lSecureCheckout },
  ].filter((row) => row.text.length > 0);
  const storeCities = lStoreCitiesRaw
    .split(',')
    .map((s) => s.trim())
    .filter(Boolean);

  // Delivery accordion rows — backed by OE's `product_card_delivery_returns` system-text set.
  const deliveryRows: Array<{ iconKey: 'truck' | 'store' | 'returns'; title: string; desc: string }> = [
    {
      iconKey: 'truck' as const,
      title: useT('p_c_d_r_standart_delivery_title', ''),
      desc: useT('p_c_d_r_standart_delivery_text', ''),
    },
    {
      iconKey: 'truck' as const,
      title: useT('p_c_d_r_express_delivery_title', ''),
      desc: useT('p_c_d_r_express_delivery_text', ''),
    },
    {
      iconKey: 'store' as const,
      title: useT('p_c_d_r_click_collect_title', ''),
      desc: useT('p_c_d_r_click_collect_text', ''),
    },
    {
      iconKey: 'returns' as const,
      title: useT('p_c_d_r_returns_title', ''),
      desc: useT('p_c_d_r_returns_text', ''),
    },
  ].filter((row) => row.title.length > 0);
  const params = useParams();
  const productId = (params?.id as string) ?? '';
  const catalogProduct = initialProduct;

  if (productId && !catalogProduct) notFound();

  const productIsOOS = catalogProduct?.inStock === false;

  // Route guard above already returned 404 when productId has no catalogProduct, so by this point catalogProduct is always defined.
  const dynamicName = catalogProduct?.name ?? '';
  const dynamicBrand = catalogProduct?.brand ?? '';
  const dynamicImage = catalogProduct?.image ?? '';
  const dynamicColors = useMemo(
    () =>
      (catalogProduct?.colors ?? []).map((hex, idx) => ({
        name: hexToColorName(hex),
        hex,
        available: productIsOOS ? false : catalogProduct?.colorStock ? catalogProduct.colorStock[idx] !== false : true,
      })),
    [catalogProduct, productIsOOS],
  );

  // Memoised: the fallback `[]` would otherwise be a new array each render and invalidate the size-availability memo below on every pass.
  const productSizeOptions = useMemo(() => catalogProduct?.sizeOptions ?? [], [catalogProduct]);
  const productSpecs = catalogProduct?.specs ?? [];
  // Reviews now stream in as a slot (`reviewsSlot`) rendered by a Suspense boundary higher up.
  const productReviews = catalogProduct?.reviews ?? [];

  // Special offer bundles aren't sourced from OneEntry on this tenant — the section stays empty until the admin wires a block.
  const specialOffers: SpecialOffer[] = [];
  const availableOffers: SpecialOffer[] = productIsOOS ? [] : specialOffers;

  const searchParams = useSearchParams();
  const rawColor = searchParams?.get('color');
  const initSize = searchParams?.get('size') ?? (productSizeOptions.length === 1 ? productSizeOptions[0].label : null);
  // Accept either hex (`#FFC0CB`) or OE colour name (`Pink`) so links coming from either the PDP (writes hex) or ProductCard/QuickView (writes OE name) both resolve to the intended swatch.
  const initColorIdx = (() => {
    if (!rawColor) return 0;
    const norm = rawColor.toLowerCase().trim();
    const idx = dynamicColors.findIndex((c) => c.hex.toLowerCase() === norm || c.name.toLowerCase() === norm);
    return idx >= 0 ? idx : 0;
  })();

  const [selectedColor, setSelectedColor] = useState(initColorIdx);
  const [selectedSize, setSelectedSize] = useState<string | null>(initSize);
  const [sizeError, setSizeError] = useState(false);

  // Refine each size's availability against the currently selected colour: OE may have `Red / 2XS` in stock but `Blue / 2XS` sold out.
  const dynamicSizeOptions = useMemo(() => {
    const selectedHex = dynamicColors[selectedColor]?.hex;
    const variants = catalogProduct?.variants;
    return productSizeOptions.map((s) => {
      if (productIsOOS) return { ...s, available: false };
      if (variants && selectedHex) {
        const combo = variants.some((v) => v.colors.includes(selectedHex) && v.sizes.includes(s.label) && v.inStock);
        return { ...s, available: combo };
      }
      return { ...s, available: s.available };
    });
  }, [productSizeOptions, catalogProduct?.variants, dynamicColors, selectedColor, productIsOOS]);

  // Active variant follows selected colour first; when a size is also picked we look for the exact combo.
  const activeVariant = useMemo(() => {
    const variants = catalogProduct?.variants;
    if (!variants || variants.length === 0) return null;
    const hex = dynamicColors[selectedColor]?.hex;
    if (!hex) return null;
    if (selectedSize) {
      const exact = variants.find((v) => v.colors.includes(hex) && v.sizes.includes(selectedSize));
      if (exact) return exact;
    }
    return variants.find((v) => v.colors.includes(hex)) ?? null;
  }, [catalogProduct?.variants, dynamicColors, selectedColor, selectedSize]);

  const activeColorImage = activeVariant?.image || catalogProduct?.colorImages?.[selectedColor] || dynamicImage;

  // Price / gallery / SKU follow the active variant when the linked product carries its own copy; otherwise we fall back to the parent product.
  const effectiveFull = activeVariant?.price ?? catalogProduct?.price ?? 0;
  const effectiveSale = activeVariant?.salePrice ?? catalogProduct?.salePrice;
  const hasVisibleDiscount =
    typeof effectiveSale === 'number' &&
    effectiveFull > 0 &&
    effectiveSale < effectiveFull &&
    Math.round((1 - effectiveSale / effectiveFull) * 100) >= 1;
  const dynamicPrice = hasVisibleDiscount ? (effectiveSale ?? effectiveFull) : effectiveFull;
  const dynamicOriginalPrice = hasVisibleDiscount ? effectiveFull : null;
  const dynamicGallery =
    activeVariant?.images && activeVariant.images.length > 0
      ? activeVariant.images
      : (catalogProduct?.galleryImages ?? (catalogProduct ? Array(5).fill(catalogProduct.image) : []));
  // Match on the stable `key`, not the label — spec labels are editable in the admin panel, so a renamed "SKU" row would otherwise silently stop matching.
  const variantSku =
    activeVariant?.sku ??
    catalogProduct?.specs?.find((s) => s.key === 'sku')?.value ??
    PRODUCT_ACTION_LABELS.defaultSku;
  const activeDescriptionHtml =
    activeVariant?.descriptionHtml && activeVariant.descriptionHtml.trim()
      ? activeVariant.descriptionHtml
      : catalogProduct?.descriptionHtml;

  // OE distinguishes four availability signals: - `in_stock` pre-launch stock, the shopper can commit to buying - `coming_soon`.
  const activeVariantStatus = activeVariant?.statusIdentifier;
  const isPreOrder = !productIsOOS && activeVariantStatus === 'preorder';
  const isComingSoon = !productIsOOS && activeVariantStatus === 'coming_soon';

  const isFirstMount = useRef(true);
  const { toggleItem, isWishlisted, updateSelection } = useWishlist();

  // Clear the picked size when the new colour doesn't stock it — otherwise the "size selected" state persists over a struck-through size.
  if (selectedSize && !dynamicSizeOptions.find((opt) => opt.label === selectedSize)?.available) {
    setSelectedSize(null);
  }

  useEffect(() => {
    if (isFirstMount.current) {
      isFirstMount.current = false;
      return;
    }
    if (!productId || !isWishlisted(productId)) return;
    updateSelection(productId, dynamicColors[selectedColor]?.hex, selectedSize ?? undefined);
  }, [selectedColor, selectedSize, productId, isWishlisted, updateSelection, dynamicColors]);

  // Reflect the current colour+size choice in the URL so a full-page reload (or a shared link) restores exactly what the shopper was looking at.
  useEffect(() => {
    if (typeof window === 'undefined') return;
    const hex = dynamicColors[selectedColor]?.hex;
    const url = new URL(window.location.href);
    if (hex) url.searchParams.set('color', hex);
    else url.searchParams.delete('color');
    if (selectedSize) url.searchParams.set('size', selectedSize);
    else url.searchParams.delete('size');
    const next = url.pathname + (url.search ? url.search : '') + url.hash;
    if (next !== window.location.pathname + window.location.search + window.location.hash) {
      window.history.replaceState(window.history.state, '', next);
    }
  }, [selectedColor, selectedSize, dynamicColors]);

  // Deep-linked shoppers hit `/product/{id}` without a `?gender` hint (search results, bookmarks, marketing emails).
  useEffect(() => {
    if (typeof window === 'undefined') return;
    if (!currentGender || (currentGender !== 'M' && currentGender !== 'W')) return;
    if (searchParams.get('gender')) return;
    const url = new URL(window.location.href);
    url.searchParams.set('gender', currentGender === 'M' ? 'men' : 'women');
    const path = url.pathname + '?' + url.searchParams.toString() + url.hash;
    router.replace(path, { scroll: false });
  }, [currentGender, searchParams, router]);

  const cart = useCart();
  const dispatch = useDispatch<AppDispatch>();
  const { isLoggedIn, user, openLoginModal } = useAuth();
  const recentlyViewed = useSelector((state: RootState) => state.recentlyViewed.items);
  // Different OE variant IDs of the same product (Pink XL / White M / …) each push their own Recently-Viewed entry, so the trail can list the same title twice.
  const allRecentlyViewed = (() => {
    const filtered = recentlyViewed
      .filter((p) => p.id !== productId)
      .filter(
        (p) => !currentGender || currentGender === 'U' || !p.gender || p.gender === currentGender || p.gender === 'U',
      );
    const seen = new Set<string>();
    const out: typeof filtered = [];
    for (const p of filtered) {
      const key = (p.name || p.id).toLowerCase().trim();
      if (seen.has(key)) continue;
      seen.add(key);
      out.push(p);
    }
    return out;
  })();
  // "You May Also Like" — streamed in by the parent via `recommendationsSlot`.

  // 1) Local: prepend the current product to the Redux trail for instant UX.
  useEffect(() => {
    if (!catalogProduct) return;
    dispatch(
      recentlyViewedActions.addProduct({
        id: catalogProduct.id,
        name: catalogProduct.name,
        brand: catalogProduct.brand,
        price: CURRENCY.format(catalogProduct.price),
        ...(catalogProduct.salePrice !== undefined && { salePrice: CURRENCY.format(catalogProduct.salePrice) }),
        image: catalogProduct.image,
        colors: catalogProduct.colors,
        ...(catalogProduct.badge && { label: catalogProduct.badge }),
        ...(catalogProduct.gender &&
        (catalogProduct.gender === 'W' || catalogProduct.gender === 'M' || catalogProduct.gender === 'U')
          ? { gender: catalogProduct.gender }
          : {}),
      }),
    );
    const numeric = Number(catalogProduct.id);
    if (Number.isFinite(numeric) && numeric > 0) {
      trackActivity({ type: 'product_view', productId: numeric });
      if (isLoggedIn) void pushRecentlyViewedAction(numeric);
    }
  }, [productId, catalogProduct, dispatch, isLoggedIn]);

  // Hydrate the Redux trail from `user.recentlyViewedItems` on login.
  const hydratedRef = useRef(false);
  useEffect(() => {
    if (!isLoggedIn || !user?.recentlyViewedItems || hydratedRef.current) return;
    if (user.recentlyViewedItems.length === 0) return;
    hydratedRef.current = true;
    const ids = user.recentlyViewedItems.map((it) => Number(it.productId)).filter((n) => Number.isFinite(n));
    void getProductsByIdsAction(ids).then((enriched) => {
      const byId = new Map(enriched.map((p) => [p.id, p]));
      const items = user.recentlyViewedItems
        .map((it) => {
          const ui = byId.get(String(it.productId));
          if (!ui) return null;
          const priceNumber = parseFloat(String(ui.price).replace(/[^\d.]/g, '')) || 0;
          return {
            id: ui.id,
            name: ui.name,
            brand: ui.brand ?? '',
            price: CURRENCY.format(priceNumber),
            image: ui.image,
            colors: ui.colors,
            ...(ui.label && { label: ui.label }),
            viewedAt: new Date(it.viewedAt).getTime(),
          };
        })
        .filter((p): p is NonNullable<typeof p> => p !== null);
      dispatch(recentlyViewedActions.hydrate(items));
    });
  }, [isLoggedIn, user, dispatch]);
  useEffect(() => {
    if (!isLoggedIn) hydratedRef.current = false;
  }, [isLoggedIn]);

  const handleAddBundle = (offerId: string) => {
    const offer = specialOffers.find((o) => o.id === offerId);
    if (!offer) return;
    cart.addBundle(
      offer.products.map((p, idx) => ({
        id: `${offerId}-item-${idx}`,
        name: p.name,
        brand: dynamicBrand,
        color: idx === 0 ? dynamicColors[selectedColor].name : '',
        sku: `BUNDLE-${offerId.toUpperCase()}-${idx + 1}`,
        size: idx === 0 && selectedSize ? selectedSize : '',
        quantity: 1,
        price: parseFloat(p.salePrice.match(/[\d.]+/)?.[0] ?? '0') || 0,
        originalPrice: parseFloat(p.originalPrice.match(/[\d.]+/)?.[0] ?? '0') || 0,
        image: p.image,
      })),
    );
    cart.openMiniCart();
  };

  const wishlisted = isWishlisted(productId || 'pdp-ribbed-cashmere-knit');
  const announce = useAnnounce();
  const {
    addedToCart,
    cartHovered,
    setCartHovered,
    showSizeGuide,
    setShowSizeGuide,
    showReserveModal,
    setShowReserveModal,
    storeCity,
    setStoreCity,
    showShare,
    setShowShare,
    copied,
    shareRef,
    handleCopyLink,
    markAddedToCart,
  } = useProductPageUIState();
  const reviewsRef = useRef<HTMLDivElement>(null);
  const sizeErrorTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    return () => {
      if (sizeErrorTimerRef.current) clearTimeout(sizeErrorTimerRef.current);
    };
  }, []);

  // Deep-link support for `/product/{id}#reviews` — used by QuickView's "N reviews" chip so shoppers land directly on the reviews block.
  useEffect(() => {
    if (typeof window === 'undefined') return;
    if (window.location.hash !== '#reviews') return;
    let cancelled = false;
    let tries = 0;
    const attempt = () => {
      if (cancelled) return;
      const el = reviewsRef.current;
      if (el) {
        const top = el.getBoundingClientRect().top + window.scrollY - 120;
        window.scrollTo({ top, behavior: 'smooth' });
        return;
      }
      tries += 1;
      if (tries < 40) setTimeout(attempt, 100);
    };
    attempt();
    return () => {
      cancelled = true;
    };
  }, []);

  const handleAddToCart = () => {
    if (!selectedSize) {
      setSizeError(true);
      if (sizeErrorTimerRef.current) clearTimeout(sizeErrorTimerRef.current);
      sizeErrorTimerRef.current = setTimeout(() => setSizeError(false), 2000);
      return;
    }
    // Snapshot the active variant's `stockqty` so the reducer can cap `updateQuantity` at OE inventory.
    const variantStock = activeVariant?.stock;
    const familyStock = catalogProduct?.stock;
    const stockLimit =
      Number.isFinite(variantStock) && (variantStock as number) > 0
        ? (variantStock as number)
        : Number.isFinite(familyStock) && (familyStock as number) > 0
          ? (familyStock as number)
          : undefined;
    cart.addItem({
      id: productId || 'pdp-ribbed-cashmere-knit',
      name: dynamicName,
      brand: dynamicBrand,
      color: dynamicColors[selectedColor].name,
      sku: catalogProduct?.specs?.find((s) => s.key === 'sku')?.value ?? productId,
      size: selectedSize,
      quantity: 1,
      price: dynamicPrice,
      originalPrice: dynamicOriginalPrice ?? undefined,
      image: activeColorImage,
      ...(stockLimit !== undefined && { stockLimit }),
    });
    cart.openMiniCart();
    markAddedToCart();
    announce(fillTokens(aAnnounceAdded, { name: dynamicName }));
  };

  // Small star-rating summary next to the title.
  const [reviewSummary, setReviewSummary] = useState<{ count: number; avg: number | null } | null>(null);
  useEffect(() => {
    const numeric = Number(catalogProduct?.id);
    if (!Number.isFinite(numeric) || numeric <= 0) return;
    let cancelled = false;
    void getProductReviewSummary(numeric).then((s) => {
      if (cancelled) return;
      setReviewSummary(s);
    });
    return () => {
      cancelled = true;
    };
  }, [catalogProduct?.id]);
  // Prefer the freshly-fetched summary; fall back to whatever the initial OE catalog product carries (usually empty since reviews aren't pre-seeded).
  const displayReviewCount = reviewSummary?.count ?? productReviews.length;
  const avgRating =
    reviewSummary?.avg ??
    (productReviews.length > 0 ? productReviews.reduce((s, r) => s + r.rating, 0) / productReviews.length : 0);

  return (
    <div
      className="flex-1 bg-white font-sans"
      style={{ '--sale': SALE_COLOR, '--accent': ACCENT } as React.CSSProperties}
    >
      <main id="main-content">
        {/* Back button */}
        <div className="px-4 pt-4 lg:px-8">
          <button
            onClick={() => router.back()}
            className="flex items-center gap-1.5 text-sm text-gray-500 transition-colors hover:text-black"
          >
            <ChevronLeft size={16} />
            {PB.back}
          </button>
        </div>

        {/* Breadcrumb — labels derived from the OE category path so each
            product gets its real taxonomy chain. Every crumb the route could
            resolve a destination for is a link (the leading "Home" anchor, the
            gender landing, the catalog page and its leaf filter); one without
            a reachable page stays plain text rather than pointing at a 404. */}
        <div className="border-b border-gray-200 px-4 py-3 lg:px-8">
          <nav data-testid="pdp-breadcrumb" className="flex flex-wrap items-center gap-1.5 text-xs text-gray-400">
            <Link href="/" data-testid="pdp-breadcrumb-link" className="transition-colors hover:text-black">
              {PB.home}
            </Link>
            {categoryBreadcrumbs.map((crumb, i) => (
              <React.Fragment key={`${crumb.name}-${i}`}>
                <ChevronRight size={11} className="shrink-0" />
                {crumb.href ? (
                  <Link
                    href={crumb.href}
                    data-testid="pdp-breadcrumb-link"
                    className="text-gray-400 transition-colors hover:text-black"
                  >
                    {crumb.name}
                  </Link>
                ) : (
                  <span className="text-gray-400">{crumb.name}</span>
                )}
              </React.Fragment>
            ))}
            <ChevronRight size={11} className="shrink-0" />
            <span className="max-w-50 truncate text-black">{dynamicName}</span>
          </nav>
        </div>

        {/* Main Product Section */}
        <div className="px-4 py-6 lg:px-8 lg:py-10">
          <div className="mx-auto flex max-w-7xl flex-col gap-8 lg:flex-row lg:gap-14">
            {/* Gallery */}
            <div className="w-full lg:sticky lg:top-33 lg:w-[55%] lg:self-start xl:w-[58%]">
              <ProductGallery
                images={dynamicGallery}
                productName={dynamicName}
                // Variant photos and the product's own share one blur map: it is keyed by URL, so whichever set is showing resolves.
                imageBlurs={activeVariant?.imageBlurs ?? catalogProduct?.imageBlurs}
              />
            </div>

            {/* Product Info */}
            <div className="w-full lg:w-[45%] xl:w-[42%]">
              {/* Brand + Share */}
              <div className="mb-2 flex items-center justify-between">
                <Link
                  href={categoryViewAllHref}
                  className="text-xs tracking-[0.2em] text-gray-500 uppercase transition-colors hover:text-black"
                >
                  {dynamicBrand}
                </Link>
                <ProductShareDropdown
                  shareRef={shareRef}
                  showShare={showShare}
                  setShowShare={setShowShare}
                  copied={copied}
                  onCopyLink={handleCopyLink}
                />
              </div>

              {/* Product Name */}
              <h1 className="leading-1.3 mb-2 text-[1.35rem] font-semibold">{dynamicName}</h1>

              {/* Rating Row */}
              <div className="mb-3 flex items-center gap-3">
                <StarRating rating={avgRating} size={15} />
                <button
                  onClick={() => {
                    // Reviews section is now always mounted (even for 0 reviews), so we can always scroll.
                    if (!reviewsRef.current) return;
                    const top = reviewsRef.current.getBoundingClientRect().top + window.scrollY - 120;
                    window.scrollTo({ top, behavior: 'smooth' });
                  }}
                  className="text-xs text-gray-500 underline transition-colors hover:text-black"
                >
                  {displayReviewCount} {lReviewsSuffix}
                </button>
                <span className="text-xs text-gray-300">|</span>
                <span
                  className={`text-xs font-medium ${isComingSoon ? 'text-[#8B8B8B]' : isPreOrder ? 'text-[#B8860B]' : 'text-[#2E8B57]'}`}
                >
                  {isComingSoon ? lComingSoon : isPreOrder ? lPreOrder : lInStock}
                </span>
              </div>

              {/* SKU */}
              <p className="mb-4 text-xs text-gray-400">
                {lSkuPrefix} <span className="text-gray-600">{variantSku}</span>
                &nbsp;·&nbsp; {lArticlePrefix}{' '}
                <span className="text-gray-600">
                  {catalogProduct?.specs?.find((s) => s.label === 'Article')?.value ??
                    PRODUCT_ACTION_LABELS.defaultArticle}
                </span>
              </p>

              {/* Price Block */}
              <div className="mb-1 flex items-baseline gap-3">
                <span className={`text-2xl font-bold ${dynamicOriginalPrice ? 'text-(--sale)' : 'text-black'}`}>
                  {CURRENCY.format(dynamicPrice)}
                </span>
                {dynamicOriginalPrice && (
                  <>
                    <span className="text-base font-normal text-gray-400 line-through">
                      {CURRENCY.format(dynamicOriginalPrice)}
                    </span>
                    <span className="rounded-none bg-(--sale) px-2 py-0.5 text-xs font-semibold tracking-widest text-white uppercase">
                      −{Math.round((1 - dynamicPrice / dynamicOriginalPrice) * 100)}%
                    </span>
                  </>
                )}
              </div>
              <p className="mb-4 text-xs text-gray-400">{lPriceNote}</p>

              {/* Purchase Bonus — rendered only when the OE `purchase-of-goods`
                  rule applies to this product. `{count}` in the OE-managed
                  heading is substituted with the resolved point value. */}
              {typeof bonusPoints === 'number' && bonusPoints > 0 && (
                <div className="mb-6 flex items-center gap-2.5 border border-[#ffe0b2] bg-[#fff8f0] px-4 py-3">
                  <span className="text-base">🎁</span>
                  <div>
                    {/* Accept both placeholder dialects: `%count%` is what OE
                        holds (braces there would break the set's public read),
                        `{count}` covers any value still authored the old way. */}
                    <p className="text-xs font-semibold text-[#b45309]">
                      {lBonusHeading.replace(/%count%|\{count\}/g, String(bonusPoints))}
                    </p>
                    <p className="text-xs text-gray-500">{lBonusBody}</p>
                  </div>
                </div>
              )}

              {/* Color Selection */}
              <div className="mb-5">
                <div className="mb-2.5 flex items-center justify-between">
                  <span className="text-xs font-semibold tracking-[0.12em] uppercase">
                    {lColorLabel} <span className="font-normal">{dynamicColors[selectedColor]?.name}</span>
                  </span>
                </div>
                <div className="flex flex-wrap items-center gap-2">
                  {dynamicColors.map((c, i) => (
                    <button
                      key={`${c.hex}-${i}`}
                      onClick={() => setSelectedColor(i)}
                      disabled={!c.available}
                      className={`group relative size-8 rounded-none outline-offset-2 ${
                        selectedColor === i
                          ? 'border-2 border-black outline-1 outline-black'
                          : 'border-[1.5px] border-[#e0e0e0]'
                      } ${c.available ? 'cursor-pointer opacity-100' : 'cursor-not-allowed opacity-35'} ${
                        c.hex === '#FFFFFF' ? 'shadow-[inset_0_0_0_1px_#ddd]' : ''
                      }`}
                      title={c.name + (!c.available ? lOutOfStockTitle : '')}
                      // The swatch renders as a bare coloured box, so without an explicit name a screen reader announces only "button". `title` alone is a weak fallback that several readers skip.
                      aria-label={c.name + (!c.available ? lOutOfStockTitle : '')}
                      aria-pressed={selectedColor === i}
                      data-testid="pdp-color-swatch"
                      style={{ backgroundColor: c.hex }}
                    >
                      {!c.available && (
                        <span className="pointer-events-none absolute inset-0 flex items-center justify-center">
                          <span
                            className="block h-px w-full rotate-45"
                            style={{ backgroundColor: strikeColor(c.hex) }}
                          />
                        </span>
                      )}
                    </button>
                  ))}
                </div>
              </div>

              {/* Size Selection */}
              <div className="mb-6">
                <div className="mb-2.5 flex items-center justify-between">
                  <span className="text-xs font-semibold tracking-[0.12em] uppercase">
                    {lSizeLabel}
                    {selectedSize ? `: ${selectedSize}` : ''}
                    {sizeError && (
                      <span className="ml-2 text-xs font-normal tracking-normal text-(--sale) normal-case">
                        {lSizeError}
                      </span>
                    )}
                  </span>
                  <button
                    onClick={() => setShowSizeGuide(true)}
                    className="flex items-center gap-1 text-xs text-gray-500 underline transition-colors hover:text-black"
                  >
                    <Ruler size={11} /> {lSizeGuide}
                  </button>
                </div>
                <div className="flex flex-wrap items-center gap-2">
                  {dynamicSizeOptions.map((s, i) => (
                    <button
                      key={`${s.label}-${i}`}
                      onClick={() => s.available && setSelectedSize(s.label)}
                      disabled={!s.available}
                      // Specs reached for these with `button:has-text("M")`, which is a case-insensitive *substring* match and so also caught "Store Locations", "WOMEN", "Shoes".
                      data-testid="pdp-size-chip"
                      aria-pressed={selectedSize === s.label}
                      className={`h-11 w-13 rounded-md text-xs transition-all duration-150 ${
                        s.available ? 'cursor-pointer' : 'cursor-not-allowed line-through'
                      } ${
                        selectedSize === s.label
                          ? 'border-2 border-black bg-black font-semibold text-white'
                          : sizeError && !selectedSize
                            ? `border border-(--sale) bg-white font-normal ${!s.available ? 'text-[#ccc]' : 'text-black'}`
                            : `border border-[#d1d5db] bg-white font-normal ${!s.available ? 'text-[#ccc]' : 'text-black'}`
                      }`}
                    >
                      {s.label}
                    </button>
                  ))}
                </div>

                <div className="mt-3 flex items-center gap-2">
                  <MapPin size={12} className="shrink-0 text-gray-400" />
                  <p className="text-xs text-gray-500">
                    {lStoreAvailableIn}{' '}
                    <select
                      value={storeCity}
                      onChange={(e) => setStoreCity(e.target.value)}
                      className="cursor-pointer border-none bg-transparent font-[inherit] text-xs text-black underline outline-none"
                    >
                      {storeCities.map((c) => (
                        <option key={c} value={c}>
                          {c}
                        </option>
                      ))}
                    </select>{' '}
                    {lStoreStockSuffix}
                  </p>
                </div>
              </div>

              {/* Purchase Actions */}
              <div className="mb-6 flex flex-col gap-3">
                {productIsOOS ? (
                  <div className="flex w-full cursor-not-allowed items-center justify-center gap-2.5 rounded-lg bg-[#999] py-4 text-xs tracking-[0.2em] text-white uppercase select-none">
                    {lOutOfStock}
                  </div>
                ) : isComingSoon ? (
                  <div className="flex w-full cursor-not-allowed items-center justify-center gap-2.5 rounded-lg bg-[#999] py-4 text-xs tracking-[0.2em] text-white uppercase select-none">
                    {lComingSoon}
                  </div>
                ) : (
                  <button
                    onMouseEnter={() => setCartHovered(true)}
                    onMouseLeave={() => setCartHovered(false)}
                    onClick={handleAddToCart}
                    className={`flex w-full items-center justify-center gap-2.5 rounded-lg py-4 text-xs tracking-[0.2em] text-white uppercase transition-colors duration-200 focus-visible:outline-none ${
                      addedToCart ? 'bg-(--sale)' : cartHovered ? 'bg-accent' : 'bg-black'
                    }`}
                  >
                    {addedToCart ? (
                      <>
                        <Check size={15} /> {lAddedToCart}
                      </>
                    ) : (
                      <>
                        <ShoppingBag size={15} /> {isPreOrder ? lPreOrderButton : lAddToCart}
                      </>
                    )}
                  </button>
                )}

                {/* Hidden when OE returned no stores — a reservation CTA with
                    no branch behind it leads to an empty picker. */}
                {reserveStores.length > 0 && (
                  <button
                    data-testid="pdp-reserve-in-store"
                    onClick={() => {
                      // Auth-gate the reservation like reviews (see ReviewsClient).
                      if (!isLoggedIn) {
                        openLoginModal();
                        return;
                      }
                      setShowReserveModal(true);
                    }}
                    className="flex w-full items-center justify-center gap-2.5 rounded-lg border border-black py-4 text-xs tracking-[0.2em] text-black uppercase transition-colors duration-200 hover:bg-black hover:text-white focus-visible:outline-none"
                  >
                    <Store size={15} /> {lReserveInStore}
                  </button>
                )}

                <button
                  onClick={() =>
                    toggleItem({
                      id: productId || 'pdp-ribbed-cashmere-knit',
                      name: dynamicName,
                      brand: 'Kekimoro',
                      price: CURRENCY.format(dynamicPrice),
                      image: activeColorImage,
                      colors: dynamicColors.map((c) => c.hex),
                      // First variant that carries each colour is the thumbnail for that swatch on the favourites card.
                      colorImages: dynamicColors.map(
                        (c) =>
                          catalogProduct?.variants?.find((v) => v.colors.includes(c.hex))?.image ||
                          catalogProduct?.colorImages?.[dynamicColors.indexOf(c)] ||
                          dynamicImage,
                      ),
                      colorStock: dynamicColors.map((c) => c.available),
                      sizes: dynamicSizeOptions.map((s) => s.label),
                      inStock: !productIsOOS,
                      selectedColor: dynamicColors[selectedColor]?.hex,
                      selectedSize: selectedSize ?? undefined,
                    })
                  }
                  className="flex w-full items-center justify-center gap-2 rounded-lg border border-gray-200 py-3 text-xs tracking-widest uppercase transition-colors hover:border-black"
                >
                  <Heart
                    size={14}
                    style={{ fill: wishlisted ? ACCENT : 'none', stroke: wishlisted ? ACCENT : '#000' }}
                  />
                  {wishlisted ? lSavedToWishlist : lSaveToWishlist}
                </button>
              </div>

              {/* Special Offers — block identifier=special_offers, kind=bought_together (UI title: "Special Offers"). Do NOT confuse with the "You May Also Like" recommendations carousel further down the page (block identifier=recommendations_carousel, kind=similar). */}
              <ProductSpecialOffers offers={availableOffers} onAddBundle={handleAddBundle} />

              {/* Quick Delivery Snippets — all three copy strings come from the
                  `product-card` system-text set. Any row with an empty OE
                  value drops out so the section never shows a blank line. */}
              <div className="flex flex-col gap-2.5 border-t border-gray-200 pt-5">
                {deliverySnippets.map((item) => (
                  <div
                    key={item.text}
                    data-testid="pdp-delivery-snippet"
                    className="flex items-center gap-2.5 text-xs text-gray-600"
                  >
                    <span className="shrink-0 text-gray-400">{DELIVERY_ICONS[item.iconKey]}</span>
                    {item.text}
                  </div>
                ))}
              </div>

              {/* Accordions */}
              <div className="mt-8">
                <AccordionSection title={lSpecsTitle} defaultOpen>
                  <div className="grid grid-cols-2 gap-x-6 gap-y-0">
                    {productSpecs.map((spec) => (
                      <React.Fragment key={spec.key ?? spec.label}>
                        <div
                          className="border-b border-gray-100 py-2.5"
                          data-testid="product-spec-row"
                          data-spec-key={spec.key}
                        >
                          <p className="text-xs text-gray-400" data-testid="product-spec-label">
                            {spec.label}
                          </p>
                          <p className="mt-0.5 text-xs font-medium text-black">{spec.value}</p>
                        </div>
                      </React.Fragment>
                    ))}
                  </div>
                </AccordionSection>

                {(activeDescriptionHtml || (catalogProduct?.productDetails?.length ?? 0) > 0) && (
                  <AccordionSection title={lDescriptionTitle}>
                    <div className="space-y-3 text-sm leading-relaxed text-gray-700">
                      {activeDescriptionHtml && (
                        <div
                          className="oe-rich-text"
                          dangerouslySetInnerHTML={{ __html: sanitizeHtml(activeDescriptionHtml) }}
                        />
                      )}
                      {(catalogProduct?.productDetails?.length ?? 0) > 0 && (
                        <ul className="space-y-1.5 pt-2 text-xs text-gray-600">
                          {catalogProduct?.productDetails?.map((d) => (
                            <li key={d} className="flex items-center gap-2">
                              <span className="size-1 shrink-0 rounded-full bg-black" />
                              {d}
                            </li>
                          ))}
                        </ul>
                      )}
                    </div>
                  </AccordionSection>
                )}

                {deliveryRows.length > 0 && (
                  <AccordionSection title={lDeliveryTitle} defaultOpen>
                    <div className="space-y-4 text-sm text-gray-700">
                      {/* Delivery rows from OE attribute set
                        `product_card_delivery_returns`. The accordion hides
                        when none of the title keys are populated. */}
                      {deliveryRows.map((d) => {
                        const icon =
                          d.iconKey === 'returns' ? (
                            <RotateCcw size={15} />
                          ) : d.iconKey === 'store' ? (
                            <Store size={15} />
                          ) : (
                            <Truck size={15} />
                          );
                        return (
                          <div key={d.title} data-testid="pdp-delivery-row" className="flex gap-3">
                            <span className="mt-0.5 shrink-0 text-gray-400">{icon}</span>
                            <div>
                              <p data-testid="pdp-delivery-row-title" className="text-xs font-semibold">
                                {d.title}
                              </p>
                              <p className="mt-0.5 text-xs leading-relaxed text-gray-500">{d.desc}</p>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  </AccordionSection>
                )}

                {(catalogProduct?.careInstructions?.length ?? 0) > 0 && (
                  <AccordionSection title={lCareTitle}>
                    <div className="flex flex-wrap gap-4 text-xs text-gray-600">
                      {/* Care instructions from OE (`careinstructions_18` list).
                          Each list value is matched against the local symbol map
                          so common phrases like "Do not bleach" still render
                          their icon. The section hides entirely when OE has no
                          care values for this product. */}
                      {catalogProduct?.careInstructions?.map((text) => (
                        <div key={text} className="flex items-center gap-1.5">
                          <span>{careSymbolFor(text)}</span>
                          <span>{text}</span>
                        </div>
                      ))}
                    </div>
                  </AccordionSection>
                )}
              </div>
            </div>
          </div>
        </div>

        {/* Reviews — streamed via Suspense from the page-level server
            component; falls back to the placeholder skeleton while OE is
            still resolving the form-data records. */}
        <div ref={reviewsRef}>{reviewsSlot}</div>

        {/* "You May Also Like" — same pattern: skeleton first, then the
            statistics-driven product list streams in. Wrapped in the same
            `<div>` shape as `reviewsSlot` above so React 19's key-tracking
            heuristic treats both streaming boundaries uniformly. */}
        <div>{recommendationsSlot}</div>

        {/* OE-attached product blocks (admin-ordered by `position`).
            Renders below the recommendations carousel so any curated
            "you'll also love" / "matching accessories" blocks attached
            to this product in OE surface without displacing the streamed
            frequently-ordered section. */}
        {productBlocks && productBlocks.length > 0 && <PageBlocksRenderer blocks={productBlocks} />}

        <RecentlyViewedSection products={allRecentlyViewed} accentColor={ACCENT} />
      </main>

      {showSizeGuide && <SizeGuideModal onClose={() => setShowSizeGuide(false)} />}
      {showReserveModal && (
        <ReserveInStoreModal
          onClose={() => setShowReserveModal(false)}
          preselectedSize={selectedSize}
          sizeOptions={dynamicSizeOptions}
          stores={reserveStores}
        />
      )}
    </div>
  );
}
