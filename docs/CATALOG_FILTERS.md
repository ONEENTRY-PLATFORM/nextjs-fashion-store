# Catalog Filters, Sort, and Variant Selection

> Audience: an LLM that must understand the rules without reading source code.
> Scope: catalog filter UX (women/men × clothing/shoes/bags/accessories + sale + new arrivals), the
> `filterProducts` data layer, sort options, URL/Redux state, the product detail page (PDP) and
> QuickView variant selection (color/size/stock).
>
> Cross-references: `./FILTER_SYSTEM.md` (UI-level overview), `./pages/catalog.md`,
> `./pages/product.md`, `./REDUX.md`.

---

## 1. Overview

Catalogs are powered by **one universal engine** — `CatalogTemplate.tsx`. Each catalog page
(`WomenCatalogPage.tsx`, `MenShoesPage.tsx`, etc.) is a thin config: a product array, a
`FilterGroup[]` array, a `ChipFilter[]` array, accent color, title, breadcrumbs. The template
owns layout, sticky bars, dropdowns, modals, the mobile filter panel, pagination, and is wired
into Redux for filter/sort/page state persistence.

Two responsibilities are kept strictly separate:

| Layer | Where | Responsibility |
|---|---|---|
| **Data** | `src/app/data/filterUtils.ts` | Pure functions: `filterProducts`, `buildOptions`, `buildColorOptions`, price-range parsing, discount % heuristic. No DOM, no Redux. |
| **UI** | `src/app/components/CatalogTemplate.tsx`, `MobileFilterPanel.tsx`, `MobileFilterBody.tsx`, `PriceRangeSlider.tsx`, `CatalogMobileSort.tsx` | Renders dropdowns, accordion, chips, swatches; dispatches Redux actions. |

The filter pipeline inside `CatalogTemplate` is:

```
allProducts
  → filterProducts(allProducts, selectedFilters, FILTER_GROUPS)   // generic predicate
  → chipDef ? baseFiltered.filter(chipDef.filter) : baseFiltered  // quick chip narrows further
  → sortedProducts.sort(...)                                       // by sortBy
  → slice((page-1) * PER_PAGE, page * PER_PAGE)                    // pagination
```

All intermediate arrays are wrapped in `useMemo` keyed on their inputs
(`CatalogTemplate.tsx:86-114`).

---

## 2. Filter group types

`FilterGroup.type` (from `CatalogTemplate.types.ts:13`) is one of:

```ts
'checkbox' | 'color' | 'section' | 'search_checkbox'
  | 'price_range' | 'size_chips' | 'measure_range'
```

A `section` group is a non-interactive label that separates groups in the bar / accordion
(rendered as a divider — see `CatalogTemplate.tsx:302-310`). A `measure_range` type is declared
in the union but is not handled by `filterProducts` and currently has no consuming branch — it is
a placeholder for future numeric ranges.

### 2.1 Combining rules (universal)

* **Inside one group** (multiple options selected for the same key) — **OR**.
  Example: `color = ['Black', 'White']` matches any product whose `product.colors` contains
  black OR white.
* **Across different groups** — **AND**.
  Example: `color = ['Black']` AND `size = ['M']` matches only products that contain black AND
  size M. This is enforced by `activeFilters.every(...)` in `filterUtils.ts:81`.
* **Empty group** (no values selected) — does not contribute to the filter and lets the product
  through. `activeFilters` short-circuits via `.filter(([, vals]) => vals.length > 0)`
  (`filterUtils.ts:69`); when no group is active the function returns `products` unchanged
  (`filterUtils.ts:70`).

### 2.2 Per-key rules

For every active `[key, selectedValues]` pair, `filterProducts` selects a branch
(`filterUtils.ts:80-135`):

