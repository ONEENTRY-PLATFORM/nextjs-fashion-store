# Checkout / Delivery (`/checkout/delivery`)

Checkout step 2 — choose how to proceed and the delivery address.

## SEO / social networks

- **Meta title**: string
- **Meta description**: text

## 1. Checkout Stepper

- `Cart` → **`Delivery`** (current) → `Payment` → `Confirmation`

## 2. Auth Choice (if not logged in)

"How would you like to continue" block.

- **Eyebrow**: `"Checkout"`
- **H2**: `"How would you like to continue?"`
- **Option**: `"Sign In"` (opens `LoginModal`)
- **Option**: `"Create Account"` (opens `RegisterModal`)
- **Option**: `"Continue as Guest"` — hint `"You can create an account after checkout"`

## 3. Delivery Address

- **H1**: `"Delivery"` (uppercase tracking)

### 3a. Saved Addresses (if any are in the profile)
- Cards of saved addresses with radio selection
- Option `"Use a different address"` — expands the new-address form with the hint `"Enter a new delivery address"`

### 3b. Delivery address form

| Field | Label | Placeholder | Type |
|---|---|---|---|
| `fullName` | `"Full Name"` | `"Jane Smith"` | text |
| `phone` | `"Phone"` | `"+44 20 0000 0000"` | tel |
| `line1` | `"Address Line 1"` | `"Street name and number"` | text |
| `city` | `"City"` | `"London"` | text |
| `postcode` | `"Postal Code"` | `"SW1A 1AA"` | text |
| `instructions` | `"Special Instructions (optional)"` | `"Gate code, floor, etc."` | text |

- **Checkbox**: `"Save this address to my profile"` (only for logged-in users)
- **Button**: `"Confirm address"` (after entry)
- **Button**: `"Edit"` (on a saved address)

## 4. Delivery Method

Radio selection of delivery method (`OptionCard`):

- **`Home / Office Delivery`** — subtitle `"2–5 business days · Standard shipping"`
- **`Store Pickup`** — subtitle `"Ready within 2 hours · Try in store"`
  - Expands store selection: address, hours
- **`Parcel Locker / Pickup Point`** — subtitle `"3–5 business days · Collect at your convenience"`
  - Button/Link: `"Select Pickup Point"`

## 5. Order Summary (right column)

- List of items in the order (thumbnails)
- `Subtotal`, `Shipping`, `Total`

## 6. Continue Button

- **Button**: `"Continue to Payment"` → `/checkout/payment`
