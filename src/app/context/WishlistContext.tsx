'use client';
import { useCallback, useEffect, useMemo, useRef } from 'react';
import { useDispatch, useSelector } from 'react-redux';

import { getCmsProductId, getPlaygroundProductId } from '@/app/data/cms-product-id-map';
import type { AppDispatch, RootState } from '@/app/store';
import { wishlistActions } from '@/app/store/wishlistSlice';
import { trackActivity } from '@/app/utils/track-activity';
import { getProductsByIdsAction } from '@/lib/oneentry/catalog/products-action';

import { useAuth } from './AuthContext';

export interface WishlistItem {
  id: string;
  name: string;
  brand: string;
  price: string;
  salePrice?: string;
  image: string;
  /** Parallel to `colors[]` — thumbnail to show per swatch. */
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
  // Scope the hydrate flag to the current OE user identifier.
  const userIdentifier = useSelector((s: RootState) => s.user.data.userIdentifier);
  const { isLoggedIn, user, syncWishlist } = useAuth();

  // Hydrate Redux from /me/wishlist once per (user × browser session).
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
    // Prune first: OE is authoritative, so any local wishlist item that has a numeric productId not present in the OE list was removed on another device.
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
      // Drop placeholders whose product the catalog didn't return.
      for (const productId of productIds) {
        const playgroundId = getPlaygroundProductId(productId);
        const localId = playgroundId ?? String(productId);
        if (!enrichedIds.has(localId)) {
          dispatch(wishlistActions.removeItem(localId));
        }
      }
    });
    // `items` is deliberately omitted: this is a one-shot merge guarded by `hydratedRef`, and it reads the local wishlist as it stands at hydration time.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isLoggedIn, user, userIdentifier, dispatch]);
  useEffect(() => {
    if (!isLoggedIn) {
      hydratedRef.current = false;
      // Also drop the sessionStorage cache so a fresh sign-in re-hydrates from OE instead of trusting stale local Redux.
      if (typeof window !== 'undefined') sessionStorage.removeItem('oe_wishlist_merged');
    }
  }, [isLoggedIn]);
  // Cross-user safety: if the signed-in identifier changes without going through a `!isLoggedIn` transition (edge case, but cheap to defend), the stored flag from the previous user is no longer valid.
  useEffect(() => {
    hydratedRef.current = false;
  }, [userIdentifier]);

  // Push the current Redux wishlist → /me/wishlist on every change (debounced).
  const lastPushedRef = useRef<string>('');
  useEffect(() => {
    if (!isLoggedIn) return;
    // Same guard as CartContext: don't push local wishlist to OE until the hydration effect finished, or a cold sign-in with an empty local wishlist would wipe items other devices already synced.
    if (!hydratedRef.current) return;
    const oeItems = items.flatMap((it) => {
      const cmsId = getCmsProductId(it.id);
      return cmsId !== null ? [{ productId: cmsId }] : [];
    });
    const key = JSON.stringify(oeItems);
    if (key === lastPushedRef.current) return;
    lastPushedRef.current = key;
    const t = setTimeout(() => {
      void syncWishlist(oeItems);
    }, 400);
    return () => clearTimeout(t);
  }, [items, isLoggedIn, syncWishlist]);

  const addItem = useCallback(
    (item: WishlistItem) => {
      dispatch(wishlistActions.addItem(item));
      const cmsId = getCmsProductId(item.id);
      if (cmsId !== null) trackActivity({ type: 'product_add_to_wishlist', productId: cmsId });
    },
    [dispatch],
  );

  const removeItem = useCallback(
    (id: string) => {
      const cmsId = getCmsProductId(id);
      if (cmsId !== null) trackActivity({ type: 'product_remove_from_wishlist', productId: cmsId });
      dispatch(wishlistActions.removeItem(id));
    },
    [dispatch],
  );

  const toggleItem = useCallback(
    (item: WishlistItem) => {
      const exists = items.some((i) => i.id === item.id);
      if (exists) {
        removeItem(item.id);
      } else {
        addItem(item);
      }
    },
    [items, addItem, removeItem],
  );

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
