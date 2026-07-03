# Cart & Wishlist State

> Source-of-truth review for cart, wishlist (favorites), and recently-viewed subsystems. Cuts across Redux Toolkit slices, the `CartContext` / `WishlistContext` hook facades, and the `syncCart` / `syncWishlist` Server Actions that mirror local state into OneEntry `users/me`.

---

## 1. Overview

The storefront treats cart and wishlist as **client-optimistic** state:

1. Every mutation dispatches to a Redux slice immediately — the UI reacts on the next render.
2. A debounced effect (400 ms) pushes the resulting snapshot to OneEntry via a Server Action.
3. On login, the server snapshot is merged into Redux once per browser session (guarded by a `sessionStorage` flag).
4. Placeholder items pulled from `users/me` are enriched with real product data via `getProductsByIdsAction`.

There is **no** RTK Query client hook on the live path — the two API slices (`cartApi`, `wishlistApi`) are compiled scaffolding, not consumers.

Guest carts / wishlists stay in Redux + `localStorage` (`oe_store`, v5). They are not synced anywhere. On sign-in, they are merged with the server list before the sync effect starts pushing.

```
Component
   │  dispatch(cartActions.addItem)   (optimistic)
   ▼
cartSlice.items          ── saveToStorage ──► localStorage['oe_store'].cart
   │
   │  400 ms debounce (CartContext effect)
   ▼
syncCartAction({items})  (Server Action, requires oe_access cookie)
   │
   ▼
OneEntry `users/me/cart` (canonical)
```

The `context/` filenames are legacy: `CartContext.tsx` and `WishlistContext.tsx` do not call `createContext()` — they expose hook facades (`useCart()`, `useWishlist()`) that wrap Redux + Server Actions. Only `AuthContext.tsx` and `QuickViewContext.tsx` and `CatalogAccentContext.tsx` are actual React Contexts. This is a layering convention, not a duplication.

---

## 2. Files at a glance

| File | Role |
|---|---|
| `src/app/store/cartSlice.ts` | Reducers + selectors for cart items and `miniCartOpen` |
| `src/app/store/wishlistSlice.ts` | Reducers + selectors for wishlist items |
| `src/app/store/recentlyViewedSlice.ts` | Reducers for the recently-viewed trail (TTL 30d, cap 100) |
| `src/app/context/CartContext.tsx` | `useCart()` — hook facade; hydrates from `user.cartItems`, debounced sync, activity tracking |
| `src/app/context/WishlistContext.tsx` | `useWishlist()` — same pattern |
| `src/lib/oneentry/auth/actions.ts` | `syncCartAction`, `syncWishlistAction`, `getCurrentUserAction` (returns `cart[]` and `wishlist[]`) |
| `src/lib/oneentry/catalog/products-action.ts` | `getProductsByIdsAction` — used to enrich server placeholders |
| `src/app/data/cms-product-id-map.ts` | `getCmsProductId` / `getPlaygroundProductId` — legacy id bridge |
| `src/app/utils/track-activity.ts` | `trackActivity()` — fire-and-forget analytics wrapper |
| `src/app/store/api/cartApi.ts` + `wishlistApi.ts` | RTK Query scaffolding — not on the live path |

---

## 3. CartItem / WishlistItem shape

```ts
// src/app/context/CartContext.tsx
interface CartItem {
  id: string;              // playground SKU ('wc-1') OR stringified OE product id
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

// src/app/context/WishlistContext.tsx
interface WishlistItem {
  id: string;
  name: string;
  brand: string;
  price: string;              // formatted string (e.g. "$89.99"), not number
  salePrice?: string;         // formatted string, not number
  image: string;
  colorImages?: string[];
  colors?: string[];
  colorStock?: boolean[];     // per-color availability flags, not stock counts
  sizes?: string[];
  badge?: string;
  inStock: boolean;
  priceAlert?: boolean;
  selectedColor?: string;
  selectedSize?: string;
}
```

The Platform payload is minimal (`{productId: number, qty: number}` for cart, `{productId: number}` for wishlist). Cosmetic fields (name / price / image) come from either the local Redux state (guest additions) or the enrichment fetch (post-login hydration).

---

## 4. Optimistic mutations (`useCart()`)

`src/app/context/CartContext.tsx`:

