# Checkout Pipeline

> Reference for the three-step checkout funnel. Audience: LLM agents that need a code-level picture of Delivery → Payment → Confirmation and the OneEntry order-creation contract.

---

## 1. Overview

Checkout is a three-segment funnel rendered through the App Router:

```
/cart  ──►  /checkout/delivery  ──►  /checkout/payment  ──►  /checkout/confirmation
            (CheckoutStepper 1)      (CheckoutStepper 2)     (CheckoutStepper 3)
```

Each `app/checkout/<step>/page.tsx` is a thin route shell that re-exports SEO metadata from `src/app/data/seoData.ts` and renders one of three client components:

- `src/app/pages/DeliveryPage.tsx` — address + shipping method + time slot + coupon
- `src/app/pages/PaymentPage.tsx` — loads payment accounts from OneEntry, submits `createOrderAction`, redirects to Stripe if needed
- `src/app/pages/ConfirmationPage.tsx` — receipt view + `clearCart()` on mount

Two client-side handoff channels move state between steps:

- `sessionStorage['oe_checkout_payload']` — Delivery → Payment (JSON of address / delivery method / date / slot / coupon / guest contact).
- Redux `cartSlice` — same across all three steps (until `clearCart()` fires on Confirmation).

Order placement **hits OneEntry for real** — `createOrderAction` writes to `orders-storage`, and Stripe accounts trigger a hosted-checkout session redirect.

Section error boundary: `app/checkout/error.tsx` catches any unhandled throw in the segment.

---

## 2. Delivery step (`DeliveryPage.tsx`)

### 2.1 Auth gate

If `!isLoggedIn`, `<GuestCheckoutModal>` renders on mount with three options:

- **Sign In** → `openLoginModal()`.
- **Register** → `openRegisterModal()`.
- **Continue as Guest** → closes the modal; page unlocks.

Guest users need to fill contact fields inline; logged-in users pick from saved addresses (`user.addresses` seeded by `AuthContext`).

### 2.2 Delivery methods

Three methods, selected via radio cards:

| Method | Consumer requirements |
|---|---|
| `home` | Full address (saved or new) + delivery date + time slot |
| `store` | Pickup store id (from `PICKUP_STORES` in `src/app/data/checkoutConfig.ts`) + guest contact if not logged in |
| `locker` | Locker id (from `PARCEL_LOCKERS`) + guest contact if not logged in |

Static resources in `src/app/data/checkoutConfig.ts`:

```ts
PICKUP_STORES = [
  { id: '...', name: 'Oxford Street Flagship', address: '...', hours: '...' },
  ...
]
PARCEL_LOCKERS = [
  'Paddington Station — Platform 8 Locker Hub',
  ...
]
DELIVERY_TIME_SLOTS = [
  { id: 'morning',   label: '09:00 – 13:00' },
  { id: 'afternoon', label: '13:00 – 17:00' },
  { id: 'evening',   label: '17:00 – 21:00' },
]
```

Delivery dates are computed client-side by `getDeliveryDates(count=7)` — earliest is tomorrow, Sundays skipped, up to 60 iteration guard for safety.

`<DeliveryOrderSummary>` is loaded via `next/dynamic({ssr:false})` — its content reads from the Redux cart slice that hydrates from `localStorage` **after** client mount, so SSR would produce an empty snapshot that conflicts with the post-hydration tree.

### 2.3 New address flow

- Fields validated with `addressSchema` (Zod, `src/app/utils/schemas.ts`).
- On "Confirm New Address", client optimistically appends the address to local state.
- On "Continue to Payment", if the user is logged in and chose to save the address, `updateAddresses(nextAddresses)` fires — hits `updateAddressesAction` Server Action → OE form-data `user_addresses`. On success, the returned canonical list replaces local state.

### 2.4 Coupons (§7)