| key | Branch | Combining inside group |
|---|---|---|
| `__primary`, `__details`, `__store`, `__main`, `city`, `store` | `FILTER_SKIP_KEYS` → always true. These are UI-only section headers or "city/store" pickers that aren't tied to a product field (`filterUtils.ts:37-40`). | n/a |
| `price` | Parse each selected bucket label via `parsePriceRange()` → `[min, max]`; product passes if effective price falls in **any** bucket. | OR |
| `discount` | Compute `pct = (price - salePrice) / price * 100`; passes when `pct >= threshold` for **any** selected option. `parseInt(label)` reads the leading number from labels like `"20% and more"` or `"10% – 20%"`. | OR (any threshold met) |
| `storeAvailability` | Maps `In Stock` → `product.inStock !== false`, `Out of Stock` → `product.inStock === false`. Other values fall through. | OR |
| `color` | Selected option labels are names (e.g. `"Black"`); products store hex. The map `nameToHex` is built from the `color` filter group's options; `product.colors` is checked against the **resolved hex** set. | OR |
| `size` | Inspects the **`sizes` array field** (not `size`). Passes if `product.sizes` contains **any** selected value. Returns `false` when `product.sizes` is missing. | OR |
| Anything else | Generic: if `product[key]` is a string → `selectedValues.includes(val)`. If it's an array → `val.some(v => selectedValues.includes(v))`. Otherwise the product is excluded (`return false`). | OR |

Edge cases:

* A product missing the relevant scalar/array field is **excluded** by the active filter (the
  generic branch returns `false` at `filterUtils.ts:133`). This is intentional: "no color
  data on this product" should not slip past a `color = ['Black']` filter.
* Price `"$100 – $200"` is parsed as `[100.01, 200]` so that it does **not** overlap with
  `"$50 – $100"` which is `[50, 100]`. See §4 for the full table.

---

## 3. Color filter — hex / name dual model

Products store an array of hex strings:

```ts
// ProductCard.tsx:42
colors: string[];   // e.g. ['#000000', '#5C3A1E']
```

Filter options expose **color names** to the user (`Black`, `Camel`, `Misty Rose`, …) backed by
a hex (`color` property on `FilterOption`). The mapping is built once per catalog by
`buildColorOptions` (`filterUtils.ts:143-157`):

```ts
// for each product, for each hex
const name = HEX_COLOR_NAMES[hex] ?? HEX_COLOR_NAMES[hex.toUpperCase()] ?? hex;
counts.set(name, (counts.get(name) ?? 0) + 1);
if (!nameToHex.has(name)) nameToHex.set(name, hex);
```

The canonical hex → name table lives in `src/app/utils/colorNames.ts` (`HEX_COLOR_NAMES`,
≈40 entries). Lookups are case-insensitive in one direction only: `HEX_COLOR_NAMES[hex]` is
tried first, then `hex.toUpperCase()`. There is no `.toLowerCase()` fallback, so a product
emitting a lowercase hex (`'#ffffff'`) is handled because both `'#FFFFFF'` and `'#ffffff'` are
present in the dictionary, but other arbitrary lowercase hex codes may not be.

Multiple hex values can map to the same name (e.g. `#C4A882` and `#C19A6B` are both `Camel`).
When the user clicks a single `Camel` chip, **only the hex captured first** ends up in
`nameToHex`; products using the second hex would not match. This is acceptable in practice
because each catalog's product data uses one canonical hex per visual color.

At filter-time, `filterProducts` rebuilds the name → hex map **from the filter group's options**
(not from `HEX_COLOR_NAMES`):

```ts
// filterUtils.ts:73-78
const colorGroup = filterGroups.find(g => g.key === 'color');
const nameToHex = new Map<string, string>(
  (colorGroup?.options ?? [])
    .filter(o => o.color)
    .map(o => [o.label, o.color!])
);
```

Then matches a product when `product.colors.some(hex => selectedHexes.includes(hex))`
(`filterUtils.ts:121`). Note: the value `'multi'` in `product.colors` is **skipped** by
`buildColorOptions` (`filterUtils.ts:148`) and therefore never produces a filter option, but
because `filterProducts` doesn't filter it out symmetrically, a `multi`-colored product would
not match any color filter.

---

## 4. Price bucket parsing

Defined in `parsePriceRange` (`filterUtils.ts:42-58`). The explicit table guarantees
**non-overlapping ranges**:

| Label | `[min, max]` |
|---|---|
| `Under $50` | `[0, 49.99]` |
| `$50 – $100` | `[50, 100]` |
| `$100 – $200` | `[100.01, 200]` |
| `$200 – $300` | `[200.01, 300]` |
| `Over $300` | `[300.01, Infinity]` |

