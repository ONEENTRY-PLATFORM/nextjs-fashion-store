# Checkout Pipeline

> Reference for the three-step checkout funnel in `apps/new-shop-nextjs`.
> Audience: LLM agents that need a faithful, code-level picture of how the
> Delivery → Payment → Confirmation flow is implemented.

---

## 1. Overview

The checkout is a three-segment funnel rendered through Next.js App Router:

```
/cart  ──►  /checkout/delivery  ──►  /checkout/payment  ──►  /checkout/confirmation
            (CheckoutStepper 1)      (CheckoutStepper 2)     (CheckoutStepper 3)
```

The App Router route segments are thin wrappers — each `page.tsx` under
`app/checkout/<step>/` re-exports the SEO metadata from
`src/app/data/seoData.ts` and renders one of three client components:

| Route | App Router file | Page component |
|---|---|---|
| `/checkout/delivery` | `app/checkout/delivery/page.tsx` | `src/app/pages/DeliveryPage.tsx` |
| `/checkout/payment` | `app/checkout/payment/page.tsx` | `src/app/pages/PaymentPage.tsx` |
| `/checkout/confirmation` | `app/checkout/confirmation/page.tsx` | `src/app/pages/ConfirmationPage.tsx` |

The stepper (`src/app/components/CheckoutStepper.tsx`) is rendered at the top
of every step. Its `STEPS` array hard-codes `Cart → Delivery → Payment →
Confirmation`. Only completed steps (`idx < currentStep`) are clickable;
the current and upcoming steps are render-disabled (`disabled={!done &&
!active}`).

### Success path

`DeliveryPage.handleContinueToPayment` (line 154) validates inputs and
navigates to `/checkout/payment` via `router.push`. `PaymentPage.handlePlaceOrder`
(line 26) optionally validates a card form, then `router.push('/checkout/confirmation')`.
`ConfirmationPage` mounts, **generates a synthetic order id client-side after mount**
(`crypto.randomUUID` inside `useEffect`, lines 22 + 31-32 — the generation is
deferred to client-only to avoid Next.js hydration mismatch), and schedules
`clearCart()` 200 ms after mount.

### Abandonment paths

- "Back to Cart" button on Delivery (line 273) — `router.push('/cart')`.
- "Back to Delivery" link on Payment (line 187).
- `PaymentPage.handlePlaceOrder` redirects to `/` (line 27) if the cart is
  empty when the place-order button is clicked.
- No persisted "abandoned-cart" event is dispatched. Cart state lives in
  Redux + `localStorage` (`src/app/store/cartSlice.ts`) and survives
  reloads until `clearCart()` runs on Confirmation mount.

### Important: no OneEntry order persistence

Grep across `src/` finds **no** `Orders.create*`, no `orders_storage`, no
`form_data` POST, no `ordersApi.ts`, and the only server action in
`src/app/actions/auth.ts` is a credential check. The checkout is a UI
mock — order placement does not call the OneEntry SDK or any backend.
The only OneEntry-backed REST endpoint touched anywhere along the path
is the cart sync (`src/app/store/api/cartApi.ts`) which runs while the
user browses the cart, **not at checkout submission**.

---

## 2. Order Data Model

There is no DTO sent to OneEntry. The "order" exists only as Redux state
plus three client-only variables on the Confirmation page:

| Concept | Where it lives | Persisted? |
|---|---|---|
| Cart items | `state.cart.items` (Redux, persisted to `localStorage`) | yes — local |
| Delivery method + address | `DeliveryPage.tsx` local `useState` | no |
| Saved address | `state.user.data.addresses` via `userSlice.addAddress` | yes — local |
| Payment method + card details | `PaymentPage.tsx` local `useState` + `CardForm` ref state | no |
| Coupon (`appliedCoupon`) | `DeliveryPage.tsx` local `useState` | no — lost on navigation |
| Order id | `ConfirmationPage.tsx` `useState<string\|null>(null)` + `setOrderId(randomOrderId())` in `useEffect` | no — random per visit, generated client-only (post-hydration) |

