'use client'
import React, { useState, useRef, useEffect, useMemo } from 'react';
import { useRouter, useParams, useSearchParams, notFound } from 'next/navigation';
import {
  hexToColorName,
  type CatalogProduct,
} from '../data/productCatalog';
import { type SpecialOffer } from '../data/specialOffers';
import { Header } from '../components/Header';
import { Footer } from '../components/Footer';
import { useSelector, useDispatch } from 'react-redux';
import type { RootState, AppDispatch } from '../store';
import { recentlyViewedActions } from '../store/recentlyViewedSlice';
import { pushRecentlyViewedAction } from '../../lib/oneentry/auth/actions';
import { getProductsByIdsAction } from '../../lib/oneentry/catalog/products-action';
import { trackActivity } from '../utils/track-activity';
import { useAuth } from '../context/AuthContext';
import { useWishlist } from '../context/WishlistContext';
import { useCart } from '../context/CartContext';
import {
  ChevronLeft, ChevronRight,
  Heart, ShoppingBag, Store, Truck, RotateCcw, Shield,
  Ruler, MapPin, Check,
} from 'lucide-react';

import { StarRating } from './product/StarRating';
import { AccordionSection } from './product/AccordionSection';
import { SizeGuideModal } from './product/SizeGuideModal';
import { ProductGallery } from './product/ProductGallery';
import { ReserveInStoreModal } from './product/ReserveInStoreModal';
import { ProductSpecialOffers } from './product/ProductSpecialOffers';
import { RecentlyViewedSection } from './product/RecentlyViewedSection';
import { ProductShareDropdown } from './product/ProductShareDropdown';
import { useProductPageUIState } from './product/useProductPageUIState';

import { ACCENT_WOMEN as ACCENT, SALE_COLOR } from '../constants/colors';
import { strikeColor } from '../utils/colorUtils';
import { useAnnounce } from '../hooks/useAnnounce';
import { PRODUCT_PRICE_NOTE, PRODUCT_ACTION_LABELS, PRODUCT_ACCORDION_LABELS as PA, PRODUCT_BREADCRUMB_LABELS as PB, PRODUCT_DEFAULTS as PD } from '../data/productPageLabels';
import { useProductCardT } from '../../lib/oneentry/labels/ProductCardLabelsContext';
import { usePdpT } from '../../lib/oneentry/labels/PdpLabelsContext';
import { CURRENCY } from '../data/currencyConfig';

const DELIVERY_ICONS = {
  truck:  <Truck size={14} />,
  return: <RotateCcw size={14} />,
  shield: <Shield size={14} />,
} as const;

/** Map common OE care-instruction phrases to their emoji symbol. Unknown
 *  phrases get a generic tag icon so the row still renders. */
