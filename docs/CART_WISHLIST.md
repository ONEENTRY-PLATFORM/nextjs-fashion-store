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
| `src/app/store/cartSlice.ts` | Reducers + selectors for cart items, `miniCartOpen`, and `unavailableRemoved` |
| `src/app/store/wishlistSlice.ts` | Reducers + selectors for wishlist items |
| `src/app/store/recentlyViewedSlice.ts` | Reducers for the recently-viewed trail (TTL 30d, cap 100) |
| `src/app/context/CartContext.tsx` | `useCart()` — hook facade; hydrates from `user.cartItems`, debounced sync, activity tracking |
| `src/app/context/WishlistContext.tsx` | `useWishlist()` — same pattern |
| `src/lib/oneentry/auth/actions.ts` | `syncCartAction`, `syncWishlistAction`, `getCurrentUserAction` (returns `cart[]` and `wishlist[]`) |
| `src/lib/oneentry/catalog/products-action.ts` | `getProductsByIdsAction` — used to enrich server placeholders |
| `src/app/data/cms-product-id-map.ts` | `getCmsProductId` / `getPlaygroundProductId` — numeric id conversion helpers |
| `src/app/utils/track-activity.ts` | `trackActivity()` — fire-and-forget analytics wrapper |
| `src/app/store/api/cartApi.ts` + `wishlistApi.ts` | RTK Query scaffolding — not on the live path |

---

## 3. CartItem / WishlistItem shape

