# Category catalog (typical)

Typical catalog page — the shared template `CatalogTemplate.tsx` for all 8 categories: `women/clothing`, `women/shoes`, `women/bags`, `women/accessories`, `men/clothing`, `men/shoes`, `men/bags`, `men/accessories`.

## SEO / social networks

- **Meta title**: string
- **Meta description**: text
- **Keywords**: string
- **OpenGraph title**: string
- **OpenGraph description**: text
- **OpenGraph siteName**: string
- **OpenGraph images alt**: string
- **Twitter site**: string
- **Twitter creator**: string
- **Twitter title**: string
- **Twitter description**: text
- **JSON-LD ItemList name (catalog name)**: string

## 1. Breadcrumbs

Breadcrumbs at the top.

- Links `Home` › `Women` › **`Women's Clothing`** (current)

## 2. Page heading

- **H1**: `"Women's Clothing"` / `"Men's Shoes"` (depends on the category)
- Subheading (optional): item count — e.g. `"234 products"`

## 3. Quick Chips (quick filters)

Horizontal row of preset filters.

- **Chips**: `"Best Sellers"`, `"Dresses"`, `"Tops"`, `"Bottoms"`, `"Outerwear"`, `"Winter Outfits"`, `"Party Outfits"` (for clothing) — switch the product subgrid

## 4. Filter Bar (desktop) / Mobile Filter (mobile)

Filter bar above the product grid. Groups — section dividers + filters. Actual composition for women/clothing (`WomenCatalogPage.tsx`):

### `Primary Filters` (section)
- `Clothing Type`, `Brand`, `Season`, `Size`, `Color` (color swatches), `Outer Material`, `Style`
- `Price` — ranges: `Under $50`, `$50 – $100`, `$100 – $200`, `$200 – $300`, `Over $300`
- `Material Origin`, `Material Finish`, `Lining Material`, `Fit (Rise)`

### `Details` (section)
- `Collar`, `Pockets`, `Brand Country`, `Silhouette`, `Hood`, `Neckline`, `Sleeve`, `Product Details`

### `Store Availability` (section)
- `Availability` (options: `In Stock`, `Out of Stock`)

### Other
- **In-filter search** (for long lists): field with placeholder `"Search…"`
- **Price Range** (if range type is set): two fields `"Min price"` / `"Max price"`
- **Button**: `"Apply"`
- **Button**: `"Clear all"`
- On mobile — `"Filters"` button opens `MobileFilterPanel`

## 5. Sort + View Controls

Right side, above the grid.

- **Sort button**: current selection (`"Sort"` / `"Newest first"` / `"Price: Low to High"` / `"Price: High to Low"` / `"Best Sellers"`)
- **Grid toggle**: 2 / 3 / 4 columns

## 6. Product Grid

Product grid (`ProductCard` × N).

- **Product card** (`ProductCard.tsx`):
  - Image + alt = `name` (with tooltip-portal on long names)
  - **Badge** in the corner — `product.label` or `product.badge` (e.g. `"BESTSELLER"` / `"NEW"` / `"SALE"`)
  - **Wishlist button** in the top-right corner — aria-label `"Add to wishlist"`
  - **Hover overlay at the bottom** (on hover):
    - **Button**: `"Add to Cart"` (with `ShoppingBag` icon) → changes to `"Added!"` after click. Hidden if the item has multiple colors or sizes.
    - **Button**: `"Quick View"` (with `Eye` icon) — opens `QuickViewModal`
  - **H3** (truncated, with floating tooltip): `name`
  - Brand
  - Price (sale price + struck-through regular price)
  - Color swatches (several hex) — aria-label `"{colorName}"` or `"{colorName} (out of stock)"`
  - Sizes — buttons `XS/S/M/L/XL`

## 7. NoFilterResults (when nothing was found)

- **Heading (H3)**: `"No matches"`
- Hint: `"Try resetting filters"`
- **Button**: `"Clear filters"`

## 8. Trending block (OE `catalog_trend_blocks`)

Below the product grid. Products are loaded via `getCachedTrending` (`getApi().Blocks.getTrending(marker, lang)`) and flow into the same `NewArrivals` UI slot. The former static editorial grid (`CatalogTrendBlocks` / `data/trendBlocks.ts`) has been removed; trending content is now fully driven by OE activity data.

## 9. CatalogCrossSell (cross-sell)

In the catalog footer — navigation to other categories.

- **Subtitle** (eyebrow)
- **Title (H2)** — e.g. `"You might also like Shoes"`
- Product cards (×~6) of the cross-category
- **Button**: `"View All Shoes"` → cross-category href
