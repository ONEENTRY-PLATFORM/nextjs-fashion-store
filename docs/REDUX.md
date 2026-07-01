# Redux

Stack: **Redux Toolkit** + **RTK Query**. Source: `src/app/store/`.

## 1. Store layout

```
src/app/store/
├── index.ts                  — store configuration, types, persistence, migrations
├── hooks.ts                  — useAppDispatch, useAppSelector
├── selectors.ts              — memoised selectors
├── catalogSlice.ts           — catalog UI state per catalogKey
├── uiSlice.ts                — QuickView + mobile menu
├── cartSlice.ts              — cart
├── wishlistSlice.ts          — wishlist
├── recentlyViewedSlice.ts    — recently viewed
├── userSlice.ts              — user dataset
└── api/
    ├── productsApi.ts        — RTK Query: catalog products (fakeBaseQuery → local TS data)
    ├── homepageApi.ts        — RTK Query: homepage blocks (fakeBaseQuery → local TS data)
    ├── catalogConfigApi.ts   — RTK Query: configs, trends, stores, recommendations (fakeBaseQuery → local TS data)
    ├── cartApi.ts            — RTK Query: real OneEntry Platform REST (`{NEXT_PUBLIC_API_URL}/users/me/cart`, fetchBaseQuery + Bearer)
    ├── wishlistApi.ts        — RTK Query: real OneEntry Platform REST (`{NEXT_PUBLIC_API_URL}/users/me/wishlist`, fetchBaseQuery + Bearer)
    └── types/                — shared cart + wishlist DTO shapes
```

### `RootState`

```ts
{
  cart:              CartState
  wishlist:          WishlistState
  recentlyViewed:    RecentlyViewedState
  catalog:           CatalogsState          // Record<catalogKey, CatalogUIState>
  ui:                UIState
  user:              UserState               // includes auth tokens (NOT persisted)
  productsApi:       RTK Query cache         // local data via queryFn
  homepageApi:       RTK Query cache         // local data via queryFn
  catalogConfigApi:  RTK Query cache         // local data via queryFn
  cartApi:           RTK Query cache         // real OneEntry Platform REST
  wishlistApi:       RTK Query cache         // real OneEntry Platform REST
}
```

> `cartApi` / `wishlistApi` are gated by `NEXT_PUBLIC_API_URL`: when empty, `isCartApiEnabled()` / `isWishlistApiEnabled()` return `false` and `CartContext` / `WishlistContext` fall back to the local `cartSlice` / `wishlistSlice` only (Storybook + offline mode).

## 2. Slices

### `catalogSlice`

UI state for every catalog page, keyed by `catalogKey`.

| `catalogKey` | Page |
|---|---|
| `women-clothing` | `WomenCatalogPage` |
| `men-clothing` | `MenCatalogPage` |
| `women-bags` | `WomenBagsPage` |
| `men-bags` | `MenBagsPage` |
| `women-shoes` | `ShoesCatalog` (via `WomenShoesPage`) |
| `men-shoes` | `ShoesCatalog` (via `MenShoesPage`) |
| `women-accessories` | `AccessoriesCatalog` (via `WomenAccessoriesPage`) |
| `men-accessories` | `AccessoriesCatalog` (via `MenAccessoriesPage`) |
| `sale` | `SalePage` |
| `new-arrivals` | `NewArrivalsPage` |

State per catalog:

```ts
interface CatalogUIState {
  selectedFilters: Record<string, string[]>   // { color: ['Black'], size: ['M'] }
  sortBy:          string                     // 'featured' | 'price_asc' | 'newest' | …
  currentPage:     number                     // 1-based
  viewCols:        3 | 4
  listMode:        boolean                    // list vs grid (ShoesCatalog only)
  activeChip:      string
}
```

Defaults: `selectedFilters: {}`, `sortBy: 'featured'`, `currentPage: 1`, `viewCols: 4`, `listMode: false`, `activeChip: ''`.

Actions:

