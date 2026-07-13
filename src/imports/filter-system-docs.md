# KEKIMORO — Filter System Documentation

## Overview

The filter system lives inside the universal catalog engine **`CatalogTemplate`** (`/src/app/components/CatalogTemplate.tsx`) and its companion mobile component (`/src/app/components/MobileFilterPanel.tsx`). It is split into two distinct experiences: a **desktop horizontal filter bar** with mega-dropdown panels, and a **mobile full-screen accordion panel**. Both share the same filter state (Redux `catalogSlice`) and the same `FILTER_GROUPS` data structure.

---

## Layout Structure (Desktop)

The entire filter UI is wrapped in a **sticky block** that locks directly below the fixed site header:

```
┌─────────────────────────────────────────────────────────────┐
│  Row 1 (non-sticky): Page title "CLOTHING" + breadcrumbs    │
├─────────────────────────────────────────────────────────────┤
│  ┌── STICKY BLOCK (z-40, bg-white) ───────────────────────┐ │
│  │  Row 2: Quick-category chips  │  View toggles + Sort   │ │
│  │  Row 3: Horizontal filter bar (desktop only)           │ │
│  │           └─ Mega-dropdown (absolute, drops below)     │ │
│  │  Row 3m: FILTERS | SORT bar (mobile only)              │ │
│  └────────────────────────────────────────────────────────┘ │
└─────────────────────────────────────────────────────────────┘
```

Sticky offsets by breakpoint:

| Breakpoint | `top` value          |
|------------|----------------------|
| `< md`     | `top-16` (64 px)     |
| `md`       | `top-24` (96 px)     |
| `lg`       | `top-[132px]`        |

---

## Row 2 — Quick-Category Chips

A horizontally scrollable row of pill-shaped shortcut chips. Scrollbar is hidden (`scrollbar-hide`).

**Chip source:** chips are no longer hardcoded in each page component. The RSC shell at `app/[...slug]/page.tsx` calls `loadFilterChips(entry.catalogKey, lang)` (`src/lib/oneentry/blocks/filter-chips.ts`), which fetches the OneEntry filter marker `filter_chips_<catalogKey>` (e.g. `filter_chips_men_bags`) and returns `FilterChip[] | null`. Each `FilterChip` carries `{ label, type: 'page' | 'attribute', url?, marker?, value? }`. Labels only are forwarded as `initialQuickChips?: string[]` to the catalog page component and into `CatalogTemplate` as `quickChips: string[]`. The chip list is therefore CMS-controlled and can differ per catalog without a code deploy.

**Server-side filter effect:** when a chip is active, `app/[...slug]/page.tsx` calls `chipToFilterPatch(filters.chip, chips)` and merges the result into `CatalogFilters` before `loadFilteredProducts` runs. `type: 'page'` chips set `filters.category`; `type: 'attribute'` chips append their value to the matching list field (`materials`, `productDetails`, etc.) via `attributeMarkerToFilterField`.

**Toggle behaviour:** clicking a chip toggles `activeChip` state. Only one chip can be active at a time; clicking the active chip deselects it.

**Visual states:**

| State    | Background  | Text    | Border           |
|----------|-------------|---------|------------------|
| Default  | transparent | `#000`  | `1px solid #000` |
| Active   | `#000`      | `#fff`  | `1px solid #000` |

Chips use `border-radius: 999px` (pill shape), consistent with the brand's otherwise rectangular design language.

---

## Row 2 (right side) — View Toggles + Sort

Visible **desktop only** (`hidden md:flex`).

### Grid View Toggle

Three icon buttons switch the product grid layout:

| Icon | Columns (desktop) | Variable        |
|------|-------------------|-----------------|
| ▌▌▌  | 3 columns         | `viewCols = 3`  |
| ▌▌▌▌ | 4 columns         | `viewCols = 4`  |

Active icon is rendered at full opacity; inactive at 40% opacity.

### Sort Dropdown

A small inline dropdown triggered by a text button. Opens as an absolutely positioned white panel (`border: 1px solid #000`, no border-radius).

**Sort options:**

| Label              | Value        |
|--------------------|--------------|
| Featured           | `featured`   |
| Price: Low to High | `price_asc`  |
| Price: High to Low | `price_desc` |
| Popularity         | `popularity` |
| New Arrivals       | `new`        |

