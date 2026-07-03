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

**Caching:** `loadProducts` wraps in React `cache()` (request-scoped memoisation) plus a 5-minute process-wide TTL keyed by `(pageUrl, filters, sort, page)`.

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
| `price` | `price_14` | Numeric range (`between`) |

Combination logic:

- **Within a group (multi-select)** — OR (`conditionMarker: "in"`).
- **Across groups** — AND (multiple `conditions` entries).

The mapping is intentionally marker-neutral in the URL — the OE marker is not exposed to the user or bookmarkable URLs.

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

`ProductDetailPage.tsx` reads the URL for two optional params:

- `?color=` — selects the initial colour swatch (hex or slug matched via `HEX_COLOR_NAMES`).
- `?size=` — selects the initial size.

If either is missing:

- Default colour = first available `colors[0]`.
- Default size = none (user must pick before Add-to-Cart is enabled).

Colour swatches are rendered by `<ColorSwatch>` (`src/app/components/ColorSwatch.tsx`). Each colour can have its own gallery (`colorImages[colorIndex]`) and stock count (`colorStock[colorIndex]`). Size options on the PDP are rendered as an **inline grid of size buttons** (not `<SizeDropdown>` — that component is used only by `CartItemRow`); out-of-stock sizes show a strikethrough.

Related-products carousel ("You may also like") is loaded via `loadFrequentlyOrderedBlock(pageId)` — see `src/lib/oneentry/blocks/page-blocks.ts`.

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

- Homepage takes CMS block data as props from the RSC shell (`heroSlides`, `homepageCollections`, `discountBanner`, `categorySection`, `pageBlocks`).
- The `<AnimatedSection>` internal component wraps every below-the-fold block in an `IntersectionObserver` fade-up (~650 ms). The hero uses `immediate` to skip the observer. A one-shot flag in `sessionStorage['HOMEPAGE_ANIMATED']` keeps subsequent revisits animation-free (fed from `STORAGE_KEYS`).

## 16. Cross-references

- [FILTER_SYSTEM.md](./FILTER_SYSTEM.md) — filter UI (sticky bar, chips, mobile accordion, mega-dropdowns)
- [ONEENTRY_INTEGRATION.md](./ONEENTRY_INTEGRATION.md) §5.2, §7.5 — full marker registry
- [REDUX.md](./REDUX.md) §2.4 — `catalogSlice` shape
- [DATASETS.md](./DATASETS.md) — remaining static datasets (labels, page registry, config)
- [pages/catalog.md](./pages/catalog.md) — per-page catalog UI spec
