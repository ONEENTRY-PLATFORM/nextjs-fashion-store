# Checkout / Confirmation (`/checkout/confirmation`)

Final screen after successful payment.

## SEO / social networks

- **Meta title**: string
- **Meta description**: text

## 1. Checkout Stepper

- `Cart` → `Delivery` → `Payment` → **`Confirmation`** (current)

## 2. Success Banner

- **Icon**: `CheckCircle` in a green square frame (`#16a34a`)
- **H1**: `"Order Confirmed!"`
- **Caption**: `"Thank you for your purchase. We're preparing your order now."`

## 3. Order ID Box

- `Package` icon + text: `"Order ID: {ORDER_ID}"` (orderId is generated randomly)

## 4. Next-Steps Cards

A grid of 3 cards with information about next steps. Exact data:

- **Icon** `Mail` — title `"Confirmation Sent"` — desc `"A receipt has been sent to your email address."`
- **Icon** `Package` — title `"Processing"` — desc `"Your order is being picked and packed right now."`
- **Icon** `CheckCircle` — title `"Estimated Delivery"` — desc `"2–5 business days to your chosen address."`

## 5. Order Summary Mini

Brief summary of purchased items.

- **Header**: `"Your Items"` (uppercase tracking)
- Rows: image + name + `"Size {M} · Qty {N}"` + price
- Total: **`Total Paid`** + amount

## 6. Loyalty Points Block

Pink block (with accent frame).

- ★ icon + text: `"You earned {N} bonus points with this order!"`
- Where `N = floor(total × 10)`

## 7. CTA Buttons

- **Button**: `"Continue Shopping"` (with `ArrowRight` icon) → `/`
- **Button**: `"New Arrivals"` (secondary, no icon) → `/women/clothing`