The active sort option shows a `✓` checkmark in `#F88A8A`. Selecting a sort option also resets pagination to page 1.

The dropdown closes on:
- Clicking another sort option
- Clicking outside the dropdown (`mousedown` listener on `document`)
- Pressing `Escape`

### Page Indicator

A small `Page X of 138` label with a `›` chevron, informational only.

---

## Row 3 — Desktop Horizontal Filter Bar

```
┌─────────────────────────────────────────────────────────────────────┐
│ PRIMARY FILTERS │ Clothing Type ∨ │ Brand ∨ │ ... │ DETAILS │ ...  │ 6,611 Styles │
└─────────────────────────────────────────────────────────────────────┘
                    ▲ 3px #F88A8A horizontal scrollbar at bottom
```

- The inner scroll container has `overflow-x-auto overflow-y-hidden` with the custom CSS class `scrollbar-pink`.
- `scrollbar-pink` defines a **3 px tall** WebKit scrollbar with thumb colour `#F88A8A`, transparent track, and zero-width vertical scrollbar. Firefox uses `scrollbar-color: #F88A8A transparent`.
- The outer row has `border-b border-gray-200` (1 px bottom border, `#e6e6e6`).
- A static `6,611 Styles` count sits at the far right, outside the scroll container (`flex-shrink-0`).

Only one filter dropdown can be open at a time (`openFilter: string | null` state). The `filterBarRef` div wraps the entire sticky block; any `mousedown` outside it closes the open dropdown.

---

## Filter Groups — Data Structure

Each entry in `FILTER_GROUPS` conforms to:

```ts
interface FilterGroup {
  label: string;
  key: string;
  options: FilterOption[];
  type?: 'checkbox' | 'color' | 'section';
  columns?: number;   // grid columns in the mega-dropdown
}

interface FilterOption {
  label: string;
  count?: number;    // product count shown in grey
  color?: string;    // hex string, only used for type === 'color'
}
```

`type: 'section'` entries are **dividers**, not interactive — they render as labelled separators in both the desktop bar and the mobile accordion.

---

## Filter Groups — Full Catalogue

### Section 1 — Primary Filters

| # | Filter Key        | Type       | Options (count) | Dropdown Columns |
|---|-------------------|------------|-----------------|------------------|
| 1 | `clothingType`    | checkbox   | 18              | 3                |
| 2 | `brand`           | checkbox   | 9               | 3                |
| 3 | `season`          | checkbox   | 4               | 2                |
| 4 | `size`            | checkbox   | 23              | 4                |
| 5 | `color`           | **color**  | 18              | 3                |
| 6 | `material`        | checkbox   | 12              | 3                |
| 7 | `style`           | checkbox   | 4               | 2                |
| 8 | `price`           | checkbox   | 5               | 2                |
| 9 | `materialOrigin`  | checkbox   | 3               | 2                |
|10 | `materialFinish`  | checkbox   | 6               | 3                |
|11 | `liningMaterial`  | checkbox   | 1               | 2                |
|12 | `fit`             | checkbox   | 3               | 2                |

<details>
<summary>Clothing Type options</summary>

Pants · Outerwear · Jeans · Loungewear · Vests · Suits · Swimwear · Tank Tops · Lingerie · Blazers · Shirts · Sweaters / Turtlenecks / Jumpers · Sportswear · T-Shirts / Polo Shirts · Hoodies / Sweatshirts · Shorts · Dresses · Skirts
</details>

<details>
<summary>Brand options</summary>

Kekimoro · & Other Stories · Arket · COS · Mango · Massimo Dutti · Weekday · H&M Studio · Zara Studio
</details>

<details>
<summary>Size options</summary>

US 0–20 (numeric) · XS/S · S/M · M/L · L/XL · XS · S · M · L · XL · XXL · XXS · ONE SIZE
</details>

<details>
<summary>Color options (with hex)</summary>

| Label      | Hex       |
|------------|-----------|
| Black      | `#000000` |
| White      | `#FFFFFF` |
| Beige      | `#C4A882` |
| Gray       | `#808080` |
| Navy       | `#1B3A5C` |
| Blue       | `#4169E1` |
| Red        | `#DA1E1E` |
| Burgundy   | `#800020` |
| Pink       | `#F88A8A` |
| Blush      | `#FFB6C1` |
| Green      | `#2E8B57` |
| Olive      | `#808000` |
| Camel      | `#C19A6B` |
| Brown      | `#5C3A1E` |
| Purple     | `#800080` |
| Orange     | `#FF6B00` |
| Yellow     | `#FFD700` |
| Multicolor | conic-gradient |
</details>