| Action | Payload | Notes |
|---|---|---|
| `toggleFilter` | `{ catalogKey, filterKey, value }` | Toggles one filter value, resets `currentPage` to 1. |
| `setFilters` | `{ catalogKey, filters }` | Replaces the whole filter map (used by category chips on Sale / NewArrivals). |
| `clearFilters` | `catalogKey` | Clears filters + `activeChip` + `currentPage`. |
| `setSort` | `{ catalogKey, sortBy }` | Resets `currentPage`. |
| `setPage` | `{ catalogKey, page }` | Pagination. |
| `setViewCols` | `{ catalogKey, cols }` | 3 or 4 columns. |
| `setListMode` | `{ catalogKey, listMode }` | List/grid (ShoesCatalog). |
| `setActiveChip` | `{ catalogKey, chip }` | Quick-filter chip, resets `currentPage`. |
| `hydrateCatalogs` | `CatalogsState` | Replaces the entire `catalog` slice. Dispatched from `Providers.tsx` after client mount to restore from localStorage without an SSR hydration mismatch. |

### `uiSlice`

```ts
interface UIState {
  quickView: {
    isOpen:             boolean
    product:            Product | null
    initialColorIndex:  number | null
  }
  mobileMenuOpen: boolean
}
```

| Action | Notes |
|---|---|
| `openQuickView({ product, initialColorIndex })` | Pre-selects the color when provided. |
| `closeQuickView` | Does **not** clear `product` immediately — `QuickViewContext` schedules `clearQuickViewProduct` after a 300 ms animation. |
| `clearQuickViewProduct` | Empties `product` (called via `setTimeout`). |
| `openMobileMenu` / `closeMobileMenu` / `toggleMobileMenu` | ⚠ Not consumed — `Header.tsx` still owns a local `useState(mobileOpen)`. |

### `cartSlice`

Persisted in `localStorage['oe_store'].cart`. Consumed via `useCart()` (`CartContext`).

```ts
interface CartItem {
  id:             string
  name:           string
  brand:          string
  color:          string
  sku:            string
  size:           string
  quantity:       number
  price:          number
  originalPrice?: number
  image:          string
  bundleId?:      string
}

interface CartState {
  items:        CartItem[]
  miniCartOpen: boolean
}
```

`useCart()` exposes: `items`, `miniCartOpen`, `openMiniCart()`, `closeMiniCart()`, `addItem(item)`, `addBundle(items)`, `removeItem(id)`, `removeBundle(bundleId)`, `updateQuantity(id, delta)`, `updateSize(id, size)`, `clearCart()`, `totalItems`, `subtotal`, `discount`, `total`.

### `wishlistSlice`

Persisted in `localStorage['oe_store'].wishlist`. Consumed via `useWishlist()` (`WishlistContext`).

```ts
interface WishlistItem {
  id:             string
  name:           string
  brand:          string
  price:          string
  salePrice?:     string
  image:          string
  colors:         string[]
  colorStock?:    boolean[]
  sizes:          string[]
  badge?:         string
  inStock:        boolean
  priceAlert?:    boolean
  selectedColor?: string
  selectedSize?:  string
}
```

`useWishlist()` exposes: `items`, `count`, `addItem(item)`, `removeItem(id)`, `toggleItem(item)`, `isWishlisted(id)`, `updateSelection(id, color?, size?)`, `clearAll()`.

**Login-time sync (`WishlistSyncEffect` in `Providers.tsx`).** When `isLoggedIn` flips to `true`, it dispatches `wishlistActions.mergeUserWishlist({ wishlist, waitingList })`. Server items win on conflict (deduped by `id`); guest-only items are appended.

### `recentlyViewedSlice`

Persisted in `localStorage['oe_store'].recentlyViewed`. Ring buffer, max 100 items; newest first, duplicates removed.

| Action | Payload |
|---|---|
| `recentlyViewedActions.addProduct` | `Product` |

Exported only via the `recentlyViewedActions` object (no named exports for individual actions). Written on `ProductDetailPage` open; rendered in the "Recently viewed" block.

### `userSlice`

```ts
interface UserState {
  data:   UserDataset
  status: 'idle' | 'loading' | 'succeeded' | 'failed'
  error:  string | null
}
```

`UserDataset` (from `data/userData.ts`; the full per-field breakdown is in `./DATASETS.md` §13):

