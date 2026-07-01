# Cart & Wishlist State

> Source-of-truth review for the cart, wishlist (favorites) and
> recently-viewed subsystems. Cross-cuts Redux Toolkit, RTK Query,
> custom localStorage persistence and the Platform user-activity REST
> API. Written for LLM consumption — exact paths, function names and
> data shapes.

---

## 1. Overview — why "Context AND Redux"

There is **no actual React Context** for cart or wishlist. The files
`src/app/context/CartContext.tsx` and `src/app/context/WishlistContext.tsx`
are **mis-named**: they neither call `createContext()` nor expose a
`Provider`. Confirmed: `createContext` is used only in
`CatalogAccentContext.tsx` and `AuthContext.tsx`.

What each file actually is:

* `context/CartContext.tsx` — public hook `useCart()` wrapping
  `cartSlice` + `cartApi` + id-map + sync-warning. Also defines
  the `CartItem` TS interface that the slice imports.
* `context/WishlistContext.tsx` — same shape around `wishlistSlice`
  + `wishlistApi`, also defines `WishlistItem`.
* `store/cartSlice.ts` / `store/wishlistSlice.ts` — the actual
  single source of truth for client state. The hooks dispatch into
  them.

So the duality is **a layering convention, not a duplication**:

```
Component ──► useCart() / useWishlist()  (context/*.tsx — hooks)
                       │
       ┌───────────────┼──────────────────────┐
       ▼               ▼                      ▼
   Redux slice    RTK-Query API         id-map + sync-warning
   (cartSlice)    (cartApi)             (cms-product-id-map,
   = client state = server I/O          syncWarnings)
```

The hook fans each action out to (a) an optimistic Redux update and
(b) a best-effort Platform mutation. Components never import the
slice or the API directly. The folder name `context/` is a historical
artefact — treat it as "the public facade", not as a React context.

---

## 2. Data model

### 2.1 `CartItem` — `context/CartContext.tsx:19-31`

```ts
interface CartItem {
  id: string;            // playground sku, e.g. 'wc-1'
  name: string;
  brand: string;
  color: string;         // display name; not the hex
  sku: string;
  size: string;          // 'S' | 'M' | … or '' for placeholders
  quantity: number;
  price: number;         // unit price in display currency
  originalPrice?: number; // crossed-out price; drives `discount`
  image: string;         // URL or '/placeholder.svg'
  bundleId?: string;     // groups rows added together via addBundle()
}
```

Composite identity for de-duplication is `(id, size)` — adding the
same product in a different size produces a second row
(`cartSlice.addItem`, line 31-38).

### 2.2 `WishlistItem` — `context/WishlistContext.tsx:18-33`

```ts
interface WishlistItem {
  id: string;
  name: string;
  brand: string;
  price: string;         // pre-formatted, e.g. '$199.00'
  salePrice?: string;    // pre-formatted
  image: string;
  colors: string[];      // hex codes
  colorStock?: boolean[]; // parallel to colors[]
  sizes: string[];
  badge?: string;
  inStock: boolean;
  priceAlert?: boolean;
  selectedColor?: string; // hex of the chosen color
  selectedSize?: string;
}
```

Identity is `id` only — wishing for the same product in two colours
just updates `selectedColor`.

### 2.3 `RecentlyViewedItem` — `store/recentlyViewedSlice.ts:8-10`

`extends Product` (the card prop from `components/ProductCard.tsx`)
with an added `viewedAt: number` (unix ms).

### 2.4 Wire types — `store/api/types/{cart,wishlist}.ts`

`CartApiItem = { productId: number; qty: number; addedAt?: string }`
and `WishlistApiItem = { productId: number; addedAt?: string }`.
The string playground id (`'wc-1'`) ↔ integer Platform id (`1`)
bridge is `data/cms-product-id-map.ts` (25 hand-mapped rows; see §10).

---

## 3. Cart lifecycle

All paths go through `useCart()` (`CartContext.tsx:72-312`). The hook
is composed of three things: the slice action, an optional Platform
mutation, and a sync-warning emitter. Optimistic-update pattern
everywhere.

### 3.1 Add — `addItem(item)` (line 131-164)

Redux merge by `(id, size)` first. If `!apiOn` → done. Otherwise
resolve `getCmsProductId(item.id)`; `null` ⇒ `unmapped` warning and
stop. Compute **absolute qty** (current matching row qty + delta),
then `POST /users/me/cart/items` via `triggerAdd`. Failure ⇒
`removeItem` rollback + `mutation` sync-warning.

