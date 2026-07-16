'use client'
import { useCallback, useEffect, useMemo, useRef } from 'react';
import { useSelector, useDispatch } from 'react-redux';
import type { RootState, AppDispatch } from '../store';
import { wishlistActions } from '../store/wishlistSlice';
import {
  getCmsProductId,
  getPlaygroundProductId,
} from '../data/cms-product-id-map';
import { useAuth } from './AuthContext';
import { getProductsByIdsAction } from '../../lib/oneentry/catalog/products-action';
import { trackActivity } from '../utils/track-activity';

export interface WishlistItem {
  id: string;
  name: string;
  brand: string;
  price: string;
  salePrice?: string;
  image: string;
  /** Parallel to `colors[]` — thumbnail to show per swatch. Callers set it
   *  from the OE variant list so the favourite card can flip its image when
   *  the shopper picks another colour inline. */
  colorImages?: string[];
  colors: string[];
  colorStock?: boolean[];
  sizes: string[];
  badge?: string;
  inStock: boolean;
  priceAlert?: boolean;
  selectedColor?: string;
  selectedSize?: string;
}

interface WishlistContextType {
  items: WishlistItem[];
  addItem: (item: WishlistItem) => void;
  removeItem: (id: string) => void;
  toggleItem: (item: WishlistItem) => void;
  updateSelection: (id: string, selectedColor?: string, selectedSize?: string) => void;
  isWishlisted: (id: string) => boolean;
  clearAll: () => void;
  count: number;
}

function placeholderFromCmsId(productId: number): WishlistItem {
  const playgroundId = getPlaygroundProductId(productId);
  return {
    id: playgroundId ?? String(productId),
    name: playgroundId ?? `Product #${productId}`,
    brand: '',
    price: '—',
    image: '/icons/ui/bag-placeholder.svg',
    colors: [],
    sizes: [],
    inStock: true,
  };
}

