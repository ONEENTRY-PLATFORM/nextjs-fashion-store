# Favorites (`/favorites`)

Favorites page.

## SEO / social networks

- **Meta title**: string
- **Meta description**: text

## 1. Breadcrumbs

- `Home` › **`Favourites`** (current)

## 2. Heading + Bulk Actions Row

Black separator line at the bottom of the row.

### Left
- **H1**: `"Favourites"` (uppercase tracking)
- **Counter**: `"({N} items)"` or `"({N} item)"` (singular)

### Right (only when there are items in favorites)
- **Button**: `"Move All to Bag"` (with `ShoppingBag` icon, black)
- **Button**: `"Clear All"` (with `Trash2` icon, outlined)
- **On click of Clear All** — turns into a confirm:
  - **Text**: `"Are you sure?"`
  - **Button**: `"Yes"` (sale-color, filled)
  - **Button**: `"Cancel"`

## 3. Empty State (if favorites is empty)

- **H2**: `"Your Favorites List is Empty"`
- Hint
- **Button**: `"Browse Catalog"` (or similar) — navigates to catalogs

## 4. Favorites Grid

Favorite item cards (`ProductCard` × N).

- Image + alt = `name`
- Brand, Name (H3), price
- Color swatches — aria-label `"{colorName} (out of stock)"` for OOS
- **Remove button** (filled heart, top-right): aria-label `"Remove from favourites"`
- **Quick view button**: aria-label `"Quick view {name}"`
- Color/Size select inline
- **Button**: `"Add to Cart"`

## 5. Recommended for You (carousel)

- **H3**: `"Recommended for You"`
- 6 product cards (`ProductCard`)
- Navigation arrows

## 6. Trending Now (carousel)

- **H3**: `"Trending Now"`
- 6 product cards
- Navigation arrows

## 7. Recently Viewed

- **Eyebrow**: `"Your History"`
- **H2**: `"Recently Viewed"`
- Grid of previously viewed item cards
- **Button**: `"Show more"` / `"Show less"` (if there are many items)
