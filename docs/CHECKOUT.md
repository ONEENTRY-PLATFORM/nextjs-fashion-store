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

On "Continue to Payment", the page writes to `sessionStorage['oe_checkout_payload']`. The actual shape written by `DeliveryPage.handleContinueToPayment` (`src/app/pages/DeliveryPage.tsx:203`) is:

```ts
{
  storage: 'home' | 'store_pickup' | 'locker',   // NOT `method` — already mapped to the storage marker
  isGuest: boolean,                              // driven by `!isLoggedIn`
  guestContact: { fullName, email, phone } | null,  // ALWAYS present for guests (used by store/locker); null when logged in
  homeAddress: {                                 // resolved from saved-address OR just-typed form; null for store/locker
    fullName, phone, line1, city, postcode, instructions,
  } | null,
  storeId: string | null,                        // PICKUP_STORES[i].id when storage === 'store_pickup'
  lockerId: number | null,                       // 0-based index into PARCEL_LOCKERS (shifted +1 later, see §3.3)
  deliveryDate: string,                          // ISO string (selectedDate.toISOString())
  deliverySlot: 'morning' | 'afternoon' | 'evening',
  couponCode: string | null,                     // mirrored from CartContext (not `preview.discountAmount`)
}
```

There is no separate `addressId` field — saved-address selection is resolved to a flat `homeAddress` object client-side before serialization. Then `router.push('/checkout/payment')`.

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
- **`type: 'stripe'`** — online prepayment. After the order is created, a follow-up SDK call `Payments.createSession(orderId, 'session', false)` (server-side wire: `POST /api/content/payments/sessions`) provisions a hosted-checkout URL. The browser is redirected there. See §3.4 for the full Stripe flow.

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
2. Builds `products: [{productId, quantity}]` converting stringified OE ids to numbers via `getCmsProductId`.
3. Constructs `formData` per delivery method (see §3.3).
4. Calls `createOrderAction({storageMarker, formIdentifier, paymentAccountIdentifier, formData, products, currency: 'USD', langCode: 'en_US'})`.

Server Action (`src/lib/oneentry/auth/actions.ts:2007`):

- SDK call: `api.Orders.createOrder(storageMarker, body, DEFAULT_LOCALE)` → hits `POST /api/content/orders-storage/marker/{storageMarker}/orders`.
- Guest detection is server-side: `isGuest = !readAccessFromCookies()`. The client-side `payload.isGuest` only controls form-data marker suffixes; the storage / formIdentifier markers are set from cookie state.
- `storageMarker` (guests get a `_guest` suffix on the storage itself):
  - Auth: `home` / `store_pickup` / `locker`
  - Guest: `home_guest` / `store_pickup_guest` / `locker_guest`
- `formIdentifier` (guests get a `_guest` suffix; base map lives in `FORM_IDENTIFIER_MAP`):
  - `checkout_home_delivery` (guest: `checkout_home_delivery_guest`)
  - `checkout_store_pickup` (guest: `checkout_store_pickup_guest`)
  - `checkout_locker` (guest: `checkout_locker_guest`)
- Body also carries `additionalDiscountsMarkers: ['bronze', 'silver', 'gold', 'platinum']` so OE can re-apply the shopper's tier; markers the shopper doesn't qualify for are ignored.
- Authentication:
  - Logged in → `Authorization: Bearer <oe_access>` cookie via `getUserApi(access)`.
  - Guest → SDK constructed with `x-guest-id: <oe_guest_id>` header via `getGuestApi(guestId)`.
- On success returns `{ orderId: number, paymentUrl: string | null, paymentSessionError?: string }`. `paymentUrl` is either surfaced by OE directly on the created order (legacy providers) or minted by a follow-up `Payments.createSession(orderId, 'session', false)` call for Stripe-typed accounts (see §3.4).

### 3.3 Form data payloads