```ts
interface UserDataset {
  credentials:     UserCredentials     // mock email + password
  profile:         UserProfile         // firstName, email, phone, dob, gender, shoeSize, clothingSize
  loyalty:         LoyaltyCard         // cardNumber, status, discount, bonuses, totalPurchases, nextLevelAmount
  addresses:       UserAddress[]
  socials:         SocialConnection[]
  orders:          UserOrder[]
  bonusHistory:    BonusTransaction[]
  purchaseHistory: HistoryOrder[]
  wishlist:        WishlistItem[]      // distinct type from wishlistSlice.WishlistItem
  waitingList:     WaitingItem[]
  referral:        ReferralData
  subscriptions:   UserSubscriptions
  consent:         { dataProcessing: boolean; crossBorder: boolean }
  authToken?:      string | null       // JWT access token, set after Platform login
  refreshToken?:   string | null       // reserved for future refresh-on-401
  userIdentifier?: string | null       // Platform identifier of the logged-in user
}
```

Initial state is `USER_DATASET` (mock data) so account pages render instantly without a loading flash.

Sync actions:

| Action | Payload |
|---|---|
| `patchUserData` | `Partial<UserDataset>` — persisted on the Save button. |
| `addAddress` | `UserAddress` — append to `data.addresses`. |
| `setAuth` | `{ accessToken, refreshToken, userIdentifier }` — stamp Platform-issued JWT pair on `user.data` after `AuthContext.login()` succeeds. Triggers `cartApi` / `wishlistApi` refetch via Bearer header. |
| `clearAuth` | — — reset `authToken` / `refreshToken` / `userIdentifier` to `null` on `AuthContext.logout()`. |

Async thunk:

```ts
export const fetchUserData = createAsyncThunk<UserDataset>(
  'user/fetchUserData',
  async () => USER_DATASET   // TODO: replace with real fetch
);
```

`user.status` / `user.error` track the thunk lifecycle. To wire the real API, replace the thunk body with `fetch('/api/user/me')` and drop `USER_DATASET` from `initialState`.

⚠ `authToken` / `refreshToken` / `userIdentifier` live on `user.data` but **are not persisted to localStorage** (see §7).

## 3. RTK Query

There are **5 RTK Query APIs**. Three (`productsApi`, `homepageApi`, `catalogConfigApi`) use `fakeBaseQuery()` with `queryFn` — data is loaded from `data/*.ts` via dynamic `import()`. The other two (`cartApi`, `wishlistApi`) are already wired to the real OneEntry Platform Content API via `fetchBaseQuery()` with `prepareHeaders` injecting the Bearer JWT from `state.user.data.authToken`. Switching one of the three local APIs to a real backend = swap `fakeBaseQuery` for `fetchBaseQuery` and `queryFn` for `query` (see §9).

### `productsApi` (`reducerPath: 'productsApi'`)

| Endpoint | Hook | Returns | Source |
|---|---|---|---|
| `getWomenClothing` | `useGetWomenClothingQuery()` | `Product[]` | `women-clothing.ts` |
| `getMenClothing` | `useGetMenClothingQuery()` | `Product[]` | `men-clothing.ts` |
| `getWomenBags` | `useGetWomenBagsQuery()` | `Product[]` | `women-bags.ts` |
| `getMenBags` | `useGetMenBagsQuery()` | `Product[]` | `men-bags.ts` |
| `getWomenShoes` | `useGetWomenShoesQuery()` | `Product[]` | `women-shoes.ts` |
| `getMenShoes` | `useGetMenShoesQuery()` | `Product[]` | `men-shoes.ts` |
| `getWomenAccessories` | `useGetWomenAccessoriesQuery()` | `Product[]` | `women-accessories.ts` |
| `getMenAccessories` | `useGetMenAccessoriesQuery()` | `Product[]` | `men-accessories.ts` |

```tsx
const { data: allProducts = WOMEN_CLOTHING_PRODUCTS } = useGetWomenClothingQuery();
```

### `homepageApi` (`reducerPath: 'homepageApi'`)

| Endpoint | Hook | Returns | Consumer |
|---|---|---|---|
| `getHeroSlides` | `useGetHeroSlidesQuery()` | `HeroSlide[]` | `HeroSlider` |
| `getPromoItems` | `useGetPromoItemsQuery()` | `PromoItem[]` | `PromoBlock` |
| `getDiscountBanner` | `useGetDiscountBannerQuery()` | `DiscountBannerData` | `DiscountBanner` |
| `getBestSellers` | `useGetBestSellersQuery()` | `Product[]` | `MenCollection` |
| `getHomepageNewArrivals` | `useGetHomepageNewArrivalsQuery()` | `Product[]` | `WomenCollection` |
| `getHomepageSaleProducts` | `useGetHomepageSaleProductsQuery()` | `Product[]` | `NewArrivals` component |