```ts
const addItem = useCallback((item: CartItem) => {
  dispatch(cartActions.addItem(item));                  // 1. optimistic Redux
  const cmsId = getCmsProductId(item.id);
  if (cmsId !== null) {
    trackActivity({                                     // 2. fire-and-forget analytics
      type: 'product_add_to_cart',
      productId: cmsId,
      meta: { quantity: item.quantity },
    });
  }
}, [dispatch]);
```

The sync to OneEntry is NOT triggered inline — it comes from a debounced effect (§5). This means many quick clicks on `+`/`-` collapse into a single `syncCart` call.

Mutations exposed by `useCart()`:

| Callback | Redux action | Activity event |
|---|---|---|
| `addItem(item)` | `cartActions.addItem` | `product_add_to_cart` |
| `addBundle(items)` | `cartActions.addBundle` | one `product_add_to_cart` per item (with `bundle: true`) |
| `removeItem(id)` | `cartActions.removeItem` | `product_remove_from_cart` |
| `removeBundle(id)` | `cartActions.removeBundle` | one `product_remove_from_cart` per removed item |
| `updateQuantity(id, delta)` | `cartActions.updateQuantity` | none (would spam the endpoint) |
| `updateSize(id, size)` | `cartActions.updateSize` | none |
| `clearCart()` | `cartActions.clearCart` + resets coupon state (`couponCode=null`, `couponError=null`, drops `sessionStorage['oe_coupon_code']`) | none |
| `openMiniCart()` / `closeMiniCart()` | `cartActions.openMiniCart` / `closeMiniCart` | — |

Derived values also exposed: `totalItems`, `subtotal`, `discount` (= `originalTotal − subtotal`), `total` (= `subtotal`).

`useWishlist()` follows the same pattern with `addItem`, `removeItem`, `toggleItem(item)`, `updateSelection(id, color?, size?)`, `isWishlisted(id)`, `clearAll()`, plus a memoised `count`.

### 4a. Checkout preview + coupons

`useCart()` also owns the OE `previewOrder` snapshot used by the Delivery step:

| Field / callback | Meaning |
|---|---|
| `preview` | Latest `PreviewOrderResult` for the current cart (+ applied coupon). |
| `previewLoading` | `true` while a `previewOrder` request is in flight. |
| `personalDiscount`, `totalDue` | Derived from `preview` — loyalty tier discount and final amount. |
| `couponCode` | Currently applied coupon (survives cart mutations and page navigation via `sessionStorage['oe_coupon_code']`; re-sent on every `previewOrder`/`createOrder`). Wiped by `clearCart()` so the next order starts without an implicit coupon. |
| `couponDiscount` | `preview.couponDiscountAmount` — what OE actually deducted. |
| `couponError` | Server-provided rejection message from the last `applyCoupon` attempt (e.g. "Add $61 more to unlock SUMMER2026"); `null` after a successful apply or `removeCoupon()`. |
| `applyCoupon(code)` | Clears `preview` and flips `previewLoading=true` before calling `previewOrderAction`. Success → sets the new `preview` and `couponCode`. Failure → sets `couponError` and re-fetches `previewOrder` without the code so the summary doesn't get stuck showing the discount-row skeleton (the `useEffect` doesn't rerun on failure because `couponCode` never changed). |
| `removeCoupon()` | Clears `preview` and flips `previewLoading=true` before setting `couponCode=null`. The `productsKey`/`couponCode` `useEffect` then re-fetches without the coupon; the discount-row skeleton fires during recompute instead of momentarily showing the stale coupon discount. |

A `useEffect` reruns `previewOrder` whenever the cart's `productsKey` or `couponCode` changes.

---

## 5. Debounced sync to OneEntry

Both contexts run an identical effect:

```ts
// src/app/context/CartContext.tsx (excerpt)
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
```

Behaviour:

- **400 ms debounce** — quick sequences collapse into a single push.
- **Payload dedupe** — `lastPushedRef` prevents replaying the same snapshot.
- **Guest gate** — no sync until `isLoggedIn === true`.
- **CMS id gate** — items without a mapped `cmsProductId` are silently dropped from the payload (see §7).

The `syncCart` / `syncWishlist` Server Actions (`src/lib/oneentry/auth/actions.ts`) both perform an **absolute PUT** — the payload replaces the server list. No add/remove deltas.

---

## 6. Login-time server merge

