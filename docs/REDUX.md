# Redux

Stack: **Redux Toolkit** + **RTK Query**. Source: `src/app/store/`.

The Redux store is the client-side optimistic-state layer. Server-authoritative data (products, pages, blocks, labels, user profile, orders) does NOT live in Redux — it comes from OneEntry Server Actions and RSC loaders (`src/lib/oneentry/**`). Redux carries the cart, wishlist, recently-viewed products, catalog UI state, quick-view / mobile-menu flags, and the user identifier.

## 1. Store layout

```
src/app/store/
├── index.ts                  — store configuration, types, persistence, migrations
├── hooks.ts                  — useAppDispatch, useAppSelector
├── selectors.ts              — memoised selectors
├── catalogSlice.ts           — catalog UI state per catalogKey
├── uiSlice.ts                — QuickView + mobile menu
├── cartSlice.ts              — cart items, miniCartOpen flag, unavailableRemoved
├── wishlistSlice.ts          — wishlist items
├── recentlyViewedSlice.ts    — recently viewed (TTL 30d, cap 100)
├── userSlice.ts              — loyalty defaults + auth identifier
├── __tests__/                — vitest unit tests
└── api/
    ├── cartApi.ts            — RTK Query scaffolding for /users/me/cart (fetchBaseQuery, Bearer). NOT on the live path.
    ├── wishlistApi.ts        — RTK Query scaffolding for /users/me/wishlist. NOT on the live path.
    └── types/                — shared cart + wishlist DTO shapes
```

The three "fake" API slices (`productsApi`, `homepageApi`, `catalogConfigApi`) that previous docs described have been **removed**. Product / catalog / homepage data now flow from `src/lib/oneentry/**` loaders directly to RSC page shells, then down to client components as props.

### `RootState`

```ts
{
  cart:              CartState
  wishlist:          WishlistState
  recentlyViewed:    RecentlyViewedState
  catalog:           CatalogsState          // Record<catalogKey, CatalogUIState>
  ui:                UIState
  user:              UserState              // authToken kept empty — session in cookies
  cartApi:           RTK Query cache        // scaffolding
  wishlistApi:       RTK Query cache        // scaffolding
}
```

## 2. Slices

### 2.1 `cartSlice` (`src/app/store/cartSlice.ts`)

**State:** `{ items: CartItem[], miniCartOpen: boolean, unavailableRemoved: CartItem[] }`.

**CartItem shape:**
```ts
{
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
  stockLimit?: number;     // max orderable qty snapshotted at add-time; undefined = uncapped
}
```

**Actions:**
- `addItem(item)` — merge or append by **id + size + color**, accumulating quantity clamped at `stockLimit ?? Infinity`. Without `color` in the key, adding a Red S after a Blue S silently merged them — the shopper received Blue on delivery even though they last picked Red. Also refreshes `stockLimit` on the existing line when the incoming payload carries a fresh value.
- `addBundle(items)` — bulk add with shared `bundleId`; quantity of each item is clamped at its `stockLimit`.
- `removeItem(id)`, `removeBundle(bundleId)`.
- `updateQuantity({id, delta})` — deltas can be negative; result is clamped to `[1, stockLimit ?? Infinity]`.
- `updateSize({id, size})`.
- `clearCart()`.
- `openMiniCart()`, `closeMiniCart()`.
- `setUnavailableRemoved(items: CartItem[])` — stores a snapshot of items that were auto-pruned because OE reported them as not found during `previewOrder`.
- `dismissUnavailableRemoved()` — clears `unavailableRemoved` after the shopper acknowledges the notice.

**Persistence:** ✅ persisted, minus `miniCartOpen` and `unavailableRemoved` (both stripped in `saveToStorage` — `miniCartOpen` to avoid re-opening the drawer on every navigation; `unavailableRemoved` because it is ephemeral session state only needed for the one-time banner).

### 2.2 `wishlistSlice` (`src/app/store/wishlistSlice.ts`)

**State:** `{ items: WishlistItem[] }`.

**Actions:**
- `addItem(item)` — upsert by id, merging richer data while preserving user selections (color / size).
- `removeItem(id)`.
- `toggleItem(item)` — add if missing, remove if present.
- `updateSelection({id, selectedColor?, selectedSize?})`.
- `clearAll()`.
- `mergeUserWishlist(payload)` — on login: combine server items + waiting list + guest-only items; server wins on dedupe.

**Persistence:** ✅ persisted.

### 2.3 `recentlyViewedSlice` (`src/app/store/recentlyViewedSlice.ts`)

**State:** `{ items: (Product & {viewedAt: number})[] }`.