---

### Section 2 — Details

| # | Filter Key      | Type     | Options (count) | Dropdown Columns |
|---|-----------------|----------|-----------------|------------------|
|13 | `collar`        | checkbox | 5               | 2                |
|14 | `pockets`       | checkbox | 4               | 2                |
|15 | `brandCountry`  | checkbox | 9               | 3                |
|16 | `silhouette`    | checkbox | 7               | 2                |
|17 | `hood`          | checkbox | 3               | 2                |
|18 | `neckline`      | checkbox | 6               | 3                |
|19 | `sleeve`        | checkbox | 4               | 2                |
|20 | `productDetails`| checkbox | 21              | 3                |

<details>
<summary>Brand Country options</summary>

Italy · France · Spain · Portugal · Germany · United Kingdom · Turkey · Denmark · Sweden
</details>

<details>
<summary>Product Details options</summary>

Removable Fur · Push-Up · Peplum · Fringe · Seamless · Bralette · Briefs · Ruffles · Embroidery · Gradient · Draping · Lace · Lurex · Metallic · Pleated · Slit · Frills · Print · Rhinestones / Sequins · Open Back · Water-Repellent Coating
</details>

---

### Section 3 — Store Availability

| # | Filter Key          | Type     | Options (count) | Dropdown Columns |
|---|---------------------|----------|-----------------|------------------|
|21 | `storeAvailability` | checkbox | 3               | 2                |

Options: All Stores (6,611) · Available In Store (4,523) · Online Only (2,088)

---

## Mega-Dropdown Panel (Desktop)

Opens as an absolute panel directly below the filter bar row, spanning full width. One panel is shown at a time.

```
┌───────────────────────────────────────────┬──────────────────┐
│  Options grid (1–4 columns depending on   │  VIEW (6,611)    │
│  the filter group's `columns` value)      │                  │
│                                           │  Clear All       │
└───────────────────────────────────────────┴──────────────────┘
```

**Styling:**
- `border-top: 2px solid #000`
- `border-bottom: 1px solid #e5e7eb`
- `box-shadow: 0 8px 32px rgba(0,0,0,0.09)`
- `background: #fff`
- Right panel is separated by `border-left: 1px solid #e5e7eb`, min-width 160 px

**Right action panel:**
- **VIEW (N) button** — black background, white uppercase text, closes the dropdown
- **Clear All link** — underlined grey text, resets all selected filter values across every group

---

## Dropdown Option Rendering

### Standard Checkbox Filter

Each option renders as a `<label>` containing:
1. A hidden native `<input type="checkbox">`
2. A custom 14×14 px square checkbox (`<Checkbox>` component):
   - Unchecked: white fill, `1px solid #bbb` border
   - Checked: black fill, `1px solid #000` border, white SVG checkmark
3. Option text (`#444`, bolded to 600 when selected)
4. Product count in grey (e.g. `(423)`)

Multi-selection is supported — multiple options within a group can be active simultaneously.

### Color Filter (`type: 'color'`)

Same layout as checkbox but with an **additional 14×14 px circular colour swatch** between the checkbox and the label. When selected, the swatch gets `outline: 2px solid #000; outline-offset: 1px`. The `Multicolor` option uses a `conic-gradient` for the swatch fill. White swatches get a `1px solid #ddd` border to remain visible on white backgrounds.

---

## Filter State

```ts
const [selectedFilters, setSelectedFilters] =
  useState<Record<string, string[]>>(INITIAL_FILTERS);
```

`INITIAL_FILTERS` is auto-generated as `{ [key]: [] }` for every non-section group. Selected values are arrays of option label strings. Toggling adds or removes the label from the array.

**Active filter count badge:** `Object.values(selectedFilters).flat().length` — shown as a pink (`#F88A8A`) badge wherever a count is relevant (mobile FILTERS button, mobile panel header, individual accordion section headers).

---

## Mobile Filter Bar (Row 3 — mobile only)

A simple two-button horizontal bar that replaces the desktop filter row on small screens:

```
┌──────────────────────┬──────────────────────┐
│   FILTERS  [N]       │       SORT           │
└──────────────────────┴──────────────────────┘
```

