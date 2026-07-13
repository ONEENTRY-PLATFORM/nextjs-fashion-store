# Datasets

Static TypeScript files in `src/app/data/`. Historically these were the primary data source; today the storefront is fully wired to OneEntry (see [ONEENTRY_INTEGRATION.md](./ONEENTRY_INTEGRATION.md)), so most of these files have been slimmed down to labels, config, mock user shape, SEO metadata, and the page registry.

Grouped by purpose. Every entry lists file, exports, and which components/hooks/loaders consume it.

## 1. Page routing

| File | Exports | Consumers |
|---|---|---|
| `pageRegistry.ts` | `PAGE_REGISTRY: Record<pathSlug, PageEntry>` | `app/[...slug]/page.tsx`, `app/sitemap.ts` |
| `infoPages.ts` | `INFO_PAGES` (title / description / keywords per info slug) | `InfoPage`, `generateMetadata` for `/[...slug]` |
| `pageRegistry.ts` also declares catalog entries with `catalogKey`, `pageMarker` (used to fetch content from OE) and SEO key. |

## 2. Numeric id conversion helpers

| File | Exports | Consumers |
|---|---|---|
| `cms-product-id-map.ts` | `getCmsProductId(id: string): number | null`, `getPlaygroundProductId(cmsId: number): string | null` | `CartContext`, `WishlistContext`, `track-activity`, checkout `createOrderAction` body builder |

The static mapping table (`CMS_PRODUCT_ID_MAP` / `REVERSE_CMS_PRODUCT_ID_MAP`) has been removed. Both helpers now do pure string↔number conversion: `getCmsProductId` parses a decimal string to a number, and `getPlaygroundProductId` stringifies a finite number. All UI item ids are already OneEntry numeric ids stored as strings.

## 3. User mock shape

| File | Exports | Consumers |
|---|---|---|
| `userData.ts` | Type contracts only: `LoyaltyStatus`, `Gender`, `LoyaltyCard`, `UserAddress`, `UserOrder`, `WishlistItem`, `HistoryOrder`, `WaitingItem`, `UserDataset`, and related interfaces | `userSlice`, `AuthContext`, Storybook stories, page components |

The `USER_DATASET` fixture (Jane Smith mock profile), `USER_SLICE_MESSAGES`, and the `credentials` / `UserCredentials` fields have been **removed**. `userData.ts` is now a pure type-contract module — no runtime data.

Real user data comes exclusively from `AuthContext.user` (populated by `getCurrentUserAction`).

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
| `promoBlocks.ts` | `PromoItem` type only — `PROMO_ITEMS` array removed; live data comes from OneEntry `homepage-collections` via prop `initialItems` | `PromoBlock` (type reference) |
| `newArrivalsConfig.ts` | New Arrivals sort options + category filters | `NewArrivalsPage`, `NewArrivalsHero` |
| `saleConfig.ts` | Sale end date + category filters | `SalePage`, `SaleHero`, `SaleCountdown` |
| `sizeGuide.ts` | Women's clothing size chart | `SizeGuideModal`, `QuickViewSizeGuide` |

Most homepage content is fetched from OneEntry Blocks (see [ONEENTRY_INTEGRATION.md](./ONEENTRY_INTEGRATION.md) §5.1) — these files carry static layout / labels / config that is not (yet) CMS-driven.

## 7. Product page & catalog data

| File | Exports | Consumers |
|---|---|---|
| `productCatalog.ts` | `Product` and PDP-specific interfaces (`CatalogProduct`, `SizeOption`, `ProductSpec`, `ProductReview`, `PdpProductVariant`) — type-only for the transitional period | Storybook, tests, occasional fallback where OE data is missing |
| `specialOffers.ts` | Bundle / offer interface types (data deprecated) | `ProductSpecialOffers` (types only) |
| `serviceData.ts` | Types only — `SERVICE_REQUESTS` array removed; live data comes from OneEntry `FormData` API (form `service_request`) via `getServiceRequestsAction()` | `ServiceMaintenanceSection` (type reference) |

The concrete product arrays that lived in this folder (`women-clothing.ts`, `men-shoes.ts`, etc.) have all been removed — catalog listings now come from OneEntry Products API.

**`salePrice` field — now populated from OE Discounts.** `CatalogProduct` and `CatalogProductVariant` (in `src/lib/oneentry/catalog/products.ts`) and `PdpProductVariant` (in `productCatalog.ts`) all carry an optional `salePrice?: number`. Previously declared but never populated, this field is now set by a post-normalise pass in `fetchFullCatalog` and `loadProductById` via `applyProductDiscount` (`src/lib/oneentry/discounts/product-discount.ts`). The value represents the lowest active OE Discounts rule price for that product or variant. It is `undefined` when no rule applies. `adaptCatalogProductToUiProduct` forwards it as a formatted string (for catalog cards and Quick View); `adaptCatalogProductToPdpProduct` forwards the raw number (for the PDP price block). In both cases the field is only forwarded when strictly below `price` — the UI uses its presence to conditionally render a strike-through.

**`discountAttributes` field on `CatalogProduct`.** `CatalogProduct` carries a required `discountAttributes: Record<string, string>` field. `normalize()` populates it during catalog load by scanning every OE `attributeValues` entry whose marker starts with `discount_` (or equals `discount`) and whose stringified value is non-empty. Before storing, `normalize()` strips a trailing `%` (and surrounding whitespace) from the parsed value, so the map holds the semantic tier in numeric-string form (e.g. `"10"`, not `"10%"`) — matching the bare numeric string that OE Discounts rules use in their `ATTRIBUTE.value.value` condition. These attribute values are what gate `ATTRIBUTE`-kind OE discount conditions — for example, attributes `discount_12` and `discount_13` in the storefront tenant hold the per-product discount tier that selects which `off_N` rule applies.

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
| Product-level `salePrice` (storefront discount overlay) | OE Discounts module — `loadProductDiscounts` + `applyProductDiscount` in `src/lib/oneentry/discounts/product-discount.ts`; applied in `fetchFullCatalog` and `loadProductById` | ✅ live |
| Pickup stores + parcel lockers | Local `checkoutConfig.ts` | ❌ static |

## 13. Cross-references

- [ONEENTRY_INTEGRATION.md](./ONEENTRY_INTEGRATION.md) — where each dataset moved to on the CMS side
- [REDUX.md](./REDUX.md) §2.6 — `userSlice` shape and empty initial state
- [CHECKOUT.md](./CHECKOUT.md) — how checkout config is consumed
- [CATALOG_FILTERS.md](./CATALOG_FILTERS.md) — where filter/sort configs are read
- [SEO_OPTIMIZATION.md](./SEO_OPTIMIZATION.md) — how `seoData.ts` powers metadata and JSON-LD