**Actions:**
- `addProduct(product)` — prepend with `viewedAt`, evict items older than 30 days (`RECENTLY_VIEWED_MAX_AGE_MS`), enforce circular buffer of `LIMITS.RECENTLY_VIEWED_MAX = 100`.
- `hydrate(items)` — replace from server-enriched trail after AuthContext bootstrap.

**Persistence:** ✅ persisted.

### 2.4 `catalogSlice` (`src/app/store/catalogSlice.ts`)

**State:** `Record<catalogKey, CatalogUIState>` where
```ts
{
  selectedFilters: Record<string, string[]>;
  sortBy: string;
  currentPage: number;
  viewCols: 3 | 4;
  listMode: boolean;
  activeChip: string;
}
```
`catalogKey` is one of `women-clothing`, `women-shoes`, `women-bags`, `women-accessories`, `men-clothing`, `men-shoes`, `men-bags`, `men-accessories`, plus `sale` / `new` / etc.

**Actions:**
- `toggleFilter({catalogKey, group, value})` — reset to page 1.
- `setFilters({catalogKey, filters})` — replace all from URL, reset page.
- `clearFilters({catalogKey})` — wipe filters + `activeChip`, reset page.
- `setSort({catalogKey, sortBy})` — reset page.
- `setPage({catalogKey, page})`.
- `setViewCols({catalogKey, cols})`.
- `setListMode({catalogKey, listMode})`.
- `setActiveChip({catalogKey, chip})` — reset page.
- `hydrateCatalogs(state)` — load persisted catalog state on client mount.

**Persistence:** ✅ persisted, but hydrated **after client mount** to avoid SSR mismatch (see §4).

### 2.5 `uiSlice` (`src/app/store/uiSlice.ts`)

**State:**
```ts
{
  quickView: { isOpen: boolean; product: Product | null; initialColorIndex: number | null };
  mobileMenuOpen: boolean;
}
```

**Actions:** `openQuickView(payload)`, `closeQuickView()`, `clearQuickViewProduct()`, `openMobileMenu()`, `closeMobileMenu()`, `toggleMobileMenu()`.

**Persistence:** ❌ not persisted.

### 2.6 `userSlice` (`src/app/store/userSlice.ts`)

**State:**
```ts
{
  data: {
    // All profile / loyalty / lists / subscriptions / consent fields start as blank defaults.
    // No fixture is spread in — initial state is empty (zeros, empty arrays, nulls).
    addresses: [],
    authToken: null,             // kept for backward compat; always empty on the live path
    refreshToken: null,          // same
    userIdentifier: null,
  };
  status: 'idle' | 'loading' | 'succeeded' | 'failed';
  error: string | null;
}
```

**Actions:**
- `patchUserData(patch)` — merge partial fields.
- `addAddress(address)`.
- `setAuth({accessToken, refreshToken, userIdentifier})` — dispatched after successful Server Action sign-in. Tokens are usually empty strings; only `userIdentifier` matters.
- `clearAuth()` — reset auth fields on logout.

The `fetchUserData` async thunk and the `USER_DATASET` / `USER_SLICE_MESSAGES` imports have been **removed**. Real profile data comes from `AuthContext.user` (populated by `getCurrentUserAction`).

**Persistence:** ❌ not persisted. Session lives in httpOnly cookies (`oe_access`, `oe_refresh`, `oe_user`). See [AUTH.md](./AUTH.md) §3.

## 3. RTK Query APIs

Two API slices remain: `cartApi` and `wishlistApi`. Both use `fetchBaseQuery` with `NEXT_PUBLIC_API_URL` and a Bearer header pulled from `state.user.data.authToken`. **On the current live path these hooks are not called** — cart and wishlist sync run through the `syncCart` / `syncWishlist` Server Actions in `AuthContext`. The RTK Query slices are kept as compiled scaffolding so a future refactor back to client-side fetching would only need to swap `NEXT_PUBLIC_API_URL` (currently empty) and start calling the hooks.

### 3.1 `cartApi` (`src/app/store/api/cartApi.ts`)

- `reducerPath: 'cartApi'`.
- `tagTypes: ['Cart']`.
- Base URL: `process.env.NEXT_PUBLIC_API_URL` (empty by default — `isCartApiEnabled()` returns `false`).
- Endpoints: `getCart` (GET `/users/me/cart`, provides `Cart`), `addCartItem` (POST `/users/me/cart/items`, invalidates `Cart`), `removeCartItem` (DELETE `/users/me/cart/items/:productId`), `setCart` (PUT `/users/me/cart`).
- Wire types in `api/types/cart.ts`.

### 3.2 `wishlistApi` (`src/app/store/api/wishlistApi.ts`)

