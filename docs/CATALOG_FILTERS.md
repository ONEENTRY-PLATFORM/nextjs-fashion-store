# Catalog & Filters

> Reference for the catalog list, filter engine, sort options, price buckets, URL sync, and PDP variant selection. Audience: LLM agents that need to understand how a `/women/clothing`-style page is composed from OneEntry data + Redux UI state.

---

## 1. Overview

A catalog page composes three inputs:

1. **Server-fetched product list** — `loadProducts({pageUrl, lang, filters, sort, page})` in `src/lib/oneentry/catalog/products.ts`.
2. **Client filter / sort / view state** — `state.catalog[catalogKey]` in Redux (`catalogSlice`).
3. **URL query params** — one-way read on mount + on browser back/forward. Filter toggles do NOT push to history (this is a deliberate choice to keep the URL clean).

```
URL (?category=&chip=&sort=)
    │
    ▼  read on mount
catalogSlice.selectedFilters / sortBy / activeChip / currentPage
    │
    ▼  passed to
loadProducts({ pageUrl, lang, filters, sort, page })  ── SDK call ─►  OneEntry Products API
    │                                                                       │
    ▼                                                                       ▼
CatalogTemplate ◄──────── UI rendering ◄──────── product list + facet counts
```

The `filters` object is translated into OneEntry attribute markers by `src/lib/oneentry/catalog/filters.ts`.

---

## 2. Catalog keys

Every catalog page has a `catalogKey` (used to segment Redux state). Values:

- `women-clothing`, `women-shoes`, `women-bags`, `women-accessories`
- `men-clothing`, `men-shoes`, `men-bags`, `men-accessories`
- `sale`, `new`

Each key maps to a page marker in `PAGE_REGISTRY` (`src/app/data/pageRegistry.ts`) — the same marker is passed to `loadProducts` as `pageUrl`, which drives OneEntry-side category scoping.

---

## 3. Product list fetch (`loadProducts`)

`src/lib/oneentry/catalog/products.ts`:

- Uses `POST /api/content/products/all` for plain listings.
- Uses `POST /api/content/products/vector/search` for semantic search (user-typed query).
- Uses `POST /api/content/products/quick/search` for prefix / autocomplete search.

Body shape (built from URL filters):

```json
{
  "langCode": "en_US",
  "pageId": 42,
  "pageSize": 24,
  "pageNumber": 1,
  "sortKey": "date_created_desc",
  "conditions": [
    { "marker": "color_9", "conditionValue": [{"value": "#FFC0CB"}, {"value": "#000000"}], "conditionMarker": "in" },
    { "marker": "brand_7", "conditionValue": [{"value": "ONEENTRY"}], "conditionMarker": "in" },
    { "marker": "price_14", "conditionMarker": "between", "conditionValue": [{"value": 50}, {"value": 100}] }
  ]
}
```

Response is normalised through `catalog/adapt.ts` into the storefront `Product` shape (id / name / brand / colors / sizes / gallery / price / originalPrice / badges / stock / description / specs / careInstructions).

**Real transport.** The codebase does not hand-craft the `POST /api/content/products/all` body — it goes through the OE SDK (`getApi().Products.getProducts(filter, lang, userQuery)`). The SDK translates the filter array into the endpoint call. `userQuery` carries `{ offset, limit, sortKey, sortOrder }`; there is no `pageNumber` field on the wire — the pagination is `offset = (page-1) * limit` client-side. `langCode` comes from the SDK's `lang` argument.

**Caching stack (three layers).**

| Layer | Where | Scope | TTL / invalidation |
|---|---|---|---|
| React `cache()` | `loadProducts`, `loadFullCatalog`, `loadProductById`, `loadProductsByIds`, `searchProducts` implicit via `loadFullCatalog` | Single HTTP request | Cleared per request |
| Process-wide `Map<Lang, {at, value}>` | `fullCatalogCache` in `products.ts` | Node process | 5 min (`FULL_CATALOG_TTL_MS`) — deduped by an `fullCatalogInflight` promise map |
| Next.js `unstable_cache` | `cachedProductList` (SDK-backed list fetch) | ISR-persistent | `REVALIDATE_CATALOG` (`src/lib/isr.ts`), tag `oe-products` |

Notably, the **full catalog dump** (`fetchFullCatalog`, limit=2000, ~30 MB payload) deliberately **bypasses `unstable_cache`** because Next.js rejects individual entries larger than 2 MB with "items over 2MB can not be cached". The in-memory `fullCatalogCache` is the only cross-request memoisation for that path.

---

## 4. Filter marker mapping

`src/lib/oneentry/catalog/filters.ts`. Client URL parameters map 1:1 to OneEntry attribute markers:

| URL param | OE marker | Notes |
|---|---|---|
| `color` | `color_9` | Hex codes, multi-select |
| `size` | `size_10` | String values, multi-select |
| `brand` | `brand_7` | String, multi-select |
| `style` | `style_3` | String |
| `material` | `material_15` | String |
| `season` | `season_19` | String |
| `fit` | `fitrise_4` | String |
| `lining` | `lining_16` | String |
| `country` | `country_20` | String |
| `label` | `lable_23` | String (note typo in marker) |
| `details` | `details_5` | String |
| `care` | `careinstructions_18` | String |
| `insulation` | `insulation_17` | String |
| `price` | `price_14` | Numeric range — see condition-marker table below |