Bucket comparison uses **inclusive on both ends**:
`effectivePrice >= min && effectivePrice <= max` (`filterUtils.ts:91`). The hand-tuned offsets
(`+0.01`) ensure a product priced exactly at `$50` belongs to `$50 – $100` only, not to
`Under $50`.

For unrecognized labels there are three fallback paths (`filterUtils.ts:54-57`):

1. `"Under $<N>"` → `[0, N - 0.01]`
2. `"Over $<N>"` → `[N + 0.01, Infinity]`
3. otherwise — strip `$`, split on en-dash `–`, parse two floats: `[a, b]`.

Effective price is `salePrice ?? price` (`filterUtils.ts:87`): a discounted product is bucketed
by its sale price, not the original.

Catalog pages compute counts for each bucket once at module load via `countByPrice` (e.g.
`WomenCatalogPage.tsx:24-29`) — the same `[min, max]` bounds are reused so the counts under each
chip stay in sync with the predicate.

---

## 5. Discount filter

Used on the `SalePage` (the standard category catalogs do not include a `discount` filter group).
Active only when a product has both `price` and `salePrice` (`filterUtils.ts:97`: missing
`salePrice` → excluded).

```ts
// filterUtils.ts:96-104
const orig = parseFloat(product.price.replace(CURRENCY.symbol, '').replace(',', ''));
const sale = parseFloat(product.salePrice.replace(CURRENCY.symbol, '').replace(',', ''));
const pct  = ((orig - sale) / orig) * 100;
return selectedValues.some(label => {
  const threshold = parseInt(label);   // "20% and more" → 20, "10% – 20%" → 10
  return pct >= threshold;
});
```

Bucket labels come from `DISCOUNT_OPTIONS` (`src/app/data/saleConfig.ts:22-28`):
`"10% – 20%"`, `"20% – 30%"`, `"30% – 40%"`, `"40% – 50%"`, `"50% and more"` (labels in
`salePageLabels.ts:72-76`). The predicate is **threshold-only** — it reads the leading number
via `parseInt`, ignoring any upper bound in the label. Selecting `"20% – 30%"` therefore matches
every product with `pct >= 20`, including a 50%-off product. Selecting both `"20% – 30%"` and
`"50% and more"` is equivalent to selecting only `"20% – 30%"`.

`SalePage` defaults the sort to `discount` so the largest reductions surface first
(`SalePage.tsx:47`).

---

## 6. Sort options

Defined in `SORT_OPTIONS` (`CatalogTemplate.types.ts:72-78`):

```
'featured'   → no-op (returns 0 — preserves array order)
'price_asc'  → ascending by effective price (salePrice ?? price)
'price_desc' → descending by effective price
'popularity' → no-op (no popularity field; falls through to featured)
'new'        → products labeled 'NEW' first
```

The comparator (`CatalogTemplate.tsx:100-107`) parses `(a.salePrice ?? a.price)` minus
`CURRENCY.symbol` and `','` to a float for the price branches. For `'new'`, the trick
`(a.label === 'NEW' ? -1 : 1) - (b.label === 'NEW' ? -1 : 1)` puts NEW products before
non-NEW ones but does **not** sort within those groups, so order inside each group reflects
the source array.

Stability:

* `Array.prototype.sort` is stable in all modern engines (TC39 since 2019). Featured and
  popularity therefore preserve the original array order.
* `chippedProducts` is spread into a new array (`[...chippedProducts].sort(...)`,
  `CatalogTemplate.tsx:100`) so sort is non-mutating with respect to `allProducts`.

Default sort:

* Most catalogs: `'featured'` (`CatalogTemplate.tsx:73` — `?? 'featured'`).
* `SalePage`: `'discount'` (`SalePage.tsx:47`). `SALE_SORT_OPTIONS` adds the `'discount'` value
  in `saleConfig.ts:51-57`.

Mobile sort is in a bottom sheet (`CatalogMobileSort.tsx`) listing `CATALOG_MOBILE_SORT_LABELS`
options; selecting one dispatches `setSort` and resets page to 1 (`CatalogMobileSort.tsx:54-57`).