The caller passes `formData` to `createOrderAction` as a **plain array** `[{marker, type, value}, ...]`. The OneEntry SDK's `Orders.createOrder` wraps it into `{ [langCode]: [...] }` internally — do **not** pre-wrap on the client (double nesting causes `formData's marker 'undefined' marker is required`). Assembled in `PaymentPage.handlePlaceOrder` (`src/app/pages/PaymentPage.tsx:186`+). A `guestPrefix = payload.isGuest ? '_guest' : ''` is spliced into the `delivery_method` and `delivery_date-time` markers for the home flow only; the store / locker / guest-contact markers are hard-coded (see below).

**Home delivery (authenticated):**
```
delivery_method              type=list          value=['courier']
delivery_date-time           type=timeInterval  value=[[fromISO, toISO]]
```
(Auth users use their saved OE profile address — no address markers travel with the order.)

**Home delivery (guest):**
```
delivery_method_guest        type=list          value=['courier']
delivery_date-time_guest     type=timeInterval  value=[[fromISO, toISO]]
checkout_home_guest_full_name              type=string  value=fullName
checkout_home_guest_phone                  type=string  value=phone   (spaces stripped, OE caps at 15 chars)
checkout_home_guest_address_line1          type=string  value=line1
checkout_home_guest_city                   type=string  value=city
checkout_home_guest_post_code              type=string  value=postcode
checkout_home_guest_special_instrations    type=string  value=instructions   (only when non-empty; note the OE typo)
```

**Time-interval derivation** — the client maps the picked slot id to fixed hours on `deliveryDate`:

```
morning:   [09:00 UTC, 13:00 UTC]
afternoon: [13:00 UTC, 17:00 UTC]
evening:   [17:00 UTC, 21:00 UTC]
```

Format: `${dayIso}T${HH}:00:00.000Z` for both ends; `dayIso = payload.deliveryDate.slice(0, 10)`.

**Store pickup (authenticated):**
```
checkout_store_pickup_select_store   type=entity   value=[String(storeId)]
```

**Store pickup (guest):**
```
checkout_store_pickup_guest_store       type=entity   value=[String(storeId)]
checkout_store_pickup_guest_full_name   type=string   value=fullName
checkout_store_pickup_guest_phone       type=string   value=phone (spaces stripped)
checkout_store_pickup_guest_email       type=string   value=email
```

Note: the guest variant uses a distinct marker (`..._guest_store`), not a suffix on `select_store`.

**Locker (authenticated):**
```
checkout_locker_pickup_point   type=integer   value=lockerId + 1   # 0-based index → 1-based OE integer
```

**Locker (guest):**
```
checkout_locker_guest_pickup_point   type=integer   value=lockerId + 1
checkout_locker_guest_full_name      type=string   value=fullName
checkout_locker_guest_phone          type=string   value=phone (spaces stripped)
checkout_locker_guest_email          type=string   value=email
```

The `+1` shift is necessary because OE rejects `0` as a missing integer.

### 3.4 Stripe redirect

For `account.type === 'stripe'`:

1. `createOrderAction` first checks whether OE already surfaced a `paymentUrl` on the created order (legacy providers do). If not, and the selected `paymentAccountType === 'stripe'`, it calls the SDK `api.Payments.createSession(orderId, 'session', false)`. That resolves to `POST /api/content/payments/sessions` server-side; note the SDK signature does **not** forward `successUrl` / `cancelUrl` — the merchant's default URLs configured in OE admin are used.
2. Response: `{ paymentUrl: string }` (typed loosely in the SDK; the storefront unwraps it via `raw.paymentUrl`).
3. Before redirecting, `PaymentPage.handlePlaceOrder` fires `clearCart()` unconditionally (see §4.2 — cart is emptied at order creation, not on Confirmation mount). It also removes `sessionStorage['oe_checkout_payload']`.
4. Client `window.location.href = paymentUrl`. Stripe hosted checkout takes over. On success, Stripe redirects to the storefront `successUrl` (`/checkout/confirmation`). Currently `ConfirmationPage` does not read the real OE `orderId` from the URL — it generates its own display-only random id (see §4.1). Wiring the real id through `?orderId=` would need a `ConfirmationPage` update plus a Stripe `successUrl` template that appends the OE-side id.

If Stripe session creation fails, `paymentSessionError` surfaces on the returned object; `handlePlaceOrder` shows the error inline (`Stripe session could not be created: {message}`) without redirecting. Because `clearCart()` runs *before* the paymentUrl check, a Stripe failure leaves the shopper with an empty cart on that screen — the OE order still exists on the server, but the buyer hasn't paid.

### 3.5 Place Order CTA gating

A local `previewInFlight` boolean tracks the **300 ms** debounced `previewOrder` fetch (`setTimeout(..., 300)` inside the `useEffect` at `PaymentPage.tsx:115`). It re-fires on any change to `productsKey` (JSON of cart products), `bonusAmount`, or `couponCode`. The **Place Order** button is `disabled` while any of `placing` (order in flight), `previewInFlight` (preview still loading), or `!preview` (first fetch hasn't landed) is true, and renders a small `animate-spin` circle inside the label while gated. `handlePlaceOrder` also early-returns on `previewInFlight || !preview`, so a stale total can never reach `createOrderAction` even if the button state races. This prevents the pre-fix bug where a shopper could submit before OneEntry finished computing discounts / bonuses, causing a mismatch between shown total and charged amount.

The delivery-step coupon input uses a different mechanism: the shopper explicitly clicks "Apply", which awaits `CartContext.applyCoupon(code)` → `previewOrderAction`. `CartContext` has its own separate 300 ms debounce for the ambient preview refresh when the cart changes (`CartContext.tsx:291`). There is no "900 ms coupon debounce" — coupon codes are validated by OE server-side on click, not by any client timer, and the legacy `CHECKOUT_COUPONS` local dictionary has been removed (see §7).

### 3.6 SSR hydration guard

`PaymentPage` mounts with an internal `mounted` flag to avoid rendering cart-dependent UI on the server pass. This eliminates a hydration mismatch that used to appear when the Redux cart differed from the SSR fallback.

### 3.7 Trust / security badges

Below the payment methods, `PaymentPage` renders a horizontal `#fafafa` strip of trust badges (`PaymentPage.tsx:353` onward). The list is derived from three OE labels (with `PAYMENT_METHODS_COPY.securityBadges` fallback):

