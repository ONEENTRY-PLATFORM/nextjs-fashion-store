# COMPONENTS.md — Component registry

Systematic inventory of every React component in the storefront: role, key props, key consumers, and the doc that describes its deeper business rules (when there is one). Grouped by folder.

Component counts (excluding tests and `.stories.tsx`):
- `src/app/components/*` — **48** global components + `figma/ImageWithFallback.tsx`
- `src/app/pages/*.tsx` — **22** page components (8 catalog shells, 14 unique routes)
- `src/app/pages/{account,cart,checkout,favorites,new,product,sale,stores}/*` — **59** page sub-components (account 21, product 20, checkout 8, cart 2, favorites 3, new 1, sale 3, stores 1)

---

## 1. Global components — `src/app/components/`

### 1.1 Layout / shell

| Component | Purpose | Deep dive |
|---|---|---|
| `Providers.tsx` | Client-side root. `<Provider store>` (Redux) → `<ServiceWorkerRegistrar>` → ARIA live regions (2) → `<AuthProvider>` → `<WishlistSyncEffect>` (no-op) → `<PageViewTracker>` → 5 label contexts (`ProductCardLabels`, `SignInLabels`, `CreateAccountLabels`, `InterfaceControlsLabels`, `YourBagLabels`) → `<FooterMenuProvider>` → `<HeaderMenuProvider>` → `<SignUpFormSchemaProvider>` → `<ErrorBoundary>`. | [ARCHITECTURE.md §5](./ARCHITECTURE.md#5-server-vs-client-rendering) |
| `Header.tsx` (294 loc) | Sticky site header: HeaderTopBar row + logo + gender nav + `<HeaderSearch>` + user/wishlist/bag icons + mobile hamburger + local dropdown-hover state. Uses a `mounted` guard so the wishlist / bag badge counts render only after client hydration (prevents SSR mismatch). **Dynamically imports 4 modals** — `MiniCart`, `LoginModal`, `RegisterModal`, `QuickViewModal` — but does NOT manage their state; each reads open/close from `AuthContext` (login/register), `QuickViewContext`, `useCart().miniCartOpen`. Reads mega-menu tree via `useHeaderMenu()`, adapts through `adaptHeaderMenuToMega()`, and passes the current sub-cat slice to `<HeaderMegaMenu>` as `currentDropdownData`. Uses `useInterfaceControlsT()` for the search placeholder. | — |
| `HeaderTopBar.tsx` | Region + language + support phone + Store Locator link. Static UI (visible on `md+`). | — |
| `HeaderMegaMenu.tsx` (134 loc) | Desktop mega-menu row (Clothing / Shoes / Bags / Accessories / New / Sale). Hover-driven mega-dropdown, `Sale` tab pulses. Purely presentational — takes 12 props from parent `<Header>`: `activeGender`, `accentColor`, `urlSubCat`, `activeDropdown`, `currentDropdownData` (pre-adapted from `useHeaderMenu()` via `adaptHeaderMenuToMega()` inside `Header`), `dropdownRef`, four hover callbacks (`onSubCatEnter` / `onSubCatLeave` / `onDropdownEnter` / `onDropdownLeave`), `onCloseDropdown`, `getNavHref`. | [ONEENTRY_INTEGRATION.md §5.3](./ONEENTRY_INTEGRATION.md#53-menus-srcliboneentrymenus) |
| `HeaderMobileDrawer.tsx` | Fixed overlay drawer (`z-100`) — gender switcher + expandable categories + footer utilities. Shares menu data with the mega-menu. | — |
| `HeaderSearch.tsx` | Debounced (350 ms) vector-search dropdown → `searchProductsAction` (`src/lib/oneentry/catalog/search-action.ts`). Fires `trackActivity({type:'search', query, meta:{resultsCount}})`, guards out-of-order responses with a `requestSeqRef` sequence counter. Desktop + mobile variants. | [ONEENTRY_INTEGRATION.md §4.4](./ONEENTRY_INTEGRATION.md#44-catalog-srcliboneentrycatalog-actionts) |
| `Footer.tsx` (176 loc) | 4 column link groups (`FOOTER_LINKS`), payment icons (`PAYMENT_METHOD_NAMES`), social (`SOCIAL_LINKS`), support blocks (`SUPPORT_ITEMS`), bottom bar. Embeds `<NewsletterForm>`. Copy from `data/footerConfig.ts` + `FOOTER_LABELS`. **Bottom-bar links are sourced from `useFooterMenu()`** (OneEntry CMS via `FooterMenuContext`); `BOTTOM_LINKS` is the local fallback. | — |
| `ScrollToTop.tsx` | On every pathname / search-params change (from `next/navigation`), scrolls window to `(0,0)`. Mounted globally in `layout.tsx`. | — |
| `ServiceWorkerRegistrar.tsx` | On mount, registers `/sw.js`. Silent on unsupported browsers. | [PWA.md §5](./PWA.md#5-registration) |
| `PageViewTracker.tsx` | Fires `trackActivity('page_view', {path})` on every pathname change. **Skips `/product/*`** — those emit a dedicated `product_view` event from the PDP. | [ONEENTRY_INTEGRATION.md §4.3](./ONEENTRY_INTEGRATION.md#43-activity-tracking-srcliboneentryactivityactionts) |
| `ErrorBoundary.tsx` | Class component (`getDerivedStateFromError` + `componentDidCatch`). Logs to console in dev; renders a plain fallback (X icon + heading + message + "Try again" button) in prod. No remote reporting. Copy from `ERROR_BOUNDARY_LABELS`. | — |
| `JsonLd.tsx` | RSC helper. Accepts single object or array of schemas; emits `<script type="application/ld+json">` with `JSON.stringify`. | [SEO_OPTIMIZATION.md §13](./SEO_OPTIMIZATION.md#runtime-seo-json-ld-per-page) |

### 1.2 Homepage blocks

| Component | Purpose | Deep dive |
|---|---|---|
| `HeroSlider.tsx` (216 loc) | Autoplaying carousel; slides come from CMS via `initialSlides?: HeroSlideFromCms[]` prop. Left/right alignment, gradient overlays, autoplay interval `TIMINGS.HERO_SLIDE_INTERVAL` (5 s). **Three timings are in play**: image transition CSS `duration-700` (700 ms), CTA content fade CSS `duration-[400ms]`, and the JS `isTransitioning` guard reset via `TIMINGS.HERO_SLIDE_TRANSITION = 600` ms. Rapid clicks are blocked until the JS timer clears — the CSS may still be in-flight but the input handler unlocks. | [ONEENTRY_INTEGRATION.md §5.1](./ONEENTRY_INTEGRATION.md#51-blocks-srcliboneentryblocks) |
| `PromoBlock.tsx` | Renders `HomepageCollectionItem[]` (CMS block `homepage_collections`) as promotional tiles. | — |
| `NewArrivals.tsx` | Section wrapper for a `Product[]` grid ("New Arrivals" on Home). | — |
| `CategorySection.tsx` | Home "Shop by Category" tabs + subcategory cards. Accepts `{initialChips?: string[], initialCategories?: CategoryItemFromCms[]}` from the RSC shell. Staged card animation via `CARD_BASE_DELAY = 680` ms (after parent `<AnimatedSection>` fade-up completes). | — |
| `DiscountBanner.tsx` | Full-width discount banner from block `discount_banner`. | [ONEENTRY_INTEGRATION.md §5.1](./ONEENTRY_INTEGRATION.md#51-blocks-srcliboneentryblocks) |
| `WomenCollection.tsx` | Home "Shop Women" grid — takes `products: Product[]` prop. Thin wrapper over `ProductCard`. | — |
| `MenCollection.tsx` | Symmetric to `WomenCollection` for the men's home block. | — |

### 1.3 Catalog

| Component | Purpose | Deep dive |
|---|---|---|
| `CatalogTemplate.tsx` (740 loc) | Universal catalog engine. Grid + list view, sticky filter bar, quick chips, sort dropdown, pagination, cross-sell block, trending blocks. Consumes `state.catalog[catalogKey]` from `catalogSlice`. Every `WomenXxxPage` / `MenXxxPage` is a wrapper that receives 7 pre-fetched props from the RSC shell (see §2.2) and passes the per-catalog UI config plus those props into this component. | [CATALOG_FILTERS.md](./CATALOG_FILTERS.md), [FILTER_SYSTEM.md](./FILTER_SYSTEM.md) |
| `CatalogTemplate.parts.tsx` | Sub-components: `ColsIcon`, `CheckboxUI`, `SortOptionBtn`. | — |
| `CatalogTemplate.types.ts` | Shared types: `FilterGroup`, `FilterOption`, `CrossSellCategory`, `BreadcrumbItem`. | — |
| `CatalogListProductCard.tsx` | List-view (compact) variant of the product card — used when `state.catalog[key].listMode === true`. | — |
| `CatalogCrossSell.tsx` | Bottom-of-catalog cross-sell grid (`CrossSellCategory[]` — e.g. "Also popular in Men's Bags"). Copy from `CATALOG_VIEW_LABELS`. | — |
| `CatalogMobileSort.tsx` | Mobile-only sort picker (opens as a sheet). | — |
| `MobileFilterPanel.tsx` | Mobile-only full-screen accordion holding all filter groups. Exports shared types `MobileFilterOption`, `MobileFilterGroup` used by the panel and the body. `type` can be `'checkbox'`, `'color'`, `'section'`, `'size_chips'`, `'search_checkbox'`, `'price_range'`, `'measure_range'`. | [FILTER_SYSTEM.md](./FILTER_SYSTEM.md) |
| `MobileFilterBody.tsx` | Content renderer for the mobile filter panel. Exports `CheckboxUI` (the tick / dash checkbox shared with desktop) and `FilterBody` (per-group renderer that dispatches by `group.type`). Handles **4 of the 7** type variants declared in `MobileFilterGroup['type']`: `size_chips`, `search_checkbox`, `color`, and the default `checkbox`. `section` is rendered by `MobileFilterPanel` as a header (not by `FilterBody`); `price_range` and `measure_range` are declared in the type union but not yet wired to a renderer — they fall through to the default `checkbox` layout. | [FILTER_SYSTEM.md](./FILTER_SYSTEM.md) |
| `NoFilterResults.tsx` | Empty state with "Clear all filters" CTA. Accepts an `onClearAll: () => void` callback prop — the parent (`CatalogTemplate`) is responsible for dispatching `catalogActions.clearFilters`. | [CATALOG_FILTERS.md §11](./CATALOG_FILTERS.md#11-empty-state) |
| `PriceRangeSlider.tsx` | Dual-thumb range slider for the Price filter group. Emits `[min, max]` — passed as `between` condition. Currency label from `CURRENCY.symbol`. Copy from `PRICE_RANGE_LABELS`. | — |
| `ShoesCatalog.tsx` | Catalog wrapper for shoe pages — passes shoes-specific `FILTER_GROUPS` / `QUICK_CHIPS` / accent into `<CatalogTemplate>`. Re-exports `FilterOption`, `FilterGroup`, `CrossSellCategory` types for use by page shells. Also used as the delegate target for `<AccessoriesCatalog>`. | — |
| `AccessoriesCatalog.tsx` | Thin alias wrapper (`AccessoriesCatalogProps = ShoesCatalogProps`) — internally renders `<ShoesCatalog>` with `chipField="accessoryType"` and the `ACCESSORY_CHIP_MAP` lookup. | — |

### 1.4 Product surfaces

| Component | Purpose | Deep dive |
|---|---|---|
| `ProductCard.tsx` (503 loc) | Grid card: gallery hover-swap, color swatches (rendered via `ColorSwatchButton`), wishlist heart, QuickView "eye" button, Add-to-Bag with inline **size chips** (not the `SizeDropdown` component), price + strike, single generic badge (`product.label ?? product.badge`). `cardHref` appends `?gender=men` / `?gender=women` when `product.gender` is `'M'` / `'W'` so the PDP keeps the correct Header gender highlight. Memoised via `React.memo`. Exports shared types: `Product`, `ProductVariant`, `ProductSpec`, `ProductReview`. | [CATALOG_FILTERS.md](./CATALOG_FILTERS.md), [PRODUCT_DETAIL.md](./PRODUCT_DETAIL.md) |
| `ProductCardSkeleton.tsx` | Placeholder skeleton matching the ProductCard grid slot. Used inside `<Suspense fallback>` and during query loading. | — |
| `ColorSwatch.tsx` | Circular colour swatch with selected-state ring. Used on PDP + QuickView. Does NOT render the OOS strike overlay — that logic lives in `ColorSwatchButton`. | — |
| `ColorSwatchButton.tsx` | Button variant used inside ProductCard's hover swatch row and add-to-bag flow. Uses `strikeColor()` (`utils/colorUtils.ts`) to render the OOS diagonal-strike overlay with the right contrast against the swatch. Copy from `CATALOG_VIEW_LABELS`. | — |
| `SizeDropdown.tsx` | Size picker consumed by `CartItemRow` only. Neither `ProductCard` (inline size chips) nor `QuickViewModal` (inline 3-column size grid) use it. Props: `{value, onChange, isShoe, availableSizes?}`. When `availableSizes` is supplied, it overrides the built-in XS…XXL / EU 36…46 fallback; an empty array hides the widget (products without sizes, e.g. jewelry) and a single-item array renders as static text instead of an interactive dropdown. Copy from `SIZE_DROPDOWN_LABELS`. | — |
| `QuickViewModal.tsx` (430 loc) | Modal PDP surrogate. Shares Add-to-Cart / Wishlist rules with PDP. `useFocusTrap` for keyboard nav. | [PRODUCT_DETAIL.md §15](./PRODUCT_DETAIL.md#15-quick-view-quickviewmodal) |
| `QuickViewSizeGuide.tsx` | Compact size-conversion table shown inside QuickView (in-place swap). | — |

### 1.5 Cart / checkout / auth

| Component | Purpose | Deep dive |
|---|---|---|
| `MiniCart.tsx` (223 loc) | Slide-in cart drawer opened from header + Add-to-Cart. `useFocusTrap` + backdrop close. Bundle rows render collapsed (single quantity control). | [PRODUCT_DETAIL.md §16](./PRODUCT_DETAIL.md#16-mini-cart-minicart) |
| `CheckoutStepper.tsx` | Progress indicator that renders **4 stages** (Cart → Delivery → Payment → Confirmation). The actual checkout **funnel is 3 steps** — the Cart is the starting point outside the funnel, but the stepper shows it as stage 1 for the user. Completed steps are **clickable for backward navigation** (`router.push()`); the active + future steps are inert. | [CHECKOUT.md](./CHECKOUT.md) |
| `LoginModal.tsx` | Sign-in form: single login field (accepts email, phone, or OE identifier — the OE email auth provider has `isLogin: true` on all three) + password + Google button + "Forgot password?" (stub, `alert()`) + link to `RegisterModal`. Google flow: click calls **`startGoogleOAuth()`** from `src/lib/google-auth.ts` — the browser navigates to Google's authorize page and comes back through `app/auth/callback/google/route.ts` (server-side authorization-code exchange). The modal itself does not see the outcome. Consumes `useSignInT()` for CMS labels; falls back to `AUTH_LABELS`. | [AUTH.md §4](./AUTH.md#4-sign-in) |
| `RegisterModal.tsx` | Sign-up form rendered from `SignUpFormSchemaContext` (CMS attribute set `users_sign_in_sign_up`). Zod client validation via `registerSchema.safeParse()`. Calls **`useAuth().signUp(input)`** (context method), which internally awaits `signUpAction`. Google button calls `startGoogleOAuth()` — the same authorization-code redirect as `LoginModal`. Consumes `useCreateAccountT()` labels. | [AUTH.md §5](./AUTH.md#5-sign-up) |
| `NewsletterForm.tsx` | Email subscribe form → `submitForm('subscribe_new_drops', [{marker:'subscribe_new_drops_email', ...}], { moduleConfigId: 52, moduleEntityIdentifier: 'subscribe' })`. **Live end-to-end** — a successful submit returns an OE form-data record id and renders the inline green "Subscribed!" state. The `{ moduleConfigId, moduleEntityIdentifier }` pair binds the form to the OE `subscribe` page; if OE admin ever unbinds or reconfigures it, look up the current pair via `Pages.getPageByUrl('subscribe').moduleFormConfigs[0]`. **Placeholder / CTA are hardcoded English** ("Your email address", "Subscribe") — no label context wired yet. Error messages containing `formIdentifier` are rewritten to a friendly fallback for the shopper. | [ONEENTRY_INTEGRATION.md §4.5](./ONEENTRY_INTEGRATION.md#45-forms-srcliboneentryforms) |

### 1.6 Form widgets

| Component | Purpose |
|---|---|
| `FormField.tsx` | Generic labelled input (text / email / tel / password). Auto-generated `id` via `useId()`. Focus / error styles, red border from `SALE_COLOR` on error. Used in RegisterModal, GuestContactForm, address forms. |
| `QtyControl.tsx` | `−` / `+` buttons around a numeric value. Sizes `sm` / `md`. Copy from `QTY_CONTROL_LABELS`. |
| `RadioCard.tsx` | Card-style radio option (border highlight, icon, title, subtitle, collapsible children). Used across DeliveryPage and PaymentPage. |

### 1.7 Utility

| Component | Purpose |
|---|---|
| `HorizontalScroller.tsx` | Horizontal-scroll container with prev / next chevron buttons and edge fade. Uses `useDragScroll()` for desktop drag-scroll. `ChevronLeft` / `ChevronRight` from `lucide-react`. Copy from `HORIZONTAL_SCROLLER_LABELS`. |
| `ImageWithFallback.tsx` | Wrapper around `next/image` with an `onError` handler that swaps to a placeholder. Optional `grayscale` prop. Used everywhere product images are rendered. |
| `figma/ImageWithFallback.tsx` | Figma-imported duplicate — retained for stories that reference the design-system primitive by path. |

---

## 2. Page components — `src/app/pages/*.tsx`

Each `app/*/page.tsx` is a thin route shell that renders one of these client components. Files under `src/app/pages/` are all `'use client'`.

### 2.1 Landing + info

| Component | Route | Deep dive |
|---|---|---|
| `HomePage.tsx` (165 loc) | `/` — hero + categories + collections + promo blocks + `AnimatedSection` fade-ups (IntersectionObserver, ~650 ms). Props: `{initialHeroSlides, initialPromoItems, initialDiscountBanner, initialCategorySection, pageBlocks}` — all pre-fetched by the RSC shell at `app/page.tsx`. `pageBlocks` for markers `homepage_new_arrivals` / `homepage_best_sellers` / `homepage_sale` gets a label-based fallback in `page-blocks.ts` when OE's similarity engine returns nothing (see [ONEENTRY_INTEGRATION.md](./ONEENTRY_INTEGRATION.md)). | [CATALOG_FILTERS.md §15](./CATALOG_FILTERS.md#15-page-specific-behaviours) |
| `InfoPage.tsx` (198 loc) | Rendered by `app/[...slug]/page.tsx` when the resolved entry is an info page and there is no dedicated section body. It does **not** call `loadPageByUrl` — the content comes from local static tables (`INFO_PAGE_LABELS`, `INFO_PAGE_HERO`, `INFO_PAGE_CTA`, `INFO_PAGE_SECTIONS`, `INFO_PAGE_FEATURE_CARDS`, `INFO_PAGE_DEMO_NOTICE`) in `data/infoPageLabels.ts`. Icon map covers `edit`/`layout`/`zap`/`globe`. | [pages/info-page.md](./pages/info-page.md) |
| `NotFoundPage.tsx` | Rendered by `app/not-found.tsx`. Copy from `NOT_FOUND_LABELS`. | [pages/not-found.md](./pages/not-found.md) |
| `FilterSystemDownloadPage.tsx` (96 loc) | `/download/filter-system` — **auto-download trigger** (not a whitepaper renderer). On mount, wraps `FILTER_SYSTEM_MARKDOWN` from `data/filterSystemMarkdown.ts` into a `Blob`, creates a `URL.createObjectURL`, programmatically clicks a temporary `<a download>` link, then revokes the URL. Renders a "Downloaded" confirmation screen; there is no in-page Markdown viewer. | [pages/filter-system-download.md](./pages/filter-system-download.md) |

### 2.2 Catalog + PDP

All eight catalog pages are wrapper client components that accept **seven props** from their RSC route shell (`app/[...slug]/page.tsx`) and pass them into `<CatalogTemplate>` with the per-catalog config:

```ts
{
  initialProducts?: Product[];        // pre-fetched via loadProducts on the server
  initialFilterGroups?: FilterGroup[];// pre-fetched via loadClothingFilter
  initialTotalStyles?: number;        // total count for the "N styles" copy
  currentFilters?: Record<string,string[]>;  // URL-derived filter state
  currentPage?: number;
  total?: number;
  trendingBlock?: unknown;            // pre-fetched trending block for the catalog
}
```

| Component | Route | Loc | Notes |
|---|---|---|---|
| `WomenCatalogPage.tsx` | `/women/clothing` | 62 | Passes women's clothing config into `<CatalogTemplate>`. |
| `WomenShoesPage.tsx` | `/women/shoes` | 48 | Delegates to `<ShoesCatalog>`. |
| `WomenBagsPage.tsx` | `/women/bags` | 67 | Direct `<CatalogTemplate>` with bags config. |
| `WomenAccessoriesPage.tsx` | `/women/accessories` | 48 | Delegates to `<AccessoriesCatalog>` → `<ShoesCatalog>` with accessory chip map. |
| `MenCatalogPage.tsx` | `/men/clothing` | 63 | Men's clothing. |
| `MenShoesPage.tsx` | `/men/shoes` | 48 | Delegates to `<ShoesCatalog>` (men's palette). |
| `MenBagsPage.tsx` | `/men/bags` | 67 | Men's bags. |
| `MenAccessoriesPage.tsx` | `/men/accessories` | 48 | Delegates to `<AccessoriesCatalog>`. |
| `ProductDetailPage.tsx` (868 loc) | `/product/[id]` | — | Full PDP. Props: `{initialProduct, categoryBreadcrumbs, reviewsSlot, recommendationsSlot, currentGender}` — the two `*Slot` props hold RSC-streamed `<Suspense>` fragments. See [PRODUCT_DETAIL.md](./PRODUCT_DETAIL.md). |
| `SalePage.tsx` (479 loc) | `/sale` | — | Countdown + category tabs + biggest-discount sort. Props: `{initialProducts, saleEndsAt}`. |
| `NewArrivalsPage.tsx` (292 loc) | `/new` | — | Gender-pill URL filter + `newest`-first default sort. Props: `{initialProducts}`. |

### 2.3 Cart + checkout

| Component | Route | Deep dive |
|---|---|---|
| `CartPage.tsx` (383 loc) | `/cart` — full cart, selection, promo, bundles. On mount fetches real product sizes via `getProductsByIdsAction` for every cart line and stores them in a `sizesById` map, forwarded as `availableSizes` to each `CartItemRow` so the size widget reflects the actual product (jewelry with no sizes hides it, single-size items render as static text). | [CHECKOUT.md §11](./CHECKOUT.md#11-cart-page--promo--selection) |
| `DeliveryPage.tsx` | `/checkout/delivery` — address + method + time slot + coupon. | [CHECKOUT.md §2](./CHECKOUT.md#2-delivery-step-deliverypagetsx) |
| `PaymentPage.tsx` | `/checkout/payment` — payment accounts + `createOrderAction` + Stripe redirect. Place Order CTA is gated by a local `previewInFlight` flag alongside `placing` / `!preview`; shows an `animate-spin` circle while disabled and `handlePlaceOrder` early-returns until the debounced `previewOrder` lands. | [CHECKOUT.md §3.5](./CHECKOUT.md#35-place-order-cta-gating) |
| `ConfirmationPage.tsx` | `/checkout/confirmation` — receipt + `clearCart()` after 200 ms. | [CHECKOUT.md §4](./CHECKOUT.md#4-confirmation-step-confirmationpagetsx) |

### 2.4 Account + favourites + misc

| Component | Route | Deep dive |
|---|---|---|
| `AccountPage.tsx` | `/account` — 9-tab dashboard, tab selection via `?tab=` URL param (default `my-data`). `authReady` gate to avoid signed-out flash. Tabs: `my-data`, `my-orders`, `my-bonuses`, `service`, `history`, `wishlist`, `waiting-list`, `feedback`, `subscriptions`. | [ACCOUNT.md](./ACCOUNT.md) |
| `FavoritesPage.tsx` (257 loc) | `/favorites` — wishlist grid + bulk Move All / Clear All. Props: `{recommended?: Product[], trending?: Product[]}` — carousel data pre-fetched by the RSC shell. | [CATALOG_FILTERS.md §15](./CATALOG_FILTERS.md#15-page-specific-behaviours) |
| `StoreLocationsPage.tsx` (242 loc) | `/stores` — city filter + store cards with map link. Receives `{initialStores, cmsPage}` as props; the parent RSC shell at `app/stores/page.tsx` awaits `loadStores` + `loadStoreLocationsPage` + `loadStoresSystemTexts` in parallel and passes them in. **ISR (`revalidate = 3600`) is declared on the route shell**, not the component. | [pages/stores.md](./pages/stores.md) |

---

## 3. Sub-components — `src/app/pages/{sub}/*`

### 3.1 Account — `pages/account/` (21 files)

11 tab-specific sections (10 active + 1 dark `ReferSection`) + `LoyaltyCard` (rendered inline inside My Data, not a tab) + `shared.tsx` helpers + 3 subfolders (`history/` — 1 file, `myData/` — 6 files, `service/` — 2 files). Every section reads / writes the OneEntry-backed user state via Server Actions from `src/lib/oneentry/auth/actions.ts`.

| File | Role | Deep dive |
|---|---|---|
| `shared.tsx` (292 loc) | Shared primitives + 10 loading skeletons: `SectionTitle`, `EditBtn`, `Field`, `FormInput`, `Sk` + `MyDataSkeleton`, `MyOrdersSkeleton`, `BonusesSkeleton`, `ServiceSkeleton`, `HistorySkeleton`, `WishlistSkeleton`, `WaitingListSkeleton`, `ReferSkeleton`, `FeedbackSkeleton`, `SubscriptionsSkeleton`. Also re-exports `ACCENT` and `fmt`. Adapters `adaptOeOrder()` and `adaptOeToHistory()` are **not** here — they live as private helpers inside `MyOrdersSection.tsx` and `HistorySection.tsx` respectively. | [ACCOUNT.md §3](./ACCOUNT.md#3-my-orders-myorderssectiontsx) |
| `LoyaltyCard.tsx` | Tier badge + progress bar + perks. Accepts `{user}` prop (typed as non-null `AuthContext.user`). Reads `user.status/discount/bonuses/totalPurchases/nextLevelAmount`. Currently mock defaults on this tenant. Also re-exports `TIER_PERKS` and `TIER_ORDER` for back-compat. | [ACCOUNT.md §4](./ACCOUNT.md#4-my-bonuses-bonusessectiontsx) |
| `MyDataSection.tsx` | Composite: LoyaltyCard header + six sub-forms. | [ACCOUNT.md §2](./ACCOUNT.md#2-my-data-mydatasectiontsx) |
| `MyOrdersSection.tsx` | Six recent orders. Row actions: Expand, Full History (pushes `?tab=history`; `AccountPage` re-runs its tab-restore effect on `useSearchParams()` changes), Reorder (re-adds each `orderItem` with a numeric `productId` via `useCart().addItem`, then routes to `/cart`; hidden when no items carry a `productId`), Cancel (confirmation modal → `cancelOrderAction(orderId, storage)` from `auth/actions.ts`; on success the row's badge flips to `Cancelled` via a local `locallyCancelledIds` overlay). | [ACCOUNT.md §3](./ACCOUNT.md#3-my-orders-myorderssectiontsx) |
| `BonusesSection.tsx` | Loyalty summary + empty transactions table. | [ACCOUNT.md §4](./ACCOUNT.md#4-my-bonuses-bonusessectiontsx) |
| `WishlistSection.tsx` | Grid via `useWishlist()`. | [ACCOUNT.md §7](./ACCOUNT.md#7-wishlist-wishlistsectiontsx) |
| `ServiceMaintenanceSection.tsx` | Existing requests + submission form → `submitServiceRequestAction`. | [ACCOUNT.md §5](./ACCOUNT.md#5-service-maintenance-servicemaintenancesectiontsx) |
| `HistorySection.tsx` | Full order history + status filter + `TrackingModal`. | [ACCOUNT.md §6](./ACCOUNT.md#6-history-historysectiontsx) |
| `WaitingListSection.tsx` | Enriched wishlist via `getWaitingListAction`. | [ACCOUNT.md §8](./ACCOUNT.md#8-waiting-list-waitinglistsectiontsx) |
| `FeedbackSection.tsx` | Star + category + free-text form (local only for now). | [ACCOUNT.md §9](./ACCOUNT.md#9-feedback-feedbacksectiontsx) |
| `SubscriptionsSection.tsx` | 7 toggles → `updateSubscriptions()`. | [ACCOUNT.md §10](./ACCOUNT.md#10-subscriptions-subscriptionssectiontsx) |
| `ReferSection.tsx` | Share-only (no backend). ⚠ **File exists but is NOT currently imported by `AccountPage`** — the refer-a-friend flow is dark code. Kept for future re-activation. | [ACCOUNT.md §11](./ACCOUNT.md#11-refer-a-friend-refersectiontsx) |
| `history/TrackingModal.tsx` | Static Royal Mail deep-link + copy-to-clipboard. | [ACCOUNT.md §6](./ACCOUNT.md#6-history-historysectiontsx) |
| `myData/PersonalInfoSection.tsx` | Profile edit → `updateProfileAction`. | [ACCOUNT.md §2](./ACCOUNT.md#2-my-data-mydatasectiontsx) |
| `myData/PasswordSection.tsx` | Local-only form (no server action). | [ACCOUNT.md §2](./ACCOUNT.md#2-my-data-mydatasectiontsx) |
| `myData/AddressesSection.tsx` | Address list + form → `updateAddressesAction`. | [ACCOUNT.md §2](./ACCOUNT.md#2-my-data-mydatasectiontsx) |
| `myData/SocialNetworksSection.tsx` | Google linking → `startGoogleOAuth('/account?googleLinked=1')` (browser redirects to Google; callback route runs `exchangeGoogleCodeAction`, which links the Google identity to the current user because `oe_access` is present). Mount effect reads `?googleLinked=1` to mark Google as linked. Apple/Facebook are visual stubs. | [ACCOUNT.md §2](./ACCOUNT.md#2-my-data-mydatasectiontsx) |
| `myData/ConsentSection.tsx` | 2 toggles → `updateConsentAction`. | [ACCOUNT.md §2](./ACCOUNT.md#2-my-data-mydatasectiontsx) |
| `myData/AccountDeletionSection.tsx` | Warning + confirm; calls `logout()` (no real delete). | [ACCOUNT.md §2](./ACCOUNT.md#2-my-data-mydatasectiontsx) |
| `service/ServiceRequestForm.tsx` | Inline form (item / category / description / date) → `submitServiceRequestAction`. Placeholder copy comes from `useFormPlaceholder('service_request', ...)` — resolves CMS placeholders with a Zod-schema fallback. Uses `useTransition` for the submit spinner. | [ACCOUNT.md §5](./ACCOUNT.md#5-service-maintenance-servicemaintenancesectiontsx) |
| `service/ServiceHowItWorks.tsx` | Static **4-step** explainer (`L.howSteps`) — Submit Request → Drop Off → We Get to Work → Collect. Grid renders `grid-cols-2 sm:grid-cols-4`. | — |

### 3.2 Cart — `pages/cart/`

| File | Role | Deep dive |
|---|---|---|
| `CartItemRow.tsx` | Single line item — image, brand + name, colour **name** rendered from hex via `hexToColorName()` (no swatch dot), `<SizeDropdown>` (receives an optional `availableSizes?: string[]` pass-through, supplied by `CartPage` from its `sizesById` map), `<QtyControl>`, selection checkbox (`isSelected` / `onToggleSelect`), wishlist heart toggle (`inWishlist` / `onToggleWishlist`), remove trash. 9 callback props total. | [CHECKOUT.md §11](./CHECKOUT.md#11-cart-page--promo--selection) |
| `CartBundleRow.tsx` | Bundle collapse row — one `QtyControl` for all bundle items, remove-bundle CTA. | [CART_WISHLIST.md §13](./CART_WISHLIST.md#13-bundles) |

### 3.3 Checkout — `pages/checkout/`

| File | Role | Deep dive |
|---|---|---|
| `GuestCheckoutModal.tsx` | Auth gate: Sign in / Register / Continue as Guest. | [CHECKOUT.md §2.1](./CHECKOUT.md#21-auth-gate) |
| `DeliveryMethodHome.tsx` (238 loc) | Address list + new-address form + delivery date + time slot. Placeholder copy from `useFormPlaceholder(...)` (OneEntry-managed). | [CHECKOUT.md §2](./CHECKOUT.md#2-delivery-step-deliverypagetsx) |
| `DeliveryMethodStore.tsx` | Pickup-store picker (`PICKUP_STORES`) + `<GuestContactForm>` when signed out. Reuses `<RadioCard>`. | [CHECKOUT.md §2.2](./CHECKOUT.md#22-delivery-methods) |
| `DeliveryMethodLocker.tsx` | Parcel-locker picker (`PARCEL_LOCKERS`) + `<GuestContactForm>` when signed out. | [CHECKOUT.md §2.2](./CHECKOUT.md#22-delivery-methods) |
| `DeliveryOrderSummary.tsx` | Right-rail summary: item rows, subtotal / promo entry (validated via OE `previewOrder`) / delivery perks / total. Props include `previewLoading` + `hasPreview` to render skeleton rows for discount + Total during the first preview; `couponError` shows the server-provided message. Copy via `useT()` from `CheckoutLabelsContext`. | [CHECKOUT.md §2.4](./CHECKOUT.md#24-coupons-7) |
| `PaymentMethodsList.tsx` | Renders `PaymentAccount[]` from `getPaymentAccountsAction`. Each account gets an `<OptionCard>` from `PaymentPage.parts`. | [CHECKOUT.md §3.1](./CHECKOUT.md#31-payment-accounts) |
| `GuestContactForm.tsx` | Guest contact fields (name / email / phone). Placeholder copy via `useFormPlaceholder(...)`. Exports `GuestContactFormState` type shared with the two guest-pickup Delivery methods. | [CHECKOUT.md §2.2](./CHECKOUT.md#22-delivery-methods) |
| `PaymentPage.parts.tsx` (243 loc) | Reusable payment UI parts. Exports: `PayMethod` (union type of accepted method identifiers), `OptionCard`, `CardForm` (via `forwardRef`), `CardFormHandle` (imperative `validate()` interface), `QRPanel`, `WalletButton`, `InstallmentPanel`. | [CHECKOUT.md §3](./CHECKOUT.md#3-payment-step-paymentpagetsx) |

### 3.4 Favorites — `pages/favorites/`

| File | Role | Deep dive |
|---|---|---|
| `FavoriteCard.tsx` | Item card in `/favorites`: color swatch, add-to-bag, remove, quick-view. | — |
| `FavoritesCarousel.tsx` | "Recently viewed" / "Trending" horizontal carousel below the wishlist grid. Props: `{title, products: CarouselProduct[]}`. Exports the `CarouselProduct` interface (`{id, name, brand?, price, salePrice?, image, colors}`) — a slimmer product shape than `Product`. | — |
| `FavoritesEmptyState.tsx` | Empty state with CTA to `/women/clothing`. | [CATALOG_FILTERS.md §15](./CATALOG_FILTERS.md#15-page-specific-behaviours) |

### 3.5 New Arrivals — `pages/new/`

| File | Role |
|---|---|
| `NewArrivalsHero.tsx` | Full-width hero with headline + subtext. |

### 3.6 Product — `pages/product/`

All PDP pieces are covered in [PRODUCT_DETAIL.md](./PRODUCT_DETAIL.md).

| File | Role |
|---|---|
| `useProductPageUIState.ts` | Centralised UI state hook (modals, hover, share dropdown, added-flash). |
| `ProductGallery.tsx` | Main gallery + thumbnails + hover zoom. |
| `FullscreenViewer.tsx` | Fullscreen image carousel. |
| `AccordionSection.tsx` | Collapsible section (Specs / Description / Delivery / Care). |
| `ProductSpecialOffers.tsx` | `bought_together` bundle block. |
| `ProductShareDropdown.tsx` | Copy link + social share links. |
| `ProductReviewsSection.tsx` | Average rating + histogram + review list wrapper. |
| `ReviewsAsync.tsx` | RSC that calls `loadProductReviews`. |
| `ReviewsClient.tsx` | Client-side pagination + Write Review trigger. |
| `ReviewsSkeleton.tsx` | Suspense fallback. |
| `ReviewCard.tsx` | Single review tile. |
| `StarRating.tsx` | 5-star SVG with half-star support. |
| `WriteReviewModal.tsx` | Review submit form → `submitForm('review_rating')` + `submitForm('review_feedback')`. |
| `ReserveInStoreModal.tsx` | Reserve form → `submitForm('reserve_in_store')`. |
| `SizeGuideModal.tsx` | Size-conversion table modal. |
| `RecommendationsCarousel.tsx` | Horizontal carousel wrapper for "You may also like". |
| `RecommendationsSkeleton.tsx` | Suspense fallback. |
| `FrequentlyOrderedAsync.tsx` | RSC that loads `pdp_you_may_also_like` block + backfill. |
| `FrequentlyOrderedClient.tsx` | Client wrapper around the carousel. |
| `RecentlyViewedSection.tsx` | Receives `{products: Product[], accentColor}` from the parent PDP and renders up to N tiles when scrolled into view (IntersectionObserver). **Does not itself dispatch or push** — the PDP dispatches `recentlyViewedActions.addProduct` on mount and calls `pushRecentlyViewedAction(numeric)` when `isLoggedIn`. |

### 3.7 Sale — `pages/sale/`

| File | Role | Deep dive |
|---|---|---|
| `SaleHero.tsx` | Hero block + countdown (renders `CountdownUnit`). Props: `{countdown, endsAt?}` — `endsAt` (epoch ms) drives the "Ends {date}" caption formatted via `Intl.DateTimeFormat('en-US')`. Copy via `useSalePageT()`. | — |
| `SaleCountdown.tsx` | `useCountdown(target)` hook + `CountdownUnit` sub-component. Ticks every second. | [CATALOG_FILTERS.md §15](./CATALOG_FILTERS.md#15-page-specific-behaviours) |
| `SaleFilterDropdowns.tsx` | Exports two generic pill dropdown components: `PillDropdown` (label + options + `selected` set + `onToggle` + `onClear`) and `ColorPillDropdown` (colour swatch grid variant). Composed on `/sale` into the category / discount / colour / sort filter row. | — |

### 3.8 Stores — `pages/stores/`

| File | Role |
|---|---|
| `StoreCard.tsx` (239 loc) | Store card: photo, name, city, "Flagship" / "New" badges + click opens a **detail modal** with full address, phone, email, opening hours, service pills, and a Google Maps deep-link. Modal locks body scroll + Escape close. Consumed by `StoreLocationsPage`. JSON-LD (`ClothingStore` per store) is emitted separately by `app/stores/page.tsx`. |

---

## 4. Coverage matrix

Every file in `src/app/{components,pages}` has a line above. If a new component lands, add a row here in the same PR — otherwise this registry drifts.

- **Global components (`src/app/components/*.tsx`)** — 48/48 covered.
- **Figma primitives (`src/app/components/figma/*.tsx`)** — 1/1 covered.
- **Page components (`src/app/pages/*.tsx`)** — 22/22 covered.
- **Page sub-components (`src/app/pages/*/**.tsx`)** — 59/59 covered. Breakdown: account 21 (11 sections + `LoyaltyCard` + `shared.tsx` + `history/` 1 + `myData/` 6 + `service/` 2), cart 2, checkout 8, favorites 3, new 1, product 20 (19 components + 1 hook module `useProductPageUIState.ts`), sale 3, stores 1.

---

## 5. Cross-references

- [ARCHITECTURE.md](./ARCHITECTURE.md) — how components are wired into the shell
- [REDUX.md](./REDUX.md) — the store slices that these components read/write
- [ONEENTRY_INTEGRATION.md](./ONEENTRY_INTEGRATION.md) — the Server Actions and loaders they invoke
- [PRODUCT_DETAIL.md](./PRODUCT_DETAIL.md), [ACCOUNT.md](./ACCOUNT.md), [CHECKOUT.md](./CHECKOUT.md), [CART_WISHLIST.md](./CART_WISHLIST.md), [CATALOG_FILTERS.md](./CATALOG_FILTERS.md) — deep dives for the feature areas