### `catalogConfigApi` (`reducerPath: 'catalogConfigApi'`)

| Endpoint | Hook | Arg | Returns | Consumer |
|---|---|---|---|---|
| `getShopCategories` | `useGetShopCategoriesQuery()` | — | `ShopCategory[]` | `CategorySection` |
| `getCategoryFilterChips` | `useGetCategoryFilterChipsQuery()` | — | `string[]` | `CategorySection` |
| `getTrendBlocks` | `useGetTrendBlocksQuery(key)` | `catalogKey` | `TrendBlock[]` | ⚠ endpoint exists, pages still import directly |
| `getStores` | `useGetStoresQuery()` | — | `Store[]` | ⚠ endpoint exists, `StoreLocationsPage` imports directly |
| `getRecommended` | `useGetRecommendedQuery(key)` | `catalogKey` | `RecommendedBlock` | `ProductDetailPage` |
| `getSpecialOffers` | `useGetSpecialOffersQuery(key)` | `catalogKey` | `SpecialOffer[]` | `ProductDetailPage` |
| `getSaleConfig` | `useGetSaleConfigQuery()` | — | `SaleConfig` | ⚠ endpoint exists, `SalePage` imports directly |
| `getNewArrivalsConfig` | `useGetNewArrivalsConfigQuery()` | — | `NewArrivalsConfig` | ⚠ endpoint exists, `NewArrivalsPage` imports directly |
| `getSalePageProducts` | `useGetSalePageProductsQuery()` | — | `(Product & { category: string })[]` | `SalePage` |
| `getNewArrivalsPageProducts` | `useGetNewArrivalsPageProductsQuery()` | — | `(Product & { category: NewArrivalCategory })[]` | `NewArrivalsPage` |

### `cartApi` (`reducerPath: 'cartApi'`) — real OneEntry REST

Talks to `{NEXT_PUBLIC_API_URL}/users/me/cart`. Bearer JWT injected via `prepareHeaders` from `state.user.data.authToken`. Cache tag: `Cart`. Gated by `isCartApiEnabled()` — when `NEXT_PUBLIC_API_URL` is empty (Storybook / offline), callers fall back to local `cartSlice`.

| Endpoint | Hook | Verb | Notes |
|---|---|---|---|
| `getCart` | `useGetCartQuery()` | `GET` | Skip with `{ skip: !authToken }` — anonymous → 401. |
| `addCartItem` | `useAddCartItemMutation()` | `POST` | Body accepts **absolute** `qty`, NOT a delta — `CartContext.updateQuantity` computes the resulting total client-side first. |
| `removeCartItem` | `useRemoveCartItemMutation()` | `DELETE` | Remove one line. |
| `setCart` | `useSetCartMutation()` | `PUT` | Replace the whole `items` list. Used by `clearCart()` (no single-call wipe endpoint). |

### `wishlistApi` (`reducerPath: 'wishlistApi'`) — real OneEntry REST

Talks to `{NEXT_PUBLIC_API_URL}/users/me/wishlist`. Same auth + gate pattern as `cartApi`. Cache tag: `Wishlist`.

| Endpoint | Hook | Verb | Notes |
|---|---|---|---|
| `getWishlist` | `useGetWishlistQuery()` | `GET` | Skip with `{ skip: !authToken }`. |
| `addWishlistItem` | `useAddWishlistItemMutation()` | `POST` | Add one product. |
| `removeWishlistItem` | `useRemoveWishlistItemMutation()` | `DELETE` | Remove one product. |
| `setWishlist` | `useSetWishlistMutation()` | `PUT` | Bulk-merge on login (see `mergeUserWishlist` reducer in `wishlistSlice`). |

> Exact request / response shapes, marker map and demo credentials: see [`./ONEENTRY_INTEGRATION.md`](./ONEENTRY_INTEGRATION.md) §5.1–§5.2.

## 4. Typed hooks (`store/hooks.ts`)

```ts
export const useAppDispatch = useDispatch.withTypes<AppDispatch>();
export const useAppSelector = useSelector.withTypes<RootState>();
```

Always use these instead of the bare `react-redux` hooks.

## 5. Selectors (`store/selectors.ts`)

