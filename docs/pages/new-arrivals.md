# New Arrivals (`/new`)

New Arrivals page.

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

## 1. Hero Banner (full-width image)

- **Image** + alt = `"New Arrivals editorial"` (with `brightness(0.48)` overlay)
- **Eyebrow** (uppercase tracking 0.35em): `"ONEENTRY FASHION"`
- **H1** (uppercase tracking 0.18em, hero-h1): `"NEW ARRIVALS"`
- Thin divider line (40px)
- **Subheading** (uppercase tracking 0.25em): `"Latest fashion drops"`

## 2. Breadcrumb + Counter (below Hero)

- **Breadcrumb**: `Home` / **`New Arrivals`**
- Right side: `"{N} styles"` (number of items found)

## 3. Category Tabs

Chips for switching categories.

- `All` (default), `Women's Clothing`, `Men's Clothing`, `Shoes`, `Bags`, `Accessories`

## 4. Sort + View Controls

- **Dropdown**: current sort (`"Newest first"` by default, `"Price: Low to High"`, `"Price: High to Low"`, `"Best Sellers"`)
- Grid toggle (2/3/4 columns)

## 5. Product Grid

Product cards with `"NEW"` badge (`ProductCard` × N).

- Image + alt = `name`
- Brand, Name, price
- Color swatches + sizes
- **Favorite button**: aria-label `"Add to wishlist"`
- **Quick view button**: aria-label `"Quick view {name}"`

## 6. NoFilterResults (if nothing was found)

- **Heading**: `"No matches"`
- **Button**: `"Clear filters"`
