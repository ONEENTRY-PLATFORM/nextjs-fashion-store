'use client'
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useSelector, useDispatch, shallowEqual } from 'react-redux';
import type { RootState, AppDispatch } from '../store';
import { cartActions } from '../store/cartSlice';
import {
  getCmsProductId,
  getPlaygroundProductId,
  extractCmsProductId,
} from '../data/cms-product-id-map';
import { useAuth } from './AuthContext';
import { getProductsByIdsAction } from '../../lib/oneentry/catalog/products-action';
import { previewOrderAction, type PreviewOrderResult } from '../../lib/oneentry/auth/actions';
import { trackActivity } from '../utils/track-activity';
import { getOrCreateGuestId } from '../utils/guest-id';

/** Free-gift line derived from `preview.giftItems` and enriched with product
 *  details (name, image) so the UI can render it next to regular cart rows.
 *  Not stored in Redux — it's ephemeral and OE-owned; the shopper cannot
 *  remove or requantify a gift, and it disappears the moment the triggering
 *  coupon is removed or the trigger product leaves the cart. */
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
  /** Maximum orderable quantity for this variant — snapshotted at add-time
   *  from OE's `stockqty` attribute. `undefined` means "unknown, uncapped
   *  client-side" (older carts persisted before this field existed, or
   *  server-hydrated placeholders with no stock context); the reducer treats
   *  `undefined` as `Infinity`. When set, `updateQuantity` / `addItem` clamp
   *  totals to this ceiling so the shopper can't overshoot inventory. */
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
  /** OE `previewOrder` snapshot for the current cart. Applies the shopper's
   *  personal discount (Bronze / …), plus any coupon or bonus that a
   *  caller passes in later. `null` while pending or for guests / empty cart. */
  preview: PreviewOrderResult | null;
  /** `true` while `previewOrder` is in flight for the current cart state.
   *  UI uses this to show a skeleton for discount/total lines instead of
   *  flashing outdated values or nothing. */
  previewLoading: boolean;
  /** Amount OE knocks off the order thanks to personal / coupon / promo
   *  discounts (excludes bonuses — those show as a separate line). */
  personalDiscount: number;
  /** Final total to charge after every discount + bonus applied. Falls back
   *  to the client-computed `total` when preview isn't available. */
  totalDue: number;
  /** Currently applied OE coupon code (uppercased), `null` when none. */
  couponCode: string | null;
  /** How much the currently applied coupon takes off the order. Zero when
   *  no coupon is active or OE accepted the code but conditions aren't met. */
  couponDiscount: number;
  /** Validation error from the last `applyCoupon` attempt — `null` after a
   *  successful apply or clear. Rendered under the promo input. */
  couponError: string | null;
  /** Send a coupon to OE via `previewOrder`. On success (OE accepted the
   *  code AND it produced a discount) the code is stored and subsequent
   *  `previewOrder`/`createOrder` calls include it. On failure the caller
   *  reads `couponError`. */
  applyCoupon: (code: string) => Promise<void>;
  /** Drop the current coupon and refresh the preview without it. */
  removeCoupon: () => void;
  /** Items dropped by the once-per-session availability check because their
   *  OneEntry record is gone (deleted product, wrong env, etc.). Empty until
   *  the check runs — a Providers-level notice component reads this so the
   *  shopper is told what disappeared instead of just seeing a smaller cart. */
  unavailableRemoved: CartItem[];
  /** Dismiss the availability notice — clears `unavailableRemoved`. */
  dismissUnavailableNotice: () => void;
  /** Free gifts OE appended to the order (from `preview.giftItems`, enriched
   *  with product name / image). Rendered in the cart & checkout summaries
   *  as separate "FREE GIFT" rows. Empty when no gift-bearing discount is
   *  active. */
  giftItems: GiftCartItem[];
}

/**
 * Synthesize a minimal `CartItem` from a Platform payload so that GET
 * /users/me/cart responses can be rendered before the user opens any
 * product page. The Platform payload only carries `{ productId, qty }`, so
 * cosmetic fields fall back to placeholders.
 */
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