Single entry point for derived state. Use these instead of inline reducers in components.

**Cart**: `selectCartItems`, `selectMiniCartOpen`, `selectCartTotalItems`, `selectCartSubtotal`, `selectCartOriginalSubtotal`, `selectCartDiscount`.

**Wishlist**: `selectWishlistItems`, `selectWishlistCount`, `selectIsWishlisted` (parametric — accepts an `id`).

**Recently viewed**: `selectRecentlyViewed`.

**User**: `selectUserData`, `selectUserStatus`, `selectUserAddresses`, `selectUserProfile`, `selectUserLoyalty`.

**UI**: `selectQuickViewProduct`.

```tsx
const wishlisted = useAppSelector(s => selectIsWishlisted(s, product.id));
const totalItems = useAppSelector(selectCartTotalItems);
const profile    = useAppSelector(selectUserProfile);
```

## 6. React contexts

Five contexts in `src/app/context/`. Two kinds: thin wrappers over slices and independent React state.

| Context | File | Kind | Hook |
|---|---|---|---|
| `CartContext` | `CartContext.tsx` | wraps `cartSlice` | `useCart()` |
| `WishlistContext` | `WishlistContext.tsx` | wraps `wishlistSlice` | `useWishlist()` |
| `QuickViewContext` | `QuickViewContext.tsx` | wraps `uiSlice.quickView` | `useQuickView()` |
| `AuthContext` | `AuthContext.tsx` | independent React state | `useAuth()` |
| `CatalogAccentContext` | `CatalogAccentContext.tsx` | independent React state | `useCatalogAccent()` |

**Wrappers.** `useCart()`, `useWishlist()`, `useQuickView()` only `dispatch` the underlying slice actions; components never touch slices directly. `closeQuickView()` internally schedules `setTimeout(() => dispatch(clearQuickViewProduct()), 300)` for the close animation.

**`AuthContext` / `useAuth()`.** Plain React state, not Redux:

```ts
interface AuthContextType {
  isLoggedIn:           boolean
  user:                 User | null      // flat profile + loyalty
  loginModalOpen:       boolean
  registerModalOpen:    boolean
  openLoginModal():     void
  closeLoginModal():    void
  openRegisterModal():  void
  closeRegisterModal(): void
  login(emailOrPhone, password): Promise<boolean>   // currently calls validateCredentials()
  logout():             void
  updateUser(data):     void
}
```

On login the `user` is set to `MOCK_USER_DATA` from `userData.ts`. Replace `validateCredentials` with the real `POST /api/auth/login` to migrate.

**`CatalogAccentContext` / `useCatalogAccent()`.** Holds the hex accent of the current section (`'#F88A8A'` for women, `'#8B9EB7'` for men). Catalog pages provide the value via `<CatalogAccentContext.Provider value={accentColor}>`. Default: `'#000000'`.

## 7. Persistence (localStorage)

Key: `'oe_store'`. Schema version: `STORAGE_VERSION = 4`.

Persisted shape:

```ts
{
  __version:      4,
  cart:           CartState,
  wishlist:       WishlistState,
  recentlyViewed: RecentlyViewedState,
  catalog:        CatalogsState,    // saved, but hydrated separately
  userAddresses:  UserAddress[],    // only addresses, not the whole user
}
```

**Catalog hydration.** `catalog` is **not** part of `preloadedState`. After client mount, `Providers.tsx` calls `loadCatalogFromStorage()` and dispatches `hydrateCatalogs(...)` — this avoids an SSR/CSR mismatch.

**Not persisted**: `ui` (QuickView, mobile menu), the RTK Query cache, the rest of `user` (only `addresses`), and `user.data.authToken` / `refreshToken` / `userIdentifier` (auth tokens are intentionally kept out of localStorage).

**Migrations** (`MIGRATIONS` in `store/index.ts`):

| Step | Behaviour |
|---|---|
| v1 → v2 | No-op (backwards compat). |
| v2 → v3 | Adds `viewedAt: Date.now()` to existing `recentlyViewed` items. |
| v3 → v4 | Defensive bump for the auth-token fields on `user.data`. They are not persisted, so no shape change — kept for traceability. |

Mechanism: `store.subscribe(() => saveToStorage(...))` — synchronous write on every state change.

## 8. Usage patterns

### Catalog page