---

## 7. URL search params sync

Limited and intentional. `CatalogTemplate` accepts two optional props:

```ts
// CatalogTemplate.types.ts:61-62
urlQueryParam?: string;   // the URL param to read on mount, e.g. 'clothingType'
urlQueryKey?: string;     // the filter group key to populate, e.g. 'clothingType'
```

When both are set, on mount the template reads `URLSearchParams.get(urlQueryParam)` and, if
present, dispatches `setFilters({ [urlQueryKey]: [val] })` — overwriting all other filters for
that catalog (`CatalogTemplate.tsx:131-138`). Example: `WomenCatalogPage.tsx:103-104` passes
`urlQueryParam="clothingType"`, so visiting `/women/clothing?clothingType=Dresses` lands with a
single-value Dresses filter active.

There is **no two-way sync**:

* Filter toggles never push to `window.history` / `URLSearchParams`. The URL doesn't track the
  user's filter state.
* The URL is only read **once** on mount; subsequent changes to `?clothingType=` are ignored
  until a full page reload.
* Sharing a URL transmits only the seed filter, not the full multi-key selection.

For variant selection, the PDP supports `?color=<hex>` and `?size=<label>` (see §8.6).

### 7.1 Persistence via localStorage

Filter state, sort, page, view columns, and active chip are persisted in **Redux + localStorage**
(`src/app/store/index.ts:107-119`) under the key `STORAGE_KEY`:

```
{
  __version, cart, wishlist, recentlyViewed,
  catalog: state.catalog,   // ← Record<catalogKey, CatalogUIState>
  userAddresses
}
```

`catalogKey` is set per page (e.g. `"women-clothing"`, `"men-shoes"`). The shape of one entry
is in `catalogSlice.ts:14-21`:

```ts
{
  selectedFilters: Record<string, string[]>,
  sortBy: string,
  currentPage: number,
  viewCols: 3 | 4,
  listMode: boolean,
  activeChip: string,
}
```

This survives navigating away and back, but does not survive a `localStorage` clear or a
`STORAGE_VERSION` bump. Hydration happens after client mount via `loadCatalogFromStorage` →
`hydrateCatalogs` to avoid SSR mismatch (`store/index.ts:92-105`, `catalogSlice.ts:100-103`).

---

## 8. Variant selection on the Product Detail Page

Source: `src/app/pages/ProductDetailPage.tsx` and `src/app/components/QuickViewModal.tsx`.

### 8.1 Per-color image + stock model

`Product` (`ProductCard.tsx:34-106`) carries two **index-parallel** arrays:

```ts
colors: string[];           // hex values
colorImages?: string[];     // gallery image (or main image) per color
colorStock?: boolean[];     // false = out of stock; undefined = in stock
```

The arrays are addressed by the same index. `colorImages?.[idx]` falls back to `product.image`
when missing (`ProductDetailPage.tsx:126`, `ProductCard.tsx:127`). `colorStock?.[idx] === false`
flags a specific variant out-of-stock; **`undefined` always means in stock**, not "unknown".

### 8.2 Initial color/size selection

PDP (`ProductDetailPage.tsx:114-123`):

1. Read URL `?color=` and `?size=` via `useSearchParams`.
2. If the color is a valid 6-digit hex (`/^#[0-9A-Fa-f]{6}$/`) and matches a color in
   `dynamicColors`, the initial color index is that match; otherwise `0`.
3. If no `?size=`, initial size is `null` — **no size is pre-selected**.

QuickView (`QuickViewModal.tsx:36-48`): initial color comes from `initialColorIndex` (the index
the user clicked on the product card); initial size is always `null`. Errors are reset to `{}`.

### 8.3 Clicking a color swatch

PDP (`ProductDetailPage.tsx:358-377`):

* Disabled swatches: `dynamicColors[i].available === false`. Computed once from
  `colorStock[i] !== false` AND `productIsOOS === false` (`ProductDetailPage.tsx:88-97`). When
  the whole product is OOS, **every color** is rendered unavailable.
