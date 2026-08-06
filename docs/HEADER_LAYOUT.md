# Header Layout — Alignment & Spacing

Design spec for the site header. Merged from two Figma hand-off notes that contradicted each other on zone composition; the zones below are corrected against the implementation.

Implemented in [`HeaderTopBar.tsx`](../src/app/components/header/HeaderTopBar.tsx), [`Header.tsx`](../src/app/components/header/Header.tsx), [`HeaderMegaMenu.tsx`](../src/app/components/header/HeaderMegaMenu.tsx), [`HeaderSearch.tsx`](../src/app/components/header/HeaderSearch.tsx), [`HeaderMobileDrawer.tsx`](../src/app/components/header/HeaderMobileDrawer.tsx).

---

## 1. Shared container

All three header rows use the **same container**, so their left and right content edges align with each other and with the rest of the page:

```
max-w-384 mx-auto px-8 lg:px-12
```

No row is allowed extra or reduced horizontal padding of its own.
Cited: [`HeaderTopBar.tsx:40`](../src/app/components/header/HeaderTopBar.tsx#L40), [`Header.tsx:166`](../src/app/components/header/Header.tsx#L166), [`HeaderMegaMenu.tsx:46`](../src/app/components/header/HeaderMegaMenu.tsx#L46).

---

## 2. Row 1 — Top Bar (region / language / phone / stores)

- Fixed height **40px** (`h-10`), black background, hidden below `md`
- `flex items-center justify-between`, `text-xs`
- **Left:** region selector, language selector (rendered only when the tenant publishes >1 locale)
- **Right:** support phone, Store Locations link
- Inner group gap: **24px** (`gap-6`)

---

## 3. Row 2 — Main header

Height **64px** (`h-16`), `flex items-center justify-between`, bottom border `border-gray-200`.

### Left zone
- Burger button (`lg:hidden`)
- Logo, 146×32

### Center zone
- Gender switch **WOMEN / MEN** — the central anchor of the header
- `hidden lg:flex items-center justify-center flex-1 mx-8`, items `gap-6`
- Active gender is underlined with a 2px bar in the accent color (`--women` / `--men`)

### Right zone
- Desktop search field (`w-64`), search toggle button below `md`
- Account, Wishlist, Bag — **icons only**, no text labels
- Each control is a `min-w-10 min-h-10` hit area, so spacing between icons is uniform by construction

> Note: region and language live in the Top Bar (row 1), **not** in the main header's left zone; search lives in the right zone, **not** in the center. Older hand-off notes claimed otherwise.

---

## 4. Row 3 — Category navigation

- Center-aligned as a group (`flex items-center justify-center`)
- Item padding **20px / 12px** (`px-5 py-3`), items vertically centered
- Same container padding as rows 1–2
- Highlighted SALE must not break the spacing rhythm

---

## 5. Vertical alignment rule

Every primary header block is vertically centered: `display: flex` + `align-items: center`. Manual margin offsets for vertical positioning are not allowed — all elements share one vertical center axis.

---

## 6. Optical balance

- Icons align visually with the text baseline
- Badge counters (`wishlistCount`, `totalItems`) are absolutely positioned (`-top-1 -right-1`, `w-4 h-4`) so they never affect layout alignment
- Search input height visually matches adjacent blocks
- No element should visually "float" above or below the others

---

## Result

Structured, symmetrical, technically precise, calm. Alignment and spacing consistency is mandatory across desktop, tablet and mobile.