```tsx
const CATALOG_KEY = 'women-clothing';

export function WomenCatalogPage() {
  const { data: allProducts = WOMEN_CLOTHING_PRODUCTS } = useGetWomenClothingQuery();

  const dispatch = useAppDispatch();
  const catalogState     = useAppSelector(s => s.catalog[CATALOG_KEY]);
  const selectedFilters  = catalogState?.selectedFilters ?? {};
  const sortBy           = catalogState?.sortBy ?? 'featured';
  const viewCols         = (catalogState?.viewCols ?? 4) as 3 | 4;

  // Local UI state stays out of Redux
  const [sortOpen, setSortOpen] = useState(false);
  const [mobileFilterOpen, setMobileFilterOpen] = useState(false);

  const handleToggleFilter = (key: string, val: string) =>
    dispatch(toggleFilter({ catalogKey: CATALOG_KEY, filterKey: key, value: val }));

  const handleSort = (value: string) =>
    dispatch(setSort({ catalogKey: CATALOG_KEY, sortBy: value }));
}
```

### Shared component with `catalogKey`

```tsx
<ShoesCatalog
  catalogKey="women-shoes"
  gender="women"
  accentColor="#C4A882"
  totalStyles={4218}
  totalPages={211}
  quickChips={QUICK_CHIPS}
  filterGroups={FILTER_GROUPS}
  products={products}
  trendBlocks={TREND_BLOCKS}
/>

// inside
const catalogState = useAppSelector(s => s.catalog[catalogKey]);
```

### Conditional RTK Query (`skip`)

```tsx
const { data: specialOffersData } = useGetSpecialOffersQuery(
  catalogProduct?.specialOffersId ?? '',
  { skip: !catalogProduct?.specialOffersId }
);
```

### QuickView

```tsx
const { openQuickView, closeQuickView, isOpen, product, initialColorIndex } = useQuickView();
// openQuickView(product, colorIndex?) — second arg sets the pre-selected color.
// closeQuickView() internally schedules clearQuickViewProduct after 300 ms.
```

## 9. Switching to a real API

The architecture is set up so a real backend swap is mechanical. The recipe below applies to the three **local-data** APIs (`productsApi`, `homepageApi`, `catalogConfigApi`); `cartApi` and `wishlistApi` are already wired to the OneEntry Platform Content API and serve as a working template — copy their `fetchBaseQuery` + `prepareHeaders` setup if a slice needs the Bearer JWT.

**Step 1 — swap `baseQuery`** in every API file:

```ts
baseQuery: fetchBaseQuery({ baseUrl: process.env.NEXT_PUBLIC_API_URL })
```

**Step 2 — replace `queryFn` with `query`**:

```ts
// Before
getWomenClothing: builder.query<Product[], void>({
  queryFn: async () => {
    const { WOMEN_CLOTHING_PRODUCTS } = await import('../../data/women-clothing');
    return { data: WOMEN_CLOTHING_PRODUCTS };
  },
}),

// After
getWomenClothing: builder.query<Product[], void>({
  query: () => '/products/women/clothing',
}),
```

**Step 3 — drop fallback defaults in components** (handle `isLoading` / `isError` instead of relying on the static fallback):

```tsx
const { data: allProducts, isLoading, isError } = useGetWomenClothingQuery();
if (isLoading) return <Skeleton />;
```

**Step 4 — SEO** (server-side, not Redux):

```ts
export async function generateMetadata(): Promise<Metadata> {
  const res = await fetch(`${process.env.API_URL}/seo/women-clothing`);
  return res.json();
}
```

After the full swap, `data/*.ts` files can be deleted or kept as dev-time fallbacks.

## 10. Tests

Directory: `src/app/store/__tests__/`. Framework: Vitest.

| File | Scope |
|---|---|
| `cartSlice.test.ts` | `cartSlice` reducer — initial state, `addItem` (new / duplicate → qty++ / sale price), `removeItem`, `updateQuantity`, `clearCart`, `miniCartOpen`. |
| `wishlistSlice.test.ts` | `wishlistSlice` reducer — analogous coverage. |

Tests run against the reducer directly, without mounting components:

```ts
import cartReducer, { cartActions } from '../cartSlice';

const state = cartReducer(undefined, cartActions.addItem(item));
expect(state.items).toHaveLength(1);
```

Run with `npx vitest run` (CI) or `npx vitest` (watch).