const CARE_SYMBOL_MAP: Array<[RegExp, string]> = [
  [/hand\s*wash/i,    '\u{1F9BA}'],
  [/machine\s*wash/i, '\u{1F9FA}'],
  [/no\s*tumble|do\s*not\s*tumble/i, '\u{1F6AB}'],
  [/iron/i,           '♨'],
  [/bleach/i,         '\u{1F9F4}'],
  [/dry\s*clean/i,    '\u{1F9F9}'],
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
}: {
  initialProduct?: CatalogProduct;
  /** Breadcrumb labels derived from the product's OE category path
   *  (e.g. `['Women', 'Clothing', 'Costumes']`). */
  categoryBreadcrumbs?: string[];
  /** Streamed customer-reviews block — a `<Suspense>`-wrapped async server
   *  component that fetches `review_feedback`/`review_rating` form-data. The
   *  page-level component just slots whatever the parent passes in. */
  reviewsSlot?: React.ReactNode;
  /** Streamed "You May Also Like" carousel (OE `frequently_ordered_block`). */
  recommendationsSlot?: React.ReactNode;
  /** Gender taxonomy of the current product — used to filter the
   *  client-side "Recently Viewed" carousel so men only see men's items and
   *  women only see women's (unisex always passes through). */
  currentGender?: 'W' | 'M' | 'U' | '';
} = {}) {
  const router = useRouter();
  const lReviewsSuffix  = useProductCardT('product-card-reviews',                  PRODUCT_ACTION_LABELS.reviewsSuffix);
  const lSizeGuide      = useProductCardT('product-card-size-guide',               PRODUCT_ACTION_LABELS.sizeGuide);
  const lAddToCart      = useProductCardT('product-card_add_to_cart_cta',          PRODUCT_ACTION_LABELS.addToCart);
  const lReserveInStore = useProductCardT('product-card_reserve_in_store_cta',     PRODUCT_ACTION_LABELS.reserveInStore);
  const lSaveToWishlist = useProductCardT('product-card-save_to_wishlist_cta',     PD.saveToWishlist);
  const lPriceNote      = useProductCardT('product-card-vat',                      PRODUCT_PRICE_NOTE);
  // Static UI strings — wired through OE so admins can override copy without
  // a code change. Each key falls back to the legacy hardcoded English when
  // the system-text set doesn't contain it.
  const lBonusHeading       = usePdpT('earn_360_bonus_points',       'earn_360_bonus_points_title', PRODUCT_ACTION_LABELS.bonusHeading);
  const lBonusBody          = usePdpT('earn_360_bonus_points',       'earn_360_bonus_points_text',  PRODUCT_ACTION_LABELS.bonusBody);
  const lColorLabel         = useProductCardT('product-card-color_label',          PRODUCT_ACTION_LABELS.colorLabel);
  const lSizeLabel          = useProductCardT('product-card-size_label',           PRODUCT_ACTION_LABELS.sizeLabel);
  const lSizeError          = useProductCardT('product-card-size_error',           PRODUCT_ACTION_LABELS.sizeError);
  const lStoreAvailableIn   = useProductCardT('product-card-available_in_store',   PRODUCT_ACTION_LABELS.storeAvailableIn);
  const lStoreStockSuffix   = useProductCardT('product-card-in_stock_today',       PRODUCT_ACTION_LABELS.storeStockSuffix);
  const lStoreCitiesRaw     = useProductCardT('product-card-store_cities',         PRODUCT_ACTION_LABELS.defaultCities.join(','));
  const lOutOfStock         = useProductCardT('product-card-out_of_stock',         PRODUCT_ACTION_LABELS.outOfStock);
  const lOutOfStockTitle    = useProductCardT('product-card-color_oos_title',      PRODUCT_ACTION_LABELS.outOfStockTitle);
  const lInStock            = useProductCardT('product-card-in_stock',             PRODUCT_ACTION_LABELS.inStock);
  const lSkuPrefix          = useProductCardT('product-card-sku_label',            PRODUCT_ACTION_LABELS.skuLabel);
  const lArticlePrefix      = useProductCardT('product-card-article_label',        PRODUCT_ACTION_LABELS.articleLabel);
  const lSpecsTitle         = useProductCardT('product-card-accordion_specs',      PA.specificationsTitle);
  const lDescriptionTitle   = useProductCardT('product-card-accordion_description', PA.descriptionTitle);
  const lDeliveryTitle      = useProductCardT('product-card-accordion_delivery',   PA.deliveryTitle);
  const lCareTitle          = useProductCardT('product-card-accordion_care',       PA.careTitle);
  const lFreeDelivery       = useProductCardT('product-card_free_delivery',        '');
  const lFreeReturns        = useProductCardT('product-card_free_returns',         '');
  const lSecureCheckout     = useProductCardT('product-card_secure_checkout',      '');
  const deliverySnippets = [
    { iconKey: 'truck'  as const, text: lFreeDelivery },
    { iconKey: 'return' as const, text: lFreeReturns },
    { iconKey: 'shield' as const, text: lSecureCheckout },
  ].filter((row) => row.text.length > 0);
  const storeCities         = lStoreCitiesRaw.split(',').map(s => s.trim()).filter(Boolean);

  // Delivery accordion rows — backed by OE's `product_card_delivery_returns`
  // system-text set. Each row is title + description; if the key is missing,
  // the row is hidden via `.filter(r => r.title)` below.
  const deliveryRows: Array<{ iconKey: 'truck' | 'store' | 'returns'; title: string; desc: string }> = [
    {
      iconKey: 'truck' as const,
      title: usePdpT('product_card_delivery_returns', 'p_c_d_r_standart_delivery_title', ''),
      desc:  usePdpT('product_card_delivery_returns', 'p_c_d_r_standart_delivery_text',  ''),
    },
    {
      iconKey: 'truck' as const,
      title: usePdpT('product_card_delivery_returns', 'p_c_d_r_express_delivery_title', ''),
      desc:  usePdpT('product_card_delivery_returns', 'p_c_d_r_express_delivery_text',  ''),
    },
    {
      iconKey: 'store' as const,
      title: usePdpT('product_card_delivery_returns', 'p_c_d_r_click_collect_title', ''),
      desc:  usePdpT('product_card_delivery_returns', 'p_c_d_r_click_collect_text',  ''),
    },
    {
      iconKey: 'returns' as const,
      title: usePdpT('product_card_delivery_returns', 'p_c_d_r_returns_title', ''),
      desc:  usePdpT('product_card_delivery_returns', 'p_c_d_r_returns_text',  ''),
    },
  ].filter((row) => row.title.length > 0);
  const params = useParams();
  const productId = (params?.id as string) ?? '';
  const catalogProduct = initialProduct;

  if (productId && !catalogProduct) notFound();

  const categoryViewAllHref = (() => {
    const id = productId;
    if (id.startsWith('wc-')) return '/women/clothing';
    if (id.startsWith('mc-')) return '/men/clothing';
    if (id.startsWith('ws-')) return '/women/shoes';
    if (id.startsWith('ms-')) return '/men/shoes';
    if (id.startsWith('wb-')) return '/women/bags';
    if (id.startsWith('mb-')) return '/men/bags';
    if (id.startsWith('wa-')) return '/women/accessories';
    if (id.startsWith('ma-')) return '/men/accessories';
    return '/women/clothing';
  })();

  const productIsOOS = catalogProduct?.inStock === false;

  // Route guard above already returned 404 when productId has no catalogProduct,
  // so by this point catalogProduct is always defined. The `?.` is kept solely
  // for the TS narrowing — runtime never falls back.
  const dynamicName = catalogProduct?.name ?? PD.fallbackName;
  const dynamicPrice = catalogProduct?.salePrice ?? catalogProduct?.price ?? 0;
  const dynamicOriginalPrice = catalogProduct?.salePrice ? catalogProduct.price : null;
  const dynamicImage = catalogProduct?.image ?? '';
  const dynamicGallery = catalogProduct?.galleryImages ?? (catalogProduct ? Array(5).fill(catalogProduct.image) : []);
  const dynamicColors = useMemo(() => (
    (catalogProduct?.colors ?? []).map((hex, idx) => ({
      name: hexToColorName(hex),
      hex,
      available: productIsOOS ? false : (catalogProduct?.colorStock ? catalogProduct.colorStock[idx] !== false : true),
    }))
  ), [catalogProduct, productIsOOS]);

  const productSizeOptions = catalogProduct?.sizeOptions ?? [];
  const dynamicSizeOptions = productSizeOptions.map(s => ({ ...s, available: productIsOOS ? false : s.available }));
  const productSpecs = catalogProduct?.specs ?? [];
  // Reviews now stream in as a slot (`reviewsSlot`) rendered by a Suspense
  // boundary higher up. The page-level component only needs the bundled
  // `reviews` field on the OE catalog product for the small star-rating
  // summary next to the title; full review cards live in the streamed block.
  const productReviews = catalogProduct?.reviews ?? [];

  // Special offer bundles aren't sourced from OneEntry on this tenant — the
  // section stays empty until the admin wires a block. Removing the legacy
  // mock keeps fake products from leaking into the page.
  const specialOffers: SpecialOffer[] = [];
  const availableOffers: SpecialOffer[] = productIsOOS ? [] : specialOffers;

  const searchParams = useSearchParams();
  const rawColor = searchParams?.get('color');
  const initColorHex = rawColor && /^#[0-9A-Fa-f]{6}$/.test(rawColor) ? rawColor : null;
  const initSize = searchParams?.get('size') ?? null;
  const initColorIdx = initColorHex
    ? Math.max(0, dynamicColors.findIndex(c => c.hex === initColorHex))
    : 0;

  const [selectedColor, setSelectedColor] = useState(initColorIdx);
  const [selectedSize, setSelectedSize] = useState<string | null>(initSize);
  const [sizeError, setSizeError] = useState(false);

  const activeColorImage = catalogProduct?.colorImages?.[selectedColor] ?? dynamicImage;

  const isFirstMount = useRef(true);
  const { toggleItem, isWishlisted, updateSelection } = useWishlist();

  useEffect(() => {
    if (isFirstMount.current) { isFirstMount.current = false; return; }
    if (!productId || !isWishlisted(productId)) return;
    updateSelection(
      productId,
      dynamicColors[selectedColor]?.hex,
      selectedSize ?? undefined,
    );
  }, [selectedColor, selectedSize, productId, isWishlisted, updateSelection, dynamicColors]);

  const cart = useCart();
  const dispatch = useDispatch<AppDispatch>();
  const { isLoggedIn, user } = useAuth();
  const recentlyViewed = useSelector((state: RootState) => state.recentlyViewed.items);
  const allRecentlyViewed = recentlyViewed
    .filter(p => p.id !== productId)
    .filter(p => !currentGender || currentGender === 'U' || !p.gender || p.gender === currentGender || p.gender === 'U');
  // "You May Also Like" — streamed in by the parent via `recommendationsSlot`.

  // 1) Local: prepend the current product to the Redux trail for instant UX.
  // 2) Server: when the visitor is signed in, persist the view to user.state
  //    so the trail follows them across devices. Fire-and-forget — UI doesn't
  //    block on the round-trip.
  useEffect(() => {
    if (!catalogProduct) return;
    dispatch(recentlyViewedActions.addProduct({
      id: catalogProduct.id,
      name: catalogProduct.name,
      brand: catalogProduct.brand,
      price: CURRENCY.format(catalogProduct.price),
      ...(catalogProduct.salePrice !== undefined && { salePrice: CURRENCY.format(catalogProduct.salePrice) }),
      image: catalogProduct.image,
      colors: catalogProduct.colors,
      ...(catalogProduct.badge && { label: catalogProduct.badge }),
    }));
    const numeric = Number(catalogProduct.id);
    if (Number.isFinite(numeric) && numeric > 0) {
      trackActivity({ type: 'product_view', productId: numeric });
      if (isLoggedIn) void pushRecentlyViewedAction(numeric);
    }
  }, [productId, catalogProduct, dispatch, isLoggedIn]);

  // Hydrate the Redux trail from `user.recentlyViewedItems` on login — these
  // are server-stored {productId, viewedAt} pairs that need catalog enrichment
  // to render as full ProductCards. Runs once after auth bootstraps.
  const hydratedRef = useRef(false);
  useEffect(() => {
    if (!isLoggedIn || !user?.recentlyViewedItems || hydratedRef.current) return;
    if (user.recentlyViewedItems.length === 0) return;
    hydratedRef.current = true;
    const ids = user.recentlyViewedItems
      .map(it => Number(it.productId))
      .filter(n => Number.isFinite(n));
    void getProductsByIdsAction(ids).then(enriched => {
      const byId = new Map(enriched.map(p => [p.id, p]));
      const items = user.recentlyViewedItems
        .map(it => {
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
    const offer = specialOffers.find(o => o.id === offerId);
    if (!offer) return;
    cart.addBundle(offer.products.map((p, idx) => ({
      id: `${offerId}-item-${idx}`,
      name: p.name,
      brand: PD.fallbackBrand,
      color: idx === 0 ? dynamicColors[selectedColor].name : PD.fallbackColorName,
      sku: `BUNDLE-${offerId.toUpperCase()}-${idx + 1}`,
      size: idx === 0 && selectedSize ? selectedSize : PD.fallbackSize,
      quantity: 1,
      price: parseFloat(p.salePrice.match(/[\d.]+/)?.[0] ?? '0') || 0,
      originalPrice: parseFloat(p.originalPrice.match(/[\d.]+/)?.[0] ?? '0') || 0,
      image: p.image,
    })));
    cart.openMiniCart();
  };

  const wishlisted = isWishlisted(productId || 'pdp-ribbed-cashmere-knit');
  const announce = useAnnounce();
  const {
    addedToCart, cartHovered, setCartHovered,
    showSizeGuide, setShowSizeGuide,
    showReserveModal, setShowReserveModal,
    storeCity, setStoreCity,
    showShare, setShowShare,
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

  const handleAddToCart = () => {
    if (!selectedSize) {
      setSizeError(true);
      if (sizeErrorTimerRef.current) clearTimeout(sizeErrorTimerRef.current);
      sizeErrorTimerRef.current = setTimeout(() => setSizeError(false), 2000);
      return;
    }
    cart.addItem({
      id: productId || 'pdp-ribbed-cashmere-knit',
      name: dynamicName,
      brand: PD.fallbackBrand,
      color: dynamicColors[selectedColor].name,
      sku: catalogProduct?.specs?.find(s => s.label === 'SKU')?.value ?? productId,
      size: selectedSize,
      quantity: 1,
      price: dynamicPrice,
      originalPrice: dynamicOriginalPrice ?? undefined,
      image: activeColorImage,
    });
    cart.openMiniCart();
    markAddedToCart();
    announce(PRODUCT_ACTION_LABELS.announceAddedToCart(dynamicName));
  };

  // Small star-rating summary next to the title — uses whatever reviews the
  // initial OE catalog product carries. The full reviews block (with its own
  // aggregation) streams in via `reviewsSlot` below.
  const avgRating = productReviews.length > 0
    ? productReviews.reduce((s, r) => s + r.rating, 0) / productReviews.length
    : 0;

  return (
    <div
      className="min-h-screen bg-white font-[Inter,sans-serif]"
      style={{ '--sale': SALE_COLOR, '--accent': ACCENT } as React.CSSProperties}
    >
      <Header />

      <main id="main-content">
        {/* Back button */}
        <div className="px-4 lg:px-8 pt-4">
          <button
            onClick={() => router.back()}
            className="flex items-center gap-1.5 text-sm text-gray-500 hover:text-black transition-colors"
          >
            <ChevronLeft size={16} />
            {PB.back}
          </button>
        </div>

        {/* Breadcrumb — labels derived from the OE category path so each
            product gets its real taxonomy chain. The leading "Home" anchor
            links back to the storefront root. */}
        <div className="px-4 lg:px-8 py-3 border-b border-gray-200">
          <nav className="flex items-center gap-1.5 text-xs text-gray-400 flex-wrap">
            <a href="/" className="hover:text-black transition-colors">{PB.home}</a>
            {categoryBreadcrumbs.map((crumb, i) => (
              <React.Fragment key={`${crumb}-${i}`}>
                <ChevronRight size={11} className="flex-shrink-0" />
                <span className="text-gray-400">{crumb}</span>
              </React.Fragment>
            ))}
            <ChevronRight size={11} className="flex-shrink-0" />
            <span className="text-black truncate max-w-[200px]">{dynamicName}</span>
          </nav>
        </div>

        {/* Main Product Section */}
        <div className="px-4 lg:px-8 py-6 lg:py-10">
          <div className="flex flex-col lg:flex-row gap-8 lg:gap-14 max-w-screen-xl mx-auto">

            {/* Gallery */}
            <div className="w-full lg:w-[55%] xl:w-[58%] lg:sticky lg:top-[132px] lg:self-start">
              <ProductGallery images={dynamicGallery} productName={dynamicName} />
            </div>

            {/* Product Info */}
            <div className="w-full lg:w-[45%] xl:w-[42%]">

              {/* Brand + Share */}
              <div className="flex items-center justify-between mb-2">
                <a href="/women/clothing" className="text-xs tracking-[0.2em] uppercase text-gray-500 hover:text-black transition-colors">
                  {PD.fallbackBrand}
                </a>
                <ProductShareDropdown
                  shareRef={shareRef}
                  showShare={showShare}
                  setShowShare={setShowShare}
                  copied={copied}
                  onCopyLink={handleCopyLink}
                />
              </div>

              {/* Product Name */}
              <h1 className="mb-2 text-[1.35rem] font-semibold leading-[1.3]">
                {dynamicName}
              </h1>

              {/* Rating Row */}
              <div className="flex items-center gap-3 mb-3">
                <StarRating rating={avgRating} size={15} />
                <button
                  onClick={() => {
                    if (!reviewsRef.current) return;
                    const top = reviewsRef.current.getBoundingClientRect().top + window.scrollY - 120;
                    window.scrollTo({ top, behavior: 'smooth' });
                  }}
                  className="text-xs text-gray-500 hover:text-black underline transition-colors"
                >
                  {productReviews.length} {lReviewsSuffix}
                </button>
                <span className="text-xs text-gray-300">|</span>
                <span className="text-xs font-medium text-[#2E8B57]">{lInStock}</span>
              </div>

              {/* SKU */}
              <p className="text-xs text-gray-400 mb-4">
                {lSkuPrefix} <span className="text-gray-600">{catalogProduct?.specs?.find(s => s.label === 'SKU')?.value ?? PRODUCT_ACTION_LABELS.defaultSku}</span>
                &nbsp;·&nbsp; {lArticlePrefix} <span className="text-gray-600">{catalogProduct?.specs?.find(s => s.label === 'Article')?.value ?? PRODUCT_ACTION_LABELS.defaultArticle}</span>
              </p>

              {/* Price Block */}
              <div className="flex items-baseline gap-3 mb-1">
                <span className={`text-2xl font-bold ${dynamicOriginalPrice ? 'text-[var(--sale)]' : 'text-black'}`}>
                  {CURRENCY.format(dynamicPrice)}
                </span>
                {dynamicOriginalPrice && (
                  <>
                    <span className="text-base text-gray-400 line-through font-normal">{CURRENCY.format(dynamicOriginalPrice)}</span>
                    <span className="px-2 py-0.5 text-white text-xs tracking-widest uppercase bg-[var(--sale)] rounded-none font-semibold">
                      −{Math.round((1 - dynamicPrice / dynamicOriginalPrice) * 100)}%
                    </span>
                  </>
                )}
              </div>
              <p className="text-xs text-gray-400 mb-4">{lPriceNote}</p>

              {/* Purchase Bonus */}
              <div className="flex items-center gap-2.5 px-4 py-3 mb-6 bg-[#fff8f0] border border-[#ffe0b2]">
                <span className="text-base">🎁</span>
                <div>
                  <p className="text-xs font-semibold text-[#b45309]">{lBonusHeading}</p>
                  <p className="text-xs text-gray-500">{lBonusBody}</p>
                </div>
              </div>

              {/* Color Selection */}
              <div className="mb-5">
                <div className="flex items-center justify-between mb-2.5">
                  <span className="text-xs tracking-[0.12em] uppercase font-semibold">
                    {lColorLabel} <span className="font-normal">{dynamicColors[selectedColor]?.name}</span>
                  </span>
                </div>
                <div className="flex items-center gap-2 flex-wrap">
                  {dynamicColors.map((c, i) => (
                    <button
                      key={c.name}
                      onClick={() => setSelectedColor(i)}
                      disabled={!c.available}
                      className={`relative group w-8 h-8 rounded-none outline-offset-2 ${
                        selectedColor === i ? 'border-2 border-black outline outline-1 outline-black' : 'border-[1.5px] border-[#e0e0e0]'
                      } ${c.available ? 'opacity-100 cursor-pointer' : 'opacity-[0.35] cursor-not-allowed'} ${
                        c.hex === '#FFFFFF' ? 'shadow-[inset_0_0_0_1px_#ddd]' : ''
                      }`}
                      title={c.name + (!c.available ? lOutOfStockTitle : '')}
                      style={{ backgroundColor: c.hex }}
                    >
                      {!c.available && (
                        <span className="absolute inset-0 flex items-center justify-center pointer-events-none">
                          <span className="block w-full h-px rotate-45" style={{ backgroundColor: strikeColor(c.hex) }} />
                        </span>
                      )}
                    </button>
                  ))}
                </div>
              </div>

              {/* Size Selection */}
              <div className="mb-6">
                <div className="flex items-center justify-between mb-2.5">
                  <span className="text-xs tracking-[0.12em] uppercase font-semibold">
                    {lSizeLabel}{selectedSize ? `: ${selectedSize}` : ''}
                    {sizeError && (
                      <span className="ml-2 text-xs font-normal normal-case tracking-normal text-[var(--sale)]">
                        {lSizeError}
                      </span>
                    )}
                  </span>
                  <button
                    onClick={() => setShowSizeGuide(true)}
                    className="flex items-center gap-1 text-xs text-gray-500 hover:text-black transition-colors underline"
                  >
                    <Ruler size={11} /> {lSizeGuide}
                  </button>
                </div>
                <div className="flex items-center gap-2 flex-wrap">
                  {dynamicSizeOptions.map(s => (
                    <button
                      key={s.label}
                      onClick={() => s.available && setSelectedSize(s.label)}
                      disabled={!s.available}
                      className={`transition-all duration-150 text-xs w-[52px] h-11 rounded-md ${
                        s.available ? 'cursor-pointer' : 'cursor-not-allowed line-through'
                      } ${
                        selectedSize === s.label
                          ? 'border-2 border-black bg-black text-white font-semibold'
                          : sizeError && !selectedSize
                            ? `border border-[var(--sale)] bg-white font-normal ${!s.available ? 'text-[#ccc]' : 'text-black'}`
                            : `border border-[#d1d5db] bg-white font-normal ${!s.available ? 'text-[#ccc]' : 'text-black'}`
                      }`}
                    >
                      {s.label}
                    </button>
                  ))}
                </div>

                <div className="flex items-center gap-2 mt-3">
                  <MapPin size={12} className="text-gray-400 flex-shrink-0" />
                  <p className="text-xs text-gray-500">
                    {lStoreAvailableIn}{' '}
                    <select
                      value={storeCity}
                      onChange={e => setStoreCity(e.target.value)}
                      className="text-xs underline bg-transparent border-none outline-none cursor-pointer text-black font-[inherit]"
                    >
                      {storeCities.map(c => (
                        <option key={c} value={c}>{c}</option>
                      ))}
                    </select>
                    {' '}{lStoreStockSuffix}
                  </p>
                </div>
              </div>

              {/* Purchase Actions */}
              <div className="flex flex-col gap-3 mb-6">
                {productIsOOS ? (
                  <div className="w-full py-4 flex items-center justify-center gap-2.5 text-xs tracking-[0.2em] uppercase text-white cursor-not-allowed select-none bg-[#999] rounded-lg">
                    {lOutOfStock}
                  </div>
                ) : (
                  <button
                    onMouseEnter={() => setCartHovered(true)}
                    onMouseLeave={() => setCartHovered(false)}
                    onClick={handleAddToCart}
                    className={`w-full py-4 flex items-center justify-center gap-2.5 text-xs tracking-[0.2em] uppercase text-white focus-visible:outline-none transition-colors duration-200 rounded-lg ${
                      addedToCart ? 'bg-[var(--sale)]' : cartHovered ? 'bg-[var(--accent)]' : 'bg-black'
                    }`}
                  >
                    {addedToCart
                      ? <><Check size={15} /> {PRODUCT_ACTION_LABELS.addedToCart}</>
                      : <><ShoppingBag size={15} /> {lAddToCart}</>}
                  </button>
                )}

                <button
                  onClick={() => setShowReserveModal(true)}
                  className="w-full py-4 flex items-center justify-center gap-2.5 text-xs tracking-[0.2em] uppercase text-black border border-black hover:bg-black hover:text-white focus-visible:outline-none transition-colors duration-200 rounded-lg"
                >
                  <Store size={15} /> {lReserveInStore}
                </button>

                <button
                  onClick={() => toggleItem({ id: productId || 'pdp-ribbed-cashmere-knit', name: dynamicName, brand: 'ONEENTRY', price: CURRENCY.format(dynamicPrice), image: activeColorImage, colors: dynamicColors.map(c => c.hex), colorStock: dynamicColors.map(c => c.available), sizes: dynamicSizeOptions.map(s => s.label), inStock: !productIsOOS, selectedColor: dynamicColors[selectedColor]?.hex, selectedSize: selectedSize ?? undefined })}
                  className="w-full py-3 flex items-center justify-center gap-2 text-xs tracking-widest uppercase border border-gray-200 hover:border-black transition-colors rounded-lg"
                >
                  <Heart size={14} fill={wishlisted ? ACCENT : 'none'} stroke={wishlisted ? ACCENT : '#000'} />
                  {wishlisted ? PD.savedToWishlist : lSaveToWishlist}
                </button>
              </div>

              {/* Special Offers — block identifier=special_offers, kind=bought_together (UI title: "Special Offers"). Do NOT confuse with the "You May Also Like" recommendations carousel further down the page (block identifier=recommendations_carousel, kind=similar). */}
              <ProductSpecialOffers offers={availableOffers} onAddBundle={handleAddBundle} />

              {/* Quick Delivery Snippets — all three copy strings come from the
                  `product-card` system-text set. Any row with an empty OE
                  value drops out so the section never shows a blank line. */}
              <div className="flex flex-col gap-2.5 pt-5 border-t border-gray-200">
                {deliverySnippets.map(item => (
                  <div key={item.text} className="flex items-center gap-2.5 text-xs text-gray-600">
                    <span className="flex-shrink-0 text-gray-400">{DELIVERY_ICONS[item.iconKey]}</span>
                    {item.text}
                  </div>
                ))}
              </div>

              {/* Accordions */}
              <div className="mt-8">
                <AccordionSection title={lSpecsTitle} defaultOpen>
                  <div className="grid grid-cols-2 gap-x-6 gap-y-0">
                    {productSpecs.map(spec => (
                      <React.Fragment key={spec.label}>
                        <div className="py-2.5 border-b border-gray-100">
                          <p className="text-xs text-gray-400">{spec.label}</p>
                          <p className="text-xs text-black mt-0.5 font-medium">{spec.value}</p>
                        </div>
                      </React.Fragment>
                    ))}
                  </div>
                </AccordionSection>

                {(catalogProduct?.descriptionHtml || (catalogProduct?.productDetails?.length ?? 0) > 0) && (
                  <AccordionSection title={lDescriptionTitle}>
                    <div className="text-sm text-gray-700 leading-relaxed space-y-3">
                      {/* Rich-text description from OE (`productdescription_6`). */}
                      {catalogProduct?.descriptionHtml && (
                        <div
                          className="oe-rich-text"
                          // OE HTML is authored in the trusted admin; render as-is so
                          // <p>/<ul>/<strong>/etc. styles come through.
                          dangerouslySetInnerHTML={{ __html: catalogProduct.descriptionHtml }}
                        />
                      )}
                      {(catalogProduct?.productDetails?.length ?? 0) > 0 && (
                        <ul className="space-y-1.5 text-xs text-gray-600 pt-2">
                          {catalogProduct!.productDetails!.map((d) => (
                            <li key={d} className="flex items-center gap-2">
                              <span className="w-1 h-1 bg-black rounded-full flex-shrink-0" />
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
                    {deliveryRows.map(d => {
                      const icon = d.iconKey === 'returns'
                        ? <RotateCcw size={15} />
                        : d.iconKey === 'store'
                          ? <Store size={15} />
                          : <Truck size={15} />;
                      return (
                        <div key={d.title} className="flex gap-3">
                          <span className="flex-shrink-0 mt-0.5 text-gray-400">{icon}</span>
                          <div>
                            <p className="text-xs font-semibold">{d.title}</p>
                            <p className="text-xs text-gray-500 mt-0.5 leading-relaxed">{d.desc}</p>
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
                      {catalogProduct!.careInstructions!.map(text => (
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
            statistics-driven product list streams in. */}
        {recommendationsSlot}

        <RecentlyViewedSection products={allRecentlyViewed} accentColor={ACCENT} />
      </main>

      <Footer />

      {showSizeGuide && <SizeGuideModal onClose={() => setShowSizeGuide(false)} />}
      {showReserveModal && <ReserveInStoreModal onClose={() => setShowReserveModal(false)} preselectedSize={selectedSize} sizeOptions={dynamicSizeOptions} />}
    </div>
  );
}