⚠ The Platform `POST /items` takes an **absolute** qty, not a delta
(`cartApi.ts:11`).

### 3.2 Update qty — `updateQuantity(id, delta)` (line 241-272)

Same pattern. `newQty = max(1, current + delta)`, dispatched to Redux,
then POSTed as the absolute value to the same endpoint. Rollback
dispatches the inverse delta.

### 3.3 Update size — `updateSize(id, size)` (line 274)

**Local only** — Platform has no size on a cart row.

### 3.4 Remove — `removeItem(id)` (line 196-218)

Snapshot the item, optimistic Redux remove,
`DELETE /users/me/cart/items/:productId`. Failure ⇒ re-add snapshot
via `addItem`.

### 3.5 Bundles — `addBundle` / `removeBundle` (line 166-239)

Bundles are a **playground-only** abstraction. `addBundle` generates
`bundle-<uuid>` and tags every row. Sync happens per constituent
item via the same `/cart/items` endpoint.

### 3.6 Clear — `clearCart()` (line 276-288)

Redux wipe + `PUT /users/me/cart { items: [] }` (the `setCart`
mutation in `cartApi.ts:62-69`) — the Platform has no single-call
wipe. `ConfirmationPage:31-34` calls `clearCart()` 200 ms after mount
when an order is placed.

### 3.7 Mini-cart UI flag

`miniCartOpen: boolean` lives in `cartSlice` (not `uiSlice`). Toggled
by `openMiniCart`/`closeMiniCart`. Persisted along with cart items.

### 3.8 Guest vs authenticated

* **Guest** — `apiOn = false`; only Redux + localStorage. Guards
  (lines 135, 199, 249, 278) skip every API path; no warnings.
* **Authenticated** — `apiOn = true`. Each mutation is optimistic in
  Redux + best-effort sync. Failures roll back +
  `emitSyncWarning('mutation', …)`.

### 3.9 Merge on login

`useGetCartQuery` fires the moment `authToken` is set
(`CartContext.tsx:80-82`). On snapshot arrival the hook (lines 83-110)
hashes the snapshot into `lastMergedRef` to prevent loops, then for
each server item: if the playground already has the same id, **remove
first and re-add** (because `cartSlice.addItem` *increments*; we want
server qty to be absolute). Logout (`authToken: null`) resets
`lastMergedRef` so the next login re-merges (lines 112-116).

⚠ The merge is **server-wins** for products in the id map; unmapped
server items render as `cms-<id>` placeholders.

---

## 4. Wishlist lifecycle

Same shape as cart but no qty, no size, no bundles. All paths go
through `useWishlist()` (`WishlistContext.tsx:67-222`).

| Action | Redux | Platform | Notes |
|---|---|---|---|
| `addItem(item)` | `wishlistActions.addItem` (no-op if dup) | `POST /users/me/wishlist/items { productId }` | Rollback `removeItem` on failure |
| `removeItem(id)` | filter out | `DELETE /users/me/wishlist/items/:productId` | Rollback re-add from snapshot |
| `toggleItem(item)` | derived (if exists → remove else add) | same | UI sugar |
| `updateSelection(id, color?, size?)` | local-only mutation | — | Selected variant for "move to cart" |
| `isWishlisted(id)` | derived selector | — | Boolean lookup |
| `clearAll()` | wipe | per-item DELETE loop | No bulk endpoint on Platform |

### 4.1 Login merge — TWO paths run in parallel

Both paths dispatch `wishlistActions.addItem`, which de-dupes by id,
so the result is correct — but the duplication is worth noting:

1. **`WishlistSyncEffect`** (`components/Providers.tsx:15-29`) —
   listens to `useAuth().isLoggedIn` and dispatches
   `wishlistActions.mergeUserWishlist({ wishlist, waitingList })`
   with the **hardcoded `USER_DATASET` mock** from `data/userData.ts`
   (a UX demo from before the Platform wishlist endpoint existed).
2. **`useGetWishlistQuery`** (`WishlistContext.tsx:78-106`) — fires
   the real `GET /users/me/wishlist` when `apiOn && authToken`.
   Each server `productId` becomes a `placeholderFromCmsId(...)` and
   is dispatched as `addItem`. Guarded by `lastMergedRef`.