Combination logic:

- **Within a group (multi-select)** — OR (`conditionMarker: "in"`, comma-joined `conditionValue`).
- **Across groups** — AND (one filter record per group).

The mapping is intentionally marker-neutral in the URL — the OE marker is not exposed to the user or bookmarkable URLs.

### 4a. OE `conditionMarker` set (as emitted by `buildOEFilterBody`)

The OE `Products.getProducts` filter DSL used by this codebase supports six condition markers. Reference:

| Marker | Meaning | Where used |
|---|---|---|
| `mth` | more than (strict `>`) | `minPrice` → `mth (minPrice - 0.01)` so the user-typed boundary is inclusive; also used as a catch-all `price mth -1` record when the only condition is `inStockOnly` (OE requires ≥1 filter record even for status-only queries) |
| `lth` | less than (strict `<`) | `maxPrice` → `lth (maxPrice + 0.01)` |
| `in` | value in set | Every list attribute (`color_9`, `size_10`, `brand_7`, …) — CSV-joined values |
| `eq` | equal | Reserved (not currently emitted) |
| `nin` | not in | Reserved (not currently emitted) |
| `lke` | LIKE / substring | Reserved (not currently emitted) |

`statusMarker` (`in_stock`) is attached per-record when `inStockOnly` is on — OE applies it query-wide even though it lives on a record. There is no OE-native `between` marker; the price range is implemented as **two records** (`mth` + `lth`) which OE AND-combines.

### 4b. Attribute suffixes vary per attribute set

The OE tenant reuses the same canonical attribute *name* across attribute sets but assigns a **different numeric suffix per set** — e.g. clothing uses `color_9 / size_10 / brand_7`, whereas shoes use `color_8 / size_9 / brand_6`. The URL→marker table above hard-codes the clothing suffixes; the **normaliser** (`findAttr` in `products.ts`) sidesteps this by looking up attributes by *canonical prefix* (`color`, `size`, `brand`) so read paths work for every category. Write-path filtering (`buildOEFilterBody`) still targets clothing suffixes only — which is why `loadFilteredProducts` currently falls back to `matchesCatalogFilters` in-memory instead of pushing conditions to OE (see §17).

### Colour hex ↔ name

`src/app/utils/colorNames.ts` — `HEX_COLOR_NAMES` dictionary (~50 entries) plus `hexToColorName(hex)`. Used to render chip labels ("Pink" instead of `#FFC0CB`) in the filter drawer.

---

## 5. Sort options

Declared per-catalog in `src/app/data/salePageLabels.ts` / `newArrivalsConfig.ts` / catalog config sections. Standard set:

| UI label | `sortKey` sent to OE |
|---|---|
| Featured | `featured` (server-side default) |
| Newest First | `date_created_desc` |
| Price: Low to High | `price_asc` |
| Price: High to Low | `price_desc` |
| Popularity | `popularity` — falls back to featured on server side |
| Biggest Discount | `discount_desc` (sale catalog only) |

The catalog page picks the current `sortBy` from `state.catalog[catalogKey]` and passes it as `sortKey`. Sort selection resets `currentPage` to 1.

---

## 6. Price buckets

Preset ranges shown as quick-select chips in the filter drawer (`FILTER_GROUPS` config for each catalog):

```
Under £50
£50 – £100
£100 – £200
£200 – £500
Over £500
```

Each bucket is passed to OE as `between` with `[min, max]`. The `Over £500` bucket sends `[500, 99999]`.

Currency: prices are stored in the CMS as decimals under the `price_14` marker. Display currency is USD (`CURRENCY = 'USD'`) — see `src/app/data/currencyConfig.ts` and [I18N.md](./I18N.md) §6 for the USD-in-UI / GBP-in-JSON-LD divergence.

---

## 7. Pagination

Default page size 24. `currentPage` in Redux state. On page change, `loadProducts` is refetched with the new `pageNumber`. `<CatalogPagination>` renders "Page N of M" from the returned `total` count.

Guests can bookmark a page via the URL only if the `?page=N` param is preserved — but toggling filters resets to page 1 regardless.

---

## 8. Chip filters (quick pre-sets)