```ts
// src/app/context/CartContext.tsx
interface CartItem {
  id: string;              // stringified OE numeric product id
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
  stockLimit?: number;     // max orderable qty for this variant, snapshotted at add-time from OE stockqty/units.
                           // undefined = uncapped (legacy items or server-hydrated placeholders).
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

`stockLimit` is snapshotted from `activeVariant?.stock` (or `catalogProduct?.stock` for products without variants) when the shopper clicks "Add to cart" on `ProductDetailPage`. Both `CatalogProduct` and `PdpProductVariant` now carry an optional `stock?: number` field populated by `adaptCatalogProductToPdpProduct`, so the PDP-to-cart path delivers a real value. `undefined` means uncapped — this is the state for items re-hydrated from the server (the OE `users/me` cart payload carries no stock field) or for tenants that track availability via `statusIdentifier` only (in which case `adaptCatalogProductToPdpProduct` intentionally omits the `stock` field rather than forwarding a zero). When a duplicate line is detected on `addItem`, the reducer refreshes `stockLimit` from the incoming payload if it carries a fresh value, so a shopper who revisits the PDP picks up any inventory changes.

**Current coverage gap:** `QuickViewModal` and `CatalogListProductCard` do not yet snapshot `stockLimit` because the UI `Product` type (used by the catalog-list path) doesn't carry a `stock` field — plumbing it would require updating `adaptCatalogProductToUiProduct` and the `Product`/`CatalogProductVariant` UI types. `previewOrderAction` triggers catalog-verified pruning for items OE reports as not found (see §4a); `createOrderAction` still relies on OE to reject on hard OOS at submit time.

### 3.1 Cart line dedup rule (id + size)

`cartSlice::addItem` treats a line as a **duplicate only when both `id` AND `size` match**:

```ts
// src/app/store/cartSlice.ts
addItem(state, action) {
  const item = action.payload;
  const existing = state.items.find(i => i.id === item.id && i.size === item.size);
  if (existing) existing.quantity += item.quantity;
  else state.items.push(item);
}
```

Consequences:

- The same product added in size `M` and size `L` renders as **two lines**, each with independent quantity controls.
- Changing size via `updateSize` does NOT re-run the dedup — it can leave two lines with the same `id + size`, which is a caller responsibility (the Cart UI never triggers this because sizes come from a bounded dropdown).
- Wishlist has no size dimension — `wishlistSlice::addItem` dedupes by `id` alone and performs an **upsert-merge** on repeat inserts so a placeholder→enriched hydration doesn't wipe user-selected `selectedColor` / `selectedSize` (they are preserved from the previous entry).

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
| `dismissUnavailableNotice()` | `cartActions.dismissUnavailableRemoved` | — |

`unavailableRemoved` (read-only from context) — snapshot of items auto-pruned by the `previewOrder` failure branch (see §4a below). Used by `CartUnavailableNotice` to render the banner.

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

#### Auto-pruning stale product ids

When `previewOrderAction` returns `!ok` and the response includes `missingProductIds: number[]`, `CartContext` runs a **catalog double-check** before touching the cart:

1. Calls `getProductsByIdsAction(missingProductIds)` (the same catalog endpoint used for cart hydration).
2. Any id the catalog **also** cannot find is considered truly gone — those `CartItem` entries are snapshotted via `dispatch(cartActions.setUnavailableRemoved(snapshots))` and removed via `cartActions.removeItem`.
3. Any id the catalog **does** return (i.e. the product exists in the catalog but `Orders.previewOrder` erroneously reports it missing) is left in the cart unchanged.
4. The pruned item list is exposed as `unavailableRemoved` from `useCart()`.

This double-check prevents valid catalog products from being silently wiped when OE's `Orders.previewOrder` endpoint returns a spurious `"Product <id> not found"` error for items that are `in_stock` in the catalog (a known OE inconsistency observed with, for example, newly added products).

`missingProductIds` is extracted server-side by `previewOrderAction` in `src/lib/oneentry/auth/actions.ts` — OE returns error messages shaped `"Product <id> not found"`; the action extracts numeric ids via regex and attaches them to the `PreviewOrderResponse` (`{ ok: false; error: string; missingProductIds: number[] }`).

After pruning confirmed-missing items, the `productsKey` dependency changes and the effect re-fires a fresh `previewOrder` without the removed ids. The shopper sees `CartUnavailableNotice` (a banner mounted in `Providers.tsx` that reads `unavailableRemoved`), which lists the removed items and offers a "Dismiss" button that calls `dismissUnavailableNotice()` → `cartActions.dismissUnavailableRemoved()`. The banner also self-dismisses automatically after 5 seconds via a `setTimeout` inside a `useEffect`; if a new removal batch replaces `unavailableRemoved` while the timer is running, the effect cleans up the old timer and starts a fresh 5-second countdown. `unavailableRemoved` is excluded from `oe_store` persistence — it is ephemeral banner state only.

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

When `isLoggedIn` flips to `true`, the effect that hydrates from `user.cartItems` fires once per **(user × browser session)**:

```ts
// src/app/context/CartContext.tsx (excerpt)
const hydratedRef = useRef(false);
useEffect(() => {
  if (!isLoggedIn || !user?.cartItems || !userIdentifier) return;
  if (hydratedRef.current) return;
  if (sessionStorage.getItem('oe_cart_merged') === userIdentifier) { hydratedRef.current = true; return; }
  hydratedRef.current = true;
  sessionStorage.setItem('oe_cart_merged', userIdentifier);
  // ... place server placeholders that aren't already in the local cart
  // ... call getProductsByIdsAction(placeholderProductIds)
  // ... swap each placeholder for the enriched product
  // ... drop stale server-only items whose id didn't come back
}, [isLoggedIn, user, userIdentifier, dispatch]);
```

Logic:

1. If `sessionStorage.oe_cart_merged` equals the **current `userIdentifier`**, the effect is a no-op — this prevents re-merging on every remount as Next.js App Router bounces the tree between navigations.
2. A mismatch (different user, stale or missing value) means the merge runs again. The stored value is the OE `userIdentifier` string, not the literal `'1'` used before this fix.
3. **Prune first (OE is authoritative).** For every local Redux item whose `id` maps to a numeric CMS product id (`getCmsProductId` returns non-null), the effect checks whether that id is present in the OE list. If it is absent, the item is dispatched with `cartActions.removeItem` / `wishlistActions.removeItem` immediately. This reflects cross-device deletions — e.g. a shopper deleted an item in the mobile app while the web tab was closed; on next page load / re-sign-in the local stale entry is pruned. Items with non-numeric ids (playground stubs) are left untouched because OE never held them.
4. For each server item after pruning, two sub-cases apply:
   - **Id not in local cart** — insert a placeholder (`name: 'Platform product #N'`, `price: 0`, `image: '/placeholder.svg'`).
   - **Id already in local cart but `quantity` differs from OE** — re-align to OE's qty by calling `removeItem(local.id)` followed by `addItem({...local, quantity: srv.qty})`. The enriched `name` / `image` / `size` fields are taken from the existing local entry so they are not lost. This handles cross-device quantity changes (e.g. the shopper adjusted qty on mobile while this browser tab was closed).
   - **Id already in local cart with matching `quantity`** — no action; the local entry is kept as-is.
5. Call `getProductsByIdsAction(productIds)` — a Server Action that maps OE product IDs to `Product` shape.
6. Swap each placeholder for the enriched product.
7. Drop any server placeholder whose id did NOT come back from the catalog fetch — that indicates a deleted product on the OE side, and leaving it in the cart would raise a `$0` line and break order placement.

**Cross-user safety (added fix).** Before this change, the flag stored a raw `'1'`. If two different users signed in during the same browser session, the `'1'` flag from user A prevented the merge from running for user B. Worse, the debounced sync effect then pushed the empty local Redux to OE as an absolute PUT, wiping user B's mobile-added items from the server. The fix scopes the flag to `userIdentifier` so a different user always gets a fresh merge.

**On logout / hard reload.** A `useEffect` that watches `!isLoggedIn` resets `hydratedRef` and removes `oe_cart_merged` from sessionStorage. Because `isLoggedIn` starts as `false` on every page load (while the bootstrap `getCurrentUserAction` is in flight), this effect runs on the initial mount — guaranteeing a fresh merge even after a hard reload by the same user, so items added on another device (mobile app, different browser) are always picked up.

**Cross-user guard without a `!isLoggedIn` transition.** A second `useEffect` watching only `userIdentifier` resets `hydratedRef` to `false`. This covers edge cases where the identifier changes without a logout cycle, ensuring the merge-check above re-evaluates against the new user.

Wishlist follows the same pattern with `oe_wishlist_merged`.

---

## 7. Numeric id conversion helpers

`src/app/data/cms-product-id-map.ts` exposes two thin conversion helpers (the static mapping table has been removed; all UI item ids are already the OneEntry numeric id as a string):

- `getCmsProductId(id: string): number | null` — returns `Number(id)` when `id` matches `/^\d+$/`, otherwise `null`.
- `getPlaygroundProductId(cmsId: number): string | null` — returns `String(cmsId)` when `cmsId` is finite, otherwise `null`.

Items for which `getCmsProductId` returns `null` (non-numeric id strings) are silently dropped from `syncCart` / `syncWishlist` payloads and produce no `trackActivity` call.

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

`saveToStorage(state)` in `src/app/store/index.ts` writes `cart` (minus `miniCartOpen` and `unavailableRemoved`), `wishlist`, `recentlyViewed`, and `catalog` on every dispatched action.

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
- **`previewOrder` "Product not found" failure** — when `previewOrderAction` returns `!ok` with `missingProductIds`, `CartContext` cross-checks each id against the catalog via `getProductsByIdsAction`. Only ids the catalog also cannot find are pruned: their snapshots are saved to `unavailableRemoved` and the items are removed from the cart; ids the catalog still returns are left untouched. After pruning, `previewOrder` is re-fired without the removed ids. `CartUnavailableNotice` surfaces the list to the shopper. See §4a for the full flow.
- **Guest bounce** — logging out while items are in the cart clears the `oe_cart_merged` flag but leaves Redux items intact. Guest continues to see the same cart; sign-in triggers a fresh merge.

### 11.1 `emitSyncWarning` event system

`src/app/utils/syncWarnings.ts` exposes a single helper for surfacing sync-side failures:

```ts
emitSyncWarning(kind: 'unmapped' | 'mutation' | 'connectivity', message: string, context?)
```

Behaviour:

- Always logs via `console.warn('[sync:<kind>] <message>', context)`.
- If `window` is defined, dispatches `CustomEvent('oe:sync-warning', { detail: { kind, message, context } })` (constant `SYNC_WARNING_EVENT`). Silent no-op on non-DOM runtimes and on browsers without the CustomEvent constructor.
- Returns the `detail` payload so unit tests (`src/app/store/__tests__/syncWarnings.test.ts`) can assert on it.

Kinds:

| Kind | Meaning |
|---|---|
| `unmapped` | Playground SKU has no `cmsProductId` — mutation stayed local-only, no server call. |
| `mutation` | Server rejected an add/remove — optimistic Redux state was (or should be) rolled back. |
| `connectivity` | Fetch itself failed (network / CORS) — local state preserved, retry on next mutation. |

No toast container subscribes to `oe:sync-warning` in production today; the current sync path (§5) also swallows errors silently rather than routing them through `emitSyncWarning`. The helper is retained so a future toast subscriber can attach without a rewrite.

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

### 13.1 Bundle rendering on `/cart`

`CartPage` groups items into `RenderRow` (`{kind: 'item' | 'bundle'}`) via a `useMemo` over `items`:

- All rows carrying the same `bundleId` collapse into a single `CartBundleRow`.
- The bundle row hides per-line quantity controls, showing a single `QtyControl` on the last line — its `+`/`-` handler calls `updateQuantity(itemId, delta)` on any sibling; the reducer fans the delta to every line in the bundle.
- The row header displays `L.bundleLabel` + a "remove entire bundle" CTA that dispatches `removeBundle(bundleId)`.
- Bundle rows do NOT render the "select for bulk remove" checkbox — the `selectedIds` `Set` on `CartPage` only covers non-bundle items, and `Select all` only maps over `nonBundleItems` (`items.filter(i => !i.bundleId)`).
- Bundle line prices are summed to `bundleTotal` (with `bundleOriginal` for strikethrough savings display); `L.bundleSavePrefix` shows `bundleOriginal − bundleTotal` when > 0.

### 13.2 Quantity floor and stock cap

`cartSlice::updateQuantity` clamps each affected item to `Math.max(1, quantity + delta)`. Reaching zero requires an explicit `removeItem` / `removeBundle` dispatch — the `-` button on a line at qty=1 is a no-op.

`addItem`, `addBundle`, and `updateQuantity` additionally clamp `quantity` at `item.stockLimit ?? Infinity`. When `stockLimit` is `undefined` (legacy or server-hydrated items) the cap is effectively infinite. The `+` button in `QtyControl` is disabled when `value >= max` (where `max` is passed down as `item.stockLimit`), preventing the shopper from requesting more units than OE reports as available at add-time.

## 14. Waiting list (derived from wishlist + OE stock)

The `/account/waiting-list` tab has no dedicated storage. `WaitingListSection` (`src/app/pages/account/WaitingListSection.tsx`) derives its rows on the fly from the **wishlist** by resolving each item's current stock status:

1. On mount (when `isLoggedIn && user.wishlistItems.length > 0`) it calls the Server Action `getWaitingListAction()` (`src/lib/oneentry/catalog/waiting-list-action.ts`).
2. The action reads `user.wishlistItems` via `getWishlistAction()`, then fetches each product via `loadProductsByIds()`.
3. For every product it infers a `WaitingStockStatus`:

   ```ts
   if (statusIdentifier === 'out_of_stock' || stock <= 0) 'out_of_stock'
   else if (stock <= 3)                                    'low_stock'
   else                                                    'back_in_stock'
   ```

4. Returns `WaitingItem[]` with `{id, name, brand, price, img, size (first), color (first), status, notify: true, addedDate}`. `addedDate` comes from `srv.addedAt` formatted as `dd MMM yyyy`.

Client-side, `WaitingListSection` filters the resolver's result to items whose id is still in the current wishlist (`wishlistIds`), so removing an item from the wishlist immediately drops the corresponding waiting-list row without a re-fetch. `notify` is a local-only override (`notifyOverrides` map, not persisted). `handleAdd` synthesizes a cart line with a suffixed id (`${item.id}-waiting`) — the `-waiting` suffix keeps it visually distinct from the same product added directly from a PDP, but note `getCmsProductId` regex-strips the suffix so sync still works.

Empty wishlist short-circuits to `[]` without a catalog call. Products the catalog can't return (deleted upstream) are silently dropped from the result via `flatMap`.

## 15. FavoritesPage bulk actions

`FavoritesPage` (`src/app/pages/FavoritesPage.tsx`) exposes two bulk operations on the wishlist:

- **`handleMoveAllToCart`** — iterates `items.filter(i => i.inStock)` and dispatches `useCart().addItem(...)` per row, synthesizing a CartItem with:
  - `id: `${item.id}-auto`` — suffix marks it as a bulk-added line, but does NOT create a new dedup key beyond what `id + size` already provides.
  - `size: item.sizes[0] ?? ''` — first available size. Wishlist items without a saved `selectedSize` end up with a blank size, which the cart row's `SizeDropdown` treats as an unselected placeholder.
  - `price` parsed from the formatted `salePrice ?? price` string via `parseFloat(str.replace(/[^0-9.]/g, ''))`.
  - Out-of-stock items are skipped silently (no toast).
- **`clearAll`** — from `useWishlist()`, dispatches `wishlistActions.clearAll()`. Gated by an inline confirmation UI (`showClearConfirm`) rather than a modal.

Bundles are NOT a concept on the favourites page (wishlist has no `bundleId` field) — bulk move-to-cart therefore adds every item as an independent cart line, even if the shopper originally arrived via a PDP bundle CTA.

The "Recently viewed" strip on `FavoritesPage` reads `state.recentlyViewed.items` and dedupes by lowercased `name` (fallback `id`) so variants of the same product don't monopolise the row.

## 16. CartPage promo section (independent from Delivery)

`CartPage` renders its own coupon input alongside the order summary. Key details:

- The input is gated by a `promoChecked` checkbox that auto-opens on mount when `couponCode` is already applied (shopper navigated back from the Delivery step with a code active — see the `useEffect` on `[couponCode, promoChecked]`).
- `handleApplyPromo` guards against re-entry with a `promoBusy` flag, then calls `useCart().applyCoupon(input)`.
- On success, the panel switches to a "coupon applied" chip with a `Remove` button that calls `useCart().removeCoupon()` and clears `promoInput`.
- `couponError` renders under the input only while `!couponCode` (i.e. no active coupon).
- `finalTotal` uses `totalDue` from `preview` when either `personalDiscount > 0` or `couponDiscount > 0`; otherwise falls back to the client-computed `total`. This avoids a flash of the pre-preview number after `applyCoupon()` clears `preview`.
- The Delivery step (`CheckoutDeliveryPage`) has its own, structurally identical promo section. Both write to the same `couponCode` in `useCart()`, so applying the code on one page immediately reflects on the other via Redux + `sessionStorage['oe_coupon_code']`. The two inputs are **independent React state** (`promoInput`, `promoChecked`) — closing the cart page and reopening it re-reads only `couponCode`, not the last-typed raw string.

**Coupon math source of truth.** Discount amounts are NOT computed client-side — the client sends `products + couponCode` to `previewOrderAction()`, and OE returns `totalSum`, `totalSumWithDiscount`, `discountConfig.coupon.applied`. `couponDiscountAmount = couponApplied ? (totalSum − totalSumWithDiscount) : 0`. There is no `(subtotal * pct / 100)` fallback in the current code path — the client never sees the coupon's percentage.

## 17. Cross-references

- [REDUX.md](./REDUX.md) — full store layout, migrations
- [AUTH.md](./AUTH.md) — how session cookies gate `syncCart` / `syncWishlist`
- [CHECKOUT.md](./CHECKOUT.md) — how the cart is snapshotted at order placement
- [ONEENTRY_INTEGRATION.md](./ONEENTRY_INTEGRATION.md) — `syncCart` / `syncWishlist` / `getCurrentUserAction` internals