- `checkout_payment_ssl` (default: **"256-bit SSL Encryption"**) — rendered with the `Shield` icon.
- `checkout_payment_pci` (default: **"PCI DSS Compliant"**) — rendered with the `Lock` icon (green).
- `checkout_payment_3d` (default: **"3D Secure"**) — rendered with the `Shield` icon.

Empty labels are filtered out (`securityBadges = [lSsl, lPci, l3d].filter(Boolean)`), so an OE deployment can suppress any badge by publishing an empty string.

The badges are purely decorative — no client-side verification of SSL / PCI / 3DS status happens. Actual PCI compliance is inherited by hosting cards on Stripe's page.

---

## 4. Confirmation step (`ConfirmationPage.tsx`)

### 4.1 Display id

The page generates a display-only order id:

```ts
'OE-' + crypto.randomUUID().replace(/-/g, '').slice(0, 8).toUpperCase()
// e.g. 'OE-A1B2C3D4'
```

This is a **cosmetic** number for the receipt. The real OneEntry `orderId` returned by `createOrderAction` is not currently persisted to the client — a follow-up refactor should surface it via the URL query so refresh preserves the number.

### 4.2 Cart cleanup — two-stage

The cart is actually cleared in **two places**, in order:

1. **`PaymentPage.handlePlaceOrder`** — immediately after `createOrderAction` resolves successfully, *before* the Stripe redirect or `router.push('/checkout/confirmation')`. This is the load-bearing clear: a closed tab during Stripe redirect (or a cancelled Stripe session) no longer leaves the just-ordered items sitting in the shopper's bag next time they open the site.
2. **`ConfirmationPage`** — 200 ms after mount, a `setTimeout(() => clearCart(), 200)` re-fires. This is a belt-and-braces call: if a user lands on Confirmation via a direct link, or the PaymentPage clear failed for any reason, the receipt view still wipes the cart. The 200 ms delay lets the receipt render with the last item snapshot before the cart is emptied. `mounted && items.length > 0` guards the item list, so a second-mount clear does not blank the receipt.