So a fully wired-up logged-in user gets
`(server snapshot) ∪ (USER_DATASET mock) ∪ (existing guest items)`,
de-duped by `id`. Without `NEXT_PUBLIC_API_URL` only the mock +
guest items remain.

### 4.2 `mergeUserWishlist` semantics — `wishlistSlice.ts:80-92`

Helpers `fromDataWishlist` and `fromWaitingItem` (lines 7-36)
translate the mock shapes to `WishlistItem`. Quirk: when a mock entry
has `originalPrice`, that high "was" price ends up in
`WishlistItem.price` and the current price ends up in `salePrice`.
`WaitingItem` produces `inStock: false` with pre-filled
`selectedColor`/`selectedSize` (rendered with an OOS badge in
`account/WishlistSection.tsx:214`). Server items take precedence;
guest-only items are appended.

---

## 5. Recently viewed

Single-reducer slice (`recentlyViewedSlice.ts:29-49`):
`addProduct(product)`.

* **Capacity:** `LIMITS.RECENTLY_VIEWED_MAX = 100`
  (`constants/timings.ts:24`).
* **TTL:** 30 days (`TTL_MS`, line 6). Eviction runs on **every
  add**, not at hydration — stale items vanish next view.
* **Order:** most-recent-first. Existing entries are removed and
  re-inserted at index 0 (sliding window). Over-cap rows are sliced
  off the tail.
* **Single writer:** `ProductDetailPage.tsx:149-160`. **Readers:**
  same page (filters out the current product) +
  `selectRecentlyViewed` (`store/selectors.ts:47`).
* **No server sync** — entirely local.

---

## 6. Persistence — handwritten, not redux-persist

`redux-persist` is not used. Persistence is inline in `store/index.ts`.

* **Key:** `oe_store` (line 15). **Version:** `STORAGE_VERSION = 4`
  with `MIGRATIONS` map (line 30-51); unknown future versions wipe.
* **Persisted** (`saveToStorage`, line 107-120): `cart`, `wishlist`,
  `recentlyViewed`, `catalog`, `user.data.addresses`.
* **Not persisted:** `user.data.authToken` (security), `ui`,
  RTK-Query caches.
* **Save trigger:** `store.subscribe(saveToStorage)` (line 151) —
  fires on every action.
* **SSR rehydration order** (`makeStore`, line 136-153): (1) sync
  `loadFromStorage()` used as `preloadedState`, with `catalog`
  intentionally excluded (line 77) to avoid hydration mismatches on
  the home page; (2) after mount, `Providers.tsx:37-42` calls
  `loadCatalogFromStorage()` and dispatches `hydrateCatalogs(...)`.
* **`userAddresses` schema** — historical. Pre-v2 stored at top
  level; the loader (line 79-84) re-wraps it into
  `user.data.addresses` for the slice.
* SSR safety: `window === undefined` ⇒ load/save no-op
  (line 66, 109).

---

## 7. Public hook surface

Both hooks return memoised objects.

`useCart()` (`CartContext.tsx:290-311`):
`{ items, miniCartOpen, openMiniCart, closeMiniCart, addItem,
addBundle, removeItem, removeBundle, updateQuantity, updateSize,
clearCart, totalItems, subtotal, discount, total }`

`useWishlist()` (`WishlistContext.tsx:212-221`):
`{ items, addItem, removeItem, toggleItem, updateSelection,
isWishlisted, clearAll, count }`

Equivalent values are also reachable via `store/selectors.ts`
(lines 6-43) for components that prefer a selector pattern.

---

## 8. Server sync

| Concern | Endpoint | When |
|---|---|---|
| Cart GET | `/users/me/cart` | RTK-Query auto-fetch when `apiOn && authToken` |
| Cart add | `POST /users/me/cart/items` | After each `addItem` / `updateQuantity` |
| Cart remove | `DELETE /users/me/cart/items/:id` | After each `removeItem` |
| Cart wipe | `PUT /users/me/cart` body `{items: []}` | `clearCart()` on order confirmation |
| Wishlist GET | `/users/me/wishlist` | Same gating |
| Wishlist add | `POST /users/me/wishlist/items` | `addItem` |
| Wishlist remove | `DELETE /users/me/wishlist/items/:id` | `removeItem`, per-item loop in `clearAll` |
| Wishlist PUT | `PUT /users/me/wishlist` | **Exported but never imported** (`useSetWishlistMutation`, `wishlistApi.ts:93`) — dead code. |
| Recently viewed | — | None. Local-only. |