* Active swatch border: 2px solid black + 1px outline.
* Unavailable visual: opacity `0.35`, `cursor-not-allowed`, plus a 45°-rotated 1px line in a
  contrast color computed by `strikeColor(hex)` (`ProductDetailPage.tsx:371-375`).
* Click updates `selectedColor` index. The main gallery image follows via:
  `activeColorImage = catalogProduct?.colorImages?.[selectedColor] ?? dynamicImage`
  (`ProductDetailPage.tsx:126`).

QuickView (`QuickViewModal.tsx:225-249`): same structural rules. Out-of-stock swatches show a
diagonal slash overlay; clicking an OOS swatch is ignored and the error state is preserved. A
successful click clears the `color` error.

### 8.4 Size + inStock interaction

PDP (`ProductDetailPage.tsx:99-100`):

```ts
const productSizeOptions = catalogProduct?.sizeOptions ?? DEFAULT_SIZE_OPTIONS;
const dynamicSizeOptions = productSizeOptions.map(s => ({
  ...s,
  available: productIsOOS ? false : s.available,
}));
```

Each size carries its own `available: boolean`. When the product is OOS, every size is forced
unavailable. The Size + Color matrix is therefore:

| Product state | Color swatches | Size buttons |
|---|---|---|
| Product `inStock !== false`, color in stock | enabled | reflect each size's `available` |
| Product `inStock !== false`, color out of stock | disabled (just that color) | reflect each size's `available` (sizes are NOT per-color) |
| `product.inStock === false` | all disabled (forced) | all disabled (forced) |

QuickView (`QuickViewModal.tsx:273-294`): uses the product-level `inStock` for every size
button — there is no per-size availability model in QuickView, just full-product OOS. This is
deliberately simpler than PDP.

There is **no per-color × per-size availability matrix**. The data model expresses per-color
stock and per-size stock independently; the UI can show "this color is out" and "this size is
out" but cannot say "this size in this color is out".

### 8.5 Add to Cart with no size

PDP (`ProductDetailPage.tsx:205-211`):

```ts
if (!selectedSize) {
  setSizeError(true);
  setTimeout(() => setSizeError(false), 2000);
  return;
}
```

`sizeError` styles the SIZE label red and outlines every size button in `--sale`; no cart write
occurs. The error self-clears after 2 seconds. There's no color-required guard on PDP — color
0 is selected by default, so a click on Add to Cart always carries a color.

QuickView is stricter (`QuickViewModal.tsx:306-313`):

```ts
const hasColors = product.colors && product.colors.length > 0;
const colorErr = hasColors && selectedColor === null;
const sizeErr = selectedSize === null;
if (colorErr || sizeErr) { setErrors({ color: colorErr, size: sizeErr }); return; }
```

Both color and size must be selected; missing either flags the corresponding error and aborts.

### 8.6 Switch from card → QuickView → full PDP

`QuickViewModal.handleViewFullDetails` (`QuickViewModal.tsx:76-82`) pushes
`/product/<id>?color=<hex>` carrying the current color (size is intentionally not propagated).
This is the only path that writes a variant selection to the URL.

### 8.7 ProductCard color swatches

`ProductCard.tsx:341-360` shows up to 4 swatches plus a `+N` overflow indicator. Clicking a
swatch on a card:

* Updates the local `selectedColor` index.
* Switches the card's image via `activeImage = product.colorImages?.[safeColorIdx] ?? product.image`
  (`ProductCard.tsx:127`).
* Disables OOS swatches: `product.inStock === false || colorStock?.[idx] === false`.
* `safeColorIdx` (`ProductCard.tsx:126`) guards against an index larger than `product.colors.length`
  so a stale selection doesn't crash.

The Add-to-Cart button on the card is **hidden** when the product has multiple colors or
multiple sizes (`ProductCard.tsx:271`): the card can only one-click-add a product with exactly
one color and ≤1 size. Multi-variant products force the user into QuickView or PDP.

---

## 9. Search

Filter-side: there is **per-group search inside a filter dropdown** for `search_checkbox` groups
(`CatalogTemplate.tsx:382-419`, `MobileFilterBody.tsx:67-110`). It is a case-insensitive
substring filter over `option.label`:

```ts
// MobileFilterBody.tsx:69-71
const visible = search.trim()
  ? group.options.filter(o => o.label.toLowerCase().includes(search.toLowerCase()))
  : group.options;
```

This filters the **option list rendered inside the dropdown** — it does not change the product
result set until the user actually toggles an option. It is per-group; switching groups resets
the search input (state lives in `filterSearch: Record<groupKey, term>`,
`CatalogTemplate.tsx:64`).

There is **no global product search** (no fuzzy match on product title / SKU / description /
attributes anywhere in `filterProducts`). The header search input is a separate concern outside
this document.

---

## 10. "No results" handling

When `filteredProducts.length === 0` after filtering + chips + sort + pagination,
`CatalogTemplate.tsx:512-513` renders `<NoFilterResults onClearAll={clearAll} />`.

`NoFilterResults` (`NoFilterResults.tsx`) shows:

* A neutral icon (`/icons/ui/no-results.svg`, 64×64).
* `L.noResultsFound` heading and `L.noFilterResultsBody` subtext (from `commonLabels.ts`).
* A black "Clear all filters" button calling the passed-in `onClearAll`.

`clearAll` (`CatalogTemplate.tsx:145-149`) dispatches `clearFilters(catalogKey)`,
resets the local `priceRange` state to its default, and clears per-group `filterSearch`.

Active filter chips are rendered above the grid when `totalActiveFilters > 0` and are click-to-
remove (`CatalogTemplate.tsx:485-509`). The same row carries an inline `Clear all` link.

---

## 11. Performance notes

* **Memoization**: `baseFiltered`, `chippedProducts`, `sortedProducts`, `filteredProducts`, and
  `pageNumbers` are all `useMemo`'d (`CatalogTemplate.tsx:86-114`). The dependency arrays
  include `allProducts`, `selectedFilters`, `FILTER_GROUPS`, `chipDef`, `sortBy`, `currentPage`,
  `PRODUCTS_PER_PAGE`. Toggling a filter re-runs `filterProducts` and the chain; changing only
  the sort skips `filterProducts` and just re-sorts.
* **Re-render scope**: filter checkbox interactions dispatch to Redux which re-renders the whole
  template tree, but memoization keeps the heavy product-array computations cheap.
* **Typical sizes**: the catalogs ship roughly 100–300 products each (Women Clothing has
  `TOTAL_STYLES = 6611` but only a sampled subset in the dataset, see `WomenCatalogPage.tsx:21`).
  `filterProducts` does one pass plus per-product `every` × `some`, so cost is bounded by
  `O(products × activeFilters × selectedValuesPerFilter)` — trivial at this scale.
* **ProductCard is memoized** (`React.memo(ProductCardInner)`, `ProductCard.tsx:367`) so grid
  re-renders skip unchanged cards.
* **No keystroke debounce** is needed for the dropdown search — it filters only options, not
  products.

---

## 12. File map

| File | Lines | Purpose |
|---|---|---|
| `src/app/data/filterUtils.ts` | 1–158 | `filterProducts`, `buildOptions`, `buildColorOptions`, `parsePriceRange`, `FILTER_SKIP_KEYS` |
| `src/app/utils/colorNames.ts` | 1–25 | `HEX_COLOR_NAMES`, `hexToColorName` |
| `src/app/data/catalogFilterLabels.ts` | 1–100+ | UI labels for section / group / option / price / discount / chips |
| `src/app/data/saleConfig.ts` | 22–57 | `DISCOUNT_OPTIONS`, `SALE_SORT_OPTIONS`, `SALE_*_OPTIONS` |
| `src/app/components/CatalogTemplate.types.ts` | 1–86 | `FilterGroup`, `FilterOption`, `ChipFilter`, `SORT_OPTIONS`, `getPageNumbers` |
| `src/app/components/CatalogTemplate.tsx` | 1–610 | Template — filter pipeline, sort, pagination, sticky bars |
| `src/app/components/CatalogTemplate.parts.tsx` | — | `ColsIcon`, `CheckboxUI`, `SortOptionBtn` |
| `src/app/components/MobileFilterPanel.tsx` | 1–168 | Mobile fullscreen filter panel + accordion |
| `src/app/components/MobileFilterBody.tsx` | 1–157 | Filter body per type (size_chips, search_checkbox, color, checkbox) |
| `src/app/components/PriceRangeSlider.tsx` | 1–69 | Dual-thumb slider + min/max numeric inputs |
| `src/app/components/CatalogMobileSort.tsx` | 1–72 | Mobile sort bottom sheet |
| `src/app/components/NoFilterResults.tsx` | 1–37 | Empty-state with Clear All CTA |
| `src/app/components/ProductCard.tsx` | 1–367 | Card with color swatches + per-color image switching |
| `src/app/components/QuickViewModal.tsx` | 1–383 | QuickView variant picker + Buy Now flow |
| `src/app/pages/ProductDetailPage.tsx` | 1–599 | PDP — variant selection, gallery, sizes, OOS rules |
| `src/app/pages/WomenCatalogPage.tsx` | 1–113 | Representative catalog config wiring `CatalogTemplate` |
| `src/app/pages/SalePage.tsx` | — | Standalone sale page (own filter bar, uses `discount` filter) |
| `src/app/store/catalogSlice.ts` | 1–120 | Redux slice (selectedFilters, sortBy, currentPage, viewCols, listMode, activeChip) |
| `src/app/store/index.ts` | 92–119 | localStorage persistence of `state.catalog` |