When `isLoggedIn` flips to `true`, the effect that hydrates from `user.cartItems` fires once per session:

```ts
// src/app/context/CartContext.tsx (excerpt)
const hydratedRef = useRef(false);
useEffect(() => {
  if (!isLoggedIn || !user?.cartItems) return;
  if (hydratedRef.current) return;
  if (sessionStorage.getItem('oe_cart_merged') === '1') { hydratedRef.current = true; return; }
  hydratedRef.current = true;
  sessionStorage.setItem('oe_cart_merged', '1');
  // ... place server placeholders that aren't already in the local cart
  // ... call getProductsByIdsAction(placeholderProductIds)
  // ... swap each placeholder for the enriched product
  // ... drop stale server-only items whose id didn't come back
}, [isLoggedIn, user, dispatch]);
```

Logic:

1. If a `sessionStorage.oe_cart_merged === '1'` flag is present, the effect is a no-op — this prevents re-merging on every remount as Next.js App Router bounces the tree between navigations.
2. Otherwise, for each server item not already in the local cart:
   - Insert a placeholder (`name: 'Platform product #N'`, `price: 0`, `image: '/placeholder.svg'`).
3. Call `getProductsByIdsAction(productIds)` — a Server Action that maps OE product IDs to `Product` shape.
4. Swap each placeholder for the enriched product.
5. Drop any server placeholder whose id did NOT come back from the catalog fetch — that indicates a deleted product on the OE side, and leaving it in the cart would raise a `$0` line and break order placement.

On logout, `hydratedRef` and the sessionStorage flag are cleared so the next login re-merges.

Wishlist follows the same pattern with `oe_wishlist_merged`.

---

## 7. Playground id bridge

`src/app/data/cms-product-id-map.ts` maps ~25 playground SKUs (`wc-1`, `mc-3`, …) to numeric OneEntry product IDs. Two helpers:

- `getCmsProductId(playgroundId): number | null` — used when the client needs to push to OE (`syncCart`, `syncWishlist`, `trackActivity`).
- `getPlaygroundProductId(cmsId): string | null` — used when hydrating server items to match against `localStorage`-persisted playground data.

Items without a mapping are:

- Silently dropped from the `syncCart` / `syncWishlist` payload.
- Untracked (no `trackActivity` fires for them).

The map is a **transitional artefact** — as more storefront components adopt integer OE ids directly, the map's role shrinks.

---

## 8. Recently viewed

`recentlyViewedSlice.ts`:

- Prepended by `addProduct(product)` — the slice attaches `viewedAt: Date.now()`.
- Evicts items older than `RECENTLY_VIEWED_MAX_AGE_MS` (30 days) on every insert.
- Circular buffer capped at `LIMITS.RECENTLY_VIEWED_MAX = 100`.
- Persisted to `oe_store.recentlyViewed` in `localStorage`.

### 8.1 Server sync

The trail is also mirrored to OneEntry for signed-in users via three Server Actions in `src/lib/oneentry/auth/actions.ts`:

| Action | Trigger | Effect |
|---|---|---|
| `pushRecentlyViewedAction({productId, viewedAt})` | `RecentlyViewedSection` on PDP mount when `isLoggedIn` | Appends one view to `user.recentlyViewedItems` on the OE side. |
| `getRecentlyViewedAction()` | `AuthContext` after `/me` bootstrap | Reads the server trail. |
| `mergeRecentlyViewedAction(local)` | `AuthContext` on the first login after guest browsing | Combines the guest's `oe_store.recentlyViewed` items with the server trail — dedupes by `productId`, keeps the most recent `viewedAt`, pushes the merged list back to OE, returns it to the client. |

After merge, `AuthContext` dispatches `recentlyViewedActions.hydrate(items)` to replace the Redux slice with the merged trail. Subsequent PDP mounts fire `addProduct` locally and `pushRecentlyViewedAction` in parallel.

Guest views never leave the browser — no `x-guest-id` push endpoint exists for recently-viewed.

The recently-viewed section on the PDP (`src/app/pages/product/RecentlyViewedSection.tsx`) is lazy-loaded via `IntersectionObserver`; the account-page history tab reads the same slice.

---

## 9. Persistence to `localStorage`

`saveToStorage(state)` in `src/app/store/index.ts` writes `cart` (minus `miniCartOpen`), `wishlist`, `recentlyViewed`, and `catalog` on every dispatched action.