Both APIs are RTK-Query slices with `tagTypes: ['Cart']` / `['Wishlist']`
so mutations invalidate the query and trigger a refetch.

`prepareHeaders` (`cartApi.ts:34-40`, `wishlistApi.ts:46-52`) pulls
the bearer token from `state.user.data.authToken`. If no token →
no header → server returns 401. Callers gate queries with
`skip: !apiOn` (i.e. `skip: !authToken`).

Backend reference: these endpoints map to the OneEntry
`user-activity` module (`cart.dto.ts`, `wishlist.dto.ts`, named in
the type comments). The Platform stores them on
`user_activity_events`, which is **out of the 24-table blueprint
whitelist** — they exist at runtime but cannot be seeded via
blueprint.

---

## 9. Discount / coupon flow

The cart slice tracks **product-level** discounts only —
`useCart().discount` is `Σ(originalPrice - price)` across rows
(`CartContext.tsx:124-126`, mirrored in `selectors.ts:24-28`).

**Coupons are page-local `useState`**, never written to Redux:

* `CartPage.tsx:29-33` keeps `promoCode`, `promoApplied`,
  `promoDiscount`, `promoError` as local state.
* `CartPage.tsx:90-102` `applyPromo()` reads
  `data/checkoutConfig.ts::CHECKOUT_COUPONS` (`ONEENTRY10`,
  `SAVE10`, `SUMMER15`, `WELCOME25`, etc.).
* `CartPage.tsx:104` `finalTotal = total - promoDiscount` is inline.
* `DeliveryPage.tsx:66-96` is a debounced clone against the same
  dict. The two pages do **not** share coupon state — switching
  pages re-prompts.

---

## 10. Edge cases

* **Unmapped product** — playground id absent from
  `CMS_PRODUCT_ID_MAP` (`cms-product-id-map.ts:34`) never syncs;
  the hook emits `emitSyncWarning('unmapped', …)` which logs and
  fires an `oe:sync-warning` `CustomEvent`. No toast UI exists yet.
* **Platform-only product** — server returns a `productId` the
  playground doesn't recognise: `placeholderFromCmsId()`
  (`CartContext.tsx:57-70`, `WishlistContext.tsx:53-65`) fabricates
  a card (`id: 'cms-<id>'`, `name: 'Platform product #<id>'`,
  `/placeholder.svg`). Subsequent actions hit
  `getCmsProductId(...) === null` and stay local.
* **Out-of-stock wishlist item** — `inStock: false` rows still
  render; `account/WishlistSection.tsx:17` filters them out for the
  account summary; `FavoritesPage.tsx:34`'s bulk move-to-cart
  excludes them.
* **Deleted product** — no detection; stale snapshot until the user
  removes the row manually.
* **Currency change** — `WishlistItem.price`/`salePrice` are
  pre-formatted **strings**, so they retain the original currency
  format. `CartItem.price` is numeric and reformatted on render →
  cart is currency-safe, wishlist is not.
* **Locale change** — wishlist colour/size labels are stored as
  strings in the slice → not re-translated on language switch.
  Cart labels live in `data/cartLabels.ts` and render-side.
* **Storage quota / version skew / multi-tab** —
  `saveToStorage` swallows quota errors (`store/index.ts:117-119`);
  unknown future `__version` wipes the cache (line 72-75); no
  `storage` event subscription, so concurrent tabs drift until
  reload.
* **No max-quantity per item** — `cartSlice.ts:35` does
  `existing.quantity += item.quantity` and `:59,64` does
  `Math.max(1, i.quantity + delta)`. Only a lower bound of 1 is
  enforced; there is no upper bound. A user can set qty to 999 (or
  paste any positive integer) and the cart will accept it. No
  per-product stock check (`Product.stock` / `colorStock[idx]`) is
  consulted at add time — out-of-stock detection happens only on
  catalog filter rendering, not in cart writes.
* **No stale-cart / price-change detection** — when the store
  rehydrates from `localStorage` on next visit
  (`store/index.ts:loadCatalogFromStorage`), cart `price` /
  `salePrice` are restored verbatim. If the product's price has
  changed in the catalog since the last visit, the cart keeps the
  old number — there is no diff-check against the live catalog and
  no "price has changed" UI prompt. Same applies if a product was
  marked out-of-stock between visits.