`clearCart()` also resets the applied coupon (`couponCode=null`, clears `couponError`, and removes `sessionStorage['oe_coupon_code']`) so the shopper's next order requires an explicit `applyCoupon` call instead of silently reusing the previous code.

Server cart is NOT wiped by these calls directly — the `syncCart` sync effect will push the empty cart on the next tick. If OneEntry order creation happens outside the sync window (e.g. Stripe success redirect), the server cart is only cleared when the user returns to a page mounted `useCart()`.

### 4.3 Loyalty points

Rendered as `Math.floor(total * 10)` points earned. This is a static marketing calculation — it does not credit the user's OE loyalty balance.

---

## 5. Data flow diagram

```
Cart Redux ──────────────────────────┐
                                     │
sessionStorage['oe_checkout_payload']─┼──► createOrderAction (Server Action)
                                     │        │
Payment accounts (OE Payments) ──────┘        ├──► OE orders-storage/marker/{home|store_pickup|locker}[_guest]
                                              │       (SDK Orders.createOrder)
                                              │
                                              ├── Stripe? ──► SDK Payments.createSession(orderId, 'session', false)
                                              │                     │
                                              │                     └──► paymentUrl
                                              │
                                              ├──► clearCart() [PaymentPage, unconditional on success]
                                              │
                                              ├── Stripe? ──► window.location.href = paymentUrl
                                              │
                                              └──► router.push('/checkout/confirmation')
                                                                          │
                                                                          └──► clearCart() 200ms after mount [belt & braces]
```

---

## 6. Guest checkout

The `x-guest-id` header (from `src/app/utils/guest-id.ts`, minted / persisted in `localStorage` as `oe_guest_id`) turns anonymous checkout into a first-class flow:

- `GuestCheckoutModal` unlocks the page after "Continue as Guest".
- Delivery page collects `guestContact = {fullName, email, phone}` when the method is store or locker (home already asks for full address).
- The `_guest` suffix is applied at two levels (see §3.2 / §3.3):
  - **Storage marker** — `home` → `home_guest`, `store_pickup` → `store_pickup_guest`, `locker` → `locker_guest`.
  - **Form identifier** — `checkout_home_delivery` → `checkout_home_delivery_guest`, and similarly for the two other forms.
  - **Individual formData markers** do NOT all follow the suffix pattern — `delivery_method` / `delivery_date-time` get a `_guest` suffix, `checkout_store_pickup_select_store` is replaced with `checkout_store_pickup_guest_store` (distinct name), and contact fields use hard-coded names like `checkout_home_guest_full_name`.
- The guest SDK is instantiated via `getGuestApi(guestId)` on the server; the SDK adds `x-guest-id: <guestId>` to every OE request (`Orders.createOrder`, `Payments.createSession`, `previewOrder`).
- Orders are persisted on the Platform side, associated with the guest UUID instead of a user identifier. On a later sign-in, the guest cart merges (see [CART_WISHLIST.md](./CART_WISHLIST.md) §6), but guest **orders** do not automatically re-parent — OE keeps them under the guest id.

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
| `addressSchema` | `fullName` (1-100), `phone` (`/^\+?[\d\s\-()\[\]]{7,20}$/`), `line1` (1-200), `city` (1-100), `postcode` (`/^[A-Z0-9\s\-]{3,10}$/i`), `instructions` (optional, ≤500) |
| `guestContactSchema` | `fullName` (1-100), `email` (RFC), `phone` (same regex as address) |
| `paymentSchema` | defined (card number w/ Luhn check, expiry `MM/YY`, CVV 3-4 digits, name on card) — kept for surfaces that host their own card UI; the checkout flow bypasses it because Stripe hosts the actual card form |
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
