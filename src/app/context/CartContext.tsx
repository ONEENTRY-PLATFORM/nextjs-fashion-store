'use client';
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { shallowEqual, useDispatch, useSelector } from 'react-redux';

import { extractCmsProductId, getCmsProductId, getPlaygroundProductId } from '@/app/data/cms-product-id-map';
import type { AppDispatch, RootState } from '@/app/store';
import { cartActions } from '@/app/store/cartSlice';
import { getOrCreateGuestId } from '@/app/utils/guest-id';
import { trackActivity } from '@/app/utils/track-activity';
import { previewOrderAction, type PreviewOrderResult } from '@/lib/oneentry/auth/actions';
import { getProductsByIdsAction } from '@/lib/oneentry/catalog/products-action';

import { useAuth } from './AuthContext';

/** Free-gift line derived from `preview.giftItems` and enriched with product details (name, image) so the UI can render it next to regular cart rows. */
export interface GiftCartItem {
  productId: number;
  name: string;
  image: string;
  /** Original catalogue price — rendered struck-through next to "FREE". */
  price: number;
  quantity: number;
}

export interface CartItem {
  id: string;
  name: string;
  brand: string;
  color: string;
  sku: string;
  size: string;
  quantity: number;
  price: number;
  originalPrice?: number;
  image: string;
  bundleId?: string;
  /** Maximum orderable quantity for this variant — snapshotted at add-time from OE's `stockqty` attribute. */
  stockLimit?: number;
}

interface CartContextType {
  items: CartItem[];
  miniCartOpen: boolean;
  openMiniCart: () => void;
  closeMiniCart: () => void;
  addItem: (item: CartItem) => void;
  addBundle: (items: Omit<CartItem, 'bundleId'>[]) => void;
  removeItem: (id: string) => void;
  removeBundle: (bundleId: string) => void;
  updateQuantity: (id: string, delta: number) => void;
  updateSize: (id: string, size: string) => void;
  clearCart: () => void;
  totalItems: number;
  subtotal: number;
  discount: number;
  total: number;
  /** OE `previewOrder` snapshot for the current cart. */
  preview: PreviewOrderResult | null;
  /** `true` while `previewOrder` is in flight for the current cart state. */
  previewLoading: boolean;
  /** Amount OE knocks off the order thanks to personal / coupon / promo discounts. */
  personalDiscount: number;
  /** Final total to charge after every discount + bonus applied. */
  totalDue: number;
  /** Currently applied OE coupon code (uppercased), `null` when none. */
  couponCode: string | null;
  /** How much the currently applied coupon takes off the order. */
  couponDiscount: number;
  /** Validation error from the last `applyCoupon` attempt — `null` after a successful apply or clear. */
  couponError: string | null;
  /** Send a coupon to OE via `previewOrder`. On success (OE accepted the code AND it produced a discount) the code is stored and subsequent `previewOrder`/`createOrder` calls include it. */
  applyCoupon: (code: string) => Promise<void>;
  /** Drop the current coupon and refresh the preview without it. */
  removeCoupon: () => void;
  /** Items dropped by the once-per-session availability check because their OneEntry record is gone. */
  unavailableRemoved: CartItem[];
  /** Dismiss the availability notice — clears `unavailableRemoved`. */
  dismissUnavailableNotice: () => void;
  /** Free gifts OE appended to the order (from `preview.giftItems`, enriched with product name / image). */
  giftItems: GiftCartItem[];
}

/** Synthesize a minimal `CartItem` from a Platform payload so that GET /users/me/cart responses can be rendered before the user opens any product page. */
function placeholderFromCmsId(productId: number, qty: number): CartItem {
  const playgroundId = getPlaygroundProductId(productId);
  return {
    id: playgroundId ?? String(productId),
    name: playgroundId ? playgroundId : `Platform product #${productId}`,
    brand: 'Platform',
    color: '',
    sku: `cms-${productId}`,
    size: '',
    quantity: qty,
    price: 0,
    image: '/icons/ui/bag-placeholder.svg',
  };
}

/** sessionStorage key holding the coupon applied to the current checkout. */
const COUPON_STORAGE_KEY = 'oe_coupon_code';