export function useCart(): CartContextType {
  const dispatch = useDispatch<AppDispatch>();
  const items = useSelector((state: RootState) => state.cart.items);
  const miniCartOpen = useSelector((state: RootState) => state.cart.miniCartOpen);
  // Scope the hydrate flag to the current OE user identifier — a raw `'1'`
  // flag survived across sign-ins and stopped the merge from running for the
  // second user, whose mobile-added items got wiped by the sync-back effect
  // below (empty local Redux → syncCart([]) → OE cleared).
  const userIdentifier = useSelector((s: RootState) => s.user.data.userIdentifier);
  // `?? []` guards against older persisted state (pre-migration cart blobs in
  // localStorage that were written before this field existed) — otherwise the
  // notice component crashes on `.length` reading undefined.
  const unavailableRemoved = useSelector(
    (state: RootState) => state.cart.unavailableRemoved ?? [],
    shallowEqual,
  );
  const { isLoggedIn, user, syncCart } = useAuth();

  // Hydrate Redux from /me/cart on login. Server returns productId+qty; we
  // synthesize a minimal CartItem (cosmetic fields stay blank until a real
  // product fetch fills them).
  // useCart() is called by multiple components (Header, MiniCart, CartPage…),
  // each instance has its own `hydratedRef`, and Next App-Router remounts the
  // tree on navigation — without a shared flag we'd re-merge on every page
  // change, blowing away the already-enriched cart items with placeholders.
  // Use sessionStorage so the merge runs at most once per browser session.
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
    // Prune first: OE is authoritative, so any local cart entry with a numeric
    // productId not in the OE cart was removed on another device. Non-numeric
    // ids (playground stubs) are left alone — OE never saw them.
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
        // Already in local — but OE is authoritative, so re-align the quantity
        // when it drifted (mobile app reduced qty, another tab already synced,
        // etc.). Keep the enriched name/image/etc. so the tile doesn't flash.
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
    // Enrich the placeholders with real product data from the catalog so the
    // cart page shows image / price / brand instead of "Platform product #N".
    void getProductsByIdsAction(productIds).then((enriched) => {
      const enrichedIds = new Set(enriched.map((u) => u.id));
      for (const ui of enriched) {
        const srv = user.cartItems.find((c) => String(c.productId) === ui.id);
        if (!srv) continue;
        const priceNumber = parseFloat(String(ui.price).replace(/[^\d.]/g, '')) || 0;
        const salePriceNumber = ui.salePrice
          ? parseFloat(String(ui.salePrice).replace(/[^\d.]/g, '')) || 0
          : undefined;
        const playgroundId = getPlaygroundProductId(srv.productId);
        const localId = playgroundId ?? String(srv.productId);
        dispatch(cartActions.removeItem(localId));
        dispatch(cartActions.addItem({
          id: ui.id,
          name: ui.name,
          brand: ui.brand ?? '',
          color: ui.colors?.[0] ?? '',
          sku: ui.id,
          size: ui.sizes?.[0] ?? '',
          quantity: srv.qty,
          // Prefer the sale price (matches catalog / PDP UX) and record
          // the "was" as `originalPrice` so the strike-through renders
          // downstream. `stockLimit` mirrors the enriched product so
          // `updateQuantity` can cap the `+` button — otherwise a
          // hydrated cart lets shoppers set 999 through the plus button
          // until OE rejects it at preview.
          price: salePriceNumber !== undefined && salePriceNumber < priceNumber ? salePriceNumber : priceNumber,
          ...(salePriceNumber !== undefined && salePriceNumber < priceNumber && { originalPrice: priceNumber }),
          ...(typeof ui.stock === 'number' && ui.stock > 0 && { stockLimit: ui.stock }),
          image: ui.image,
        }));
      }
      // Drop any placeholder whose product id didn't come back from the
      // catalog — it's a stale OE cart entry (deleted product, wrong env,
      // etc.) and leaving it in cart leads to a $0 line and a "Product's
      // price is not defined" error at order placement.
      for (const srv of user.cartItems) {
        if (enrichedIds.has(String(srv.productId))) continue;
        const playgroundId = getPlaygroundProductId(srv.productId);
        const localId = playgroundId ?? String(srv.productId);
        dispatch(cartActions.removeItem(localId));
      }
    });
  }, [isLoggedIn, user, userIdentifier, dispatch]);
  useEffect(() => {
    if (!isLoggedIn) {
      hydratedRef.current = false;
      // Also drop the sessionStorage cache so a fresh sign-in — including the
      // implicit re-sign-in that happens on every hard reload — re-hydrates
      // from OE instead of trusting stale local Redux (which could be out of
      // date with what another device pushed while this tab was quiet).
      if (typeof window !== 'undefined') sessionStorage.removeItem('oe_cart_merged');
    }
  }, [isLoggedIn]);
  // Cross-user safety: if the signed-in identifier changes without going
  // through a `!isLoggedIn` transition (edge case, but cheap to defend), the
  // stored flag from the previous user is no longer valid — reset so the
  // check above runs the merge again.
  useEffect(() => {
    hydratedRef.current = false;
  }, [userIdentifier]);

  // Push local cart → /me/cart on every change (debounced) so the server
  // mirrors the optimistic Redux state.
  const lastPushedRef = useRef<string>('');
  useEffect(() => {
    if (!isLoggedIn) return;
    // Wait until the hydration effect above finished merging OE's server
    // cart into the local Redux state — otherwise a cold sign-in with an
    // empty local cart would push `[]` UP into OE, wiping any items the
    // shopper added from another device. `hydratedRef.current` flips to
    // `true` right after we finish enrichment and it is also mirrored in
    // sessionStorage `oe_cart_merged` for the current userIdentifier.
    if (!hydratedRef.current) return;
    const oeItems = items.flatMap((it) => {
      const cmsId = getCmsProductId(it.id);
      return cmsId !== null ? [{ productId: cmsId, qty: it.quantity }] : [];
    });
    const key = JSON.stringify(oeItems);
    if (key === lastPushedRef.current) return;
    lastPushedRef.current = key;
    const t = setTimeout(() => { void syncCart(oeItems); }, 400);
    return () => clearTimeout(t);
  }, [items, isLoggedIn, syncCart]);

  const totalItems = items.reduce((s, i) => s + i.quantity, 0);
  const subtotal = items.reduce((s, i) => s + i.price * i.quantity, 0);
  const originalTotal = items.reduce((s, i) => s + (i.originalPrice ?? i.price) * i.quantity, 0);
  const discount = Math.max(0, originalTotal - subtotal);
  const total = subtotal;

  const openMiniCart = useCallback(() => dispatch(cartActions.openMiniCart()), [dispatch]);
  const closeMiniCart = useCallback(() => dispatch(cartActions.closeMiniCart()), [dispatch]);

  // All mutations are optimistic in Redux. The sync effect above pushes the
  // resulting state to /me/cart, so individual mutations don't need to call
  // the server directly.
  const addItem = useCallback((item: CartItem) => {
    dispatch(cartActions.addItem(item));
    const cmsId = getCmsProductId(item.id);
    if (cmsId !== null) trackActivity({ type: 'product_add_to_cart', productId: cmsId, meta: { quantity: item.quantity } });
  }, [dispatch]);

  const addBundle = useCallback((bundleItems: Omit<CartItem, 'bundleId'>[]) => {
    dispatch(cartActions.addBundle(bundleItems));
    for (const it of bundleItems) {
      const cmsId = getCmsProductId(it.id);
      if (cmsId !== null) trackActivity({ type: 'product_add_to_cart', productId: cmsId, meta: { quantity: it.quantity, bundle: true } });
    }
  }, [dispatch]);

  const removeItem = useCallback((id: string) => {
    const cmsId = getCmsProductId(id);
    if (cmsId !== null) trackActivity({ type: 'product_remove_from_cart', productId: cmsId });
    dispatch(cartActions.removeItem(id));
  }, [dispatch]);

  const removeBundle = useCallback((bundleId: string) => {
    const removedIds = items.filter((i) => i.bundleId === bundleId).map((i) => i.id);
    dispatch(cartActions.removeBundle(bundleId));
    for (const id of removedIds) {
      const cmsId = getCmsProductId(id);
      if (cmsId !== null) trackActivity({ type: 'product_remove_from_cart', productId: cmsId, meta: { bundle: true } });
    }
  }, [dispatch, items]);

  const updateQuantity = useCallback((id: string, delta: number) => {
    dispatch(cartActions.updateQuantity({ id, delta }));
  }, [dispatch]);

  const updateSize = useCallback((id: string, size: string) => dispatch(cartActions.updateSize({ id, size })), [dispatch]);

  const clearCart = useCallback(() => {
    dispatch(cartActions.clearCart());
    // A cleared cart signals a completed checkout (or explicit reset) — the
    // applied coupon shouldn't quietly ride along into the next order.
    // Drop both the in-memory code and its sessionStorage backing so the
    // next `previewOrder` fires without a `couponCode`.
    setCouponCode(null);
    setCouponError(null);
    try {
      sessionStorage.removeItem(COUPON_STORAGE_KEY);
      // Also wipe the checkout-payload cache left by DeliveryPage. If the
      // shopper abandoned checkout mid-way and later starts a fresh
      // order, stale delivery / coupon fields from the previous attempt
      // would otherwise land in the new order without them touching the
      // form.
      sessionStorage.removeItem('oe_checkout_payload');
    } catch { /* ignore */ }
  }, [dispatch]);

  // OE `previewOrder` — reruns whenever the cart or applied coupon changes
  // so every screen that shows totals (cart, mini-cart, delivery, payment)
  // renders the real numbers OE will apply. Only useful for logged-in
  // shoppers because personal discounts and bonuses are gated by user + group.
  const [preview, setPreview] = useState<PreviewOrderResult | null>(null);
  const [previewLoading, setPreviewLoading] = useState(false);
  // Coupon persisted in sessionStorage so it survives page navigation inside
  // the checkout flow (cart → delivery → payment).
  const COUPON_STORAGE_KEY = 'oe_coupon_code';
  const [couponCode, setCouponCode] = useState<string | null>(() => {
    if (typeof window === 'undefined') return null;
    return sessionStorage.getItem(COUPON_STORAGE_KEY);
  });
  const [couponError, setCouponError] = useState<string | null>(null);
  // Shared sequence counter across the auto-preview effect and every manual
  // applyCoupon / removeCoupon call — a late response from a stale request
  // used to overwrite the freshest one (rapid Apply → clear → Apply, or
  // Apply landing after the debounced auto-preview from a cart edit).
  const previewSeqRef = useRef(0);
  const productsForPreview = items.flatMap((it) => {
    // Cart items sometimes carry suffixed ids (`${cmsId}-fav`, `-quick`,
    // `-auto`, `-item-N`, …) that leak from downstream Add-to-Cart UX.
    // Extract the leading numeric productId — matches how OE preview /
    // createOrder identify products server-side.
    const cmsId = extractCmsProductId(it.id);
    if (cmsId === null) return [];
    return [{ productId: cmsId, quantity: it.quantity }];
  });
  const productsKey = JSON.stringify(productsForPreview);
  useEffect(() => {
    if (productsForPreview.length === 0) {
      setPreview(null);
      setPreviewLoading(false);
      return;
    }
    setPreviewLoading(true);
    let cancelled = false;
    const mySeq = ++previewSeqRef.current;
    const t = setTimeout(async () => {
      // Guests get their session id from `localStorage` so OE can validate
      // guest-eligible coupons (SUMMER2026 etc.). For logged-in users the
      // server action reads the access cookie and ignores `guestId`.
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
        // OE told us the cart contains products that no longer exist. Prune
        // them locally so the next preview succeeds (otherwise we'd be stuck
        // in an infinite failure loop: same cart → same "not found" error →
        // Place Order button stuck as disabled spinner). Snapshot the local
        // CartItem before removing so the notice banner can name what went.
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
      setPreviewLoading(false);
    }, 300);
    return () => { cancelled = true; clearTimeout(t); };
    // productsKey covers the array; effect re-fires on cart / login / coupon.
    // `items` is intentionally read from the closure (only needed to snapshot
    // dropped item details) — including it would re-fire the preview on every
    // mutation, which productsKey already handles.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isLoggedIn, productsKey, couponCode]);

  const personalDiscount = preview?.discountAmount ?? 0;
  const totalDue = preview?.totalDue ?? total;
  const couponDiscount = preview?.couponDiscountAmount ?? 0;

  const applyCoupon = useCallback(async (raw: string) => {
    const code = raw.trim().toUpperCase();
    if (!code) {
      setCouponError('Enter a promo code');
      return;
    }
    if (productsForPreview.length === 0) {
      setCouponError('Add items to cart first');
      return;
    }
    // Clear the previous preview so the summary rows render as skeletons
    // while OE recomputes with the new coupon. Otherwise the shopper stares
    // at the pre-coupon numbers for ~500ms which reads as "nothing changed".
    setPreview(null);
    setPreviewLoading(true);
    const mySeq = ++previewSeqRef.current;
    // Validate via `previewOrder` — OE returns IError for unknown/expired
    // codes and `discountConfig.coupon = null` when the code is valid but
    // conditions (cart total, applicability, expiry) aren't met.
    const guestId = isLoggedIn ? undefined : getOrCreateGuestId();
    const r = await previewOrderAction({
      products: productsForPreview,
      couponCode: code,
      ...(guestId ? { guestId } : {}),
    });
    // A newer preview / applyCoupon / removeCoupon has already fired since we
    // started — drop this stale response so we don't overwrite fresher state.
    if (mySeq !== previewSeqRef.current) return;
    const setFailure = async (message: string) => {
      setCouponError(message);
      // OE rejected the code — restore a preview WITHOUT the coupon so the
      // summary stops showing a skeleton. `couponCode` never changed here,
      // so the useEffect won't refire on its own.
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
      // Prefer the condition-specific message from OE ("Add $X more to
      // unlock", "unlocks after $Y in lifetime purchases", etc.) — falls
      // back to a generic hint when we couldn't parse a reason.
      await setFailure(r.couponReason
        ?? (r.couponValidButNotApplied
          ? 'Promo code accepted, but conditions are not met for this cart'
          : 'Invalid promo code'));
      return;
    }
    setCouponError(null);
    setCouponCode(code);
    setPreview(r);
    setPreviewLoading(false);
    try { sessionStorage.setItem(COUPON_STORAGE_KEY, code); } catch { /* quota */ }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [productsKey]);

  const dismissUnavailableNotice = useCallback(() => {
    dispatch(cartActions.dismissUnavailableRemoved());
  }, [dispatch]);

  const removeCoupon = useCallback(() => {
    // Clear preview so the summary rows render as skeletons while OE
    // recomputes without the coupon — otherwise the shopper briefly sees
    // the pre-remove totals and thinks nothing happened. Bumping the seq
    // here also invalidates any in-flight applyCoupon that would otherwise
    // land after removeCoupon and re-set a coupon the shopper just cleared.
    ++previewSeqRef.current;
    setPreview(null);
    setPreviewLoading(true);
    setCouponCode(null);
    setCouponError(null);
    try { sessionStorage.removeItem(COUPON_STORAGE_KEY); } catch { /* ignore */ }
  }, []);

  // Hydrate gift lines from `preview.giftItems` with real product data
  // (name, image) so the UI can render them next to regular cart rows.
  // Server-side we only get `{ productId, quantity, price }`; the catalog
  // fetch fills in the rest. Falls back to a placeholder tile while pending
  // so the "FREE GIFT" row appears immediately instead of after a round-trip.
  const [giftDetails, setGiftDetails] = useState<Record<number, { name: string; image: string }>>({});
  const previewGifts = preview?.giftItems ?? [];
  const previewGiftsKey = JSON.stringify(previewGifts.map((g) => g.productId));
  useEffect(() => {
    if (previewGifts.length === 0) return;
    const missing = previewGifts
      .map((g) => g.productId)
      .filter((id) => !giftDetails[id]);
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
    return () => { cancelled = true; };
    // Depend on the id list rather than the array identity — otherwise the
    // fresh `preview.giftItems` array on every previewOrder response would
    // refetch even when the gift set is unchanged.
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

  return useMemo(() => ({
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
  }), [
    items, miniCartOpen, openMiniCart, closeMiniCart,
    addItem, addBundle, removeItem, removeBundle,
    updateQuantity, updateSize, clearCart,
    totalItems, subtotal, discount, total,
    preview, previewLoading, personalDiscount, totalDue,
    couponCode, couponDiscount, couponError,
    applyCoupon, removeCoupon,
    unavailableRemoved, dismissUnavailableNotice,
    giftItems,
  ]);
}
