# Datasets

Static TypeScript files in `src/app/data/`. Historically these were the primary data source; today the storefront is fully wired to OneEntry (see [ONEENTRY_INTEGRATION.md](./ONEENTRY_INTEGRATION.md)), so most of these files have been slimmed down to labels, config, mock user shape, SEO metadata, and the page registry.

Grouped by purpose. Every entry lists file, exports, and which components/hooks/loaders consume it.

## 1. Page routing

| File | Exports | Consumers |
|---|---|---|
| `pageRegistry.ts` | `PAGE_REGISTRY: Record<pathSlug, PageEntry>` | `app/[...slug]/page.tsx`, `app/sitemap.ts` |
| `infoPages.ts` | `INFO_PAGES` (title / description / keywords per info slug) | `InfoPage`, `generateMetadata` for `/[...slug]` |
| `pageRegistry.ts` also declares catalog entries with `catalogKey`, `pageMarker` (used to fetch content from OE) and SEO key. |

## 2. Product-side identity bridge

| File | Exports | Consumers |
|---|---|---|
| `cms-product-id-map.ts` | `CMS_PRODUCT_ID_MAP`, `getCmsProductId(playgroundId)`, `getPlaygroundProductId(cmsId)` | `CartContext`, `WishlistContext`, `track-activity`, checkout `createOrderAction` body builder |

Bridges the ~25 legacy playground SKUs (`wc-1`, `mc-3`, …) to numeric OneEntry product IDs. Kept transitional — as more code paths switch to integer IDs directly, this file shrinks.

## 3. User mock shape

| File | Exports | Consumers |
|---|---|---|
| `userData.ts` | `USER_DATASET` (profile / loyalty / addresses / subscriptions fixture) + type exports (`Gender`, `LoyaltyStatus`, `UserAddress`, `PaymentMethod` types), `MOCK_USER_DATA` | `userSlice` initial state, Storybook stories, `validateCredentials` legacy Server Action |

Real user data comes from `AuthContext.user` (populated by `getCurrentUserAction`). `USER_DATASET` remains as:

- The Redux `userSlice` initial state (loyalty defaults show something while `/me` is loading).
- The credentials source for the legacy `validateCredentials` fallback used only by Storybook and mocked E2E paths (see [AUTH.md](./AUTH.md) §12).

## 4. Checkout configuration

| File | Exports | Consumers |
|---|---|---|
| `checkoutConfig.ts` | `PICKUP_STORES`, `PARCEL_LOCKERS`, `DELIVERY_TIME_SLOTS`, `DELIVERY_PERKS`, `PICKUP_PERKS` | `DeliveryPage`, `PaymentPage`, `DeliveryOrderSummary`, `CartPage` |
| `paymentMethodsConfig.ts` | `PAYMENT_METHODS_COPY` (stylistic UI copy per method identifier) | `PaymentMethodsList` (as fallback labels; real accounts come from OE `getPaymentAccountsAction`) |
| `currencyConfig.ts` | `CURRENCY = {code:'USD', symbol:'$', fmt, stripTrailingZeros}` frozen object, plus re-exports `fmt`, `stripTrailingZeros` | Every price render (`ProductCard`, `MiniCart`, `CartPage`, `PaymentPage`, `ConfirmationPage`, `PriceRangeSlider.CURRENCY.formatInteger` etc.) |