- `reducerPath: 'wishlistApi'`.
- `tagTypes: ['Wishlist']`.
- Same base-URL / gate pattern as `cartApi`.
- Endpoints: `getWishlist`, `addWishlistItem`, `removeWishlistItem`, `setWishlist`.
- Helper `isFetchBaseQueryError(err)` narrows RTK Query errors to `{status, data}`.

Both middlewares are still concatenated in `makeStore()` — removing them would be a small future cleanup.

## 4. Persistence

`saveToStorage` / `loadFromStorage` / `loadCatalogFromStorage` in `src/app/store/index.ts`.

- **Key:** `oe_store` in `localStorage`.
- **Schema version:** **5** (`STORAGE_VERSION = 5`).
- **Persisted slices:** `cart` (minus `miniCartOpen` and `unavailableRemoved`), `wishlist`, `recentlyViewed`, `catalog`.
- **Not persisted:** `ui`, `user` (session lives in cookies).

### Migrations

| From → To | Effect |
|---|---|
| `v1 → v2` | No-op — legacy `userAddresses` moved out of `user.data`. |
| `v2 → v3` | Adds `viewedAt` timestamp to every `recentlyViewed` item. |
| `v3 → v4` | Defensive bump — auth-token fields were added to `user.data` at this time but are explicitly not persisted. |
| `v4 → v5` | Drops the top-level `userAddresses` key entirely. Real addresses now live in `AuthContext.user.addresses`. |

Unknown future versions (`__version > STORAGE_VERSION`) wipe the store to prevent corruption.

`catalogSlice` is deliberately excluded from the main `preloadedState` load and injected via `loadCatalogFromStorage()` on client mount — otherwise SSR would render page 1 while the client's localStorage reports page 3, causing a hydration mismatch.

## 5. Hooks

`src/app/store/hooks.ts`:

- `useAppDispatch()` — typed `useDispatch<AppDispatch>()`.
- `useAppSelector` — typed `useSelector<RootState>`.

Consumers should prefer these over untyped `useDispatch` / `useSelector`.

## 6. Selectors

`src/app/store/selectors.ts` — memoised selectors (`createSelector`) for hot paths:

**Cart:**
- `selectCartItems` — items array
- `selectMiniCartOpen`
- `selectCartTotalItems` — sum of quantities
- `selectCartSubtotal` — sale/current total
- `selectCartOriginalSubtotal` — full total
- `selectCartDiscount` — `originalSubtotal − subtotal`

**Wishlist:**
- `selectWishlistItems`
- `selectWishlistCount`
- `selectIsWishlisted(id)`

**Recently viewed:**
- `selectRecentlyViewed`

**User:**
- `selectUserData`, `selectUserStatus`, `selectUserAddresses`, `selectUserProfile`, `selectUserLoyalty`

**UI:**
- `selectQuickViewProduct`

## 7. Middleware

`makeStore()` composes:

1. RTK Toolkit default middleware.
2. `wishlistApi.middleware`.
3. `cartApi.middleware`.

`store.subscribe(saveToStorage)` writes on every dispatched action.

## 8. Testing

Vitest unit tests live in `src/app/store/__tests__/`. Each slice has a `*.test.ts` that exercises the reducers with synthetic actions. RTK Query slices are tested via mocked `fetch`.

## 9. Consumption pattern

- **Read state:** `useAppSelector(selectX)` where `X` is a memoised selector.
- **Write state:** `useAppDispatch()` + slice action creators. `cartActions`, `wishlistActions`, `uiActions`, `catalogActions`, `userActions`, `recentlyViewedActions` are re-exported from each slice.
- **Cross-slice mutations:** wrap in a React Context hook (`useCart`, `useWishlist`, `useAuth`) so the mutation coordinates the Server Action too. Never call `syncCart` from a random component — use `useCart().addItem` and let `CartContext` handle the debounced sync.

## 10. What is NOT in Redux (intentional)

- Products, pages, blocks, menus, labels, orders, payment accounts — all server-fetched via `src/lib/oneentry/**`.
- Auth tokens — httpOnly cookies.
- Form state (checkout, register) — local `useState` inside the page component.
- Modal open/close for auth modals — lives in `AuthContext` state (not `uiSlice`).

## 11. Cross-references

- [ARCHITECTURE.md](./ARCHITECTURE.md) §4 — state layers overview
- [CART_WISHLIST.md](./CART_WISHLIST.md) — how CartContext / WishlistContext wrap the slices
- [AUTH.md](./AUTH.md) — why auth tokens don't live here
- [CATALOG_FILTERS.md](./CATALOG_FILTERS.md) — how `catalogSlice` is consumed
- [ONEENTRY_INTEGRATION.md](./ONEENTRY_INTEGRATION.md) — the Server Actions that replaced the fake RTK Query slices
