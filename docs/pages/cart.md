# Cart (`/cart`)

Cart page. 4 blocks.

## SEO / social networks

- **Meta title**: string
- **Meta description**: text

## 1. Checkout Stepper

Checkout step indicator.

- Steps: **`Cart`** (current) → `Delivery` → `Payment` → `Confirmation`

## 2. Page heading

- **H1**: `"Cart"` (uppercase tracking)

## 3. Cart Items List (if the cart is not empty)

### Bulk actions row
- **Checkbox**: `"Select All"`
- **Button** (visible when ≥1 item is selected): `"Remove Selected (N)"` (with `Trash2` icon)

### Item cards
- **Cart item card** (×N):
  - Image + alt = `name`
  - Brand
  - Name
  - **Size**: `"Size {M}"`
  - Price
  - **QtyControl**: `−` / `+` buttons + value
  - **Button**: `"Wishlist"` — aria-label `"Move to wishlist"`
  - **Button**: `"Remove"` — aria-label `"Remove item"`
- **Bundle (Special Offer)** — separate block:
  - Badge `"Special Offer Bundle"`
  - Multiple items inside
  - Bundle price
  - **Button**: aria-label `"Remove bundle"`

## 4. Summary (right column)

### Order Summary
- **H2**: `"Order Summary"`
- `Subtotal ({N} items)` — dynamic caption with quantity
- `Items discount` (if there are item discounts)
- `Delivery`: `"Free"` (in green)
- Promo discount (if applied): `−$XX.XX`
- **Total**: $XX.XX

### Loyalty bonus block
- ★ icon (accent) + text: `"You'll earn {N} pts with this order"`

### Promo Code
- **Checkbox with label**: `"I have a promo code"` (with `Tag` icon)
- When activated, expands to:
  - **Field**: placeholder `"Enter code"`
  - **Button**: `"Apply"`
- Success: `"✓ Promo applied — {label}!"` (green)
- Error: `"Invalid promo code"`

### CTA
- **Button**: `"Proceed to Checkout"` → `/checkout/delivery`
- **Button/link**: `"Continue Shopping"` → `/`

## 5. Empty Cart (if the cart is empty)

- **Text**: `"Your cart is empty"`
- **Button**: `"Continue Shopping"` → `/`
