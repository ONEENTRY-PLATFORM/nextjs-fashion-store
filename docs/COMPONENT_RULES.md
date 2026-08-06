# Component Rules — Product Card & Store Card

Figma design spec for two card components used across the storefront. Merged from `product-card-rules.md` and `store-card-modal.md`.

Implemented in [`ProductCard.tsx`](../src/app/components/product/ProductCard.tsx), [`CatalogListProductCard.tsx`](../src/app/components/catalog/CatalogListProductCard.tsx), [`StoreCard.tsx`](../src/app/pages/stores/StoreCard.tsx).

---

## Product Card

All product grids across the site use one unified product card component. Applies to category grids, Men / Women collections, New Arrivals, sliders and recommendation blocks.

### Border system

Cards use a black outline, but borders must render as a **single line** inside grids.

- The border stays visible in default and hover states
- Border thickness stays visually consistent
- Borders must not double up where cards touch — no thick separators

Allowed implementations:

- borders on top & left edges only, plus right border on the last card in a row and bottom border on the last row
- or container grid borders with internal card borders so shared edges render once
- or the `border-r ... last:border-r-0` pattern used in [`RecentlyViewedSection.tsx:58`](../src/app/pages/product/RecentlyViewedSection.tsx#L58)

### Internal spacing

Spacing applies to the content area only, never to images.

| Area | Rule |
|---|---|
| Image | Full width, no internal padding |
| Content (name, price, labels, colors) | Left padding **16–20px** |
| Below color swatches | **12–16px** before the bottom border |

Padding must not break grid alignment and must scale across responsive layouts.

### Layout

```
[ Product Image ]
-------------------
   Product Name
   Price
   Labels
   Color options
   (bottom spacing)
-------------------
```

### Fixed height & long titles

The card keeps a **fixed height** regardless of title length — consistent grid alignment, no visual jumps between cards.

A long title stays on a single line and truncates with an ellipsis:

```css
white-space: nowrap;
overflow: hidden;
text-overflow: ellipsis;
```

In Tailwind this is the `truncate` utility — see [`ProductCard.tsx:510`](../src/app/components/product/ProductCard.tsx#L510).

---

## Store Card

### Fixed height

All store cards keep a uniform, fixed height regardless of how much store information exists:

- identical height across all cards
- no expansion when extra information is available
- no inline expand/collapse — it would shift the grid

### "More Info" modal

Clicking **More Info** opens a modal with the full store information; the card itself stays unchanged.

#### Overlay
- Page behind is blurred (`backdrop-filter`) or dimmed (`rgba(0,0,0,0.4–0.6)`)
- Background scrolling disabled while open
- Modal sits above all page content

#### Content
Full opening hours, in-store services, contact details, email & social links, any additional information. Content may scroll inside the modal.

#### Closing
Close icon (×), click outside the modal, or `Escape` on desktop. On close: blur/dim removed, background scroll restored, layout unchanged.
