# Datasets

All files live in `src/app/data/`. Today data is shipped as TS constants; the target is to serve every section from the backend via RTK Query (endpoints are already wired in `store/api/`).

## Contents

1. [Catalog products](#1-catalog-products)
2. [Aggregated product datasets](#2-aggregated-product-datasets)
3. [Homepage content blocks](#3-homepage-content-blocks)
4. [Catalog config (filters, trends, recommendations)](#4-catalog-config)
5. [Sale page](#5-sale-page)
6. [New Arrivals page](#6-new-arrivals-page)
7. [Navigation & layout](#7-navigation--layout)
8. [SEO & metadata](#8-seo--metadata)
9. [Info pages & FAQ](#9-info-pages--faq)
10. [Utilities (not data)](#10-utilities-not-data)
11. [Checkout config](#11-checkout-config)
12. [Dynamic page registry](#12-dynamic-page-registry)
13. [User data](#13-user-data)
14. [Platform integration](#14-platform-integration)
15. [Migration status](#migration-status)

---

## 1. Catalog products

Eight category files, each exporting one constant of type `Product[]`. Reused via the `products.ts` barrel (`export * from './<category>'`).

| File | Export | Consumer | Hook |
|---|---|---|---|
| `women-clothing.ts` | `WOMEN_CLOTHING_PRODUCTS` | `WomenCatalogPage` | `useGetWomenClothingQuery()` ✅ |
| `men-clothing.ts` | `MEN_CLOTHING_PRODUCTS` | `MenCatalogPage` | `useGetMenClothingQuery()` ✅ |
| `women-bags.ts` | `WOMEN_BAGS_PRODUCTS` | `WomenBagsPage` | `useGetWomenBagsQuery()` ✅ |
| `men-bags.ts` | `MEN_BAGS_PRODUCTS` | `MenBagsPage` | `useGetMenBagsQuery()` ✅ |
| `women-shoes.ts` | `WOMEN_SHOES_PRODUCTS` | `WomenShoesPage` | `useGetWomenShoesQuery()` ✅ |
| `men-shoes.ts` | `MEN_SHOES_PRODUCTS` | `MenShoesPage` | `useGetMenShoesQuery()` ✅ |
| `women-accessories.ts` | `WOMEN_ACCESSORIES_PRODUCTS` | `WomenAccessoriesPage` | `useGetWomenAccessoriesQuery()` ✅ |
| `men-accessories.ts` | `MEN_ACCESSORIES_PRODUCTS` | `MenAccessoriesPage` | `useGetMenAccessoriesQuery()` ✅ |

All eight files are also consumed by `homepageProducts.ts` (aggregation), `productCatalog.ts` (`PRODUCT_CATALOG` lookup) and `recommended.ts` (`RECOMMENDED_CATALOG`).

`Product` shape (see `src/app/components/ProductCard.tsx`):

```ts
{ id, name, brand, price, salePrice?, image, label?, category?, colors?, sizes?,
  badge?, inStock?, specs?, reviews?, galleryImages?, colorImages?, colorStock?,
  specialOffersId?, recommendedId?, /* + many category-specific fields */ }
```

### `products.ts`

Barrel — re-exports every catalog with `export *`. Used by page components that need a whole catalog without naming a specific file.

---

## 2. Aggregated product datasets

### `homepageProducts.ts`

Aggregates the eight catalogs into `ALL_PRODUCTS` and slices them by `label`.

| Export | Logic | Hook |
|---|---|---|
| `BEST_SELLERS` | `label === 'BESTSELLER'`, max 12 | `useGetBestSellersQuery()` ✅ |
| `NEW_ARRIVALS` | `label === 'NEW'`, max 12 | `useGetHomepageNewArrivalsQuery()` ✅ |
| `SALE_PRODUCTS` | `label === 'SALE'`, max 12 | `useGetHomepageSaleProductsQuery()` ✅ |
| `NEW_ARRIVALS_PAGE_PRODUCTS` | All `label === 'NEW'`, tagged with `inferNewArrivalCategory(id)` | `useGetNewArrivalsPageProductsQuery()` ✅ |
| `SALE_PAGE_PRODUCTS` | All `label === 'SALE'`, tagged with `inferSaleCategory(id)` | `useGetSalePageProductsQuery()` ✅ |
| `FAVORITES_RECOMMENDED` | First 6 `label === 'NEW'` | ⚠ no endpoint — `FavoritesPage` imports directly |
| `FAVORITES_TRENDING` | First 6 `label === 'BESTSELLER'` | ⚠ no endpoint — `FavoritesPage` imports directly |

Consumers: `MenCollection` (BEST_SELLERS), `WomenCollection` (NEW_ARRIVALS), the `NewArrivals` component (SALE_PRODUCTS), `SalePage`, `NewArrivalsPage`, `FavoritesPage`.

### `productCatalog.ts`

Large lookup dictionary `PRODUCT_CATALOG: Record<string, CatalogProduct>` — flat map of every product by `id`.

| Export | Purpose |
|---|---|
| `PRODUCT_CATALOG` | Lookup by id for the PDP. |
| `hexToColorName()` | Helper: hex → color label. |
| `DEFAULT_GALLERY_IMAGES` | Fallback gallery. |
| `DEFAULT_COLOR_OPTIONS` | Fallback colors. |
| `DEFAULT_SIZE_OPTIONS` | Fallback sizes. |
| `DEFAULT_SPECS` | Fallback spec rows. |
| `DEFAULT_REVIEWS` | Fallback reviews. |

Consumers:
- `ProductDetailPage` — `PRODUCT_CATALOG[productId]`.
- `app/product/[id]/page.tsx` — `generateMetadata()`, `generateStaticParams()`, `DEFAULT_REVIEWS`, `DEFAULT_SPECS` (server route).
- The eight `app/*/page.tsx` catalog routes — `generateStaticParams()`.
- `app/sitemap.ts` — product URL generation.
- `app/llms.txt/route.ts` — AI product index.

> When the API lands, this becomes `getProductById(id)` inside `generateMetadata` and the page component.

---

## 3. Homepage content blocks

### `heroSlides.ts`

| Export | Type | Notes |
|---|---|---|
| `HERO_SLIDES` | `HeroSlide[]` | 3 hero slides. |
| `HeroSlide` | interface | `{ id, image, eyebrow, headline, subtext, cta, href, align, gender }` |

Consumer: `HeroSlider` → `useGetHeroSlidesQuery()` ✅

### `promoBlocks.ts`

| Export | Type | Notes |
|---|---|---|
| `PROMO_ITEMS` | `PromoItem[]` | 4 promo cards. |
| `PromoItem` | interface | `{ id, title, subtitle, image, cta, href }` |

Consumer: `PromoBlock` → `useGetPromoItemsQuery()` ✅

### `banners.ts`

| Export | Type | Notes |
|---|---|---|
| `DISCOUNT_BANNER` | `DiscountBannerData` | Single discount banner (70% off, bags). |
| `DiscountBannerData` | interface | `{ image, alt, badge, discountText, category, description, href, cta }` |

Consumer: `DiscountBanner` → `useGetDiscountBannerQuery()` ✅

### `sectionTitles.ts`

| Export | Notes |
|---|---|
| `SECTION_TITLES` | `Record<string, SectionTitle>` — keys: `bestSellers`, `newArrivals`, `sale`. |
| `SectionTitle` | `{ eyebrow?, title, subtitle?, viewAllHref }` |

Consumers: `MenCollection`, `WomenCollection`, `NewArrivals` — direct import ⚠ (no endpoint).

---

## 4. Catalog config

### `categories.ts`

| Export | Notes |
|---|---|
| `Gender` | `'women' \| 'men'` — used in `Header`. |
| `SubCat` | `'shoes' \| 'clothing' \| 'bags' \| 'accessories' \| null`. |
| `MEGA_DATA` | `Record<Gender, Record<string, { title; items: string[] }[]>>` — mega-menu structure. |
| `SUB_CATEGORIES` | `['Shoes', 'Clothing', 'Bags', 'Accessories', 'New', 'Sale']`. |
| `SHOP_CATEGORIES` | `ShopCategory[]` — 30 cards for the homepage Shop By Category block (6 per chip). |
| `CATEGORY_FILTER_CHIPS` | `['Outerwear', 'Tops', 'Bottoms', 'Sports', 'Lounge & Underwear']`. |

Consumers: `Header` (`MEGA_DATA`, `SUB_CATEGORIES`, direct import ⚠), `CategorySection` (`useGetShopCategoriesQuery()`, `useGetCategoryFilterChipsQuery()` ✅).

### `trendBlocks.ts`

| Export | Notes |
|---|---|
| `TREND_BLOCKS_CATALOG` | `Record<string, TrendBlock[]>` — keys: `women-bags`, `men-bags`, `women-shoes`, `men-shoes`, `women-accessories`, `men-accessories`. |
| `TrendBlock` | `{ label, image, tag? }` |

Endpoint `getTrendBlocks(catalogKey)` exists, but the six catalog pages still import directly ⚠.

### `recommended.ts`

| Export | Notes |
|---|---|
| `RECOMMENDED_CATALOG` | `Record<string, RecommendedBlock>` — 6 products per catalog. |
| `DEFAULT_RECOMMENDED_BLOCK` | Fallback (women-clothing). |
| `RecommendedBlock` | `{ id, products: Product[] }` |

Consumer: `ProductDetailPage` — `useGetRecommendedQuery(key, { skip: !key })` ✅.

### `specialOffers.ts`

| Export | Notes |
|---|---|
| `SPECIAL_OFFERS_CATALOG` | `Record<string, SpecialOffer[]>` — bundle offers per catalog. |
| `DEFAULT_SPECIAL_OFFERS` | Fallback (women-clothing). |
| `SpecialOffer` | `{ id, title, savings, bundlePrice, products: SpecialOfferItem[] }` |

Consumer: `ProductDetailPage` — `useGetSpecialOffersQuery(key, { skip: !key })` ✅.

---

## 5. Sale page

### `saleConfig.ts`

| Export | Notes |
|---|---|
| `SALE_END_DATE` | Unix timestamp (March 2026). |
| `SALE_CATEGORIES` | `readonly string[]` — `['All', "Women's Clothing", "Women's Shoes", "Men's Clothing", "Men's Shoes", 'Bags', 'Accessories']`. |
| `SaleCategory` | `(typeof SALE_CATEGORIES)[number]`. |
| `DISCOUNT_OPTIONS` | `string[]` — `['10% – 20%', '20% – 30%', '30% – 40%', '40% – 50%', '50% and more']`. |
| `SALE_SIZE_OPTIONS` | `string[]` — XS–XXL plus EU shoe sizes 36–42. |
| `SALE_COLOR_OPTIONS` | `{ label, color }[]` — 8 colors with hex. |
| `SALE_BRAND_OPTIONS` | `string[]` — 6 brands. |
| `SALE_SORT_OPTIONS` | `{ label, value }[]` — 5 sort options. |

Endpoint `getSaleConfig` exists; `SalePage` still imports directly ⚠.

---

## 6. New Arrivals page

### `newArrivalsConfig.ts`

| Export | Notes |
|---|---|
| `NEW_ARRIVALS_SORT_OPTIONS` | `{ label, value }[]` — 5 options. |
| `NEW_ARRIVALS_CATEGORIES` | `['All', 'Clothing', 'Shoes', 'Accessories']`. |
| `NewArrivalCategory` | `(typeof NEW_ARRIVALS_CATEGORIES)[number]`. |

Endpoint `getNewArrivalsConfig` exists; `NewArrivalsPage` still imports directly ⚠.

---

## 7. Navigation & layout

### `headerConfig.ts`

| Export | Notes |
|---|---|
| `HEADER_REGIONS`, `HEADER_LANGUAGES` | Region & language dropdown options. |
| `DEFAULT_REGION_LABEL`, `DEFAULT_LANGUAGE_LABEL` | Defaults. |
| `WOMEN_COLOR`, `MEN_COLOR` | Re-export of `ACCENT_WOMEN` / `ACCENT_MEN` from `constants/colors`. |
| `SUPPORT_PHONE` | `'+44 20 7946 0958'`. |
| `LOGO_ALT` | `'ONEENTRY FASHION'`. |
| `SEARCH_PLACEHOLDER`, `SEARCH_PLACEHOLDER_MOBILE` | Search placeholders. |
| `STORE_LOCATIONS_LABEL`, `STORE_LOCATIONS_HREF`, `ACCOUNT_HREF`, `WISHLIST_HREF` | Nav links. |
| `GENDER_NAV_HREFS` | `{ women: '/women/clothing', men: '/men/clothing' }`. |
| `MOBILE_FOOTER_LINKS` | 2 mobile-menu footer links. |
| `HEADER_ARIA_LABELS` | 8 aria labels (openMenu, closeMenu, toggleSearch, searchDesktop, searchMobile, account, wishlist, bag). |
| `MobileFooterLink` | `{ label, href, iconType: 'user' \| 'map-pin' }` |

Consumer: `Header` — direct import ⚠.

### `footerConfig.ts`

| Export | Notes |
|---|---|
| `FOOTER_LINKS` | `Record<string, FooterLink[]>` — 4 columns: About Company (9 links), Service (4), Help (6), Customer Support (4). |
| `PAYMENT_METHOD_NAMES` | 8 payment methods (Visa, Mastercard, Amex, Maestro, Apple Pay, Google Pay, PayPal, Klarna). |
| `SOCIAL_LINKS` | 5 socials (TikTok, Facebook, Instagram, YouTube, Pinterest). |
| `SUPPORT_ITEMS` | 4 support buttons (`iconKey, title, desc`). |
| `BOTTOM_LINKS` | 5 bottom links (Sitemap, Terms of Sale, Terms of Use, Privacy Policy, Promo Terms). |
| `COMPANY_INFO` | `{ description, phone, copyright }`. |

Consumer: `Footer` — direct import ⚠.

### `stores.ts`

| Export | Notes |
|---|---|
| `STORES` | `Store[]` — 6 stores (Oxford Street, Chelsea, Manchester, Birmingham, Edinburgh, Brighton). |
| `STORE_SCHEMA_DEFAULTS` | `{ currenciesAccepted, paymentAccepted, priceRange, addressCountry }` — defaults for the schema.org `LocalBusiness` node. |
| `Store` | `{ id, name, city, address, postcode, phone, email, instagram, hours: {day, time}[], services: string[], image, mapUrl, isflagship, tag? }` |

> Note: the field is `isflagship` (lowercase) in the codebase, not `isFlagship`.

Consumers:
- `StoreLocationsPage` — direct import ⚠ (endpoint `getStores` exists but is not wired).
- `app/stores/page.tsx` — JSON-LD schema.org markup (server route).
- `app/page.tsx` — flagship store JSON-LD on the homepage.
- `app/llms.txt/route.ts` — store list for the AI index.

### `sizeGuide.ts`

| Export | Notes |
|---|---|
| `SIZE_GUIDE_DATA` | `SizeRow[]` — 5 rows (XS–XL × US / bust / waist / hip). |

Consumer: `ProductDetailPage` (direct). Static, low migration priority.

---

## 8. SEO & metadata

### `seoData.ts`

| Export | Notes |
|---|---|
| `SEO` | `Record<string, Metadata>` — Next.js metadata per page. |
| `SITE_NAME`, `SITE_URL`, `SITE_DESCRIPTION` | Global site constants. |
| `OG_IMAGE` | Default OpenGraph image (`{ url, width, height, alt }`). |
| `TWITTER_HANDLE` | `'@ONEENTRYFashion'`. |
| `CURRENCY` | `'GBP'`. |
| `FREE_SHIPPING_THRESHOLD`, `RETURN_WINDOW_DAYS` | Shipping / returns thresholds. |
| `DELIVERY_COUNTRY` (`'GB'`), `DELIVERY_MIN_DAYS` (`2`), `DELIVERY_MAX_DAYS` (`5`) | Delivery range for schema.org. |
| `OFFER_CATALOGUE` | schema.org sections. |
| `ORG_SOCIALS` | Socials for structured data. |

Consumers: 28 Next.js server files — `app/layout.tsx`, every `app/*/page.tsx`, `app/not-found.tsx`, `app/opengraph-image.tsx`, `app/sitemap.ts`, `app/robots.ts`, `app/llms.txt/route.ts`.

> Server-side only — Redux does not apply. The API migration is to make `generateMetadata` async and `fetch('/api/seo/<key>')`.

---

## 9. Info pages & FAQ

### `infoPages.ts`

| Export | Notes |
|---|---|
| `INFO_PAGE_META` | `Record<string, { title, description, keywords }>` — 23 info pages. |
| `INFO_SLUGS` | `string[]` — all slug keys (`Object.keys(INFO_PAGE_META)`). |
| `InfoPageMeta` | `{ title, description, keywords }`. |

Consumers: `app/info/[slug]/page.tsx` (`generateMetadata` + `generateStaticParams`), `app/sitemap.ts`, `app/llms.txt/route.ts`.

### `faqData.ts`

| Export | Notes |
|---|---|
| `FAQ_ITEMS` | `FaqItem[]` — 10 Q/A pairs. |
| `FaqItem` | `{ question, answer }`. |

Consumer: `app/info/[slug]/page.tsx` — embedded into the JSON-LD `FAQPage` schema (server route, not a client component).

---

## 10. Utilities (not data)

### `filterUtils.ts`

Pure functions, no data.

| Export | Notes |
|---|---|
| `buildOptions(products, key)` | Counts occurrences and builds filter options. |
| `buildColorOptions(products)` | Builds the color filter list with hex codes. |
| `filterProducts(products, selectedFilters, filterGroups)` | Applies active filters to a product array. |
| `FilterOption` | `{ label, count, color? }`. |

Consumers: all eight catalog pages. The hex → color name mapping lives in `src/app/utils/colorNames.ts` (`HEX_COLOR_NAMES`).

---

## 11. Checkout config

### `checkoutConfig.ts`

| Export | Type | Notes |
|---|---|---|
| `CHECKOUT_COUPONS` | `Record<string, { label, pct }>` | `ONEENTRY10` (10%), `SAVE10` (10%), `ONEENTRY20` (20%), `SUMMER15` (15%), `WELCOME25` (25%). |
| `PICKUP_STORES` | `{ id, name, address, hours }[]` | 3 pick-up stores (Oxford Street, Covent Garden, Canary Wharf). |
| `PARCEL_LOCKERS` | `string[]` | 4 lockers (Paddington, Victoria, King's Cross, Waterloo). |
| `DELIVERY_TIME_SLOTS` | `{ id, label, sub }[]` | Morning / Afternoon / Evening. |
| `DELIVERY_PERKS` | `{ icon, text }[]` | 3 courier perks. |
| `PICKUP_PERKS` | `{ text }[]` | 3 pick-up perks. |

Consumer: the checkout page — direct import ⚠. API target: `GET /api/checkout/config`.

---

## 12. Dynamic page registry

### `pageRegistry.ts`

Single source of truth for the catch-all route.

| Export | Notes |
|---|---|
| `PAGE_REGISTRY` | `Record<string, PageEntry>` — keys: `'women/clothing'`, `'women/shoes'`, `'women/bags'`, `'women/accessories'`, `'men/clothing'`, `'men/shoes'`, `'men/bags'`, `'men/accessories'`, `'info'` + every info slug. |
| `CatalogPageEntry` | `{ type: 'catalog', catalogKey, seoKey, productIdPrefix, schemaName, breadcrumbs }`. |
| `InfoPageEntry` | `{ type: 'info', slug }`. |
| `PageEntry` | `CatalogPageEntry \| InfoPageEntry`. |
| `CATALOG_PATHS` | Catalog paths for sitemap + `generateStaticParams`. |
| `INFO_PATHS` | Info-page paths. |
| `buildPageMetadata(entry)` | Builds Next.js `Metadata` for the catch-all route. |
| `buildBreadcrumbSchema(breadcrumbs)` | Builds the JSON-LD `BreadcrumbList`. |

Consumers: `app/[...slug]/page.tsx`, `app/sitemap.ts`. Server-side — Redux does not apply.

---

## 13. User data

### `userData.ts`

Types and mock dataset used as the `initialState` of `userSlice`.

#### Types

| Type / interface | Description |
|---|---|
| `UserProfile` | `{ firstName, email, phone, dob, gender, shoeSize, clothingSize }` |
| `LoyaltyCard` | `{ cardNumber, status, discount, bonuses, totalPurchases, nextLevelAmount }` |
| `LoyaltyStatus` | `'Bronze' \| 'Silver' \| 'Gold' \| 'Platinum'` |
| `UserAddress` | `{ id, name, full, fullName, phone, line1, city, postcode, instructions? }` |
| `SocialConnection` | `{ id, name, connected }` |
| `BonusTransaction` | `{ date, desc, pts, sign: 1 \| -1 }` |
| `UserOrder` | `{ id, date, status, items, total, image, orderItems, trackingNo?, estimatedDelivery? }` |
| `UserOrderItem` | `{ name, size, color, qty, price, img }` |
| `HistoryOrder` | `{ id, orderNo, date, status, total, itemCount, trackingNo, items }` |
| `WaitingItem` | `{ id, name, brand, price, img, size, color, status, notify, addedDate }` |
| `WaitingStockStatus` | `'out_of_stock' \| 'low_stock' \| 'back_in_stock'` |
| `ReferralData` | `{ linkBase, creditAmount, stats, minPurchase, creditExpiryMonths }` |
| `UserSubscriptions` | `{ emailNewsletter, smsNotifications, pushNotifications, orderUpdates, newArrivals, saleAlerts, loyaltyUpdates }` |
| `UserCredentials` | `{ email, password }` — mock, do not ship to production. |
| `UserDataset` | Root type (see below). |

#### `UserDataset` shape

```ts
interface UserDataset {
  credentials:     UserCredentials
  profile:         UserProfile
  loyalty:         LoyaltyCard
  addresses:       UserAddress[]
  socials:         SocialConnection[]
  orders:          UserOrder[]
  bonusHistory:    BonusTransaction[]
  purchaseHistory: HistoryOrder[]
  wishlist:        WishlistItem[]   // distinct type from wishlistSlice.WishlistItem
  waitingList:     WaitingItem[]
  referral:        ReferralData
  subscriptions:   UserSubscriptions
  consent:         { dataProcessing: boolean; crossBorder: boolean }
  authToken?:      string | null    // JWT access token after Platform login
  refreshToken?:   string | null    // reserved for future refresh-on-401
  userIdentifier?: string | null    // Platform identifier of the logged-in user
}
```

#### Exports

| Export | Type | Notes |
|---|---|---|
| `USER_DATASET` | `UserDataset` | Full mock (Jane, `test@test.com` / `111`). |
| `MOCK_USER_DATA` | flat object | Profile + loyalty merged for `AuthContext` (`{ ...profile, ...loyalty }`). |

Consumers:
- `store/userSlice.ts` — `initialState = { data: USER_DATASET, status: 'idle', error: null }`.
- `context/AuthContext.tsx` — `MOCK_USER_DATA` as the logged-in `User`.
- Account pages via `useAppSelector(s => s.user.data)`.

> `UserDataset.wishlist` is a separate type from `wishlistSlice.WishlistItem`. Auth-token fields (`authToken`, `refreshToken`, `userIdentifier`) live on `user.data` but are **not** persisted to `localStorage`.

To switch to a real backend, replace the `fetchUserData` thunk body with `fetch('/api/user/me')`.

### `serviceData.ts`

Service-maintenance requests (account section).

| Type / interface | Description |
|---|---|
| `ServiceStatus` | `'open' \| 'in-progress' \| 'ready' \| 'completed' \| 'cancelled'` |
| `ServiceCategory` | `'alteration' \| 'repair' \| 'cleaning' \| 'restoration' \| 'other'` |
| `ServiceRequest` | `{ id, ref, category, item, description, droppedOff, estimatedReady, status, cost, notes, img }` |

| Export | Notes |
|---|---|
| `SERVICE_REQUESTS` | `ServiceRequest[]` — 4 requests with refs `SVC-00412`, `SVC-00389`, `SVC-00351`, `SVC-00298` (statuses: ready / in-progress / completed / open). |

Consumer: the Service Maintenance section in the account — direct import ⚠. API target: `GET /api/user/service-requests`.

---

## 14. Platform integration

### `cms-product-id-map.ts`

Manual mapping between playground product id (string, e.g. `'wc-1'`) and the corresponding Platform `products.id` (integer) in the local demo seed (`test_db_dataset_clean`). The playground catalog is fashion; the demo seed covers electronics / beauty / sports / food — categories do not overlap, so the mapping is artificial and exists only so QA can exercise cart/wishlist sync against a real backend.

| Export | Type | Notes |
|---|---|---|
| `CMS_PRODUCT_ID_MAP` | `Readonly<Record<string, number>>` | 25 pairs: `playgroundId → cmsProductId`. |
| `REVERSE_CMS_PRODUCT_ID_MAP` | `Readonly<Record<number, string>>` | Reverse map (frozen). |
| `getCmsProductId(playgroundId)` | `string → number \| null` | `null` ⇒ local-only product, skip the API. |
| `getPlaygroundProductId(cmsId)` | `number → string \| null` | `null` ⇒ Platform product the playground does not know about. |

When the Platform DB seed changes, re-run the lookup query documented at the top of the file and refresh the constants. The file goes away once the playground talks to a real catalog API.

See `./DEMO_LOGIN.md` for how to bootstrap demo accounts so wishlist/cart sync works against the local Platform instance.

---

## Migration status

| File | RTK Query endpoint | Status |
|---|---|---|
| `women-clothing.ts` … `men-accessories.ts` (8 files) | `productsApi.get<Category>` | ✅ wired |
| `homepageProducts.ts` (BEST_SELLERS / NEW_ARRIVALS / SALE_PRODUCTS) | `getBestSellers` / `getHomepageNewArrivals` / `getHomepageSaleProducts` | ✅ wired |
| `homepageProducts.ts` (SALE_PAGE / NEW_ARRIVALS_PAGE) | `getSalePageProducts` / `getNewArrivalsPageProducts` | ✅ wired |
| `homepageProducts.ts` (FAVORITES_*) | — | ⚠ `FavoritesPage` direct import |
| `heroSlides.ts` | `getHeroSlides` | ✅ wired |
| `promoBlocks.ts` | `getPromoItems` | ✅ wired |
| `banners.ts` | `getDiscountBanner` | ✅ wired |
| `categories.ts` (SHOP_CATEGORIES / CHIPS) | `getShopCategories` / `getCategoryFilterChips` | ✅ wired |
| `categories.ts` (MEGA_DATA / SUB_CATEGORIES) | — | ⚠ `Header` direct import |
| `trendBlocks.ts` | `getTrendBlocks` | ⚠ endpoint exists, pages not wired |
| `recommended.ts` | `getRecommended` | ✅ wired |
| `specialOffers.ts` | `getSpecialOffers` | ✅ wired |
| `saleConfig.ts` | `getSaleConfig` | ⚠ endpoint exists, `SalePage` direct import |
| `newArrivalsConfig.ts` | `getNewArrivalsConfig` | ⚠ endpoint exists, `NewArrivalsPage` direct import |
| `stores.ts` | `getStores` | ⚠ endpoint exists, `StoreLocationsPage` direct import |
| `sectionTitles.ts` | — | ⚠ 3 components direct import |
| `headerConfig.ts` | — | ⚠ `Header` direct import |
| `footerConfig.ts` | — | ⚠ `Footer` direct import |
| `productCatalog.ts` | — | ⚠ `ProductDetailPage` direct import |
| `seoData.ts` | — | ⚠ server route files (Redux N/A) |
| `sizeGuide.ts` | — | ⚠ `ProductDetailPage` direct import |
| `infoPages.ts` | — | ⚠ server route files (Redux N/A) |
| `faqData.ts` | — | ⚠ `app/info/[slug]/page.tsx` JSON-LD (server route) |
| `filterUtils.ts` | — | ✅ pure utility, no migration needed |
| `checkoutConfig.ts` | — | ⚠ `CheckoutPage` direct import |
| `pageRegistry.ts` | — | ⚠ catch-all route (Redux N/A) |
| `userData.ts` | — | ⚠ `userSlice` initial state, `fetchUserData` thunk not wired |
| `serviceData.ts` | — | ⚠ Service Maintenance direct import |
| `cms-product-id-map.ts` | — | ⚠ temporary playground ↔ Platform id bridge for cart/wishlist sync |