---

## 13. Mapping to OneEntry

Filters in OneEntry are **out-of-whitelist** (`filters`, `filter_items_mn`,
`filter_custom_items_mn`) and configured post-import via the admin API
(`POST /api/admin/filters` + `POST /api/admin/filters/:id/items`, with body using camelCase:
`localizeInfos`, `scopeTypes`, `objectType`, `attributeIdentifier`). See
`agents_datasets/rules/filters-setup.md` for the full pipeline.

Mapping the current frontend model onto OneEntry:

| Frontend filter key | OneEntry `objectType` | `attributeIdentifier` |
|---|---|---|
| `clothingType`, `bagType`, `shoeType`, `accessoryType`, `material`, `style`, `season`, `brand`, `collar`, `pockets`, `silhouette`, … (single-string Product fields) | `attribute` | corresponding `forProducts_<segment>` schema key |
| `size` | `attribute` | `sizes` (a multi-value `list` schema item; storefront expects array) |
| `color` | `attribute` | `colors` (list) — note the hex/name reconciliation must happen on storefront read |
| `price` | `attribute` (`isRange: true`, `rangeFrom`, `rangeTo`) | `price` (numeric) |
| `discount` | `attribute` with `allowedProductStatusIds: [<sale status>]` and threshold ranges | derived from `salePrice` vs `price` (not a single attribute today) |
| `storeAvailability` | `attribute` | derived from `product_status.identifier` (`in_stock` / `out_of_stock`) — see `agents_datasets/rules/products-architecture.md` for the canonical statuses |

Sort options (`featured`, `price_asc`, `price_desc`, `popularity`, `new`, `discount`) do **not**
correspond to any OneEntry concept — they remain frontend-driven and rely on the same
`salePrice ?? price` heuristic. `popularity` is currently a placeholder (no popularity field on
`Product`).

The frontend's "category page" concept (`/women/clothing`, `/men/shoes`, `/sale`) corresponds to
OneEntry `catalog_page` (gtid=4) with one `filter` row per page bound by `page_id` (one filter
per catalog scope, per the per-page recommendation in `filters-setup.md` §1.4).

---

## 14. Cross-references

* `./FILTER_SYSTEM.md` — broader UI architecture / Figma-derived design intent.
* `./pages/catalog.md` — per-catalog-page documentation.
* `./pages/product.md` — PDP rendering and content blocks.
* `./pages/sale.md` — `SalePage` specifics.
* `./REDUX.md` — Redux store, persistence, `catalogSlice` lifecycle.
* `agents_datasets/rules/filters-setup.md` — OneEntry filters runtime model and admin REST.
* `agents_datasets/rules/products-architecture.md` — `forProducts_*` schema rules; canonical
  product statuses (`in_stock`, `out_of_stock`, `preorder`, `coming_soon`, `sold_out`,
  `discontinued`, `draft`, `archived`).