- `border-top: 1px solid #e5e7eb`
- `border-bottom: 1px solid #000`
- Each button: height 48 px, uppercase, `letter-spacing: 0.2em`
- **FILTERS** button opens the full-screen `MobileFilterPanel`; shows an `#F88A8A` badge with total active filter count when `> 0`
- **SORT** button opens a bottom-sheet sort overlay

---

## Mobile Full-Screen Filter Panel (`MobileFilterPanel.tsx`)

Triggered by the FILTERS button. A `fixed inset-0 z-[60] bg-white flex flex-col` overlay — no partial sheet, full screen takeover. Locks body scroll via `document.body.style.overflow = 'hidden'` while open.

### Header (fixed, 56 px)

| Element      | Behaviour                                                   |
|--------------|-------------------------------------------------------------|
| `×` button   | Closes panel (`onClose`)                                    |
| Title        | "FILTERS" + pink badge with total active count              |
| "Clear All"  | Resets all filters; disabled (grey, no underline) when count = 0 |

### Body (scrollable accordion)

Each filter group renders as a collapsible accordion row (height 52 px header). The first two filter groups are expanded by default.

**Section dividers** (`type: 'section'`) render as a 40 px labelled band with `background: #f9f9f9` and a `border-y border-gray-200`.

**Accordion animation:** `max-height` transitions from `0px` → `1200px` over 360 ms using `cubic-bezier(0.4,0,0.2,1)`.

**Option layout (mobile):**
- Always 2 columns (`grid-cols-2`)
- Minimum touch target 44 px per option (`minHeight: 44px`)
- Color filter adds a 22×22 px circle swatch (larger than desktop's 14 px)
- Checkbox is 18×18 px (larger than desktop's 14 px for touch ergonomics)

### Footer (fixed)

A full-width black button: **VIEW {N} ITEMS** — closes the panel and returns the user to the filtered catalog. Height 52 px, uppercase, `letter-spacing: 0.2em`.

---

## Mobile Sort Bottom-Sheet

A semi-transparent backdrop (`rgba(0,0,0,0.45)`) + white sheet anchored to the bottom of the screen. `border-top: 2px solid #000`. Each sort option is a full-width 52 px button. The active option is bolded and shows an `#F88A8A` `✓`. Includes a `env(safe-area-inset-bottom)` spacer for iOS home-indicator clearance.

---

## Scrollbar Styling (`.scrollbar-pink`)

Defined in `/src/styles/theme.css`:

```css
.scrollbar-pink {
  scrollbar-width: thin;
  scrollbar-color: #F88A8A transparent;   /* Firefox */
  overflow-y: hidden;
}
.scrollbar-pink::-webkit-scrollbar { height: 3px; width: 0; }
.scrollbar-pink::-webkit-scrollbar-track { background: transparent; }
.scrollbar-pink::-webkit-scrollbar-thumb { background-color: #F88A8A; border-radius: 0; }
.scrollbar-pink::-webkit-scrollbar-button { display: none; }
```

Applied to the desktop filter buttons scroll container. The 3 px horizontal bar in `#F88A8A` appears at the bottom of the filter row only when content overflows (i.e. on narrower desktop viewports). No vertical scrollbar is shown.

---

## Design Tokens Used

| Token       | Value     | Usage                              |
|-------------|-----------|------------------------------------|
| `ACCENT`    | `#F88A8A` | Badges, active filter count, scrollbar, colour swatch outlines |
| `#DA1E1E`   | —         | Men's accent / SALE labels         |
| `#000000`   | —         | Borders, selected checkboxes, CTA buttons |
| `#e6e6e6`   | —         | `--border` CSS var, `border-gray-200` |
| `#bbb`      | —         | Section label text, inactive checkbox borders |
| `#555`      | —         | Inactive filter button text        |

---

## Files

| File                                          | Role                                              |
|-----------------------------------------------|---------------------------------------------------|
| `src/app/pages/WomenCatalogPage.tsx`          | All filter state, desktop bar, mega-dropdown, sort, pagination |
| `src/app/components/MobileFilterPanel.tsx`    | Full-screen mobile filter accordion component     |
| `src/styles/theme.css`                        | `.scrollbar-pink`, `.scrollbar-hide`, `.scrollbar-thin-light` utilities |
