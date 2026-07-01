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
    image: '/placeholder.svg',
    colors: [],
    sizes: [],
    inStock: true,
  };
}

export function useWishlist(): WishlistContextType {
  const dispatch = useDispatch<AppDispatch>();
  const items = useSelector((state: RootState) => state.wishlist.items);
  const { isLoggedIn, user, syncWishlist } = useAuth();

  // Hydrate Redux from /me/wishlist once per browser session. Use
  // sessionStorage so re-mounts on navigation don't re-merge stale OE items
  // and overwrite already-enriched cards.
  const hydratedRef = useRef(false);
  useEffect(() => {
    if (!isLoggedIn || !user?.wishlistItems) return;
    if (hydratedRef.current) return;
    if (typeof window !== 'undefined' && sessionStorage.getItem('oe_wishlist_merged') === '1') {
      hydratedRef.current = true;
      return;
    }
    hydratedRef.current = true;
    if (typeof window !== 'undefined') sessionStorage.setItem('oe_wishlist_merged', '1');
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
  }, [isLoggedIn, user, dispatch]);
  useEffect(() => {
    if (!isLoggedIn) {
      hydratedRef.current = false;
      if (typeof window !== 'undefined') sessionStorage.removeItem('oe_wishlist_merged');
    }
  }, [isLoggedIn]);

  // Push the current Redux wishlist → /me/wishlist on every change (debounced).
  const lastPushedRef = useRef<string>('');
  useEffect(() => {
    if (!isLoggedIn) return;
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