* **No deleted-product backfill** — see above; if a product is
  removed from the catalog data, the cart still shows the cached
  row with `/placeholder.svg` fallback on image errors but no
  "this product is no longer available" banner.

---

## 11. File map

Core (writers):

* `src/app/context/CartContext.tsx` (312) — `useCart()` hook +
  `CartItem` type + sync orchestration.
* `src/app/context/WishlistContext.tsx` (222) — `useWishlist()` hook +
  `WishlistItem` type.
* `src/app/store/cartSlice.ts` (84) — reducer: `addItem`, `addBundle`,
  `removeItem`, `removeBundle`, `updateQuantity`, `updateSize`,
  `clearCart`, `openMiniCart`, `closeMiniCart`.
* `src/app/store/wishlistSlice.ts` (98) — reducer +
  `mergeUserWishlist` + `fromDataWishlist`/`fromWaitingItem` helpers.
* `src/app/store/recentlyViewedSlice.ts` (54) — sliding window
  (cap 100, TTL 30 d).
* `src/app/store/selectors.ts` (60) — `selectCart*`, `selectWishlist*`,
  `selectRecentlyViewed`.
* `src/app/store/api/cartApi.ts` (78) — RTK-Query for `/users/me/cart*`.
* `src/app/store/api/wishlistApi.ts` (107) — RTK-Query for
  `/users/me/wishlist*`.
* `src/app/store/api/types/cart.ts` (35), `…/types/wishlist.ts` (32) —
  wire types.
* `src/app/store/index.ts` (159) — store factory + localStorage
  versioning + migrations.
* `src/app/data/cms-product-id-map.ts` (103) — playground↔Platform id
  map + helpers.
* `src/app/data/checkoutConfig.ts` — `CHECKOUT_COUPONS` promo dict.
* `src/app/utils/syncWarnings.ts` (50) — `emitSyncWarning(kind, msg,
  ctx)` (console + `oe:sync-warning` `CustomEvent`).
* `src/app/components/Providers.tsx` (67) — `Provider`,
  `WishlistSyncEffect`, catalog rehydration.

Consumers (read-only):
`Header.tsx` (`totalItems`, `openMiniCart`, `wishlistCount`),
`MiniCart.tsx` (drawer; `items`, `removeItem`, `updateQuantity`,
`subtotal`, `totalItems`), `ProductCard.tsx`/`QuickViewModal.tsx`
(`toggleItem`, `isWishlisted`, `addItem`), `pages/CartPage.tsx` (full
cart + local promo), `pages/ConfirmationPage.tsx` (`clearCart()` 200 ms
after mount), `pages/DeliveryPage.tsx` (`total`),
`pages/PaymentPage.tsx` (`items`, `discount`, `total`),
`pages/FavoritesPage.tsx` (wishlist + "Move all to cart"),
`pages/ProductDetailPage.tsx` (`recentlyViewedActions.addProduct` +
cart + wishlist), `pages/favorites/FavoriteCard.tsx`,
`pages/account/WishlistSection.tsx`.

### 11.1 Known unused / dead code

* `useSetWishlistMutation` (`store/api/wishlistApi.ts:93`) — exported,
  never imported. The wishlist has no `PUT` analogue of `clearCart`.
* `mergeUserWishlist` (`store/wishlistSlice.ts:80`) and the
  associated `WishlistSyncEffect` consume `USER_DATASET` (a static
  mock). They're not strictly dead — they fire on every login — but
  they will become so when the mock dataset is removed.

---

## 12. Cross-references

* [`REDUX.md`](./REDUX.md) — store layout, slice catalogue, persistence
  contract.
* [`ARCHITECTURE.md`](./ARCHITECTURE.md) — overall folder layout and
  the role of `src/app/context/`.
* [`CHECKOUT.md`](./CHECKOUT.md) — payment flow, order placement, the
  `clearCart()` hand-off.
* [`AUTH.md`](./AUTH.md) — `AuthProvider`, `authToken` lifecycle,
  the `apiOn` gate.
* `agents_datasets/ClaudeInfos/use-cases.md` case 12 — Platform-side
  description of `user_activity_events`.
* Upstream Platform DTOs referenced inline:
  `cms/src/modules/user-activity/dto/cart.dto.ts`,
  `…/wishlist.dto.ts` (per the type-file comments).
