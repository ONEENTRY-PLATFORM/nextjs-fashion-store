# Tailwind Component Conventions

Design-system rules for the Tailwind implementation layer, plus a note on where the current code diverges from them.

Theme tokens live in [`app/globals.css`](../app/globals.css); JS-side color constants in [`src/app/constants/colors.ts`](../src/app/constants/colors.ts).

---

## 1. Core rule

All UI is built from Tailwind utility classes, predefined design tokens (spacing, colors, typography) and reusable component patterns. No inline styles, no arbitrary values outside the design system.

---

## 2. Design tokens

### Spacing
8px scale. No arbitrary spacing values (`mt-[13px]` is not allowed).

### Colors
Semantic tokens only — `primary-women`, `primary-men`, `black`, `white`. No hardcoded hex inside components.

Defined as Tailwind v4 theme tokens:

```css
/* app/globals.css:36-37 */
--primary-women: #F88A8A;
--primary-men:   #DA1E1E;

/* app/globals.css:88-89 — @theme inline */
--color-primary-women: var(--primary-women);
--color-primary-men:   var(--primary-men);
```

Used as `bg-primary-women`, `text-primary-men`, `active:bg-primary-men`, etc.

Where a color has to reach JavaScript (a prop, an inline CSS variable), use the constants from [`colors.ts`](../src/app/constants/colors.ts) — `ACCENT_WOMEN`, `ACCENT_MEN`, `SALE_COLOR`, … — never a literal. The header publishes the active gender accent as `--women` / `--men` / `--accent` on `<header>` ([`Header.tsx:156-160`](../src/app/components/header/Header.tsx#L156-L160)), so descendants can use `bg-accent` / `text-(--women)`.

### Typography
Font family `Inter`. Use the predefined text styles for headings and body — see [`HERO_TYPOGRAPHY.md`](./HERO_TYPOGRAPHY.md) for the hero override.

---

## 3. Components

### 3.1 Buttons
- `flex items-center justify-center`
- `transition-all duration-200`
- **No border radius** (sharp edges — `rounded-none`)
- Padding from the spacing scale

Variants: Primary (Women), Primary (Men), Secondary, Outline, Ghost, Disabled. Each ships default / hover / active / disabled states. No custom button styling outside these variants.

### 3.2 Icons
Consistent size scale (16 / 20 / 24px), vertically aligned via flex, inherit `currentColor`, one style family — don't mix outline and filled at random.

### 3.3 Cards
Follow the spacing system, consistent padding, aligned to the grid. See [`COMPONENT_RULES.md`](./COMPONENT_RULES.md).

---

## 4. Interaction states

Interactive components implement hover, active, focus-visible and (where applicable) disabled. Focus states stay visible and accessible.

---

## 5. Where the code diverges

Audited against the current tree — worth knowing before treating this file as ground truth:

- **Brand tokens: followed.** `primary-women` / `primary-men` are real theme tokens and are used in 7 components (`LoginModal`, `MiniCart`, `DiscountBanner`, …).
- **Neutral colors: not followed.** ~19 components carry arbitrary hex for greys, borders and warning colors — `border-[#e5e7eb]`, `bg-[#fafafa]`, `text-[#78350f]` ([`CartUnavailableNotice.tsx:29-44`](../src/app/components/cart/CartUnavailableNotice.tsx#L29-L44), [`CatalogMobileSort.tsx:36-54`](../src/app/components/catalog/CatalogMobileSort.tsx#L36-L54)). These have no semantic token yet; add one before reaching for a literal.
- **Arbitrary sizing:** ~9 component files use `-[Npx]` values (e.g. `border-[1.5px]`, `text-[13px]`). Some are legitimate one-offs from the Figma spec (`tracking-[0.3em]`, `clamp()` in the hero), some are drift.

---

## Final principle

Tailwind is the implementation layer of the design system. Components stay consistent, reusable and aligned with the global UI rules.
