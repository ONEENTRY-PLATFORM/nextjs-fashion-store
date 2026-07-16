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
// PRODUCT_DEFAULTS (`PD`) now only holds admin-controllable copy fallbacks
// (`saveToWishlist`, `savedToWishlist`) — anything referring to product data
// (name/brand/price/size/colour) comes from `catalogProduct` / OneEntry.
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
  bonusPoints,
  categoryViewAllHref = '/',
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
  /** Bonus points earned when purchasing this product, resolved server-side
   *  from the OE `purchase-of-goods` discount rule. `undefined` (or `0`) hides
   *  the "Earn X bonus points" block entirely. */
  bonusPoints?: number;
  /** Href for the "View all in this category" link — derived from the product's
   *  OE `categories` path server-side. When absent (or `'/'`), used as a
   *  passthrough to the recommendations carousel. */
  categoryViewAllHref?: string;
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
  const lPreOrder           = useProductCardT('product-card-pre_order',            PRODUCT_ACTION_LABELS.preOrder);
  const lPreOrderButton     = useProductCardT('product-card-pre_order_button',     PRODUCT_ACTION_LABELS.preOrderButton);
  const lComingSoon         = useProductCardT('product-card-coming_soon',          PRODUCT_ACTION_LABELS.comingSoon);
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

  const productIsOOS = catalogProduct?.inStock === false;

  // Route guard above already returned 404 when productId has no catalogProduct,
  // so by this point catalogProduct is always defined. The `?.` is kept solely
  // for the TS narrowing — runtime never falls back.
  const dynamicName = catalogProduct?.name ?? '';
  const dynamicBrand = catalogProduct?.brand ?? '';
  const dynamicImage = catalogProduct?.image ?? '';
  const dynamicColors = useMemo(() => (
    (catalogProduct?.colors ?? []).map((hex, idx) => ({
      name: hexToColorName(hex),
      hex,
      available: productIsOOS ? false : (catalogProduct?.colorStock ? catalogProduct.colorStock[idx] !== false : true),
    }))
  ), [catalogProduct, productIsOOS]);

  const productSizeOptions = catalogProduct?.sizeOptions ?? [];
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
  const initSize = searchParams?.get('size')
    ?? (productSizeOptions.length === 1 ? productSizeOptions[0].label : null);
  // Accept either hex (`#FFC0CB`) or OE colour name (`Pink`) so links coming
  // from either the PDP (writes hex) or ProductCard/QuickView (writes OE name)
  // both resolve to the intended swatch.
  const initColorIdx = (() => {
    if (!rawColor) return 0;
    const norm = rawColor.toLowerCase().trim();
    const idx = dynamicColors.findIndex(
      (c) => c.hex.toLowerCase() === norm || c.name.toLowerCase() === norm,
    );
    return idx >= 0 ? idx : 0;
  })();

  const [selectedColor, setSelectedColor] = useState(initColorIdx);
  const [selectedSize, setSelectedSize] = useState<string | null>(initSize);
  const [sizeError, setSizeError] = useState(false);

  // Refine each size's availability against the currently selected colour:
  // OE may have `Red / 2XS` in stock but `Blue / 2XS` sold out. When the
  // shopper picks Blue, 2XS should render as line-through even though the
  // colour-agnostic flag from the adapter says it's globally available.
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

  // Active variant follows selected colour first; when a size is also picked
  // we look for the exact combo (some variants share a colour but differ by
  // size / price / SKU). Falls back to the colour-first match so the shopper
  // always sees the swatch's data reflected in the page.
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

  const activeColorImage = activeVariant?.image
    || catalogProduct?.colorImages?.[selectedColor]
    || dynamicImage;

  // Price / gallery / SKU follow the active variant when the linked product
  // carries its own copy; otherwise we fall back to the parent product
  // (mirrors how the shopper sees the swatch as picking a whole variant).
  // Effective full/sale must come from the SAME source so the rendered
  // percent isn't off by a variant. Previously `dynamicPrice` fell through
  // `activeVariant.price ?? catalogProduct.salePrice ?? catalogProduct.price`
  // (variant full → family sale) while `dynamicOriginalPrice` only looked at
  // `catalogProduct.salePrice`, so an OE tenant that stored a family-level
  // discount would render "$35 / $35 / −0%" whenever a variant reported the
  // full price. Anchor both derivations to the same `activeVariant` (fall
  // back to the family) and only surface the sale UI when the discount
  // rounds to at least 1% — sub-cent OE discounts otherwise ship as `−0%`.
  const effectiveFull = activeVariant?.price ?? catalogProduct?.price ?? 0;
  const effectiveSale = activeVariant?.salePrice ?? catalogProduct?.salePrice;
  const hasVisibleDiscount =
    typeof effectiveSale === 'number' &&
    effectiveFull > 0 &&
    effectiveSale < effectiveFull &&
    Math.round((1 - effectiveSale / effectiveFull) * 100) >= 1;
  const dynamicPrice = hasVisibleDiscount ? effectiveSale! : effectiveFull;
  const dynamicOriginalPrice = hasVisibleDiscount ? effectiveFull : null;
  const dynamicGallery = (activeVariant?.images && activeVariant.images.length > 0)
    ? activeVariant.images
    : catalogProduct?.galleryImages
      ?? (catalogProduct ? Array(5).fill(catalogProduct.image) : []);
  const variantSku = activeVariant?.sku ?? catalogProduct?.specs?.find(s => s.label === 'SKU')?.value ?? PRODUCT_ACTION_LABELS.defaultSku;
  const activeDescriptionHtml = (activeVariant?.descriptionHtml && activeVariant.descriptionHtml.trim())
    ? activeVariant.descriptionHtml
    : catalogProduct?.descriptionHtml;

  // OE distinguishes four availability signals:
  //   - `in_stock`     — regular purchase
  //   - `preorder`     — pre-launch stock, the shopper can commit to buying
  //   - `coming_soon`  — announced but not orderable yet; swatch stays
  //                     selectable so the shopper can see the variant, but the
  //                     CTA turns into a status-only label
  //   - `out_of_stock` — greyed out entirely
  const activeVariantStatus = activeVariant?.statusIdentifier;
  const isPreOrder = !productIsOOS && activeVariantStatus === 'preorder';
  const isComingSoon = !productIsOOS && activeVariantStatus === 'coming_soon';

  const isFirstMount = useRef(true);
  const { toggleItem, isWishlisted, updateSelection } = useWishlist();

  // Clear the picked size when the new colour doesn't stock it — otherwise
  // the "size selected" state persists over a struck-through size (e.g. the
  // shopper picked Pink/M, then flipped to a colour that has no M in stock).
  useEffect(() => {
    if (!selectedSize) return;
    const stillAvailable = dynamicSizeOptions.find((s) => s.label === selectedSize)?.available;
    if (!stillAvailable) setSelectedSize(null);
  }, [selectedColor, dynamicSizeOptions, selectedSize]);

  useEffect(() => {
    if (isFirstMount.current) { isFirstMount.current = false; return; }
    if (!productId || !isWishlisted(productId)) return;
    updateSelection(
      productId,
      dynamicColors[selectedColor]?.hex,
      selectedSize ?? undefined,
    );
  }, [selectedColor, selectedSize, productId, isWishlisted, updateSelection, dynamicColors]);

  // Reflect the current colour+size choice in the URL so a full-page reload
  // (or a shared link) restores exactly what the shopper was looking at.
  // `history.replaceState` sidesteps Next.js router — no re-render, no scroll,
  // no server round-trip — while `useSearchParams()` still picks up the value
  // on the next mount because it reads from `window.location`.
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

  // Deep-linked shoppers hit `/product/{id}` without a `?gender` hint (search
  // results, bookmarks, marketing emails). The header falls back to WOMEN in
  // that case — misleading on a men's PDP. Use `router.replace` so Next.js's
  // `useSearchParams()` in `<Header>` picks up the new value; a bare
  // `history.replaceState` would sync the URL bar but not trigger Header
  // to re-derive gender.
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
  // Different OE variant IDs of the same product (Pink XL / White M / …) each
  // push their own Recently-Viewed entry, so the trail can list the same
  // title twice. Dedupe by name (falling back to id) — keeps the most-recent
  // entry per unique product.
  const allRecentlyViewed = (() => {
    const filtered = recentlyViewed
      .filter(p => p.id !== productId)
      .filter(p => !currentGender || currentGender === 'U' || !p.gender || p.gender === currentGender || p.gender === 'U');
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
      ...(catalogProduct.gender && (catalogProduct.gender === 'W' || catalogProduct.gender === 'M' || catalogProduct.gender === 'U')
        ? { gender: catalogProduct.gender }
        : {}),
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
      brand: dynamicBrand,
      color: idx === 0 ? dynamicColors[selectedColor].name : '',
      sku: `BUNDLE-${offerId.toUpperCase()}-${idx + 1}`,
      size: idx === 0 && selectedSize ? selectedSize : '',
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

  // Deep-link support for `/product/{id}#reviews` — used by QuickView's
  // "N reviews" chip so shoppers land directly on the reviews block. The
  // reviews slot is streamed via <Suspense>, so we retry the scroll until
  // the section actually mounts (or the retry budget expires) instead of
  // firing once on load and missing when the section is still empty.
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
    return () => { cancelled = true; };
  }, []);

  const handleAddToCart = () => {
    if (!selectedSize) {
      setSizeError(true);
      if (sizeErrorTimerRef.current) clearTimeout(sizeErrorTimerRef.current);
      sizeErrorTimerRef.current = setTimeout(() => setSizeError(false), 2000);
      return;
    }
    // Snapshot the active variant's `stockqty` so the reducer can cap
    // `updateQuantity` at OE inventory. Fall back to the family stock when a
    // specific variant isn't resolved (e.g. product without variants). Leaves
    // `stockLimit` undefined only when OE truly doesn't track a number for
    // this product — which the reducer treats as uncapped (belt-and-braces
    // still applies server-side at `previewOrder` / `createOrder`).
    const variantStock = activeVariant?.stock;
    const familyStock = catalogProduct?.stock;
    const stockLimit = Number.isFinite(variantStock) && (variantStock as number) > 0
      ? (variantStock as number)
      : (Number.isFinite(familyStock) && (familyStock as number) > 0 ? (familyStock as number) : undefined);
    cart.addItem({
      id: productId || 'pdp-ribbed-cashmere-knit',
      name: dynamicName,
      brand: dynamicBrand,
      color: dynamicColors[selectedColor].name,
      sku: catalogProduct?.specs?.find(s => s.label === 'SKU')?.value ?? productId,
      size: selectedSize,
      quantity: 1,
      price: dynamicPrice,
      originalPrice: dynamicOriginalPrice ?? undefined,
      image: activeColorImage,
      ...(stockLimit !== undefined && { stockLimit }),
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
                <a href={categoryViewAllHref} className="text-xs tracking-[0.2em] uppercase text-gray-500 hover:text-black transition-colors">
                  {dynamicBrand}
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
                    // Reviews section is now always mounted (even for 0
                    // reviews), so we can always scroll. All auth / purchase
                    // gating lives inside ReviewsClient's own CTA — clicking
                    // that button surfaces the login modal (guest) or the
                    // "purchase required" notice (signed-in, unpurchased).
                    if (!reviewsRef.current) return;
                    const top = reviewsRef.current.getBoundingClientRect().top + window.scrollY - 120;
                    window.scrollTo({ top, behavior: 'smooth' });
                  }}
                  className="text-xs text-gray-500 hover:text-black underline transition-colors"
                >
                  {productReviews.length} {lReviewsSuffix}
                </button>
                <span className="text-xs text-gray-300">|</span>
                <span className={`text-xs font-medium ${isComingSoon ? 'text-[#8B8B8B]' : isPreOrder ? 'text-[#B8860B]' : 'text-[#2E8B57]'}`}>
                  {isComingSoon ? lComingSoon : isPreOrder ? lPreOrder : lInStock}
                </span>
              </div>

              {/* SKU */}
              <p className="text-xs text-gray-400 mb-4">
                {lSkuPrefix} <span className="text-gray-600">{variantSku}</span>
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

              {/* Purchase Bonus — rendered only when the OE `purchase-of-goods`
                  rule applies to this product. `{count}` in the OE-managed
                  heading is substituted with the resolved point value. */}
              {typeof bonusPoints === 'number' && bonusPoints > 0 && (
                <div className="flex items-center gap-2.5 px-4 py-3 mb-6 bg-[#fff8f0] border border-[#ffe0b2]">
                  <span className="text-base">🎁</span>
                  <div>
                    <p className="text-xs font-semibold text-[#b45309]">{lBonusHeading.replace('{count}', String(bonusPoints))}</p>
                    <p className="text-xs text-gray-500">{lBonusBody}</p>
                  </div>
                </div>
              )}

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
                      key={`${c.hex}-${i}`}
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
                  {dynamicSizeOptions.map((s, i) => (
                    <button
                      key={`${s.label}-${i}`}
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
                ) : isComingSoon ? (
                  <div className="w-full py-4 flex items-center justify-center gap-2.5 text-xs tracking-[0.2em] uppercase text-white cursor-not-allowed select-none bg-[#999] rounded-lg">
                    {lComingSoon}
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
                      : <><ShoppingBag size={15} /> {isPreOrder ? lPreOrderButton : lAddToCart}</>}
                  </button>
                )}

                <button
                  onClick={() => {
                    // Auth-gate the reservation like reviews (see ReviewsClient).
                    // The reserve form collects contact info that OE ties to
                    // the shopper; without a login the record has no owner and
                    // the shopper can't later look up their reservation. Guest
                    // shoppers get bounced into the login modal; on success
                    // they land back on the PDP with modal state intact.
                    if (!isLoggedIn) {
                      openLoginModal();
                      return;
                    }
                    setShowReserveModal(true);
                  }}
                  className="w-full py-4 flex items-center justify-center gap-2.5 text-xs tracking-[0.2em] uppercase text-black border border-black hover:bg-black hover:text-white focus-visible:outline-none transition-colors duration-200 rounded-lg"
                >
                  <Store size={15} /> {lReserveInStore}
                </button>

                <button
                  onClick={() => toggleItem({
                    id: productId || 'pdp-ribbed-cashmere-knit',
                    name: dynamicName,
                    brand: 'Kekimoro',
                    price: CURRENCY.format(dynamicPrice),
                    image: activeColorImage,
                    colors: dynamicColors.map(c => c.hex),
                    // First variant that carries each colour is the thumbnail
                    // for that swatch on the favourites card.
                    colorImages: dynamicColors.map(c =>
                      catalogProduct?.variants?.find(v => v.colors.includes(c.hex))?.image
                      || catalogProduct?.colorImages?.[dynamicColors.indexOf(c)]
                      || dynamicImage,
                    ),
                    colorStock: dynamicColors.map(c => c.available),
                    sizes: dynamicSizeOptions.map(s => s.label),
                    inStock: !productIsOOS,
                    selectedColor: dynamicColors[selectedColor]?.hex,
                    selectedSize: selectedSize ?? undefined,
                  })}
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

                {(activeDescriptionHtml || (catalogProduct?.productDetails?.length ?? 0) > 0) && (
                  <AccordionSection title={lDescriptionTitle}>
                    <div className="text-sm text-gray-700 leading-relaxed space-y-3">
                      {activeDescriptionHtml && (
                        <div
                          className="oe-rich-text"
                          dangerouslySetInnerHTML={{ __html: activeDescriptionHtml }}
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
            statistics-driven product list streams in. Wrapped in the same
            `<div>` shape as `reviewsSlot` above so React 19's key-tracking
            heuristic treats both streaming boundaries uniformly. */}
        <div>{recommendationsSlot}</div>

        <RecentlyViewedSection products={allRecentlyViewed} accentColor={ACCENT} />
      </main>

      <Footer />

      {showSizeGuide && <SizeGuideModal onClose={() => setShowSizeGuide(false)} />}
      {showReserveModal && <ReserveInStoreModal onClose={() => setShowReserveModal(false)} preselectedSize={selectedSize} sizeOptions={dynamicSizeOptions} />}
    </div>
  );
}