export function useWishlist(): WishlistContextType {
  const dispatch = useDispatch<AppDispatch>();
  const items = useSelector((state: RootState) => state.wishlist.items);
  // Scope the hydrate flag to the current OE user identifier — a raw `'1'`
  // flag survived across sign-ins and stopped the merge from running for the
  // second user, whose mobile-added items then got wiped by the sync-back
  // effect below (empty local Redux → push([]) → OE cleared).
  const userIdentifier = useSelector((s: RootState) => s.user.data.userIdentifier);
  const { isLoggedIn, user, syncWishlist } = useAuth();

  // Hydrate Redux from /me/wishlist once per (user × browser session). The
  // sessionStorage value carries the userIdentifier that was merged, so a
  // fresh sign-in as a different user (or the same user after a soft reload
  // that dropped the userIdentifier) always re-hydrates. A ref keeps repeat
  // consumers in the same render tree from firing duplicate merges.
  const hydratedRef = useRef(false);
  useEffect(() => {
    if (!isLoggedIn || !user?.wishlistItems || !userIdentifier) return;
    if (hydratedRef.current) return;
    if (typeof window !== 'undefined' && sessionStorage.getItem('oe_wishlist_merged') === userIdentifier) {
      hydratedRef.current = true;
      return;
    }
    hydratedRef.current = true;
    if (typeof window !== 'undefined') sessionStorage.setItem('oe_wishlist_merged', userIdentifier);
    // Prune first: OE is authoritative, so any local wishlist item that has a
    // numeric productId not present in the OE list was removed on another
    // device (e.g. the shopper deleted it from the mobile app). Non-numeric
    // ids are left alone — those are local-only entries that OE never saw.
    const oeProductIdSet = new Set(user.wishlistItems.map((i) => String(i.productId)));
    for (const local of items) {
      const cmsId = getCmsProductId(local.id);
      if (cmsId === null) continue;
      if (!oeProductIdSet.has(String(cmsId))) {
        dispatch(wishlistActions.removeItem(local.id));
      }
    }
    // Then add anything OE has that local Redux doesn't.
    const localIds = new Set(items.map((i) => i.id));
    const productIds: number[] = [];
    for (const srv of user.wishlistItems) {
      const playgroundId = getPlaygroundProductId(srv.productId);
      const id = playgroundId ?? String(srv.productId);
      if (localIds.has(id)) continue;
      dispatch(wishlistActions.addItem(placeholderFromCmsId(srv.productId)));
      productIds.push(srv.productId);
    }
    if (productIds.length === 0) return;
    void getProductsByIdsAction(productIds).then((enriched) => {
      const enrichedIds = new Set(enriched.map((u) => u.id));
      for (const ui of enriched) {
        dispatch(
          wishlistActions.addItem({
            id: ui.id,
            name: ui.name,
            brand: ui.brand ?? '',
            price: ui.price,
            image: ui.image,
            colors: ui.colors,
            sizes: ui.sizes ?? [],
            inStock: ui.inStock ?? true,
            badge: ui.label,
          }),
        );
      }
      // Drop placeholders whose product the catalog didn't return — they're
      // stale OE wishlist entries (deleted product, wrong env) and would
      // render as broken "Product #N" cards forever.
      for (const productId of productIds) {
        const playgroundId = getPlaygroundProductId(productId);
        const localId = playgroundId ?? String(productId);
        if (!enrichedIds.has(localId)) {
          dispatch(wishlistActions.removeItem(localId));
        }
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
      if (typeof window !== 'undefined') sessionStorage.removeItem('oe_wishlist_merged');
    }
  }, [isLoggedIn]);
  // Cross-user safety: if the signed-in identifier changes without going
  // through a `!isLoggedIn` transition (edge case, but cheap to defend), the
  // stored flag from the previous user is no longer valid — reset so the
  // check above runs the merge again.
  useEffect(() => {
    hydratedRef.current = false;
  }, [userIdentifier]);

  // Push the current Redux wishlist → /me/wishlist on every change (debounced).
  const lastPushedRef = useRef<string>('');
  useEffect(() => {
    if (!isLoggedIn) return;
    // Same guard as CartContext: don't push local wishlist to OE until
    // the hydration effect finished, or a cold sign-in with an empty
    // local wishlist would wipe items other devices already synced.
    if (!hydratedRef.current) return;
    const oeItems = items.flatMap((it) => {
      const cmsId = getCmsProductId(it.id);
      return cmsId !== null ? [{ productId: cmsId }] : [];
    });
    const key = JSON.stringify(oeItems);
    if (key === lastPushedRef.current) return;
    lastPushedRef.current = key;
    const t = setTimeout(() => { void syncWishlist(oeItems); }, 400);
    return () => clearTimeout(t);
  }, [items, isLoggedIn, syncWishlist]);

  const addItem = useCallback((item: WishlistItem) => {
    dispatch(wishlistActions.addItem(item));
    const cmsId = getCmsProductId(item.id);
    if (cmsId !== null) trackActivity({ type: 'product_add_to_wishlist', productId: cmsId });
  }, [dispatch]);

  const removeItem = useCallback((id: string) => {
    const cmsId = getCmsProductId(id);
    if (cmsId !== null) trackActivity({ type: 'product_remove_from_wishlist', productId: cmsId });
    dispatch(wishlistActions.removeItem(id));
  }, [dispatch]);

  const toggleItem = useCallback((item: WishlistItem) => {
    const exists = items.some((i) => i.id === item.id);
    if (exists) {
      removeItem(item.id);
    } else {
      addItem(item);
    }
  }, [items, addItem, removeItem]);

  const updateSelection = useCallback(
    (id: string, selectedColor?: string, selectedSize?: string) =>
      dispatch(wishlistActions.updateSelection({ id, selectedColor, selectedSize })),
    [dispatch],
  );

  const isWishlisted = useCallback((id: string) => items.some((i) => i.id === id), [items]);

  const clearAll = useCallback(() => {
    dispatch(wishlistActions.clearAll());
  }, [dispatch]);

  return useMemo(
    () => ({
      items,
      addItem,
      removeItem,
      toggleItem,
      updateSelection,
      isWishlisted,
      clearAll,
      count: items.length,
    }),
    [items, addItem, removeItem, toggleItem, updateSelection, isWishlisted, clearAll],
  );
}