- **Key:** `oe_store`.
- **Version:** 5.
- **Auth tokens are NEVER persisted** — the session lives in httpOnly cookies (see [AUTH.md](./AUTH.md) §3).

If the persisted schema version is unknown (future), the store is wiped to prevent corruption.

---

## 10. Legacy RTK Query scaffolding

`src/app/store/api/cartApi.ts` and `wishlistApi.ts` are `createApi` slices with `fetchBaseQuery({baseUrl: process.env.NEXT_PUBLIC_API_URL})`. Their query hooks are NOT called from any component — the live sync goes through Server Actions. Both middlewares remain registered in `makeStore()` so any future migration back to client-side fetching would only need to swap the base URL and start calling the hooks.

`isCartApiEnabled()` / `isWishlistApiEnabled()` both return `false` in the current production config (`NEXT_PUBLIC_API_URL` unset).

---

## 11. Error handling

- **Failed `syncCart` / `syncWishlist`** — the Server Action swallows the error (fire-and-forget). Redux state is NOT rolled back; the next mutation will re-attempt. Look for `console.warn('[…] sync failed')` on the server logs.
- **Failed `getCurrentUserAction`** — `AuthContext` sets `authReady = true` but leaves `user = null`; login prompts render.
- **Failed `getProductsByIdsAction` during merge** — placeholders remain in the cart with `$0` price. This is a symptom of stale server state (deleted products) — the merge effect explicitly drops those items.
- **Guest bounce** — logging out while items are in the cart clears the `oe_cart_merged` flag but leaves Redux items intact. Guest continues to see the same cart; sign-in triggers a fresh merge.

Legacy helper `emitSyncWarning(kind, message)` in `src/app/utils/syncWarnings.ts` dispatches a `CustomEvent('oe:sync-warning')` for future toast subscribers — currently no listener is attached.

---

## 12. Selectors (`src/app/store/selectors.ts`)

Memoised via `createSelector`:

- `selectCartItems`, `selectMiniCartOpen`
- `selectCartTotalItems`, `selectCartSubtotal`, `selectCartOriginalSubtotal`, `selectCartDiscount`
- `selectWishlistItems`, `selectWishlistCount`, `selectIsWishlisted(id)`
- `selectRecentlyViewed`

Selectors are the preferred read path — direct `useSelector((s) => s.cart.items)` is fine for one-off reads but should be avoided in hot components.

---

## 13. Bundles

Bundle items are cart lines that share a synthetic `bundleId` (e.g. `bundle-x8f2a1`, generated by `cartSlice::addBundle`). Rules:

- `addBundle(items)` — pushes all items into `state.items`, stamping each with the same fresh `bundleId`. Bundle-scoped ids collide with normal SKUs safely because they include the `bundle-` prefix.
- `updateQuantity({id, delta})` — if the target item has a `bundleId`, ALL siblings in the same bundle are updated by the same `delta`. The UI shows a single quantity control per bundle, not one per line.
- `removeBundle(bundleId)` — removes every item whose `bundleId` matches.
- `removeItem(id)` on a bundle line only removes that line (allowing partial breakage), but the current UI never does this — it always dispatches `removeBundle`.

Persisted normally through `oe_store`. Server sync via `syncCart` flattens the bundle into individual `{productId, qty}` entries — OneEntry has no bundle concept, only line items. If the bundle is re-hydrated from the server after a re-login, it is NOT re-bundled — items appear as independent lines. This is a known limitation; carrying the `bundleId` through OE requires an `OeCartItem.bundleId` field on the server side.

Bundle sources:
- **PDP Special Offers** (`ProductSpecialOffers`) — "Buy this bundle" CTA calls `useCart().addBundle(bundleItems)`.
- **CartBundleRow** in `/cart` renders the aggregated bundle row.
- **MiniCart** renders bundle rows collapsed with the same shared control.

## 14. Cross-references

- [REDUX.md](./REDUX.md) — full store layout, migrations
- [AUTH.md](./AUTH.md) — how session cookies gate `syncCart` / `syncWishlist`
- [CHECKOUT.md](./CHECKOUT.md) — how the cart is snapshotted at order placement
- [ONEENTRY_INTEGRATION.md](./ONEENTRY_INTEGRATION.md) — `syncCart` / `syncWishlist` / `getCurrentUserAction` internals
