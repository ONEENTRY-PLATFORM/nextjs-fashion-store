# Sale (`/sale`)

Sale page.

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

## 1. Hero Banner (full-width)

Large hero with a photo and a countdown on the right.

- **Image** + alt = `"Season Sale"`
- Dark overlay
- **Left column**:
  - **Eyebrow** (uppercase tracking 0.3em): `"LIMITED TIME OFFER"`
  - **H1** (hero-h1, uppercase) — main promo heading
  - **Composite heading**: `"UP TO"` + large number (`"-{N}%"` or `"70%"`) + `"OFF"`
  - Description below the heading
- **Right column** — Countdown:
  - **Caption** (uppercase tracking 0.25em): `"Sale ends in"`
  - 4 `CountdownUnit` cells:
    - `{days}` — `"days"`
    - `{hours}` — `"hours"`
    - `{minutes}` — `"min"`
    - `{seconds}` — `"sec"`
  - **Caption at the bottom**: `"Ends March 15, 2026 at midnight"`

## 2. Breadcrumbs

- `Home` › **`Sale`**

## 3. Sticky Filter Bar

Horizontal sticky bar below the Hero.

### Category tabs (left, horizontal scroll)
- `All` (without counter) + categories with count: `"{Category} ({N})"`
- Active tab is underlined in black

### Filter Pills (desktop, after the separator)
- **`Discount`** (PillDropdown) — options from `DISCOUNT_OPTIONS`
- **`Size`** (PillDropdown) — size chips
- **`Color`** (ColorPillDropdown) — color swatches
- **`Brand`** (PillDropdown) — list of brands with search
- **Button**: `"Clear all"` (with `X` icon, visible when active filters exist)

### Mobile
- **Button**: `"Filters"` — opens `MobileFilterPanel`
- Text on the right: `activeSortLabel` (current sort)

## 4. Results count + Active Filter Chips

Below the sticky bar.

- **Text**: number of items found (uppercase tracking)
- **Active filter chips** — clickable with an "x" (remove)

## 5. Sort Dropdown

- **Button**: current sort (or `"Sort"` by default) with `ChevronDown` icon
- Options from `SALE_SORT_OPTIONS` (for example: `Highest discount`, `Price: Low to High`, `Price: High to Low`, `Newest first`)

## 6. Product Grid

Product cards on sale (`ProductCard` × N).

- Badge: `"-{NN}%"` or `"SALE"`
- Sale price + struck-through regular price

## 7. NoFilterResults (if nothing was found)

- **Heading**: `"No matches"`
- **Button**: `"Clear filters"`