Above the main filter drawer, each catalog offers 5–7 quick chips (e.g. "Best Sellers", "Dresses", "Winter Outfits" for women's clothing). Selecting a chip sets `catalogSlice.activeChip` and translates to a category / tag filter on OE side (`?chip=Best+Sellers` in the URL).

Chip → filter mapping is defined in `src/lib/oneentry/catalog/filters.ts` (`CHIP_TO_CONDITIONS`) and in per-catalog CMS content when the chip corresponds to a taxonomy child page.

---

## 9. URL sync

- **On mount** — the catalog page reads `URL(?category=&chip=&color=&brand=…)` and calls `catalogActions.setFilters` / `setActiveChip` / `setSort` to seed Redux.
- **On filter toggle** — Redux updates only; the URL is not touched. This prevents an infinite history stack of every filter change.
- **On sort change** — same (Redux only).
- **On chip click** — `router.replace(...)` with the new `?chip=` param so the current view is bookmarkable.
- **On browser back/forward** — Redux re-syncs from URL on the resulting route mount.

Persistence outside URL: filter state is written to `localStorage['oe_store'].catalog[catalogKey]` on every dispatched action, so returning to a catalog restores the previous filters.

---

## 10. PDP variant selection

`ProductDetailPage.tsx` reads the URL for three optional params:

- `?color=` — selects the initial colour swatch. Accepts **hex** (`#FFC0CB`) or OE **colour name** (`Pink`); the matcher is case-insensitive and searches both `hex` and `name` on `dynamicColors[]`. Falls back to index `0` when no match.
- `?size=` — selects the initial size (`initSize`).
- `?gender=men|women` — used by `<Header>` to highlight the correct tab. PDP mount injects it via `router.replace` when the product has a determinate gender and the param is missing (deep links, search hits).

If `?color=` / `?size=` are missing:

- Default colour = index `0` of `dynamicColors[]`.
- Default size = `null` (user must pick before Add-to-Cart — see PRODUCT_DETAIL.md §4).

Colour + size UI is rendered **inline** by `ProductDetailPage` (no shared `<ColorSwatch>` component — that file is used elsewhere in the catalog). Per-colour gallery lookup order: `activeVariant.image` → `catalogProduct.colorImages?.[idx]` → parent `image`. Per-size availability is cross-checked against `variants[]` when a colour is selected (see PRODUCT_DETAIL.md §3.3). Out-of-stock swatches use `strikeColor(hex)` (from `src/app/utils/colorUtils.ts`) so a diagonal strike stays visible on any background.

**URL synchronisation** — `useEffect([selectedColor, selectedSize])` writes `?color=<hex>` / `?size=<label>` back into the URL via `window.history.replaceState` (no re-render, no scroll) so a full reload restores the exact variant.

Related-products carousel ("You may also like") is loaded via `loadFrequentlyOrderedBlock(marker, productId)` with backfill up the category tree — see PRODUCT_DETAIL.md §9.

---

## 10a. Seasonal Trends override

`src/lib/oneentry/catalog/seasonal-trend.ts` lets an OE page act as a trend landing that maps to an attribute filter instead of a category leaf. Two page attributes drive it:

- `st_type-of-trends` — either the literal `"category"` or an OE attribute marker/name (e.g. `Material`, `Style`, `material_15`).
- `st_trends` — the target value: a category `pageUrl` when the type is `category`, otherwise the attribute value (e.g. `Cotton`, `Rubber`).

Exports:

- `resolveSeasonalTrend(pageUrl)` → `{ kind: 'category', value } | { kind: 'attribute', field, value } | null`.
- `applySeasonalTrend(filters, trend)` — mutates a `CatalogFilters` object: `category` overrides `filters.category`; `attribute` appends `value` to the corresponding list filter (`materials`, `styles`, `brands`, `colors`, …) and **clears** `filters.category` so the trend's own `pageUrl` no longer narrows the grid.

`app/[...slug]/page.tsx` runs `resolveSeasonalTrend(filters.category)` right after `parseCatalogSearchParams`, before `loadFilteredProducts`. `src/lib/oneentry/catalog/pages.ts` was updated so the normaliser accepts both wrapped (`attributeValues.en_US`) and flat (`attributeValues`) attribute shapes.

**Category slug fallback (`matchesCatalogFilters` in `src/lib/oneentry/catalog/products.ts`).** When `filters.category` is set — whether via `?category=` or a SEASONAL TRENDS `st_trends="category"` override — the in-memory matcher tries both the raw value AND a slugified variant against each segment of `p.categories[]`. This lets a merchant put a display name like `"T-Shirts & Polos"` in `st_trends`: the matcher slugifies it (`& → space`, then `[^a-z0-9]+ → -`, trim) to `t-shirts-polos` and matches the slug stored on the product. Direct `pageUrl` needles (`men_polo_t-shirts`) still hit on raw match first.

Verified live: `women_knitwear` (Material=Cotton) → 14 products; `women_natural_rubber` (Material=Rubber) → 3 products; `/men/clothing?category=men_polo_t-shirts` → 3 Styles (all previously returned 0).

---

## 11. Empty state

If the OE call returns zero products for the current filter combination, `<NoFilterResults>` renders with a "Clear all filters" CTA that dispatches `catalogActions.clearFilters`.

---

## 12. Filter counts

The filter drawer previews option counts (e.g. "Color · 18 options"). Currently these are static per config (labelled with round numbers in the copy) — real counts require the OE facet-count endpoint. When that endpoint is wired, the counts become dynamic per current-filter selection.

---

## 13. What the filter engine does NOT do

- **No autocomplete search bar on the catalog page** — search is only in the header (`<HeaderSearch>` → `searchProductsAction`).
- **No dynamic facet counts** — see §12.
- **No filter history in URL** — see §9.
- **No cross-catalog "shop the look"** filter — bundle recommendations are handled by `<CatalogCrossSell>` block.

---

## 14. Files touched

| File | Role |
|---|---|
| `src/lib/oneentry/catalog/products.ts` | List / vector / quick search loaders |
| `src/lib/oneentry/catalog/filters.ts` | URL ↔ OE marker mapping, chip presets, sort keys |
| `src/lib/oneentry/catalog/adapt.ts` | `ProductEntity` → UI `Product` normaliser |
| `src/app/components/CatalogTemplate.tsx` | Main catalog engine (grid, filters, sort, pagination) |
| `src/app/components/CatalogTemplate.parts.tsx` | Filter drawer pieces, sort button, view mode toggle |
| `src/app/components/MobileFilterPanel.tsx` + `MobileFilterBody.tsx` | Mobile full-screen filter accordion |
| `src/app/components/CatalogMobileSort.tsx` | Mobile sort picker |
| `src/app/components/NoFilterResults.tsx` | Empty state |
| `src/app/components/ProductCard.tsx` | Grid card |
| `src/app/components/CatalogListProductCard.tsx` | List-view card variant |
| `src/app/store/catalogSlice.ts` | Filter/sort/page/chip state per `catalogKey` |
| `src/app/data/pageRegistry.ts` | catalogKey → pageMarker mapping |
| `src/app/utils/colorNames.ts` | Hex ↔ name |
| `src/lib/oneentry/catalog/seasonal-trend.ts` | `resolveSeasonalTrend` / `applySeasonalTrend` — OE page → attribute-filter override |
| `src/lib/oneentry/catalog/pages.ts` | Page-by-URL loader; normaliser now accepts wrapped + flat `attributeValues` |

---

## 15. Page-specific behaviours

Beyond the generic catalog engine, three routes carry extra business rules:

**`/sale` (`SalePage`)**

- Client-side countdown driven by `useCountdown(SALE_END_DATE)` in `src/app/pages/sale/SaleCountdown.tsx`. `SALE_END_DATE` is a hard-coded epoch ms constant in `src/app/data/saleConfig.ts` (currently `2026-03-15T23:59:59`). When the countdown expires it reads `00:00:00:00` — the page does NOT auto-hide the sale block.
- Category tabs (all / women's clothing / women's shoes / men's clothing / men's shoes / bags / accessories) come from `SALE_CATEGORY_FILTERS` in `saleConfig.ts`.
- Sort options include `discount_desc` (biggest discount) — unique to Sale.
- Countdown labels resolve via `SalePageLabelsContext` (`sale_page_top_banner_*`).

**`/new` (`NewArrivalsPage`)**

- Gender pill (all / women's / men's / kids) is a URL-synced filter (`?gender=`) that adds a category-scope condition to the OE query.
- Sort options in `newArrivalsConfig.ts` (`newest`, `price_asc/desc`, `popularity`, `brand`) — `newest` maps to OE `date_created_desc`.

**`/favorites` (`FavoritesPage`)**

- Reads `useWishlist()`: renders `<FavoriteCard>` per item; empty state = `<FavoritesEmptyState>` with a CTA to `/women/clothing`.
- Bulk actions: **Move All to Bag** (loops `useCart().addItem` for every in-stock item), **Clear All** (opens a confirm modal, calls `clearAll()` on confirm).
- Guarded by a `mounted` flag to skip SSR mismatch — persisted wishlist may differ from the empty SSR pass.

**`/` (`HomePage`)**

- Route shell (`app/page.tsx`) declares `export const revalidate = 300` as a hard-coded literal (Next.js requires a statically-analysable literal here; importing a computed value causes "Invalid segment configuration export detected"). The `ISR_HOME_TTL_SEC` env var tunes only the `unstable_cache` TTL inside the loaders. All underlying loaders use `unstable_cache` with the `REVALIDATE_HOME` constant from `src/lib/isr.ts`, so no `cache: 'no-store'` fetch is in play. It `Promise.all`-awaits **six** loaders in parallel: `loadHeroSlides()`, `loadHomepageCollections()`, `loadDiscountBanner()`, `loadCategorySection()`, `loadPageBlocksById(HOME_PAGE_ID)` (id = 1), and `loadStores()`. The stores load is only used to pick a `flagship` for the Organization JSON-LD `contactPoint` / `address`.
- Two JSON-LD blobs are emitted from the shell via `<JsonLd>`:
  - **Organization** (`ORG_SCHEMA_COPY.schemaType`) — name, logo, `sameAs`, `areaServed`, `priceRange`, `paymentAccepted`, `contactPoint` (phone from flagship), `address` (flagship street/city/postcode), `hasOfferCatalog` built from `OFFER_CATALOGUE`, and a `potentialAction` `BuyAction` pointing at `/women/clothing`.
  - **WebSite** — with a `SearchAction` whose `urlTemplate` is `${SITE_URL}/women/clothing?q={search_term_string}` (`query-input: required name=search_term_string`).
- Block ordering: `pageBlocks` returned from OE are re-sorted client-agnostic against the hard-coded `HOMEPAGE_MARKER_ORDER` list (`hero_slider`, `category_section`, `homepage_new_arrivals`, `promo_block`, `homepage_sale`, `homepage_best_sellers`, `discount_banner`). Unknown markers fall through untouched. This override is a temporary shim until the OE admin sequence matches design; markers `homepage_new_arrivals` / `homepage_best_sellers` map to the Women / Men carousels respectively.
- `HomePage.tsx` (client) is a data-driven `switch (block.marker)` mapper: `hero_slider → HeroSlider`, `category_section → CategorySection`, `promo_block → PromoBlock`, `discount_banner → DiscountBanner`, `men_collection` / `homepage_best_sellers → MenCollection`, `women_collection` / `homepage_new_arrivals → WomenCollection`, `new_arrivals` / `homepage_sale → NewArrivals`; any unrecognised marker with a non-empty `products` list falls back to `NewArrivals`, empty blocks render `null` and disappear from the layout.
- **`AnimatedSection`** (internal component, top of `HomePage.tsx`) wraps every block. It starts `visible = immediate`, mounts an `IntersectionObserver` (`threshold: 0.05`, `rootMargin: '0px 0px -40px 0px'`) that flips `visible = true` on first intersection, then disconnects. The transition class is `transition-[opacity,transform] duration-[650ms] ease-out`, moving `opacity-0 translate-y-7 → opacity-100 translate-y-0`. The hero passes `immediate` so it renders at full opacity on first paint. A `pageshow` listener force-reveals when `event.persisted` is true (bfcache safety net). **Note:** the current implementation does not read `sessionStorage['homepageAnimated']` in `AnimatedSection` — the key is still declared in `STORAGE_KEYS.HOMEPAGE_ANIMATED` (value `'homepageAnimated'`, `constants/timings.ts`) and is only consumed by `CategorySection` (see below).
- **`HeroSlider`** — 600 px fixed-height carousel driven by `initialSlides`. Auto-advance uses `TIMINGS.HERO_SLIDE_INTERVAL = 5000 ms`; the transition-reset timer uses `TIMINGS.HERO_SLIDE_TRANSITION = 600 ms`. Image cross-fade is a Tailwind `duration-700` opacity swap; the content overlay fades with `duration-[400ms]` while transitioning. Hover / focus pauses the interval (`onMouseEnter/Leave`, `onFocusCapture/BlurCapture`). Prev / next arrows + dot tablist with `aria-roledescription="carousel"`, `aria-roledescription="slide"`, `HERO_SLIDER_DYNAMIC_ARIA.slideDescriptionTpl(idx+1, total, headline)`. Directional gradient per slide `align` (left / right / center) and per-gender CTA background (`ACCENT_WOMEN` / `ACCENT_MEN`).
- **`CategorySection`** — filter-chip tab bar (chips from CMS) + 6-column responsive grid. `activeFilter` state defaults to the first chip; cards are filtered by `cat.chip === activeFilter`. Card entrance animation is a Tailwind keyframe `hp-fade-up 0.5s` with `animationDelay = CARD_BASE_DELAY (680 ms) + i * CARD_STAGGER (55 ms)` — the 680 ms base waits for the parent `AnimatedSection` fade to finish. On back-navigation the effect reads `sessionStorage.getItem('homepageAnimated') === '1'` and sets `animated = true`, which skips the per-card delay so the grid is visible immediately. Six skeleton tiles render pre-mount (`aspect-[2/3]`, `animate-pulse`) to keep the SSR / CSR grid identical.

**`/stores` (`StoreLocationsPage`)**

- ISR route: `app/stores/page.tsx` uses `export const revalidate = 3600` (hard-coded literal — all route-shell revalidate values must be literals). Shell awaits three loaders in parallel: `loadStoresSystemTexts()`, `loadStores()`, `loadStoreLocationsPage()`, wraps the page in `<StoresLabelsProvider>` and emits **one ClothingStore JSON-LD blob per store** via `buildStoreSchema`. Each schema includes `image`, `PostalAddress`, `telephone`, `email`, `openingHoursSpecification` (day labels mapped through `SCHEMA_DAYS` — `Mon–Sat` expands to six day entries), `hasMap`, `currenciesAccepted`, `paymentAccepted`, `priceRange` (defaults from `STORE_SCHEMA_DEFAULTS`).
- Filtering UI: search input matches `name` / `city` / `postcode` (case-insensitive), plus a city pill row built from `[L.cityAll, …unique(store.city)]`. Both narrow `filtered`; the count strip renders `${filtered.length} ${singular|plural}` (plural label from OE system text `store_location_found`).
- **`StoreCard`** — image (16 / 9) with `NEW`/`FLAGSHIP` badges, a fixed-height (`h-[200px]`) info panel (city eyebrow, name, address + postcode, phone `tel:` link, first `hours[0].time` line), and two CTAs: `Get Directions` (external `mapUrl` link) and `More info` (opens modal).
- **Store detail modal** (`modalOpen` state inside `StoreCard`): body-scroll lock via `document.body.style.overflow = 'hidden'` on open, restored on close. `Escape` key close is wired through a `useEffect` that adds a `keydown` listener while `modalOpen`. Backdrop click (`bg-black/55 backdrop-blur-[6px]`) also closes. Layout: left photo + right scrollable pane with sections **Location** (address, phone, email, instagram `@`), **Opening Hours** (all rows from `store.hours`), **Services** (pill chips from `store.services`), plus `Get Directions` / `Close` footer CTAs.
- Static below-grid content: `In-store services` strip (grid of `L.services` icon + label), optional `Flagship` callout (image + eyebrow / title / body / `Get Directions` + `Book Styling` CTAs — copy pulled from `cmsPage.flagshipCallout` with local fallbacks), and a bottom `Shop online` link (`L.shopOnlineHref → /women/clothing`). Empty state: `MapPin` icon + heading + `Clear filters` button that resets both search and city.

**`/[...slug]` info pages (`InfoPage`)**

- Content is **entirely static** — pulled from `INFO_PAGE_LABELS`, `INFO_PAGE_DEMO_NOTICE`, `INFO_PAGE_HERO`, `INFO_PAGE_CTA`, `INFO_PAGE_SECTIONS`, `INFO_PAGE_FEATURE_CARDS` in `data/infoPageLabels.ts`. No CMS loader is called from the InfoPage component itself (see ONEENTRY_INTEGRATION §5.2 — `loadPageByUrl` is retained as scaffolding).
- Layout: full-bleed **Hero** (Unsplash editorial image, dark overlay, breadcrumb `Home › Info`, H1, subtitle) → **OneEntry Demo Notice** beige bar (`Edit3` icon + strong / mid / strong / suffix run-on text + external `Explore OneEntry` link) → **Lead paragraph** → **Alternating text / image sections** (`SECTIONS.map`, image side flips per `imageRight` flag, eyebrow + rule + H2 + `body.split('\n\n')` paragraphs) → **dark Stats strip** (`IPL.stats` grid) → **Platform CTA** with 4 feature cards (`ICON_MAP: edit/layout/zap/globe`) and two outbound buttons (`ctaExplorePlatform`, `ctaSdkDocs`, both `target="_blank" rel="noopener noreferrer"`).

**`/not-found` (`NotFoundPage`)**

- Rendered by `app/not-found.tsx` → `<NotFoundPage />`. Static UI — no CMS loaders. Effect on mount: `window.scrollTo(0, 0)` to defeat scroll-restore when the browser lands on a missing route after a client-side navigation.
- Large decorative `404` (`aria-hidden`), eyebrow + H1 + divider + body copy, three CTA buttons (`Back to Home`, `Women`, `Men`) driven by `NOT_FOUND_LABELS`, and a `Trending Now` link row (`L.trendingLinks` array of `{label, href}`).

## 15a. `catalogKey → pageUrl` and `catalogKey → categoryPath`

Two adjacent helpers used by the `[...slug]` shell to bridge the storefront slug and the OE side of things:

- `catalogKeyToPageUrl(catalogKey)` in `src/lib/oneentry/catalog/products.ts` — maps `women-clothing` → `women_clothing`, `women-shoes` → `women_shoes`, `women-bags`, `women-accessories`, `men-clothing`, `men-shoes`, `men-bags`, `men-accessories`. Returns `null` for anything else (Sale / New / info pages). Consumers pass the result as OE's `pageUrl` marker when reading page-scoped configuration.
- `catalogKeyToCategoryPath(catalogKey)` in `src/lib/oneentry/catalog/adapt.ts` — maps the same eight catalog keys to the leading OE category path (`/women/women_clothing`, `/men/men_shoes`, …). Used by `[...slug]/page.tsx` to seed `loadFilteredProducts({ categoryPath })` — products whose `p.categories[]` don't start with this prefix are dropped in-memory *before* attribute filtering.

Sale / New / Favorites don't map through these — they compose category buckets via their own configs (`SALE_CATEGORY_FILTERS`, `newArrivalsConfig.ts`) and fetch products from OneEntry at runtime via `loadProducts` / `loadFilteredProducts`.

## 15b. `categoryPathToBreadcrumbs`

`src/lib/oneentry/catalog/products.ts`. Turns an OE category path like `/women/women_clothing/costumes` into a capitalised label chain `['Women', 'Clothing', 'Costumes']`:

- Splits on `/`, drops empty segments.
- Trims the redundant gender prefix (`women_`, `men_`) so `women_clothing` collapses to `Clothing`.
- Replaces `_` / `-` with spaces, title-cases every word.

Used by `ProductDetailPage.tsx` so each PDP renders the exact category chain the product actually lives in, rather than a hard-coded chain per catalogKey. Empty input returns `[]`.

## 15c. Product attribute normalisation — full field list

`normalize(raw, lang)` in `products.ts` walks `attributeValues` (both wrapped `{ en_US: {…} }` and flat shapes via `pickAttributes`) and produces a `CatalogProduct` with every field the storefront reads. `findAttr(attrs, prefixes)` handles both exact keys (`brand`) and suffixed variants (`brand_7`) so shoes / clothing / bags all normalise through one code path.

| Field | Attribute prefix(es) | Extractor | Notes |
|---|---|---|---|
| `id` | — | `raw.id` | Numeric OE id |
| `title` | `title`, `productname` | `stringValue` → falls back to `localizeInfos.title` | |
| `description` | `description`, `productdescription` | `stringValue` (plain text) | |
| `descriptionHtml` | `description`, `productdescription` | `richTextValue` (prefers `htmlValue`, then `mdValue`, then `plainValue`) | Rendered by PDP body |
| `statusIdentifier` | — | `raw.statusIdentifier` | `in_stock` / `out_of_stock` / other |
| `price` | `price` (string) → `raw.price` | `asNumber` | |
| `currency` | `currency` | `stringValue` | Defaults to `'USD'` |
| `sku` | `sku` | `stringValue` → `raw.sku` | |
| `brand` | `brand` | `listValues[0]` | First entry from the list |
| `colors` | `colors`, `color` | `listValues` | Names, not hex; hex mapping in `adaptCatalogProductToPdpProduct` via `COLOR_NAME_TO_HEX` |
| `sizes` | `sizes`, `size` | `listValues` | |
| `materials` | `material` | `listValues` | |
| `styles` | `style` | `listValues` | |
| `tag` | `label`, `lable`, `tags` | `listValues[0]` | Handles the `lable` typo marker |
| `season` | `season` | `listValues[0]` | |
| `country` | `brand_country`, `country` | `listValues[0]` | |
| `fit` | `fit`, `fitrise` | `listValues[0]` | |
| `liningMaterial` | `lining_material`, `lining` | `listValues[0]` | |
| `insulation` | `insulation` | `listValues[0]` | |
| `productDetails` | `details` | `listValues` | |
| `careInstructions` | `careinstructions`, `care` | `listValues` | |
| `stock` | `stockqty` → `units` | `asNumber(stringValue(...))` | |
| `gender` | `gender` (list) | `GENDER_MAP[genderRaw]` → `''` fallback | `W/M/U` |
| `images` | `gallery`, `pictures` | `imagesValue` (reads `.downloadLink`) | |
| `preview` | — | `images[0]` | |
| `categories` | — | `raw.categories` (path strings) | |
| `relatedIds` | — | `raw.relatedIds`, filtered to positive numbers | Used by `aggregateByName` |

Two adapters ride on top:

- `adaptCatalogProductToUiProduct` (`adapt.ts`) — for `ProductCard` / grid. Formats price via `CURRENCY.format`, uppercases `tag` (`Sale → SALE` via `TAG_TO_LABEL`), derives per-swatch `colorStock` from `variants`, fills `gender` from `p.categories[0]` when the OE attr is blank (via `genderFromCategoryPath`).
- `adaptCatalogProductToPdpProduct` (`adapt.ts`) — for `ProductDetailPage`. Additionally converts colour names to hex (via a local `COLOR_NAME_TO_HEX` distinct from `HEX_COLOR_NAMES`), computes per-size availability from variants, builds a `specs` table with `buildProductSpecs`, and emits a slim `pdpVariants` list carrying `descriptionHtml` per variant so the PDP can swap rich text on colour change.

## 15d. Variant aggregation (`aggregateByName`)

Called by `loadProducts({unique:true})` (default), `loadFilteredProducts` and `searchProducts` to collapse `CatalogProduct[]` rows into unique products, keyed by `title`.

Algorithm:

1. Bucket rows by `title` (falls back to `id:${p.id}` when the title is blank).
2. For every bucket, build the **family** = bucket members ∪ every product referenced by any bucket member's `relatedIds` (looked up in `allById`, a `Map<id, CatalogProduct>` of the whole cached catalog). Dedup by id.
3. Pick the **representative** = first family member that is buyable (`stock > 0 || statusIdentifier !== 'out_of_stock'`); falls back to `family[0]` if none.
4. Aggregate: union `colors` and `sizes`, take `Math.max(stock)`, set `statusIdentifier = 'in_stock'` if any family member is buyable, else keep the representative's status.
5. Emit `variants: CatalogProductVariant[]` with a slim per-member descriptor (`id`, `colors`, `sizes`, `price`, `sku`, `preview`, `images`, `stock`, `statusIdentifier`, `descriptionHtml`).

Server-side OE `aggregate=true` isn't used because a product's colour / size variants can live in **different category leaves** in this tenant, and server-side aggregation would collapse rows before the category filter runs, surfacing wrong representatives. Aggregating locally against the cached full-catalog dump avoids the round-trip cost.

`loadProductById` performs the same expansion but pushes `target` first, so the PDP always opens on the requested variant while still exposing the whole family. It also does a second `for … push` pass over sibling `relatedIds` to reach two-hop links.

## 15e. Stock inference

Stock signalling is deliberately permissive — a product is considered buyable when **either** the numeric `stock > 0` **or** the `statusIdentifier !== 'out_of_stock'`. This is captured by the `isVariantBuyable` / `variantHasStock` helpers across `products.ts` and `adapt.ts`. Rationale: several OE tenants track availability only via the status flag and never populate the numeric stock column — a strict `stock > 0` check would grey out an entire catalog.

| UI signal | Source |
|---|---|
| **Grid card OOS** (`inStock: false`) | `p.statusIdentifier === 'out_of_stock'` (post-aggregation, so family status wins) |
| **Family-level buyability** | `anyBuyable` inside `aggregateByName` — set on aggregated `statusIdentifier: 'in_stock'` if any variant is buyable |
| **Per-swatch OOS** (`colorStock[]`) | Each colour flagged buyable when *some* variant carrying that colour is buyable |
| **Per-size OOS** (`sizeOptions[].available` on PDP) | Same rule, over sizes; refined client-side by PDP once the shopper picks a colour |
| **`inStockOnly` filter** | `matchesCatalogFilters` drops products with `statusIdentifier === 'out_of_stock'` — treats missing status as in-stock so unconfigured dev rows aren't silently hidden |

`preorder` and `coming_soon` status identifiers are not currently emitted by this tenant and have no dedicated UI handling — any status other than `'out_of_stock'` collapses into "buyable".

## 15f. `loadFilteredProducts` vs `loadProducts`

Both live in `products.ts`. They target overlapping shapes but differ in intent:

| | `loadProducts(opts)` | `loadFilteredProducts(opts)` |
|---|---|---|
| Input | `{ categoryPath?, tags?, ids?, unique, limit, offset, sortKey, sortOrder, lang }` | `{ pageUrl?, categoryPath?, filters: CatalogFilters, page?, limit?, lang }` |
| Backend fetch | `loadFullCatalog(lang)` (bounded fast path when `opts.ids` is set) | Always `loadFullCatalog(lang)` |
| Attribute filtering | `categoryPath.startsWith` + `tag` set | Runs `matchesCatalogFilters(p, filters)` over every attribute (`colors / sizes / brands / styles / materials / seasons / fits / …`) plus category slug fallback |
| Aggregation | `aggregateByName` when `unique !== false` | Always `aggregateByName` |
| Sort | Server via `sortKey` / `sortOrder` | Client-side `price_asc` / `price_desc` after aggregation (`filters.sort`) |
| Pagination | `offset` / `limit` slice | `(page - 1) * limit` slice |
| Callers | Home page carousels, Sale, New Arrivals, PDP "you may also like" | `[...slug]` catalog SSR shell |

**Bottom line:** `loadFilteredProducts` is the SSR-shell path for attribute-driven catalogs, `loadProducts` is the generic "give me these products / this category / these ids" fetcher used everywhere else.

## 15g. Search — vector vs quick, debounce, min chars

`searchProducts(queryText, {limit, lang})` in `products.ts`:

- Trims the query; **returns `[]` for < 2 chars**.
- Fires `vectorSearchIds` (semantic — `Products.getProductsByVectorSearch`) and `quickSearchIds` (literal substring — `Products.searchProduct`) **in parallel** via `Promise.all`.
- Merges ids **vector-first, then quick**, dedup by `Set<number>` — so semantic matches always rank above literal ones.
- Enriches ids against `loadFullCatalog` (image / price / brand / colors / sizes — none of which the quick endpoint returns).
- Collapses variants via `aggregateByName` before slicing to `limit` (default 30, HeaderSearch server action passes 12).

`HeaderSearch.tsx` (client component wrapping the header input):

- Debounce: **350 ms** via `setTimeout` in a `useEffect` keyed on `query`.
- Minimum characters: **2** (guard `text.length < 2 → clear results`).
- Out-of-order request guard: monotonic `requestSeqRef` — a slower older request is discarded if a newer query has landed.
- Fires a `trackActivity({ type: 'search', query, meta: { resultsCount } })` after every successful search.

`searchProductsAction` (`search-action.ts`) is a `'use server'` wrapper that runs `searchProducts` with `limit: 12` and pipes each result through `adaptCatalogProductToUiProduct` before returning. There is **no autocomplete on catalog pages** — search is header-only.

## 15h. `matchesCatalogFilters` — private in-memory matcher

`products.ts` (module-private). Consumed only by `loadFilteredProducts`. Runs against normalised `CatalogProduct` rows after the category-path prefix filter, before variant aggregation. Kept private because it operates on the internal `CatalogProduct` shape, not the storefront `Product`.

- **Category needle**: raw needle **and** a slugified variant (`& → space`, then `[^a-z0-9]+ → -`, trim) matched against every segment of every `p.categories[]` path. Enables SEASONAL TRENDS display names (`"T-Shirts & Polos"`) to hit stored slug (`t-shirts-polos`) — see §10a.
- **Price bounds**: `p.price < minPrice → drop`, `p.price > maxPrice → drop` (both inclusive since the OE side uses ± 0.01 boundary padding).
- **`inStockOnly`**: drops `statusIdentifier === 'out_of_stock'` only; unknown / empty status stays in.
- **List attributes** (`colors`, `sizes`, `styles`, `materials`, `productDetails`, `careInstructions`) — pass if *any* selected value case-insensitively matches *any* product value (`anyMatchCI`). Within a group = OR.
- **Scalar attributes** (`brands`, `seasons`, `fits`, `liningMaterials`, `brandCountries`, `labels`, `insulations`) — pass if any selected value case-insensitively equals the product's single string field (`eqCI`).
- Across groups: implicit AND (each `if` early-returns `false`).

Why this exists at all: `buildOEFilterBody` hard-codes clothing attribute suffixes (`color_9`, `size_10`, `brand_7`, …), but shoes / bags / accessories carry the same attributes under different suffixes (`color_8`, `size_9`, `brand_6`). Pushing filters to OE would silently zero-match those categories, so `loadFilteredProducts` runs the whole thing in-memory over the cached 5-minute full-catalog snapshot — fast enough for SSR against ~2000 products.

---

## 17. Known gaps in filter transport

- **`loadFilteredProducts` does not currently call `buildOEFilterBody`.** The SSR shell filters in-memory against the cached full catalog for the reasons in §15h. `buildOEFilterBody` is retained for the future clothing-only OE-native path but is not on the request path today.
- **`unstable_cache` bypass for the 2000-row dump** — the full-catalog fetcher explicitly skips `unstable_cache` because Next.js caps a single entry at 2 MB and the payload is ~30 MB. If the merchant grows the catalog materially, this bypass needs revisiting (Redis, page-based paging).
- **OE-native facet counts still unwired.** The filter drawer counts come from `loadClothingFilter` (`src/lib/oneentry/blocks/clothing-filter.ts`) which pulls the OE `clothing` filter marker and recounts each option locally against `countingProducts`. Real OE facet counts would collapse this into one endpoint call.

## 16. Cross-references

- [FILTER_SYSTEM.md](./FILTER_SYSTEM.md) — filter UI (sticky bar, chips, mobile accordion, mega-dropdowns)
- [ONEENTRY_INTEGRATION.md](./ONEENTRY_INTEGRATION.md) §5.2, §7.5 — full marker registry
- [REDUX.md](./REDUX.md) §2.4 — `catalogSlice` shape
- [DATASETS.md](./DATASETS.md) — remaining static datasets (labels, page registry, config)
- [pages/catalog.md](./pages/catalog.md) — per-page catalog UI spec