export function useCart(): CartContextType {
  const dispatch = useDispatch<AppDispatch>();
  const items = useSelector((state: RootState) => state.cart.items);
  const miniCartOpen = useSelector((state: RootState) => state.cart.miniCartOpen);
  // Scope the hydrate flag to the current OE user identifier.
  const userIdentifier = useSelector((s: RootState) => s.user.data.userIdentifier);
  // `?? []` guards against older persisted state (pre-migration cart blobs in localStorage that were written before this field existed).
  const unavailableRemoved = useSelector((state: RootState) => state.cart.unavailableRemoved ?? [], shallowEqual);
  const { isLoggedIn, user, syncCart } = useAuth();

  // Hydrate Redux from /me/cart on login.
  const hydratedRef = useRef(false);
  useEffect(() => {
    if (!isLoggedIn || !user?.cartItems || !userIdentifier) return;
    if (hydratedRef.current) return;
    if (typeof window !== 'undefined' && sessionStorage.getItem('oe_cart_merged') === userIdentifier) {
      hydratedRef.current = true;
      return;
    }
    hydratedRef.current = true;
    if (typeof window !== 'undefined') sessionStorage.setItem('oe_cart_merged', userIdentifier);
    // Prune first: OE is authoritative, so any local cart entry with a numeric productId not in the OE cart was removed on another device.
    const oeProductIdSet = new Set(user.cartItems.map((i) => String(i.productId)));
    for (const local of items) {
      const cmsId = getCmsProductId(local.id);
      if (cmsId === null) continue;
      if (!oeProductIdSet.has(String(cmsId))) {
        dispatch(cartActions.removeItem(local.id));
      }
    }
    const localById = new Map(items.map((i) => [i.id, i]));
    const productIds: number[] = [];
    for (const srv of user.cartItems) {
      const playgroundId = getPlaygroundProductId(srv.productId);
      const id = playgroundId ?? String(srv.productId);
      const local = localById.get(id);
      if (local) {
        // Already in local — but OE is authoritative, so re-align the quantity when it drifted (mobile app reduced qty, another tab already synced, etc.).
        if (local.quantity !== srv.qty) {
          dispatch(cartActions.removeItem(id));
          dispatch(cartActions.addItem({ ...local, quantity: srv.qty }));
        }
        continue;
      }
      dispatch(cartActions.addItem(placeholderFromCmsId(srv.productId, srv.qty)));
      productIds.push(srv.productId);
    }
    if (productIds.length === 0) return;
    // Enrich the placeholders with real product data from the catalog so the cart page shows image / price / brand instead of "Platform product #N".
    void getProductsByIdsAction(productIds).then((enriched) => {
      const enrichedIds = new Set(enriched.map((u) => u.id));
      for (const ui of enriched) {
        const srv = user.cartItems.find((c) => String(c.productId) === ui.id);
        if (!srv) continue;
        const priceNumber = parseFloat(String(ui.price).replace(/[^\d.]/g, '')) || 0;
        const salePriceNumber = ui.salePrice ? parseFloat(String(ui.salePrice).replace(/[^\d.]/g, '')) || 0 : undefined;
        const playgroundId = getPlaygroundProductId(srv.productId);
        const localId = playgroundId ?? String(srv.productId);
        dispatch(cartActions.removeItem(localId));
        dispatch(
          cartActions.addItem({
            id: ui.id,
            name: ui.name,
            brand: ui.brand ?? '',
            color: ui.colors?.[0] ?? '',
            sku: ui.id,
            size: ui.sizes?.[0] ?? '',
            quantity: srv.qty,
            // Prefer the sale price (matches catalog / PDP UX) and record the "was" as `originalPrice` so the strike-through renders downstream.
            price: salePriceNumber !== undefined && salePriceNumber < priceNumber ? salePriceNumber : priceNumber,
            ...(salePriceNumber !== undefined && salePriceNumber < priceNumber && { originalPrice: priceNumber }),
            ...(typeof ui.stock === 'number' && ui.stock > 0 && { stockLimit: ui.stock }),
            image: ui.image,
          }),
        );
      }
      // Drop any placeholder whose product id didn't come back from the catalog.
      for (const srv of user.cartItems) {
        if (enrichedIds.has(String(srv.productId))) continue;
        const playgroundId = getPlaygroundProductId(srv.productId);
        const localId = playgroundId ?? String(srv.productId);
        dispatch(cartActions.removeItem(localId));
      }
    });
    // `items` is deliberately omitted: this is a one-shot merge guarded by `hydratedRef`, and it reads the local cart as it stands at hydration time.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isLoggedIn, user, userIdentifier, dispatch]);
  useEffect(() => {
    if (!isLoggedIn) {
      hydratedRef.current = false;
      // Also drop the sessionStorage cache so a fresh sign-in re-hydrates from OE instead of trusting stale local Redux.
      if (typeof window !== 'undefined') sessionStorage.removeItem('oe_cart_merged');
    }
  }, [isLoggedIn]);
  // Cross-user safety: if the signed-in identifier changes without going through a `!isLoggedIn` transition (edge case, but cheap to defend), the stored flag from the previous user is no longer valid.
  useEffect(() => {
    hydratedRef.current = false;
  }, [userIdentifier]);

  // Push local cart → /me/cart on every change (debounced) so the server mirrors the optimistic Redux state.
  const lastPushedRef = useRef<string>('');
  useEffect(() => {
    if (!isLoggedIn) return;
    // Wait until the hydration effect above finished merging OE's server cart into the local Redux state.
    if (!hydratedRef.current) return;
    const oeItems = items.flatMap((it) => {
      const cmsId = getCmsProductId(it.id);
      return cmsId !== null ? [{ productId: cmsId, qty: it.quantity }] : [];
    });
    const key = JSON.stringify(oeItems);
    if (key === lastPushedRef.current) return;
    lastPushedRef.current = key;
    const t = setTimeout(() => {
      void syncCart(oeItems);
    }, 400);
    return () => clearTimeout(t);
  }, [items, isLoggedIn, syncCart]);

  const totalItems = items.reduce((s, i) => s + i.quantity, 0);
  const subtotal = items.reduce((s, i) => s + i.price * i.quantity, 0);
  const originalTotal = items.reduce((s, i) => s + (i.originalPrice ?? i.price) * i.quantity, 0);
  const discount = Math.max(0, originalTotal - subtotal);
  const total = subtotal;

  const openMiniCart = useCallback(() => dispatch(cartActions.openMiniCart()), [dispatch]);
  const closeMiniCart = useCallback(() => dispatch(cartActions.closeMiniCart()), [dispatch]);

  // All mutations are optimistic in Redux.
  const addItem = useCallback(
    (item: CartItem) => {
      dispatch(cartActions.addItem(item));
      const cmsId = getCmsProductId(item.id);
      if (cmsId !== null)
        trackActivity({ type: 'product_add_to_cart', productId: cmsId, meta: { quantity: item.quantity } });
    },
    [dispatch],
  );

  const addBundle = useCallback(
    (bundleItems: Omit<CartItem, 'bundleId'>[]) => {
      dispatch(cartActions.addBundle(bundleItems));
      for (const it of bundleItems) {
        const cmsId = getCmsProductId(it.id);
        if (cmsId !== null)
          trackActivity({
            type: 'product_add_to_cart',
            productId: cmsId,
            meta: { quantity: it.quantity, bundle: true },
          });
      }
    },
    [dispatch],
  );

  const removeItem = useCallback(
    (id: string) => {
      const cmsId = getCmsProductId(id);
      if (cmsId !== null) trackActivity({ type: 'product_remove_from_cart', productId: cmsId });
      dispatch(cartActions.removeItem(id));
    },
    [dispatch],
  );

  const removeBundle = useCallback(
    (bundleId: string) => {
      const removedIds = items.filter((i) => i.bundleId === bundleId).map((i) => i.id);
      dispatch(cartActions.removeBundle(bundleId));
      for (const id of removedIds) {
        const cmsId = getCmsProductId(id);
        if (cmsId !== null)
          trackActivity({ type: 'product_remove_from_cart', productId: cmsId, meta: { bundle: true } });
      }
    },
    [dispatch, items],
  );

  const updateQuantity = useCallback(
    (id: string, delta: number) => {
      dispatch(cartActions.updateQuantity({ id, delta }));
    },
    [dispatch],
  );

  const updateSize = useCallback(
    (id: string, size: string) => dispatch(cartActions.updateSize({ id, size })),
    [dispatch],
  );

  // OE `previewOrder` — reruns whenever the cart or applied coupon changes so every screen that shows totals (cart, mini-cart, delivery, payment) renders the real numbers OE will apply.
  const [preview, setPreview] = useState<PreviewOrderResult | null>(null);
  const [previewLoading, setPreviewLoading] = useState(false);
  // Coupon persisted in sessionStorage so it survives navigation inside the checkout flow.
  const [couponCode, setCouponCode] = useState<string | null>(() => {
    if (typeof window === 'undefined') return null;
    return sessionStorage.getItem(COUPON_STORAGE_KEY);
  });
  const [couponError, setCouponError] = useState<string | null>(null);

  const clearCart = useCallback(() => {
    dispatch(cartActions.clearCart());
    // A cleared cart signals a completed checkout (or explicit reset) — the applied coupon shouldn't quietly ride along into the next order.
    setCouponCode(null);
    setCouponError(null);
    try {
      sessionStorage.removeItem(COUPON_STORAGE_KEY);
      // Also wipe the checkout-payload cache left by DeliveryPage.
      sessionStorage.removeItem('oe_checkout_payload');
    } catch {
      /* ignore */
    }
  }, [dispatch]);
  // Shared sequence counter across the auto-preview effect and every manual applyCoupon / removeCoupon call.
  const previewSeqRef = useRef(0);
  const productsForPreview = items.flatMap((it) => {
    // Cart items sometimes carry suffixed ids (`${cmsId}-fav`, `-quick`, `-auto`, `-item-N`, …) that leak from downstream Add-to-Cart UX.
    const cmsId = extractCmsProductId(it.id);
    if (cmsId === null) return [];
    return [{ productId: cmsId, quantity: it.quantity }];
  });
  const productsKey = JSON.stringify(productsForPreview);
  // An empty cart has nothing to preview.
  const hasPreviewableItems = productsForPreview.length > 0;
  // `previewLoading` starts as "the cached preview doesn't match this cart yet", derived during render.
  const [previewFor, setPreviewFor] = useState<string | null>(null);
  const previewStale = hasPreviewableItems && previewFor !== productsKey;
  useEffect(() => {
    if (!hasPreviewableItems) return;
    let cancelled = false;
    const mySeq = ++previewSeqRef.current;
    const t = setTimeout(async () => {
      // Guests get their session id from `localStorage` so OE can validate guest-eligible coupons (SUMMER2026 etc.).
      const guestId = isLoggedIn ? undefined : getOrCreateGuestId();
      const r = await previewOrderAction({
        products: productsForPreview,
        ...(couponCode ? { couponCode } : {}),
        ...(guestId ? { guestId } : {}),
      });
      if (cancelled || mySeq !== previewSeqRef.current) return;
      if (r.ok) {
        setPreview(r);
      } else if (r.missingProductIds && r.missingProductIds.length > 0) {
        // OE told us the cart contains products that no longer exist — prune locally, or the preview keeps failing.
        const missing = new Set(r.missingProductIds.map(String));
        const dropped: CartItem[] = [];
        for (const it of items) {
          const cmsId = getCmsProductId(it.id);
          if (cmsId !== null && missing.has(String(cmsId))) dropped.push(it);
        }
        if (dropped.length > 0) {
          for (const it of dropped) dispatch(cartActions.removeItem(it.id));
          dispatch(cartActions.setUnavailableRemoved(dropped));
        }
      }
      setPreviewFor(productsKey);
      setPreviewLoading(false);
    }, 300);
    return () => {
      cancelled = true;
      clearTimeout(t);
    };
    // productsKey covers the array; effect re-fires on cart / login / coupon.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isLoggedIn, productsKey, couponCode]);

  const personalDiscount = preview?.discountAmount ?? 0;
  const totalDue = preview?.totalDue ?? total;
  const couponDiscount = preview?.couponDiscountAmount ?? 0;

  const applyCoupon = useCallback(
    async (raw: string) => {
      const code = raw.trim().toUpperCase();
      if (!code) {
        setCouponError('Enter a promo code');
        return;
      }
      if (productsForPreview.length === 0) {
        setCouponError('Add items to cart first');
        return;
      }
      // Clear the previous preview so the summary rows render as skeletons while OE recomputes with the new coupon.
      setPreview(null);
      setPreviewLoading(true);
      const mySeq = ++previewSeqRef.current;
      // Validate via `previewOrder`.
      const guestId = isLoggedIn ? undefined : getOrCreateGuestId();
      const r = await previewOrderAction({
        products: productsForPreview,
        couponCode: code,
        ...(guestId ? { guestId } : {}),
      });
      // A newer preview / applyCoupon / removeCoupon has already fired since we started — drop this stale response so we don't overwrite fresher state.
      if (mySeq !== previewSeqRef.current) return;
      const setFailure = async (message: string) => {
        setCouponError(message);
        // OE rejected the code — restore a preview WITHOUT the coupon so the summary stops showing a skeleton.
        const restoreSeq = ++previewSeqRef.current;
        const restored = await previewOrderAction({
          products: productsForPreview,
          ...(couponCode ? { couponCode } : {}),
          ...(guestId ? { guestId } : {}),
        });
        if (restoreSeq !== previewSeqRef.current) return;
        if (restored.ok) setPreview(restored);
        setPreviewLoading(false);
      };
      if (!r.ok) {
        await setFailure(r.error || 'Invalid promo code');
        return;
      }
      if (!r.couponApplied) {
        // Prefer the condition-specific message from OE ("Add $X more to unlock", "unlocks after $Y in lifetime purchases", etc.).
        await setFailure(
          r.couponReason ??
            (r.couponValidButNotApplied
              ? 'Promo code accepted, but conditions are not met for this cart'
              : 'Invalid promo code'),
        );
        return;
      }
      setCouponError(null);
      setCouponCode(code);
      setPreview(r);
      setPreviewLoading(false);
      try {
        sessionStorage.setItem(COUPON_STORAGE_KEY, code);
      } catch {
        /* quota */
      }
    },
    // `productsForPreview` is a fresh array on every render — `productsKey` is its stable stringification and stands in for it here.
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [productsKey, couponCode, isLoggedIn],
  );

  const dismissUnavailableNotice = useCallback(() => {
    dispatch(cartActions.dismissUnavailableRemoved());
  }, [dispatch]);

  const removeCoupon = useCallback(() => {
    // Clear preview so the summary rows render as skeletons while OE recomputes without the coupon.
    ++previewSeqRef.current;
    setPreview(null);
    setPreviewLoading(true);
    setCouponCode(null);
    setCouponError(null);
    try {
      sessionStorage.removeItem(COUPON_STORAGE_KEY);
    } catch {
      /* ignore */
    }
  }, []);

  // Hydrate gift lines from `preview.giftItems` with real product data (name, image) so the UI can render them next to regular cart rows.
  const [giftDetails, setGiftDetails] = useState<Record<number, { name: string; image: string }>>({});
  const previewGifts = preview?.giftItems ?? [];
  const previewGiftsKey = JSON.stringify(previewGifts.map((g) => g.productId));
  useEffect(() => {
    if (previewGifts.length === 0) return;
    const missing = previewGifts.map((g) => g.productId).filter((id) => !giftDetails[id]);
    if (missing.length === 0) return;
    let cancelled = false;
    void getProductsByIdsAction(missing).then((enriched) => {
      if (cancelled) return;
      setGiftDetails((prev) => {
        const next = { ...prev };
        for (const ui of enriched) {
          const numeric = Number(ui.id);
          if (!Number.isFinite(numeric)) continue;
          next[numeric] = { name: ui.name, image: ui.image };
        }
        return next;
      });
    });
    return () => {
      cancelled = true;
    };
    // Depend on the id list rather than the array identity.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [previewGiftsKey]);
  const giftItems: GiftCartItem[] = previewGifts.map((g) => {
    const details = giftDetails[g.productId];
    return {
      productId: g.productId,
      name: details?.name ?? 'Free gift',
      image: details?.image ?? '/icons/ui/bag-placeholder.svg',
      price: g.price,
      quantity: g.quantity,
    };
  });

  return useMemo(
    () => ({
      items,
      miniCartOpen,
      openMiniCart,
      closeMiniCart,
      addItem,
      addBundle,
      removeItem,
      removeBundle,
      updateQuantity,
      updateSize,
      clearCart,
      totalItems,
      subtotal,
      discount,
      total,
      preview,
      previewLoading: previewLoading || previewStale,
      personalDiscount,
      totalDue,
      couponCode,
      couponDiscount,
      couponError,
      applyCoupon,
      removeCoupon,
      unavailableRemoved,
      dismissUnavailableNotice,
      giftItems,
    }),
    [
      items,
      miniCartOpen,
      openMiniCart,
      closeMiniCart,
      addItem,
      addBundle,
      removeItem,
      removeBundle,
      updateQuantity,
      updateSize,
      clearCart,
      totalItems,
      subtotal,
      discount,
      total,
      preview,
      previewLoading,
      previewStale,
      personalDiscount,
      totalDue,
      couponCode,
      couponDiscount,
      couponError,
      applyCoupon,
      removeCoupon,
      unavailableRemoved,
      dismissUnavailableNotice,
      giftItems,
    ],
  );
}
