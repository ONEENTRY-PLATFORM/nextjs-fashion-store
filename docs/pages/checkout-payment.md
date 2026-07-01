# Checkout / Payment (`/checkout/payment`)

Checkout step 3 — choose and enter the payment method.

## SEO / social networks

- **Meta title**: string
- **Meta description**: text

## 1. Checkout Stepper

- `Cart` → `Delivery` → **`Payment`** (current) → `Confirmation`

## 2. Heading

- **H1**: `"Payment"` (uppercase tracking)

## 3. Payment Method Options

A list of radio cards (`OptionCard`) — payment method selection. Exact title/subtitle/badge:

- **`Cash Payment`** — subtitle `"Pay in cash upon delivery"` — badge `"COD"`
- **`Bank Card on Delivery`** — subtitle `"Swipe your card when the order arrives"` — badge `"COD"`
- **`QR Payment (Faster Payment System)`** — subtitle `"Scan & pay instantly from your banking app"`
- **`Apple Pay`** — subtitle `"Pay with Face ID or Touch ID"`
- **`Google Pay`** — subtitle `"Fast checkout with your Google account"`
- **`Bank Card`** — subtitle `"Visa, Mastercard, Amex — powered by CloudPayments"`
- **`Installment Payment`** — subtitle `"Split into 3, 6, or 12 monthly payments · 0% interest"`

## 4. Installment Plan (if "Installment Payment" is selected)

- **Label**: `"Choose installment plan"`
- Term selection buttons: `3` / `6` / `12` (months)
- Calculation hint: `"~$XX.XX / month for {N} months"`
- The standard Card Form is shown next (see §5).

## 5. Card Form (if "Bank Card" or "Installment Payment" is selected)

| Field | Label | Placeholder |
|---|---|---|
| `cardNumber` | `"Card Number"` | `"1234 5678 9012 3456"` |
| `nameOnCard` | `"Cardholder Name"` | `"Jane Smith"` |
| `expiry` | `"Expiry Date"` | `"MM/YY"` |
| `cvv` | `"CVV"` | `"•••"` |

- **Hint below the form** (with lock icon): `"Your card details are encrypted and secure (CloudPayments)"`

## 6. FPS / QR Panel (if `QR Payment` is selected)

- Text: `"Scan with your banking app via Faster Payment System (FPS)"`
- QR image
- alt = `"Payment QR code"`

## 7. Security Note

Below the card form — lock icon + text: `"Your card details are encrypted and secure (CloudPayments)"`

## 8. Order Summary (right column)

- List of items (thumbnails)
- `Subtotal`, `Shipping`, `Discount`, `Total`

## 9. CTA

- **Button**: `"Pay Now"` (or `"Place Order"`) → `/checkout/confirmation`
