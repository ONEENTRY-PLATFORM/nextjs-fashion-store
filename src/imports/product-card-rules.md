------------------------------------------------------------------------
# GLOBAL PRODUCT CARD RULES
------------------------------------------------------------------------

All product grids across the website use a unified product card component.

This rule applies to:
- Category grids
- Men collection
- Women collection
- New Arrivals
- Sliders and recommendation blocks

------------------------------------------------------------------------

## Product Card Border System

Product cards use a black outline, but borders must render as a **single line** inside grids.

### Rules
- Each card uses a black border.
- Border must remain visible in default and hover states.
- Border thickness must remain visually consistent.
- Borders must not visually double when cards touch.

### Grid Behavior
When cards stand side-by-side:
- Only **one border line** must be visible between cards.
- Double borders that create thicker lines are not allowed.

### Implementation Principle
One of the following approaches must be used:

• Apply borders only on top & left edges  
• Add right border only to last card in row  
• Add bottom border only to last row  

OR

• Use container grid borders with internal card borders so shared edges render once.

Result: clean, uniform grid without thick separators.

------------------------------------------------------------------------

## Product Card Internal Spacing

Spacing applies only to content area, not images.

### Image Area
- Product image remains full width
- No internal padding around images

### Content Area Padding
Left padding applied to:
- Product name
- Price
- Labels
- Color options

Recommended value:
- 16–20 px left padding

### Bottom Content Spacing
Spacing required below color swatches:
- Adds breathing room before bottom border
- Recommended: 12–16 px spacing

### Layout Integrity
- Padding must not break grid alignment
- Spacing must scale correctly across responsive layouts

------------------------------------------------------------------------

## Product Card Layout Summary

Standard card structure:

    [ Product Image ]
    -------------------
       Product Name
       Price
       Labels
       Color options
       (bottom spacing)
    -------------------

------------------------------------------------------------------------
# Product Card — Long Title Handling Rule

## Fixed Card Height

The product card must always maintain a **fixed height**, regardless of the product title length.

The card height must not change based on text length.  
This ensures:

- Consistent grid alignment  
- Clean and stable layout  
- No visual jumps between cards  

---

## Long Title Display Behavior

If a product title is too long:

- The text must always remain **on a single line**
- The title must be visually truncated using ellipsis
- The following CSS rules must be applied:

```css
.product-card__title {
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

------------------------------------------------------------------------

✅ Result:
Consistent borders, clean grid lines, and readable product cards across all layouts.