If/when the project moves to real OneEntry order persistence, the form
marker is expected to be `checkout` (`forForms_checkout` attribute set —
see `agents_datasets/rules/users-architecture.md` §"forForms_checkout —
NARROW: order-specific fields only") with the order written to
`orders_storage` marker `default`. None of that is wired today.

---

## 3. Step 1: Delivery (`/checkout/delivery`)

Page component: `src/app/pages/DeliveryPage.tsx` (310 lines).

### 3.1 Auth gate

`useEffect` (line 187) opens `GuestCheckoutModal` automatically when the
user is not logged in. The modal
(`src/app/pages/checkout/GuestCheckoutModal.tsx`) offers three options:

- **Sign In** — closes the modal, opens `LoginModal` via `useAuth().openLoginModal`.
- **Create Account** — opens `RegisterModal` via `openRegisterModal`.
- **Continue as Guest** — simply closes the modal; the user proceeds without auth.

### 3.2 Delivery methods

Three mutually exclusive radio-cards (`DeliveryMethod = 'home' | 'store' | 'locker'`,
default `'home'`):

#### Home / Office (`DeliveryMethodHome.tsx`)

- Logged-in user with saved addresses → list of `RadioCard` rows from
  `state.user.data.addresses` plus an "Use a different address" entry
  that expands a new-address form (line 111).
- Anonymous user or empty address book → the new-address form is rendered
  inline (line 154).
- Address form fields (matching `addressSchema` in `src/app/utils/schemas.ts`):

  | Field | Type | Validation (Zod) |
  |---|---|---|
  | `fullName` | text | `min(1)`, `max(100)` |
  | `phone` | tel | `min(1)`, regex `/^\+?[\d\s\-()\[\]]{7,20}$/` |
  | `line1` | text | `min(1)`, `max(200)` |
  | `city` | text | `min(1)`, `max(100)` |
  | `postcode` | text | `min(1)`, regex `/^[A-Z0-9\s\-]{3,10}$/i` |
  | `instructions` | text | optional, `max(500)` |

- Optional checkbox "Save this address to my profile" (`saveNewAddr`,
  default `true`). When checked, on Confirm the address is dispatched
  via `addAddress` (line 148) — generating an id with
  `crypto.randomUUID().slice(0, 8)` prefixed `'a'`.
- Delivery date selector — `getDeliveryDates(7)` (DeliveryPage line 35)
  returns the next 7 calendar days starting tomorrow, **skipping Sundays**.
- Time-slot selector — `DELIVERY_TIME_SLOTS` from `checkoutConfig.ts`:
  `morning` (09:00–13:00), `afternoon` (13:00–17:00), `evening` (17:00–21:00).

#### Store Pickup (`DeliveryMethodStore.tsx`)

- Selects a store from `PICKUP_STORES` (3 hardcoded London stores in
  `src/app/data/checkoutConfig.ts:11`).
- Anonymous user must additionally fill `GuestContactForm` (full name,
  phone, email) — validated by `guestContactSchema` (`fullName` min 1,
  `email` rfc, `phone` same regex as address).

#### Parcel Locker (`DeliveryMethodLocker.tsx`)

- Selects from `PARCEL_LOCKERS` string list (4 hardcoded locations).
- Same anonymous → `GuestContactForm` rule applies.

### 3.3 Continue-to-payment guard

`handleContinueToPayment` (line 154):

1. If method = `'home'`:
   - If logged-in **and** the user picked a saved address (not `'new'`) →
     allow.
   - Else if `newAddrConfirmed === false` → parse `newAddrForm` against
     `addressSchema`. On failure, set per-field errors and return.
2. If method = `'store' | 'locker'` and `!isLoggedIn` → parse
   `guestContact` against `guestContactSchema`; on failure set errors
   and return.
3. On success → `router.push('/checkout/payment')`.

There is no validation of the saved address itself (it was validated at
add time) and no per-slot enforcement.

---

## 4. Step 2: Payment (`/checkout/payment`)

Page component: `src/app/pages/PaymentPage.tsx` (249 lines).

### 4.1 Payment methods (`paymentMethodsConfig.ts`)

The `PayMethod` union (`PaymentPage.parts.tsx:7`) enumerates seven
options, grouped in the UI into two sections:

#### "Pay on Delivery" (COD)
- `cash` — Cash Payment, badge `COD`. Description-only, no extra inputs.
- `card-delivery` — Bank Card on Delivery, badge `COD`. POS terminal
  description only, no extra inputs.

#### "Online Prepayment"
- `qr` — QR / Faster Payment System. Renders a static decorative QR
  grid (`QRPanel`, no real payment session).
- `apple-pay` — renders an `<WalletButton>` (decorative — no
  `ApplePaySession` wiring; the SVG is a static asset under
  `/icons/wallet/apple-pay.svg`).
- `google-pay` — same pattern, blue button. Decorative.
- `card-online` — renders the `CardForm` (see §4.2). Subtitle text says
  "Visa, Mastercard, Amex — powered by CloudPayments" but the form
  doesn't tokenize: it validates and stays in component state.
- `installment` — picks 3/6/12 months, then renders `CardForm` inside
  `InstallmentPanel`. Monthly price hardcoded against `368.99`
  (`PaymentPage.parts.tsx:237`) — display only.

Default selected method: `'card-online'` (`PaymentPage.tsx:23`).

### 4.2 Card form (`CardForm`, `PaymentPage.parts.tsx:72`)

Fields and validation (`paymentSchema` in `src/app/utils/schemas.ts:106`):

| Field | Mask / Max | Validation |
|---|---|---|
| `cardNumber` | `maxLength={19}` | regex `/^[\d\s]{13,19}$/` **and** Luhn-10 (`luhn` helper at line 93) |
| `nameOnCard` | — | `min(1)`, `max(100)` |
| `expiry` | `maxLength={5}` | regex `/^(0[1-9]|1[0-2])\/\d{2}$/` and `refine` that `MM/YY` is in the future |
| `cvv` | `maxLength={4}`, type=password | regex `/^\d{3,4}$/` |

The card form is exposed via `useImperativeHandle` so the parent page
can call `cardRef.current?.validate()` (line 28) before navigating.

### 4.3 PCI / tokenization

**There is no tokenization layer.** `CardForm` stores the raw PAN and CVV
in React `useState` (line 73) and never POSTs them anywhere — the data
exists only for as long as the page is mounted. No CloudPayments script,
no Stripe Elements, no PSP iframe. The "SSL Encrypted / PCI DSS Compliant
/ 3D Secure" badges shown at line 177 are marketing copy from
`PAYMENT_PAGE_LABELS.securityBadges`.

If the playground is ever wired to a real PSP, the CardForm must be
replaced with a hosted iframe / SDK Element so card data never reaches
the React tree.

### 4.4 Place Order

`handlePlaceOrder` (line 26):

```ts
if (items.length === 0) { router.push('/'); return; }
if ((method === 'card-online' || method === 'installment') && !cardRef.current?.validate()) return;
router.push('/checkout/confirmation');
```

That's the entire submission. No coupon is re-applied here, no order is
written to a backend, no payment session is created. The button label
is `"Place Order · {fmt(total)}"` (line 197) — note `total` here is the
**raw cart total ignoring the coupon** (see §7).

---

## 5. Step 3: Confirmation (`/checkout/confirmation`)

Page component: `src/app/pages/ConfirmationPage.tsx` (151 lines).

### 5.1 Order id generation

```ts
function randomOrderId() {
  return 'OE-' + crypto.randomUUID().replace(/-/g, '').slice(0, 8).toUpperCase();
}
```

Generated client-only after mount: `useState<string | null>(null)` (line 29)
+ `setOrderId(randomOrderId())` inside `useEffect` (line 32). The deferred
generation avoids Next.js hydration mismatch (server renders an empty `<strong></strong>`,
the client fills it post-mount). The id is therefore **ephemeral, not persisted,
and not unique across users or sessions**. There is no lookup endpoint backing
it.

### 5.2 What the user sees

1. Large success icon + `CONFIRMATION_LABELS.heading` ("Order Confirmed!").
2. The synthetic order id box.
3. Three "what happens next" cards (`CONFIRMATION_INFO_CARDS` in
   `src/app/data/confirmationLabels.ts:33`):
   - **Confirmation Sent** — "A receipt has been sent to your email address."
   - **Processing** — "Your order is being picked and packed right now."
   - **Estimated Delivery** — "2–5 business days to your chosen address."
4. Itemised summary — read straight from `useCart().items` (rendered
   before the 200 ms `clearCart()` effect fires).
5. A loyalty-points line:
   `${Math.floor(total * 10)} bonus points` — display-only, not posted anywhere.
   ⚠ **Formula divergence between pages:** `CartPage.tsx:295` computes
   loyalty as `Math.floor(finalTotal * 10)` (post-coupon), while
   `ConfirmationPage.tsx:125` uses `Math.floor(total * 10)` (pre-coupon,
   because Confirmation reads `useCart().total` and the coupon was held
   in `DeliveryPage` local state, not Redux). Result: same order can
   advertise different bonus numbers across Cart → Confirmation when a
   coupon was applied. No bonus is ever written to a real ledger
   (`bonusHistory` in `userData.ts:368` is a static mock).
6. Two CTAs: `Continue Shopping` → `/`, `New Arrivals` → `/women/clothing`.

### 5.3 Email pathway

**No email is sent.** The "A receipt has been sent" copy is informational
only — there is no email service wired in, no SMTP/transactional provider
integration, no OneEntry event/notification trigger. Real wiring would
flow through OneEntry `events` (see `agents_datasets/rules/oneentry-invariants.md` §10).

---

## 6. Coupon Flow

### 6.1 Coupon dictionary

Hardcoded in `src/app/data/checkoutConfig.ts:3`:

```ts
export const CHECKOUT_COUPONS: Record<string, { label: string; pct: number }> = {
  ONEENTRY10: { label: '10% off', pct: 10 },
  SAVE10:     { label: '10% off', pct: 10 },
  ONEENTRY20: { label: '20% off', pct: 20 },
  SUMMER15:   { label: '15% off', pct: 15 },
  WELCOME25:  { label: '25% off', pct: 25 },
};
```

Note `pct` here is the **integer percent** (e.g. `10` means 10%), and
the discount calculation divides by 100 — see §7.

### 6.2 Entry point

A `Tag`-iconed "Promo Code" input + "Apply" button lives in the
right-column `DeliveryOrderSummary` on the Delivery step
(`src/app/pages/checkout/DeliveryOrderSummary.tsx:90`). There is **no
coupon field on the Payment step** — the user must apply the code on
Delivery and the value travels via Redux/component state.

Actually inspecting `PaymentPage.tsx`: the right-column "Order Summary"
on Payment ignores `appliedCoupon` entirely (line 222 uses raw `total`
from `useCart()`). This is a **known inconsistency**: a coupon applied
on Delivery is not visible on Payment, and the "Place Order · ${total}"
total on Payment shows the pre-coupon amount.

### 6.3 Apply logic

`DeliveryPage.handleApplyCoupon` (line 76):

1. Trim + uppercase the input → `code`.
2. Set `couponLoading = true` and start a 900 ms `setTimeout` to mimic
   a network call.
3. If `CHECKOUT_COUPONS[code]` exists → store it in `appliedCoupon`,
   show success state, clear the input.
4. Else → clear `appliedCoupon`, show "Invalid or expired code" error.

`handleRemoveCoupon` clears state to idle. The timeout ref is cleaned
up on unmount (line 95).

### 6.4 Discount math

`DeliveryPage.tsx:73`:

```ts
const couponDiscount = appliedCoupon
  ? Math.round(total * CHECKOUT_COUPONS[appliedCoupon].pct) / 100
  : 0;
const finalTotal = Math.round((total - couponDiscount) * 100) / 100;
```

`total` here is `useCart().total` = the cart subtotal (no delivery, no
tax). The coupon is applied at the **cart level** (`applicability: TO_ORDER`
in OneEntry discount terminology — see `agents_datasets/rules/discounts-setup.md` §3),
not per-item. There is no stacking limit and no order-of-application
question because only one coupon may be active at a time.

### 6.5 Coupon state per page — at-a-glance ⚠

The coupon is held in **page-local `useState`**, never in Redux. This
produces three independent slates and well-defined zeroing points. An
LLM auditing this code should understand the table below before
suggesting "fix the coupon math":

| Page | Coupon field exists? | Math used | Reflected in displayed total? | Persisted across navigation? |
|---|---|---|---|---|
| Cart (`/cart`) | ✅ yes — `CartPage.tsx:32` `promoDiscount` `useState(0)` | `finalTotal = total - promoDiscount` (line 104, no rounding) | yes — summary shows `finalTotal` | ❌ no — discarded on route change |
| Delivery (`/checkout/delivery`) | ✅ yes — `DeliveryPage.tsx:67` `appliedCoupon` `useState<string \| null>` | `couponDiscount = Math.round(total * pct) / 100`; `finalTotal = round((total - couponDiscount) * 100) / 100` (line 73) | yes — summary shows `finalTotal` | ❌ no — discarded on route change |
| Payment (`/checkout/payment`) | ❌ no input field, no `appliedCoupon` state | none — uses raw `useCart().total` (line 197, 236) | ❌ **no** — Place Order button shows `total` ignoring whatever coupon was applied on Delivery | n/a |
| Confirmation (`/checkout/confirmation`) | ❌ no input | none — synthetic order id; itemised summary from `useCart().items` | n/a — order recap, not a total to pay | n/a |

**Consequences:**

- A coupon entered on Cart is invisible to Delivery (and vice versa). User must re-enter the same code on each page that supports it.
- The Payment page's "Place Order · $X" button shows the **pre-coupon** total, even after a successful Apply on Delivery. The user is charged the un-couponed amount as far as the UI is concerned (and since there is no PSP integration — see §4.3 — nothing is actually charged either way).
- Math precision differs: Cart subtracts `promoDiscount` as-is (raw `setState` value); Delivery rounds to cents twice. For a 25% coupon on a $99.95 cart Cart could show `$74.96` vs Delivery `$74.96` — usually the same, but a hand-set `promoDiscount` could diverge.

**To fix properly:** lift the coupon into Redux (a new `checkoutSlice.appliedCoupon`) and have all three pages read from it. Documented but not done.

---

## 7. Pricing Math

`src/app/context/CartContext.tsx:122-126`:

```ts
const totalItems    = items.reduce((s, i) => s + i.quantity, 0);
const subtotal      = items.reduce((s, i) => s + i.price * i.quantity, 0);
const originalTotal = items.reduce((s, i) => s + (i.originalPrice ?? i.price) * i.quantity, 0);
const discount      = Math.max(0, originalTotal - subtotal);
const total         = subtotal;
```

Notes:

- **Per-item "sale" discount** = `originalPrice − price` accumulated
  across the cart. It is purely a display artifact (the cart already
  has discounted prices in `items[].price`); `discount` is shown on the
  summary as a strike-through-style line.
- **`total` ≡ `subtotal`** — they're aliases. The cart context does
  **not** subtract the coupon discount; that's done in the Delivery
  page as a derived `finalTotal` (§6.4).
- **Delivery cost** is always rendered as "Free" — see `OS.deliveryFree`
  in `checkoutLabels.ts:75` and `:86`. There is no shipping calculator,
  no postcode-based rate lookup, no carrier integration.
- **Taxes** — not computed anywhere. Prices in the data files are
  assumed to be tax-inclusive (Western EU-style).

Computation order: `subtotal → (display) discount → coupon discount →
finalTotal`. Free shipping is added as a zero. Total payable shown to
the user on the Delivery summary is `finalTotal`; on the Payment page
"Place Order" button it is `total` (the un-couponed value).

### 7.1 SEO-only shipping & return constants ⚠

`src/app/data/seoData.ts:15-19` exports five shipping/return constants:

```ts
export const FREE_SHIPPING_THRESHOLD = 50;   // £50+ = free UK delivery
export const RETURN_WINDOW_DAYS       = 28;
export const DELIVERY_COUNTRY         = 'GB';
export const DELIVERY_MIN_DAYS        = 2;
export const DELIVERY_MAX_DAYS        = 5;
```

**None of these affect runtime behaviour.** They are consumed only by
JSON-LD `shippingDetails` / `hasMerchantReturnPolicy` builders in
`app/product/[id]/page.tsx` and `app/[...slug]/page.tsx`. The checkout
UI itself:

- Always shows "Free delivery" regardless of cart total (no
  `if (total < FREE_SHIPPING_THRESHOLD) charge_shipping_fee` branch
  anywhere — grep confirms zero call sites for `FREE_SHIPPING_THRESHOLD`
  outside `seoData.ts` and JSON-LD scripts).
- Has no min-cart-amount gate on the Continue button.
- Hard-codes the delivery estimate "2–5 business days" in
  `confirmationLabels.ts:33` rather than reading `DELIVERY_MIN_DAYS` /
  `DELIVERY_MAX_DAYS`.
- Has no `/returns` flow; the 28-day return window is a marketing claim
  only.

**Implication for an LLM:** do **not** read these constants as business
rules and do **not** assume a discount/threshold engine wires through
them. They are SEO copy that happens to live in TypeScript instead of a
CMS field. When OneEntry comes online they should move to
`forForms_checkout` / `discounts` config and be removed from
`seoData.ts`. See also `./I18N.md` §6 "Currency authority conflict"
for the related USD-vs-GBP divergence and `./SEO_OPTIMIZATION.md` for the
JSON-LD shape that consumes them.

---

## 8. Form Submission via OneEntry

Not implemented. The blueprint pipeline would expect this checkout flow
to map to the `checkout` form (`type: order`, `forForms_checkout`
attribute set) with submissions written to `form_data` and an order
row in `orders_storage` (marker `default`, `general_type_id: 21`).
The recommended attribute schema is documented in
`agents_datasets/rules/users-architecture.md` §"forForms_checkout —
NARROW".

The currently-collected client-side fields map to those attributes as
follows (when wiring is added later):

| Client state | Source | OneEntry form attribute |
|---|---|---|
| `method` | `DeliveryPage.tsx:55` | `delivery_method` (list) |
| `selectedStore.id` / `selectedLocker` | DeliveryPage state | `delivery_pickup_point` |
| Address (logged-in saved or new-addr form) | `userSlice.addresses` or `newAddrForm` | `address_line1` / `city` / `postcode` + identity copied from `forUsers` |
| `selectedDate` + `selectedSlot` | DeliveryPage state | `delivery_slot` (dateTime) |
| `instructions` | `newAddrForm.instructions` | `delivery_instructions` |
| `method` (PayMethod) | `PaymentPage.tsx:23` | `payment_method` (list) |
| `appliedCoupon` | DeliveryPage state | `promo_code` |
| Card fields | `CardForm` state | **never** — these go through a PSP iframe, not the form |
| `guestContact.*` | DeliveryPage state | `guest_full_name` / `guest_email` / `guest_phone` (Pattern A guest checkout) |

---

## 9. Order Persistence

Not implemented. The `orders_storage` marker `default` does not get a
new row — the `randomOrderId()` value is not reachable by any backend
query. Account → My Orders (`src/app/pages/account/MyOrdersSection.tsx`)
reads from a hardcoded `USER_DATASET.orders` fixture
(`src/app/data/userData.ts`), not from anything created during checkout.

When real persistence is added, the expected flow is:

1. Build a `form_data` payload from the captured fields above.
2. POST to `/api/content/form-data` against form marker `checkout`.
3. Response carries the order id (numeric) from `orders_storage`.
4. Persist `orderId` and pass it as a URL param to
   `/checkout/confirmation?id=…` so refreshing the page keeps showing
   the same order.
5. Optionally fetch order detail via OneEntry order content APIs for
   the confirmation summary instead of the local cart snapshot.

---

## 10. Authenticated vs Guest Checkout

`useAuth().isLoggedIn` drives all auth-conditional behavior:

| Aspect | Logged in | Guest |
|---|---|---|
| Modal on Delivery mount | not shown (line 189) | `GuestCheckoutModal` shown (line 188) |
| Saved address list | rendered if `savedAddresses.length > 0` | not rendered |
| "Save address to profile" checkbox | shown (`saveNewAddr` default `true`) | n/a — addresses can't persist anonymously |
| Store / Locker contact form | name/phone pulled from profile elsewhere | `GuestContactForm` required, validated by `guestContactSchema` |
| Cart sync | `cartApi.ts` sync runs when `authToken` present | local-only Redux |
| Order persistence | n/a (no backend) | n/a (no backend) |

Pattern A guest checkout (single form, `guest_*` fields) per
`agents_datasets/rules/users-architecture.md` §"Guest checkout — two
acceptable patterns" is the appropriate target shape; the playground
already captures `guestContact = { fullName, email, phone }` at the
right moment.

---

## 11. Error Handling

### Validation errors

Each Zod schema produces per-field error messages bubbled through the
`setErrors` reducers:

- `addrErrors` / `guestContactErrors` on Delivery — rendered inline via
  `FormField`'s `error` prop.
- `errors` inside `CardForm` — rendered via per-input red border + a
  small `<p className="text-xs text-red-500">` (line 124, 136, 150, 163).
- `couponStatus === 'error'` on Delivery — shows
  `L.promoInvalid = "Invalid or expired code"` (line 136 of
  `DeliveryOrderSummary.tsx`).

### Payment failures

Cannot happen — there is no payment provider. The card form only blocks
submission with client-side validation; once Luhn + expiry pass,
`handlePlaceOrder` always navigates to `/checkout/confirmation`.

### Network errors

The only network calls in the flow are the optional cart-sync mutations
from `cartApi.ts` (add/remove/setCart). They are wrapped in
`.catch((err) => …)` blocks in `CartContext.tsx` (lines 154, 207, 263,
282) that emit a `syncWarning` and roll the optimistic change back —
the checkout itself does not surface these errors on the Delivery /
Payment pages.

### Empty-cart guard

`PaymentPage.handlePlaceOrder` (line 27) redirects to `/` when
`items.length === 0` is detected at click time. There is no equivalent
guard on the Delivery or Confirmation pages (a directly-entered URL on
an empty cart will render an empty summary).

---

## 12. Cart Cleanup

`ConfirmationPage.tsx:31`:

```ts
useEffect(() => {
  const timer = setTimeout(() => clearCart(), 200);
  return () => clearTimeout(timer);
}, [clearCart]);
```

The 200 ms delay exists so the page can render the just-purchased items
in the "Your Items" summary before they vanish from `useCart()`. After
the timer fires:

- `cartActions.clearCart()` empties `state.cart.items` in Redux.
- If `isCartApiEnabled() && authToken` are both truthy, `triggerSet({
  items: [] })` is fired against OneEntry to mirror the empty cart on
  the server (`CartContext.tsx:281`).
- No order-saved acknowledgement is awaited — the cart is cleared
  unconditionally because there is nothing to acknowledge.

Reloading the Confirmation page **regenerates a new order id** (the
`useState` initialiser runs again) and shows an empty items summary
because the cart has already been cleared.

---

## 13. File Map

| Path | Lines | Role |
|---|---|---|
| `app/checkout/delivery/page.tsx` | 1–10 | App Router shim: SEO + render `<DeliveryPage />` |
| `app/checkout/payment/page.tsx` | 1–10 | App Router shim: SEO + render `<PaymentPage />` |
| `app/checkout/confirmation/page.tsx` | 1–10 | App Router shim: SEO + render `<ConfirmationPage />` |
| `src/app/pages/DeliveryPage.tsx` | 1–310 | Delivery step orchestrator: methods, guards, coupon |
| `src/app/pages/PaymentPage.tsx` | 1–249 | Payment step: method selection, place-order |
| `src/app/pages/ConfirmationPage.tsx` | 1–151 | Success view, random order id, `clearCart` |
| `src/app/components/CheckoutStepper.tsx` | 1–88 | Stepper UI; `STEPS` array defines flow paths |
| `src/app/pages/checkout/DeliveryMethodHome.tsx` | 1–231 | Home/Office: saved-address list + new-addr form |
| `src/app/pages/checkout/DeliveryMethodStore.tsx` | 1–104 | Store pickup: store dropdown + perks + guest form |
| `src/app/pages/checkout/DeliveryMethodLocker.tsx` | — | Parcel locker variant of Store |
| `src/app/pages/checkout/DeliveryOrderSummary.tsx` | 1–171 | Right-column summary + coupon input |
| `src/app/pages/checkout/GuestCheckoutModal.tsx` | 1–77 | Sign-in / Register / Guest fork |
| `src/app/pages/checkout/GuestContactForm.tsx` | 1–62 | Anonymous user contact triplet |
| `src/app/pages/checkout/PaymentPage.parts.tsx` | 1–244 | `OptionCard`, `CardForm`, `QRPanel`, `WalletButton`, `InstallmentPanel`, `PayMethod` union |
| `src/app/data/checkoutConfig.ts` | 1–41 | `CHECKOUT_COUPONS`, `PICKUP_STORES`, `PARCEL_LOCKERS`, `DELIVERY_TIME_SLOTS`, `DELIVERY_PERKS`, `PICKUP_PERKS` |
| `src/app/data/checkoutLabels.ts` | 1–114 | All UI strings for Delivery + Payment + Stepper |
| `src/app/data/paymentMethodsConfig.ts` | 1–66 | `PAYMENT_METHODS_COPY`, `PAYMENT_PAGE_LABELS`, `WALLET_BUTTON_LABELS` |
| `src/app/data/confirmationLabels.ts` | 1–53 | Confirmation copy + 3 info cards |
| `src/app/utils/schemas.ts` | 1–157 | Zod: `addressSchema`, `guestContactSchema`, `paymentSchema` (+ Luhn), `promoSchema` |
| `src/app/context/CartContext.tsx` | 1–313 | `useCart` hook: items, subtotal, discount, total, `clearCart` |
| `src/app/store/userSlice.ts` | 59–61, 102 | `addAddress` reducer used when "Save to profile" is checked |

---

## 14. Cross-References

- [`./CART_WISHLIST.md`](./CART_WISHLIST.md) — cart state, optimistic sync to OneEntry,
  the `cartApi.ts` RTK Query endpoints used pre-checkout.
- [`./AUTH.md`](./AUTH.md) — `useAuth` context, login/register modals invoked
  from `GuestCheckoutModal`.
- [`./ONEENTRY_INTEGRATION.md`](./ONEENTRY_INTEGRATION.md) — where the OneEntry SDK is/isn't
  used. The checkout flow is currently in the "not yet wired" bucket.
- `./pages/checkout-delivery.md` — original spec doc (UI-level) for the
  Delivery step.
- `./pages/checkout-payment.md` — original spec doc for the Payment step.
- `./pages/checkout-confirmation.md` — original spec doc for the
  Confirmation step.
- `agents_datasets/rules/users-architecture.md` §"forForms_checkout" —
  target OneEntry attribute schema when the form is wired.
- `agents_datasets/rules/discounts-setup.md` — how the `CHECKOUT_COUPONS`
  dictionary should map to OneEntry `discounts` + `discount_coupons`
  after import.
- `agents_datasets/rules/standard-entities.md` §"orders_storage +
  order_statuses" — required entities for the persistence layer that
  is not yet built.