Validated server-side via OE `previewOrder`. The Delivery page pulls `couponCode`, `couponDiscount`, `couponError`, `applyCoupon`, `removeCoupon`, and `previewLoading` from `useCart()` (see [CART_WISHLIST.md §4a](./CART_WISHLIST.md#4a-checkout-preview--coupons)). On "Apply", `applyCoupon(code)` calls `previewOrderAction` with the code — success sets `couponCode` (persisted in the cart context so subsequent `previewOrder`/`createOrder` calls include it); an `IError` response populates `couponError` with the server's message (e.g. "Add $61 more to unlock SUMMER2026").

Discount math: `couponDiscount = preview.couponDiscountAmount` (whatever OE actually deducted). Not stored in Redux — the applied code lives in `CartContext` state and is included in the Delivery → Payment handoff payload.

While a `previewOrder` is in flight and no preview is present (`previewLoading && !hasPreview`), `<DeliveryOrderSummary>` renders **skeleton** placeholders for the discount rows and the Total. `applyCoupon`/`removeCoupon` both clear `preview` and set `previewLoading=true` before firing, so the skeleton now also runs during apply/remove (and on `applyCoupon` failure the context re-fetches without the code to release the skeleton). The applied-coupon panel shows the raw code (no local label lookup).

### 2.5 Handoff to Payment

On "Continue to Payment", the page writes to `sessionStorage['oe_checkout_payload']`:

```ts
{
  method: 'home' | 'store' | 'locker',
  address?: { fullName, phone, line1, city, postcode, instructions },
  addressId?: string,               // for saved addresses
  deliveryDateISO?: string,
  timeSlotId?: 'morning' | 'afternoon' | 'evening',
  storeId?: string,
  lockerIndex?: number,
  couponCode?: string,
  guestContact?: { fullName, email, phone },  // guest store / locker
}
```

Then `router.push('/checkout/payment')`.

---

## 3. Payment step (`PaymentPage.tsx`)

### 3.1 Payment accounts

On mount, calls `getPaymentAccountsAction()` (Server Action → `getApi().Payments.getAccounts()`) with an `accountsLoading` loading state. On resolve, **auto-selects the first visible account** so "Place Order" is pre-filled (though the CTA itself is still gated by the preview fetch — see §3.5). Returns `PaymentAccount[]`:

```ts
interface PaymentAccount {
  id: number;
  identifier: string;
  type: 'stripe' | 'custom';
  title: string;
  description: string;
  // isVisible: filtered server-side
}
```

Rendered in two groups:

- **`type: 'custom'`** — pay-on-delivery / offline (cash, card-on-delivery, QR, Apple Pay, Google Pay). No redirect; the order is created and Confirmation renders immediately.
- **`type: 'stripe'`** — online prepayment. After the order is created, a secondary call to `POST /api/content/payments/sessions` provisions a hosted-checkout URL. The browser is redirected there.

The list is fully CMS-driven; UI copy (title / description / badges) comes from either the OneEntry account fields or, as a stylistic fallback, `PAYMENT_METHODS_COPY` in `src/app/data/paymentMethodsConfig.ts`.

### 3.2 Order creation — `createOrderAction`

Located in `src/lib/oneentry/auth/actions.ts`. Signature:

```ts
createOrderAction(input): Promise<
  | { ok: true; orderId: number; paymentUrl: string | null; paymentSessionError?: string }
  | { ok: false; error: string }
>
```

Flow:

1. Client reads `sessionStorage['oe_checkout_payload']` and Redux cart.
2. Builds `products: [{productId, quantity}]` mapping playground SKUs → OE numeric ids via `getCmsProductId`.
3. Constructs `formData` per delivery method (see §3.3).
4. Calls `createOrderAction({storageMarker, formIdentifier, paymentAccountIdentifier, formData, products, currency: 'USD', langCode: 'en_US'})`.

Server Action:

- Chooses HTTP endpoint: `POST /api/content/orders-storage/marker/{storageMarker}/orders`
- `storageMarker`:
  - `home` for home delivery
  - `store_pickup` for store pickup
  - `locker` for parcel locker
- `formIdentifier`:
  - `checkout_home_delivery` (guest: `checkout_home_delivery_guest`)
  - `checkout_store_pickup` (guest: `checkout_store_pickup_guest`)
  - `checkout_locker` (guest: `checkout_locker_guest`)
- Authentication:
  - Logged in → `Authorization: Bearer <oe_access>` cookie.
  - Guest → `x-guest-id: <oe_guest_id>` header.
- On success returns `orderId` (numeric OE record) + optional `paymentUrl` from Stripe.

### 3.3 Form data payloads

The caller passes `formData` to `createOrderAction` as a **plain array** `[{marker, type, value}, ...]`. The OneEntry SDK's `Orders.createOrder` wraps it into `{ [langCode]: [...] }` internally — do **not** pre-wrap on the client (double nesting causes `formData's marker 'undefined' marker is required`). Excerpts:

Home delivery (authenticated):
```
delivery_method              type=string     value=['courier']
delivery_date-time           type=timeInterval value=[[fromISO, toISO]]
user_addresses_recipient_name / phone / line_1 / city / postcode / special_instructions
```

Home delivery (guest): identical structure but with `_guest` suffixes on the marker names.

Store pickup:
```
checkout_store_pickup_select_store   type=entity   value=[storeId]
# guest only:
checkout_store_pickup_guest_full_name / _phone / _email
```

Locker:
```
checkout_locker_pickup_point   type=integer   value=lockerIndex + 1  # 0-based → 1-based
# guest only:
checkout_locker_guest_pickup_point / _guest_contact_*
```

### 3.4 Stripe redirect

For `account.type === 'stripe'`:

1. After `createOrderAction` returns `orderId`, the same action calls `POST /api/content/payments/sessions` with:
   ```json
   { "orderId": 123, "type": "session", "automaticTaxEnabled": false, "successUrl": "...", "cancelUrl": "..." }
   ```
2. Response: `{ paymentUrl: string }`.
3. Client `window.location.href = paymentUrl`. Stripe hosted checkout takes over. On success, Stripe redirects to the storefront `successUrl` (`/checkout/confirmation`). Currently `ConfirmationPage` does not read the real OE `orderId` from the URL — it generates its own display-only random id (see §4.1). Wiring the real id through `?orderId=` would need a `ConfirmationPage` update plus a Stripe `successUrl` template that appends the OE-side id.

If Stripe session creation fails, `paymentSessionError` surfaces on the returned object; the client shows an error inline without redirecting.

### 3.5 Place Order CTA gating

A local `previewInFlight` boolean tracks the debounced `previewOrder` fetch: set `true` when the effect fires, cleared on response (or on the empty-cart early exit). The **Place Order** button is `disabled` while any of `placing` (order in flight), `previewInFlight` (preview still loading), or `!preview` (first fetch hasn't landed) is true, and renders a small `animate-spin` circle inside the label while gated. `handlePlaceOrder` also early-returns on `previewInFlight || !preview`, so a stale total can never reach `createOrderAction` even if the button state races. This prevents the pre-fix bug where a shopper could submit before OneEntry finished computing discounts / bonuses, causing a mismatch between shown total and charged amount.

### 3.6 SSR hydration guard

`PaymentPage` mounts with an internal `mounted` flag to avoid rendering cart-dependent UI on the server pass. This eliminates a hydration mismatch that used to appear when the Redux cart differed from the SSR fallback.

---

## 4. Confirmation step (`ConfirmationPage.tsx`)

### 4.1 Display id

The page generates a display-only order id:

```ts
'OE-' + crypto.randomUUID().replace(/-/g, '').slice(0, 8).toUpperCase()
// e.g. 'OE-A1B2C3D4'
```

This is a **cosmetic** number for the receipt. The real OneEntry `orderId` returned by `createOrderAction` is not currently persisted to the client — a follow-up refactor should surface it via the URL query so refresh preserves the number.

### 4.2 Cart cleanup

200 ms after mount, `useCart().clearCart()` fires. The delay lets the receipt render with the last item snapshot before the cart is wiped. `clearCart()` also resets the applied coupon (`couponCode=null`, clears `couponError`, and removes `sessionStorage['oe_coupon_code']`) so the shopper's next order requires an explicit `applyCoupon` call instead of silently reusing the previous code.

Server cart is NOT wiped by this call — the `syncCart` sync effect will push the empty cart on the next tick. If OneEntry order creation happens outside the sync window (e.g. Stripe success redirect), the server cart is only cleared when the user returns to a page mounted `useCart()`.

### 4.3 Loyalty points

Rendered as `Math.floor(total * 10)` points earned. This is a static marketing calculation — it does not credit the user's OE loyalty balance.

---

## 5. Data flow diagram

```
Cart Redux ──────────────────────────┐
                                     │
sessionStorage['oe_checkout_payload']─┼──► createOrderAction (Server Action)
                                     │        │
Payment accounts (OE Payments) ──────┘        ├──► OE orders-storage/marker/{home|store_pickup|locker}
                                              │
                                              ├── Stripe? ──► POST /payments/sessions ──► paymentUrl
                                              │
                                              └──► onSuccess: router.push('/checkout/confirmation')
                                                                          │
                                                                          └──► clearCart() 200ms after mount
```

---

## 6. Guest checkout

The `x-guest-id` header (from `src/app/utils/guest-id.ts`) turns anonymous checkout into a first-class flow:

- `GuestCheckoutModal` unlocks the page after "Continue as Guest".
- Delivery page collects `guestContact = {fullName, email, phone}` when the method is store or locker (home already asks for full address).
- All guest form-identifier markers use the `_guest` suffix (see §3.3).
- Orders are still persisted on the Platform side, associated with the guest UUID instead of a user identifier.

Guest cart persists in `localStorage`; if the guest signs in later, `CartContext` performs the login-time merge (see [CART_WISHLIST.md](./CART_WISHLIST.md) §6).

---

## 7. Coupons

Coupons on the Delivery step are validated and priced by OneEntry via `previewOrderAction`. `CartContext` owns the applied code and derives `couponDiscount` from `preview.couponDiscountAmount` (see §2.4 and [CART_WISHLIST.md §4a](./CART_WISHLIST.md#4a-checkout-preview--coupons)).

The `/cart` promo entry (§11) uses the same OE-backed flow via `CartContext.applyCoupon`. The former local `CHECKOUT_COUPONS` mock in `src/app/data/checkoutConfig.ts` has been removed; there is no client-side coupon validation left.

---

## 8. Validations

Zod schemas in `src/app/utils/schemas.ts`:

| Schema | Fields |
|---|---|
| `loginSchema` | email/phone/identifier + password |
| `registerSchema` | Sign-up form fields |
| `addressSchema` | `fullName` (1-100), `phone` (regex), `line1` (1-200), `city` (1-100), `postcode` ([A-Z0-9\s-]{3,10}) |
| `guestContactSchema` | `fullName`, `email`, `phone` |
| `paymentSchema` | not currently used — Stripe hosts the card UI |
| `profileSchema` | Account "My Data" form |
| `promoSchema` | Refer-a-friend, gift certificate promo codes |

Client validation runs on the DeliveryPage "Continue to Payment" click. Server validation happens inside OneEntry when the order is POSTed — its errors surface in `createOrderAction`'s `{ok: false, error}` return.

---

## 9. Session-scoped state

| Key | Scope | Lifetime | Purpose |
|---|---|---|---|
| `oe_checkout_payload` | `sessionStorage` | Until Payment redirects / order created | Delivery → Payment handoff |
| `oe_cart_merged` / `oe_wishlist_merged` | `sessionStorage` | Session | Prevent re-merge on tree remounts |
| `oe_guest_id` | `localStorage` | Persistent | Link guest orders / activity |
| `oe_access` / `oe_refresh` / `oe_user` | Cookies | Server-managed | Auth session |
| `oe_store` | `localStorage` | Persistent | Redux persisted slices (cart, wishlist, recentlyViewed, catalog) |

---

## 10. What the checkout does NOT do

- No **PSP integration inside the storefront** — card fields never touch React state; Stripe hosts them.
- No **email confirmations** — the OE side may send them, but the storefront does not trigger any.
- No **order-status polling** — after Stripe redirect the storefront simply lands on Confirmation.
- No **inventory reservation** — the cart is snapshot at order placement; stock is enforced by OneEntry on submit (400 back if OOS).
- No **shipment tracking sync** — displayed tracking on the account page uses OE order state, but there is no polling loop.

---

## 11. Cart page — promo + selection

`/cart` (`src/app/pages/CartPage.tsx`) has its own promo entry, independent of the Delivery-step promo. Behaviour:

- Cart items appear grouped as `RenderRow[]` — singles + bundles (bundles rendered by `CartBundleRow`).
- `selectedIds: Set<string>` tracks which lines are ticked for checkout (currently informational; checkout still uses the whole cart).
- Promo entry has three local UI states (`promoChecked`, `promoInput`, `promoBusy`); the applied code, discount and error live on `CartContext` (`couponCode`, `couponDiscount`, `couponError`). `handleApplyPromo()` calls `applyCoupon(promoInput)` — OE `previewOrder` validates and prices the code; `handleRemovePromo()` calls `removeCoupon()`.
- A local `wishlist: Set<string>` state mirrors the wishlist for the row's "heart" toggle (the actual mutation still goes through `useWishlist()`).
- `mounted` flag suppresses the SSR pass to avoid hydration mismatch when the persisted cart differs from `[]`.

The applied promo now persists across `/cart` → Delivery because both surfaces read it from `CartContext` (see [CART_WISHLIST.md §4a](./CART_WISHLIST.md#4a-checkout-preview--coupons)).

## 12. Files touched

| File | Role |
|---|---|
| `app/checkout/{delivery,payment,confirmation}/page.tsx` | Route shells (SEO metadata + client component) |
| `app/checkout/error.tsx` | Segment error boundary |
| `src/app/pages/DeliveryPage.tsx` | Delivery step client component |
| `src/app/pages/PaymentPage.tsx` | Payment step client component |
| `src/app/pages/ConfirmationPage.tsx` | Confirmation step client component |
| `src/app/pages/checkout/DeliveryMethodHome.tsx` / `Locker.tsx` / `Store.tsx` | Method-specific sub-forms |
| `src/app/pages/checkout/DeliveryOrderSummary.tsx` | Right-rail order summary |
| `src/app/pages/checkout/PaymentMethodsList.tsx` | Renders the OE payment accounts list |
| `src/app/pages/checkout/GuestCheckoutModal.tsx` | Auth gate modal |
| `src/app/pages/checkout/GuestContactForm.tsx` | Guest contact inputs |
| `src/app/components/CheckoutStepper.tsx` | Step indicator |
| `src/app/data/checkoutConfig.ts` | Pickup stores, lockers, time slots, coupon dict, delivery perks |
| `src/app/data/paymentMethodsConfig.ts` | Stylistic copy for payment badges |
| `src/lib/oneentry/auth/actions.ts` | `createOrderAction`, `updateAddressesAction`, `getCurrentUserAction` |
| `src/lib/oneentry/payments/accounts.ts` | `getPaymentAccountsAction` |
| `src/app/utils/guest-id.ts` | `getOrCreateGuestId()` |
| `src/app/utils/schemas.ts` | Zod schemas |

---

## 13. Cross-references

- [CART_WISHLIST.md](./CART_WISHLIST.md) — cart snapshot / sync semantics
- [AUTH.md](./AUTH.md) — the auth gate on the Delivery step
- [ONEENTRY_INTEGRATION.md](./ONEENTRY_INTEGRATION.md) — `createOrderAction`, `getPaymentAccountsAction`, `updateAddressesAction`
- [pages/checkout-delivery.md](./pages/checkout-delivery.md), [pages/checkout-payment.md](./pages/checkout-payment.md), [pages/checkout-confirmation.md](./pages/checkout-confirmation.md) — per-page UI specs