Pickup stores/lockers are still local; a future refactor may pull them from OneEntry. All coupon validation — on both the Delivery step and the `/cart` promo entry — now goes through OE via `previewOrderAction` (see [CHECKOUT.md §2.4](./CHECKOUT.md#24-coupons-7)); no client-side mock remains.

## 5. Header, footer, navigation

| File | Exports | Consumers |
|---|---|---|
| `headerConfig.ts` | Regions, languages, support phone, logo alt, gender nav hrefs | `Header`, `HeaderTopBar` |
| `footerConfig.ts` | Footer link groups (About / Service / Help / Customer support) | `Footer` |
| `categories.ts` | `MEGA_DATA` (women/men taxonomy fallback used only if OE menu load fails) | `HeaderMegaMenu` (fallback path) |

`categories.ts` is a **fallback** — primary source is the OneEntry `Menus` API via `src/lib/oneentry/menus/`.

## 6. Homepage / catalog metadata

| File | Exports | Consumers |
|---|---|---|
| `sectionTitles.ts` | Eyebrow / title / subtitle / view-all config for homepage carousels | `HomePage` sections |
| `trendBlocks.ts` | Trend category blocks per catalog (suede bags, evening bags, animal prints, XXL…) | `CatalogTrendBlocks` |
| `promoBlocks.ts` | Promotional heroes (Best Dress for You, Discover New Style…) | `PromoBlock`, `HomePage` |
| `newArrivalsConfig.ts` | New Arrivals sort options + category filters | `NewArrivalsPage`, `NewArrivalsHero` |
| `saleConfig.ts` | Sale end date + category filters | `SalePage`, `SaleHero`, `SaleCountdown` |
| `sizeGuide.ts` | Women's clothing size chart | `SizeGuideModal`, `QuickViewSizeGuide` |

Most homepage content is fetched from OneEntry Blocks (see [ONEENTRY_INTEGRATION.md](./ONEENTRY_INTEGRATION.md) §5.1) — these files carry static layout / labels / config that is not (yet) CMS-driven.

## 7. Product page & catalog data

| File | Exports | Consumers |
|---|---|---|
| `productCatalog.ts` | `Product` and PDP-specific interfaces (`CatalogProduct`, `SizeOption`, `ProductSpec`, `ProductReview`) — type-only for the transitional period | Storybook, tests, occasional fallback where OE data is missing |
| `specialOffers.ts` | Bundle / offer interface types (data deprecated) | `ProductSpecialOffers` (types only) |
| `serviceData.ts` | Service maintenance offerings | `ServiceMaintenanceSection` fallback |

The concrete product arrays that lived in this folder (`women-clothing.ts`, `men-shoes.ts`, etc.) have all been removed — catalog listings now come from OneEntry Products API.

## 8. Labels (UI copy — many CMS-mirrored)

Local label constants used as fallbacks when the corresponding OneEntry label context is missing (e.g. Storybook stories, or during the SSR/CSR bridge on cold start).

| File | Domain |
|---|---|
| `commonLabels.ts` | Shared widgets (price range, qty control, carousel, mini-cart aria) |
| `cartLabels.ts` | Mini-cart + cart page |
| `favoritesLabels.ts` | Favourites page |
| `accountLabels.ts` | Account sections (profile, addresses, orders, loyalty, security, preferences) |
| `authLabels.ts` | Sign-in + registration |
| `productPageLabels.ts` | Product detail + quick-view |
| `catalogPageLabels.ts` | Catalog / filter UI |
| `catalogFilterLabels.ts` | Filter section / group / chip labels |
| `checkoutLabels.ts` | Checkout copy |
| `infoPageLabels.ts` | Info page section copy |
| `errorPageLabels.ts` | 404 / 500 / offline |
| `notFoundLabels.ts` | 404 page |
| `offlinePageLabels.ts` | Offline SW state |
| `confirmationLabels.ts` | Order confirmation |
| `newArrivalsLabels.ts` | New Arrivals |
| `salePageLabels.ts` | Sale page (categories / discounts / colors / sort) |
| `storesLabels.ts` | Store locator |
| `llmsTextLabels.ts` | Content for `/llms.txt` |
| `validationMessages.ts` | Form validation error messages |
| `filterSystemDownloadLabels.ts` | Filter download / export UI |

Primary source of these labels is the OneEntry AttributesSets → the 12 label loaders under `src/lib/oneentry/labels/**` (see [ONEENTRY_INTEGRATION.md](./ONEENTRY_INTEGRATION.md) §5.4).

## 9. SEO & metadata

| File | Exports | Consumers |
|---|---|---|
| `seoData.ts` | `SITE`, `SEO` metadata per route, `PRODUCT_DEFAULTS` (aggregate rating / offer / shipping), `DEFAULT_SPECS`, `DEFAULT_REVIEWS`, `OFFER_CATALOG_ITEMS` | `layout.tsx`, `app/**/page.tsx` metadata exports, JSON-LD renderers |
| `infoPages.ts` | Info page metadata (title / description / keywords) | Info page `generateMetadata` |

`seoData.ts` still contains the JSON-LD source of truth — currency (`GBP`), shipping thresholds (`£50+ free`), return window (`28 days`), delivery range (`2-5 days UK`), Twitter handle (`@KekimoroFashion`). See [SEO_OPTIMIZATION.md](./SEO_OPTIMIZATION.md).

## 10. Content

| File | Exports | Consumers |
|---|---|---|
| `faqData.ts` | FAQ Q&A array | `FAQ` info page (fallback) |
| `stores.ts` | `Store` type + `DEFAULT_STORE_SCHEMA` (LocalBusiness JSON-LD) + mock store list | `StoreLocationsPage` (mock fallback), `stores.ts` OneEntry loader (adapts to same shape) |
| `filterSystemMarkdown.ts` | Markdown content for filter-system whitepaper | `FilterSystemDownloadPage` |

FAQ and stores are primarily served from OneEntry now — these files are fallback + schema helpers.

## 11. Removed files

Compared to earlier versions of this doc, the following files no longer exist (data now comes from OneEntry):

- `women-clothing.ts`, `women-shoes.ts`, `women-bags.ts`, `women-accessories.ts`
- `men-clothing.ts`, `men-shoes.ts`, `men-bags.ts`, `men-accessories.ts`
- `heroSlides.ts`, `homepageBlocks.ts`
- `bestSellers.ts`, `homepageNewArrivals.ts`, `homepageSaleProducts.ts`
- `salePageProducts.ts`, `newArrivalsPageProducts.ts`
- `recommended.ts`, `discountBanner.ts`, `shopCategories.ts`, `categoryFilterChips.ts`

If a component still imports from one of these paths, that's an unfinished migration — the correct target is the corresponding loader in `src/lib/oneentry/`.

## 12. Migration status matrix

| Domain | Source of truth | Notes |
|---|---|---|
| Hero slides | OE Blocks (`hero_slider`) | ✅ live |
| Homepage collections | OE Blocks (`homepage_collections`) | ✅ live |
| Discount banner | OE Blocks (`discount_banner`) | ✅ live |
| Category section | OE Blocks (`category_section`) | ✅ live |
| Homepage product carousels | OE Blocks (`best_sellers` etc.) | ✅ live |
| Catalog product lists | OE `Products.getAll` / `vector/search` | ✅ live |
| Filter option values | Static config for now; OE facet endpoint pending | ⚠ partial |
| Seasonal trend landings | OE Pages attributes `st_type-of-trends` + `st_trends` via `seasonal-trend.ts` | ✅ live |
| Sort options | Local config → passed as `sortKey` to OE | ✅ live |
| Product detail | OE `Products.getProductById` + form-data reviews | ✅ live |
| Info pages | Local static (`INFO_PAGE_LABELS` in `data/infoPageLabels.ts`) — `loadPageByUrl` exists in SDK layer but is dead code | ⚠ static |
| Header / footer menus | OE `Menus.getMenusByMarker` | ✅ live (categories.ts is fallback) |
| Header / footer branding config | `headerConfig.ts` / `footerConfig.ts` | ❌ static |
| Auth / session | OE `AuthProvider` + cookies | ✅ live |
| Cart / wishlist per user | OE user state + `syncCart` / `syncWishlist` | ✅ live |
| Payment accounts | OE `Payments.getAccounts` | ✅ live |
| Order creation | OE `orders-storage/marker/{marker}/orders` | ✅ live |
| Reviews | OE form-data (`review_feedback` + `review_rating`) | ✅ live |
| Service requests | OE form-data (`service_request`) | ✅ live |
| Waiting list | OE wishlist + product stock inference | ✅ live |
| Stores locator | OE Pages child pages | ✅ live |
| Labels (product-card, checkout, PDP, sign-in, etc.) | OE AttributesSets — 12 sets | ✅ live |
| System text (eyebrows, section headings) | OE `getAttributeSetByMarker` (`system-text.ts`) | ✅ live |
| Sign-up form schema | OE AttributesSet `users_sign_in_sign_up` | ✅ live |
| Locale-aware content | Single-locale (`en_US`); every fetcher accepts `lang` | ⚠ single locale for now |
| Analytics tracking | OE `user-activity/track` | ✅ live |
| Coupons (checkout Delivery step) | OE `previewOrder` — server-validated + priced | ✅ live |
| Coupons (`/cart` promo entry) | OE `previewOrder` via `CartContext.applyCoupon` | ✅ live |
| Pickup stores + parcel lockers | Local `checkoutConfig.ts` | ❌ static |

## 13. Cross-references

- [ONEENTRY_INTEGRATION.md](./ONEENTRY_INTEGRATION.md) — where each dataset moved to on the CMS side
- [REDUX.md](./REDUX.md) §2.6 — `userSlice` still uses `USER_DATASET` as initial state
- [CHECKOUT.md](./CHECKOUT.md) — how checkout config is consumed
- [CATALOG_FILTERS.md](./CATALOG_FILTERS.md) — where filter/sort configs are read
- [SEO_OPTIMIZATION.md](./SEO_OPTIMIZATION.md) — how `seoData.ts` powers metadata and JSON-LD
