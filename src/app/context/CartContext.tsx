'use client'
import { useCallback, useEffect, useMemo, useRef } from 'react';
import { useSelector, useDispatch } from 'react-redux';
import type { RootState, AppDispatch } from '../store';
import { cartActions } from '../store/cartSlice';
import {
  getCmsProductId,
  getPlaygroundProductId,
} from '../data/cms-product-id-map';
import { useAuth } from './AuthContext';
import { getProductsByIdsAction } from '../../lib/oneentry/catalog/products-action';
import { trackActivity } from '../utils/track-activity';

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
    image: '/placeholder.svg',
  };
}

export function useCart(): CartContextType {
  const dispatch = useDispatch<AppDispatch>();
  const items = useSelector((state: RootState) => state.cart.items);
  const miniCartOpen = useSelector((state: RootState) => state.cart.miniCartOpen);
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
    if (!isLoggedIn || !user?.cartItems) return;
    if (hydratedRef.current) return;
    if (typeof window !== 'undefined' && sessionStorage.getItem('oe_cart_merged') === '1') {
      hydratedRef.current = true;
      return;
    }
    hydratedRef.current = true;
    if (typeof window !== 'undefined') sessionStorage.setItem('oe_cart_merged', '1');
    const localIds = new Set(items.map((i) => i.id));
    const productIds: number[] = [];
    for (const srv of user.cartItems) {
      const playgroundId = getPlaygroundProductId(srv.productId);
      const id = playgroundId ?? String(srv.productId);
      // Skip items already in the local cart — overwriting with a placeholder
      // would erase the price/name we already had.
      if (localIds.has(id)) continue;
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
          price: priceNumber,
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
  }, [isLoggedIn, user, dispatch]);
  useEffect(() => {
    if (!isLoggedIn) {
      hydratedRef.current = false;
      if (typeof window !== 'undefined') sessionStorage.removeItem('oe_cart_merged');
    }
  }, [isLoggedIn]);

  // Push local cart → /me/cart on every change (debounced) so the server
  // mirrors the optimistic Redux state.
  const lastPushedRef = useRef<string>('');
  useEffect(() => {
    if (!isLoggedIn) return;
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
  }, [dispatch]);

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
  }), [
    items, miniCartOpen, openMiniCart, closeMiniCart,
    addItem, addBundle, removeItem, removeBundle,
    updateQuantity, updateSize, clearCart,
    totalItems, subtotal, discount, total,
  ]);
}
