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

**OE page-block wiring for checkout routes.** The cart and the first two checkout steps load CMS-attached blocks from OneEntry and render them via `<PageBlocksRenderer>` after the main content, immediately before `<Footer>`:

| Next.js route | `loadPageBlocksByUrl(pageUrl)` call | Page component prop |
|---|---|---|
| `app/cart/page.tsx` | `'cart'` | `<CartPage pageBlocks={pageBlocks} />` |
| `app/checkout/delivery/page.tsx` | `'delivery_method'` (OE marker — not the route path) | `<DeliveryPage pageBlocks={pageBlocks} />` |
| `app/checkout/payment/page.tsx` | `'payment'` | `<PaymentPage pageBlocks={pageBlocks} />` |

`app/checkout/confirmation/page.tsx` is not wired — the OE `confirmation` page currently has no attached blocks.

`CartPage`, `DeliveryPage`, and `PaymentPage` each declare an optional `pageBlocks?: PageBlock[]` prop (declared in their respective `*Props` interface) and render `<PageBlocksRenderer blocks={pageBlocks} />` at the bottom of their JSX, after all primary UI. This placement matches the convention established for catalog, `/sale`, `/new`, `/stores`, `/favorites`, and info-page routes.

Two client-side handoff channels move state between steps:

- `sessionStorage['oe_checkout_payload']` — Delivery → Payment (JSON of address / delivery method / date / slot / coupon / guest contact).
- Redux `cartSlice` — same across all three steps (until `clearCart()` fires on Confirmation).

Order placement **hits OneEntry for real** — `createOrderAction` writes to `orders-storage`, and Stripe accounts trigger a hosted-checkout session redirect.

Section error boundary: `app/checkout/error.tsx` catches any unhandled throw in the segment.

---

## 2. Delivery step (`DeliveryPage.tsx`)

### 2.0 Empty-cart route guard

On mount, both `DeliveryPage` and `PaymentPage` check `items.length === 0` (from `useCart()`). When the cart is empty the component calls `router.push('/cart')` before rendering any form UI. This prevents deep-linking to `/checkout/delivery` or `/checkout/payment` with an empty cart, which previously showed a `$0` total and let the shopper begin filling in the delivery form or payment details for a phantom order.

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
| `store` | Pickup store (from OE via `loadStores()`, adapted to `PickupStore[]` in the server layer) + guest contact if not logged in |
| `locker` | Locker id (from `PARCEL_LOCKERS`) + guest contact if not logged in |

**Delivery method copy — OE-driven with literal fallback**

Radio card copy (title, subtitle, perks, and the locker PIN hint) is loaded at request time from the OE admin panel and passed down to the method components through a React Context:

- `src/lib/oneentry/checkout/delivery-methods.ts` — exports `loadDeliveryMethodInfo(lang?)` and the `DeliveryMethodInfo` interface. The loader calls `Forms.getFormByMarker('checkout_home_delivery', lang)`, reads the `delivery_method` attribute's `listTitles` (keyed by values `courier`, `pickup`, `locker`) for titles and subtitles, and reads `additionalFields` for perks (`home_free_delivery`, `home_partial_purchase`, `home_in-home-fitting`; `store_pickup_free`, `store_pickup_partial_purchase`, `store_pickup_fitting_room`) and the locker PIN hint (`locaer_text` — typo preserved from the OE admin panel). The loader is wrapped with `unstable_cache` (cache key `oe-delivery-method-info`, tag `oe-forms`, TTL `REVALIDATE_STORES`). Any OE error returns the local `FALLBACK` constant built from `DELIVERY_METHOD_HOME/STORE/LOCKER_LABELS` and `DELIVERY_PERKS` / `PICKUP_PERKS`.
- `src/lib/oneentry/checkout/DeliveryMethodInfoContext.tsx` — exports `DeliveryMethodInfoProvider` (wraps children with the loaded `DeliveryMethodInfo`) and `useDeliveryMethodInfo()` (returns `DeliveryMethodInfo | null`; returns `null` when the provider is absent so Storybook / unit tests can omit it).
- `app/checkout/delivery/page.tsx` — `Promise.all`s `loadDeliveryMethodInfo()` alongside `loadStores()` and the other loaders, then wraps `<DeliveryPage />` in `<DeliveryMethodInfoProvider data={info}>`.
- `DeliveryMethodHome.tsx` / `DeliveryMethodStore.tsx` / `DeliveryMethodLocker.tsx` — each calls `useDeliveryMethodInfo()` and reads `.home` / `.store` / `.locker`; falls back to its local literal labels when the hook returns `null`. Perks are rendered as a plain string list; `DeliveryMethodLocker` additionally replaces the hardcoded `pinHint` with `info.locker.pinHint`.

**Pickup store loading** — `app/checkout/delivery/page.tsx` calls `loadStores()` (from `src/lib/oneentry/catalog/stores.ts`) as part of a `Promise.all` alongside the label / placeholder loaders. Only stores that carry a numeric `oeId` (populated by `normalize()` from `raw.id`) are kept — entries without `oeId` have no matching OE page and would be rejected at order creation. The filtered list is mapped to `PickupStore[]` (defined in `src/app/data/checkoutConfig.ts`) and passed as the `pickupStores` prop to `<DeliveryPage>`.

`DeliveryPage` accepts an optional `pickupStores?: PickupStore[]` prop. When the array is non-empty it is used as the source of truth; when it is empty (OE has no stores, or the page is rendered bare in tests / Storybook) the component falls back to the literal `PICKUP_STORES` constant in `checkoutConfig.ts`. `<DeliveryMethodStore>` renders whichever list it receives via a `stores` prop — it no longer imports `PICKUP_STORES` directly.

```ts
// PickupStore — src/app/data/checkoutConfig.ts
export interface PickupStore {
  id: string;       // pageUrl slug (stable marker)
  oeId?: number;    // numeric OE page id — required for the order form entity field
  name: string;
  address: string;
  hours: string;    // pre-flattened to a single string by the server layer
}

// PICKUP_STORES stays in the file as a typed PickupStore[] dev/test fallback
```

Other static resources in `src/app/data/checkoutConfig.ts`:

```ts
PARCEL_LOCKERS = [
  'Paddington Station — Platform 8 Locker Hub',
  ...
]
DELIVERY_TIME_SLOTS = [
  { id: 'morning',   label: '09:00 – 13:00', sub: 'Morning' },
  { id: 'afternoon', label: '13:00 – 17:00', sub: 'Afternoon' },
  { id: 'evening',   label: '17:00 – 21:00', sub: 'Evening' },
]
```

`DELIVERY_TIME_SLOTS` is the **hardcoded fallback** only — time slots and calendar configuration are normally loaded from OE at request time (see §2.2a below).

**§2.2a OE-driven delivery schedule**

`src/lib/oneentry/checkout/delivery-schedule.ts` provides two exports:

- `loadDeliverySchedule(variant?, lang?)` — cached async loader. `variant` is `'authed'` (default) or `'guest'`; it selects the **attribute-set** (aset) and attribute markers to read:

  | variant | aset marker | timeInterval attr |
  |---|---|---|
  | `authed` | `checkout_home` | `delivery_date-time` |
  | `guest` | `checkout_home_guest` | `delivery_date-time_guest` |

  **Why asets, not forms.** `Forms.getFormByMarker(...)` strips the `value` field of every attribute down to a placeholder; the actual storefront-shaped values live on the attribute-set schema. The loader therefore calls `AttributesSets.getAttributesByMarker(asetMarker, lang)`, which returns a per-attribute list carrying the full `.value`.

  **Reading the timeInterval attribute.** The loader finds the entry whose `marker` matches `dateAttr` and `type === 'timeInterval'`. From that entry it reads `value[0].values[0]`, which carries two fields:

  - `dates: [startISO, endISO]` — the admin-configured availability window. The loader walks every UTC day from `start` through `end` (inclusive), using `getUTCDay()` for the weekday check and `setUTCDate` for the day increment — both operations use UTC so a timezone offset (e.g. Vladivostok UTC+10 where local Sunday 21:00 is UTC Monday) cannot shift the active-weekday set. The loader records which UTC weekday numbers appear across the window and computes `disabledWeekdays = [0…6] \ active`. A Mon–Fri range produces `disabledWeekdays: [0, 6]`; Mon–Sat produces `[0]`. `buildDeliveryDates` also uses `getUTCDay()` + `setUTCDate` throughout, so the two sides always agree. When the `dates` array is absent or unparseable, `FALLBACK.disabledWeekdays` (`[0]`) is used instead.
  - `times: [[startHM, endHM], …]` — one entry per delivery slot, each element being `{hours, minutes}` pairs. The loader maps each pair to a `DeliveryTimeSlot`:
    - `id` — `HHMM-HHMM` (colons stripped), e.g. `0900-1300`.
    - `label` — `HH:MM – HH:MM`, e.g. `09:00 – 13:00`.
    - `sub` — start-hour bucketed: `< 12` → `'Morning'`, `< 17` → `'Afternoon'`, `< 22` → `'Evening'`, else `''`.
    Slots are sorted by label (lexicographic, which equals chronological for zero-padded HH:MM). Missing or empty `times[]` → `DELIVERY_TIME_SLOTS` fallback.

  **`daysAhead` is fixed at `7`.** OE's `timeInterval` attribute is a recurrence rule, not a bounded list of allowed dates, so there is no admin field from which to read a configurable look-ahead. The value `7` is taken from the `FALLBACK` constant and remains the same regardless of the aset contents.

  Returns a `DeliverySchedule` `{ slots, daysAhead, disabledWeekdays }`. Any OE error, missing aset, or missing attribute falls back to the hardcoded `FALLBACK` constant (7 days, skip Sundays, three-slot list). Cached under key `oe-delivery-schedule`, tag `oe-forms`, TTL `REVALIDATE_STORES`.

- `buildDeliveryDates(daysAhead, disabledWeekdays, now?)` — pure function (no hooks, server- and test-safe). Starts from tomorrow, skips weekdays in `disabledWeekdays`, and collects `daysAhead` dates. Safety cap: `daysAhead * 4 + 14` iterations maximum.

`app/checkout/delivery/page.tsx` calls `loadDeliverySchedule('authed')` and `loadDeliverySchedule('guest')` **in parallel** inside its `Promise.all` alongside `loadStores()` and the other loaders. It then calls `buildDeliveryDates` for each result and serialises both strips to ISO strings:

```ts
const [scheduleAuthed, scheduleGuest] = await Promise.all([
  loadDeliverySchedule('authed'),
  loadDeliverySchedule('guest'),
  // …loadStores, loadDeliveryMethodInfo, etc.
]);
const deliveryDatesIsoAuthed = buildDeliveryDates(scheduleAuthed.daysAhead, scheduleAuthed.disabledWeekdays).map(d => d.toISOString());
const deliveryDatesIsoGuest  = buildDeliveryDates(scheduleGuest.daysAhead,  scheduleGuest.disabledWeekdays ).map(d => d.toISOString());
```

Four props are passed to `<DeliveryPage>`:

| Prop | Source |
|---|---|
| `deliveryDatesIsoAuthed` | ISO date strip derived from the `checkout_home` aset schedule |
| `deliveryDatesIsoGuest` | ISO date strip derived from the `checkout_home_guest` aset schedule |
| `deliverySlotsAuthed` | `scheduleAuthed.slots` — time slots decoded from `delivery_date-time` |
| `deliverySlotsGuest` | `scheduleGuest.slots` — time slots decoded from `delivery_date-time_guest` |

`DeliveryPage` selects the active pair from `isLoggedIn` (read from `AuthContext`):

```ts
const activeDatesIso = isLoggedIn ? deliveryDatesIsoAuthed : deliveryDatesIsoGuest;
const activeSlots    = isLoggedIn ? deliverySlotsAuthed    : deliverySlotsGuest;
```

Authed users see dates/slots from the `checkout_home` aset; guests see dates/slots from `checkout_home_guest`. The flip is a pure prop swap — no client-side data fetching on auth-state change.

When no strip was supplied at all (Storybook / bare unit test), a client-only `getDeliveryDates(count=7)` function generates a 7-day strip skipping Sundays, and `DELIVERY_TIME_SLOTS` is used as the slot fallback — matching `FALLBACK.disabledWeekdays`.

`DeliveryMethodHome` accepts an optional `timeSlots?: DeliveryTimeSlot[]` prop; when provided and non-empty, it is used instead of `DELIVERY_TIME_SLOTS`.

`<DeliveryOrderSummary>` is loaded via `next/dynamic({ssr:false})` — its content reads from the Redux cart slice that hydrates from `localStorage` **after** client mount, so SSR would produce an empty snapshot that conflicts with the post-hydration tree.

### 2.3 New address flow

- Fields validated with `addressSchema` (Zod, `src/app/utils/schemas.ts`).
- On "Confirm New Address", client optimistically appends the address to local state.
- On "Continue to Payment", if the user is logged in and chose to save the address, `updateAddresses(nextAddresses)` fires — hits `updateAddressesAction` Server Action → OE form-data `user_addresses`. On success, the returned canonical list replaces local state.

### 2.4 Coupons (§7)

Validated server-side via OE `previewOrder`. The Delivery page pulls `couponCode`, `couponDiscount`, `couponError`, `applyCoupon`, `removeCoupon`, and `previewLoading` from `useCart()` (see [CART_WISHLIST.md §4a](./CART_WISHLIST.md#4a-checkout-preview--coupons)). On "Apply", `applyCoupon(code)` calls `previewOrderAction` with the code — success sets `couponCode` (persisted in the cart context so subsequent `previewOrder`/`createOrder` calls include it); an `IError` response populates `couponError` with the server's message (e.g. "Add $61 more to unlock SUMMER2026").

Discount math: `couponDiscount = preview.couponDiscountAmount` — the monetary deduction attributable to the coupon alone. This is **zero for gift-only coupons** (OE `discountValue: null`) so that loyalty-tier discounts present in the same order are not misattributed to the coupon line (see §7a). Not stored in Redux — the applied code lives in `CartContext` state and is included in the Delivery → Payment handoff payload.

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
  storeId: string | number | null,               // selectedStore.oeId ?? selectedStore.id when storage === 'store_pickup'; numeric oeId is strongly preferred — OE's entity field expects the page's numeric id, not the slug
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
3. Before redirecting, `PaymentPage.handlePlaceOrder` fires `clearCart()` unconditionally (see §4.2 — cart is emptied at order creation, not on Confirmation mount). It also saves `String(res.orderId)` to `sessionStorage['oe_last_order_id']` and removes `sessionStorage['oe_checkout_payload']`.
4. Client `window.location.href = paymentUrl`. Stripe hosted checkout takes over. On success, Stripe redirects to the storefront `successUrl` (`/checkout/confirmation`), where `ConfirmationPage` reads `sessionStorage['oe_last_order_id']` to display the real OE order id (see §4.1). Note: the Stripe round-trip may clear `sessionStorage` on some browsers — in that case `ConfirmationPage` falls back to the random display id.

If Stripe session creation fails, `paymentSessionError` surfaces on the returned object; `handlePlaceOrder` shows the error inline (`Stripe session could not be created: {message}`) without redirecting. Because `clearCart()` runs *before* the paymentUrl check, a Stripe failure leaves the shopper with an empty cart on that screen — the OE order still exists on the server, but the buyer hasn't paid.

### 3.5 Place Order CTA gating

A local `previewInFlight` boolean tracks the **300 ms** debounced `previewOrder` fetch (`setTimeout(..., 300)` inside the `useEffect` at `PaymentPage.tsx:115`). It re-fires on any change to `productsKey` (JSON of cart products), `bonusAmount`, or `couponCode`. The **Place Order** button is `disabled` while any of `placing` (order in flight), `previewInFlight` (preview still loading), or `!preview` (first fetch hasn't landed) is true, and renders a small `animate-spin` circle inside the label while gated. `handlePlaceOrder` also early-returns on `previewInFlight || !preview`, so a stale total can never reach `createOrderAction` even if the button state races. This prevents the pre-fix bug where a shopper could submit before OneEntry finished computing discounts / bonuses, causing a mismatch between shown total and charged amount.

### 3.5a Pre-flight preview check

Because PDP and catalog routes are now ISR-cached (up to ~2 minutes for PDP, 5 minutes for home/catalog), a shopper could add an item at a stale price, walk away, and return to place an order using an out-of-date total. To close this gap, `handlePlaceOrder` runs a **fresh `previewOrderAction`** against the exact `productsForPreview` payload that the debounced summary was built from, immediately after `setPlacing(true)` and before `createOrderAction`.

Two guards are applied on the fresh response:

1. **`!fresh.ok`** — OE rejected the preview (e.g. a line item is unavailable or its price is undefined). `handlePlaceOrder` surfaces `fresh.error` (or a generic re-validation message) and returns without calling `createOrderAction`. Note: "Product not found" failures are handled earlier — `CartContext`'s ambient `previewOrder` effect double-checks each reported id against the catalog via `getProductsByIdsAction` and only prunes items that the catalog also cannot find, so valid products are not removed due to a spurious `Orders.previewOrder` error (see [CART_WISHLIST.md §4a](./CART_WISHLIST.md#4a-checkout-preview--coupons)).
2. **Total drift** — if `preview` exists and `Math.abs(fresh.totalDue - preview.totalDue) > 0.01`, the `preview` state is updated to the fresh figures and a message is shown: _"Order total changed to $X since you last reviewed it — please check the summary and place the order again."_ The shopper must click **Place Order** a second time with the corrected total visible on screen.
3. **Sale-price mismatch guard.** `PaymentPage` additionally compares OE's authoritative `fresh.totalSum` (the pre-discount gross) against the client `subtotal` (`Math.abs(fresh.totalSum - subtotal) > 0.01`). This catches the "guest whose OE Discount rule requires a logged-in tier" case — the catalog optimistically showed a sale price OE will not honour — which the `totalDue` vs `totalDue` guard alone could not detect because OE's `totalDue` was already consistent with the non-discounted total. When this guard fires the "We now show $X at checkout" banner is shown, `preview` is updated to the fresh figures, and the order is not submitted.

   **`alreadyReconciled` skip.** When this guard fires on the first click, `setPreview(fresh)` propagates OE's authoritative totals to the Order Summary and CTA. On the shopper's second click, `fresh` is re-fetched and will again differ from client `subtotal` — so without an additional check the guard would re-fire indefinitely. To prevent this, `handlePlaceOrder` computes:

   ```ts
   const alreadyReconciled = preview
     && Math.abs(fresh.totalSum - preview.totalSum) < 0.01
     && Math.abs(fresh.totalDue - preview.totalDue) < 0.01;
   if (!alreadyReconciled && Math.abs(fresh.totalSum - subtotal) > 0.01) { … }
   ```

   If the on-screen `preview` already matches the fresh OE response (both `totalSum` and `totalDue` within $0.01), the shopper has already seen the reconciled total — their second click **is** the re-confirmation, so the sale-price guard is skipped and `createOrderAction` proceeds.

This makes the fresh preview the authoritative pre-flight check for every order, regardless of how long the shopper spent on the page or how stale the ISR-cached PDP was.

**`PreviewOrderResponse` shape** (`src/lib/oneentry/auth/actions.ts`):

```ts
type PreviewOrderResponse =
  | { ok: true;  /* ...preview fields... */ }
  | { ok: false; error: string; missingProductIds: number[] }
```

`missingProductIds` is populated by parsing OE's `"Product <id> not found"` error messages via regex. An empty array (`[]`) is always present on the failure branch so callers can safely check `.length > 0` without a null guard.

**`PreviewOrderResult` key fields** (the `ok: true` branch):

| Field | Type | Notes |
|---|---|---|
| `couponApplied` | `boolean` | `true` when OE confirmed it applied the code. |
| `couponDiscountAmount` | `number` | Monetary deduction attributable to the coupon alone. **Zero for gift-only coupons** (where OE's `discountValue` is `null`) so that any loyalty-tier discount visible in `discountAmount` is not wrongly attributed to the coupon line. |
| `giftItems` | `PreviewGiftItem[]` | Free products OE appended to the order. Sourced from `orderPreview[]` entries where `isGift === true`. Empty when no gift-bearing discount is active. |

```ts
export interface PreviewGiftItem {
  productId: number;
  quantity: number;
  /** Original catalogue price — displayed struck-through next to "FREE". */
  price: number;
}
```

Gift items are never merged into the local Redux cart — they are OE-owned, the shopper cannot remove or requantify them, and they disappear as soon as the triggering coupon is removed or its conditions are no longer met.

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

On mount, `ConfirmationPage` reads `sessionStorage['oe_last_order_id']` (set by `PaymentPage` immediately after `createOrderAction` resolves) and uses that value as the receipt order id. The entry is removed from `sessionStorage` after reading so it is not reused on a second visit.

`randomOrderId()` (`'OE-' + crypto.randomUUID().replace(/-/g,'').slice(0,8).toUpperCase()`) is now only a fallback — it fires when the `sessionStorage` read returns empty (direct navigation to `/checkout/confirmation`, or Stripe round-trip clearing `sessionStorage` on some browsers). The fallback keeps the receipt from rendering `null` for the order number.

### 4.2 Cart cleanup — two-stage

The cart is actually cleared in **two places**, in order:

1. **`PaymentPage.handlePlaceOrder`** — immediately after `createOrderAction` resolves successfully, *before* the Stripe redirect or `router.push('/checkout/confirmation')`. This is the load-bearing clear: a closed tab during Stripe redirect (or a cancelled Stripe session) no longer leaves the just-ordered items sitting in the shopper's bag next time they open the site.
2. **`ConfirmationPage`** — 200 ms after mount, a `setTimeout(() => clearCart(), 200)` re-fires. This is a belt-and-braces call: if a user lands on Confirmation via a direct link, or the PaymentPage clear failed for any reason, the receipt view still wipes the cart. The 200 ms delay lets the receipt render with the last item snapshot before the cart is emptied. `mounted && items.length > 0` guards the item list, so a second-mount clear does not blank the receipt.

`clearCart()` also resets the applied coupon (`couponCode=null`, clears `couponError`, and removes `sessionStorage['oe_coupon_code']`) so the shopper's next order requires an explicit `applyCoupon` call instead of silently reusing the previous code.

Server cart is NOT wiped by these calls directly — the `syncCart` sync effect will push the empty cart on the next tick. If OneEntry order creation happens outside the sync window (e.g. Stripe success redirect), the server cart is only cleared when the user returns to a page mounted `useCart()`.

### 4.3 Order total on the receipt

`ConfirmationPage` reads `sessionStorage['oe_last_order_total']` (written by `PaymentPage.handlePlaceOrder` immediately after `createOrderAction` resolves, using the `finalTotal` that was presented to the shopper). Because the cart is cleared before the page loads, `useCart().total` would be `$0`; this snapshot is the only reliable source of the paid amount. The entry is consumed and removed on first mount. When the key is absent (direct navigation or Stripe-round-trip `sessionStorage` clear), `paidTotal` stays `null` and the receipt falls back to `useCart().total` — which may be `$0` on that session.

**`activePreview` derivation.** `finalTotal` (and the `sessionStorage['oe_last_order_total']` snapshot written at order creation) is computed as:

```ts
const finalTotal = activePreview ? activeTotalDue : total;
```

`activePreview = preview ?? cartPreview`, where `preview` is `PaymentPage`'s own local `previewOrder` state and `cartPreview` is `CartContext.preview`. When `PaymentPage`'s debounced fetch has returned at least one result, `preview` takes precedence; before the first local fetch resolves, `cartPreview` provides a non-null value so the summary and CTA are never gated on the cold-start delay. `activeTotalDue` is read from `activePreview`. Whenever an OE preview is available, `finalTotal` equals OE's authoritative `totalDue` — regardless of whether any discount field is non-zero. This fixes the "OE quotes MORE than the client optimistic" direction: when a catalog `applyProductDiscount` overlay marks a product on sale but an OE Discount rule requires a user-group the shopper isn't in, OE returns `productDiscounts: []` and `totalDue` equal to full price. The previous three-flag guard (`activePersonalDiscount > 0 || activeCouponDiscount > 0 || activeBonusBurned`) stayed false in that case, collapsing `finalTotal` back to the optimistic client `total` even though the "total changed" warning banner correctly showed the higher OE figure. Now the CTA, Order Summary, and `oe_last_order_total` snapshot all consistently reflect OE's charge. `activeBonusBurned` has been removed as it was only used by the old formula.

> **CartPage / DeliveryPage divergence.** Those pages still use the three-flag shape (`personalDiscount > 0 || couponDiscount > 0 || preview.bonusApplied > 0 ? totalDue : subtotal`) because no fresh re-check preview is triggered there. The `PaymentPage` pre-flight guard (`handlePlaceOrder` → `previewOrderAction`) remains the point where OE's figure becomes authoritative.

### 4.4 Loyalty points

Rendered as `Math.floor((paidTotal ?? total) * 10)` points earned, using the same `paidTotal` snapshot. This is a static marketing calculation — it does not credit the user's OE loyalty balance.

### 4.5 Order-confirmed heading — copy precedence chain

The heading shown on the Confirmation page ("Order Confirmed!" or equivalent) is resolved at three levels, in priority order:

1. **OE System Text bucket `checkout_confirmed` / key `checkout_confirmed_titel`** — loaded via `useT('checkout_confirmed', 'checkout_confirmed_titel', ...)` at render time. This is the highest-priority override and the primary admin surface for per-locale copy.
2. **`checkout_home_delivery` form's `localizeInfos.successMessage`** — loaded server-side by `loadCheckoutSuccessMessage(lang)` (exported from `src/lib/oneentry/checkout/delivery-methods.ts`). The loader calls `Forms.getFormByMarker('checkout_home_delivery', lang)` and reads `.localizeInfos.successMessage`. It is wrapped with `unstable_cache` (key `oe-checkout-success-message`, tag `oe-forms`, TTL `REVALIDATE_STORES`) and returns `null` on error or when the field is empty. The `app/checkout/confirmation/page.tsx` route shell adds this loader to its existing `Promise.all` alongside `loadCheckoutSystemTexts()` and passes the result as a `successMessage?: string | null` prop to `<ConfirmationPage />`. If the System Text is blank, `useT` falls through to this value.
3. **Local literal `L.heading`** — a hardcoded string ("Order Confirmed!") compiled into `ConfirmationPage.tsx`. Used only when both OE surfaces are empty or unavailable.

---

## 5. Data flow diagram

```
handlePlaceOrder ───► previewOrderAction (fresh pre-flight)
                             │
                      !ok? ──► show error, return
                             │
                      totalDue drifted? ──► update preview state, show "total changed" message, return
                             │
Cart Redux ──────────────────┼──────────────────────┐
                             │                       │
sessionStorage['oe_checkout_payload']────────────────┼──► createOrderAction (Server Action)
                                                     │        │
Payment accounts (OE Payments) ──────────────────────┘        ├──► OE orders-storage/marker/{home|store_pickup|locker}[_guest]
                                                              │       (SDK Orders.createOrder)
                                                              │
                                                              ├── Stripe? ──► SDK Payments.createSession(orderId, 'session', false)
                                                              │                     │
                                                              │                     └──► paymentUrl
                                                              │
                                                              ├──► clearCart() [PaymentPage, unconditional on success]
                                                              │
                                                              ├──► sessionStorage['oe_last_order_id'] = orderId
                                                              │
                                                              ├── Stripe? ──► window.location.href = paymentUrl
                                                              │
                                                              └──► router.push('/checkout/confirmation')
                                                                                          │
                                                                                          ├──► read sessionStorage['oe_last_order_id'] → display real order id
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

### 7a. Gift-only coupons ("GIFT" style)

Some OE coupon discount configs award a free product rather than a price reduction (`discountValue: null` or `{ value: null }` with a non-empty `gifts[]` array). `previewOrderAction` detects this pattern after a successful `couponApplied === true` response by fetching the discount config via `Discounts.getDiscountByMarker`. When the coupon is gift-only:

- `couponDiscountAmount` is set to `0` (even though OE's `discountAmount` may be non-zero because a loyalty-tier discount is also in play). This prevents the UI from rendering a "Promo (CODE) −$X" line where the dollar figure actually belongs to the shopper's loyalty tier, not the coupon.
- `preview.giftItems` is populated from `orderPreview[]` entries with `isGift === true` — each entry carries `productId`, `quantity`, and the catalogue `price`.
- `CartContext` enriches each gift item with `name` and `image` via `getProductsByIdsAction`, producing `GiftCartItem[]` which is exposed as `useCart().giftItems`.
- `DeliveryOrderSummary`, `CartPage`, `MiniCart`, and `PaymentPage` all render gift items as distinct "FREE GIFT" rows: product image, name, a `FREE GIFT` badge, "Free" as the effective price, and the catalogue price struck-through next to it.
- Because `useCart()` is a plain hook (no `Context.Provider`), each consumer gets its own independent `useState` — so `DeliveryOrderSummary` receives `giftItems` as an explicit prop from `DeliveryPage` (mirroring how `couponDiscount`, `personalDiscount`, and `finalTotal` are already passed down) rather than calling `useCart()` itself.

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
| `oe_last_order_id` | `sessionStorage` | Written by PaymentPage after `createOrderAction`; removed by ConfirmationPage on mount | Real OE `orderId` surfaced on the receipt |
| `oe_last_order_total` | `sessionStorage` | Written by PaymentPage (`String(finalTotal)`) immediately before redirect/push; removed by ConfirmationPage on mount | `finalTotal` snapshot used by ConfirmationPage so the receipt shows the real paid amount after the cart is cleared |
| `oe_cart_merged` / `oe_wishlist_merged` | `sessionStorage` | Session; cleared on logout | Prevent re-merge on tree remounts; cleared by `AuthContext.logout()` to prevent cross-user leakage |
| `oe_coupon_code` | `sessionStorage` | Until `clearCart()` or logout | Applied coupon code persisted across cart → delivery navigation; cleared on logout |
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
- When a gift-bearing coupon is applied, `useCart().giftItems` (a `GiftCartItem[]`) is non-empty. `CartPage` renders each gift below the regular item list as a distinct "FREE GIFT" row (image, name, badge, catalogue price struck-through, effective price "Free"). Gift rows have no qty control or remove button — they are OE-owned.
- A local `wishlist: Set<string>` state mirrors the wishlist for the row's "heart" toggle (the actual mutation still goes through `useWishlist()`).
- `mounted` flag suppresses the SSR pass to avoid hydration mismatch when the persisted cart differs from `[]`.

The applied promo now persists across `/cart` → Delivery because both surfaces read it from `CartContext` (see [CART_WISHLIST.md §4a](./CART_WISHLIST.md#4a-checkout-preview--coupons)).

## 12. Files touched

| File | Role |
|---|---|
| `app/checkout/delivery/page.tsx` | Delivery route shell — also calls `loadStores()` and adapts the result to `PickupStore[]` before passing to `<DeliveryPage>` |
| `app/checkout/confirmation/page.tsx` | Route shell — `Promise.all`s `loadCheckoutSuccessMessage()` alongside `loadCheckoutSystemTexts()`; passes result as `successMessage` prop to `<ConfirmationPage />` |
| `app/checkout/payment/page.tsx` | Route shell (SEO metadata + client component) |
| `app/checkout/error.tsx` | Segment error boundary |
| `src/app/pages/DeliveryPage.tsx` | Delivery step client component; accepts `pickupStores?: PickupStore[]`, `deliveryDatesIsoAuthed?: string[]`, `deliveryDatesIsoGuest?: string[]`, `deliverySlotsAuthed?: DeliveryTimeSlot[]`, and `deliverySlotsGuest?: DeliveryTimeSlot[]` props; selects the active pair based on `isLoggedIn` from `AuthContext` |
| `src/app/pages/PaymentPage.tsx` | Payment step client component; writes real `orderId` to `sessionStorage['oe_last_order_id']` on success |
| `src/app/pages/ConfirmationPage.tsx` | Confirmation step; reads real `orderId` from `sessionStorage['oe_last_order_id']`, falls back to `randomOrderId()`; accepts optional `successMessage?: string | null` prop used as secondary source for the confirmed-order heading (see §4.4) |
| `src/app/pages/checkout/DeliveryMethodHome.tsx` / `Locker.tsx` / `Store.tsx` | Method-specific sub-forms; `Store.tsx` takes a `stores: PickupStore[]` prop; `DeliveryMethodHome.tsx` accepts optional `timeSlots?: DeliveryTimeSlot[]` (falls back to `DELIVERY_TIME_SLOTS` when absent); all three read OE copy via `useDeliveryMethodInfo()` with literal-label fallback |
| `src/lib/oneentry/checkout/delivery-methods.ts` | `loadDeliveryMethodInfo()` — cached OE form loader; returns `DeliveryMethodInfo`. Also exports `loadCheckoutSuccessMessage(lang)` — reads `checkout_home_delivery` form's `localizeInfos.successMessage`; cached under key `oe-checkout-success-message`, tag `oe-forms`, TTL `REVALIDATE_STORES`; returns `null` on error/empty (see §4.4) |
| `src/lib/oneentry/checkout/delivery-schedule.ts` | `loadDeliverySchedule(variant?, lang?)` — cached OE loader for the date-strip + time-slot config; `variant` selects the `authed` or `guest` aset/attribute marker pair (see §2.2a). `buildDeliveryDates(daysAhead, disabledWeekdays, now?)` — pure date-strip generator, server and test safe |
| `src/lib/oneentry/checkout/DeliveryMethodInfoContext.tsx` | `DeliveryMethodInfoProvider` + `useDeliveryMethodInfo()` |
| `src/app/data/stores.ts` | `Store` interface — carries optional `oeId?: number` (numeric OE page id) |
| `src/lib/oneentry/catalog/stores.ts` | `normalize()` populates `oeId: raw.id` on every store returned from OE |
| `src/app/pages/checkout/DeliveryOrderSummary.tsx` | Right-rail order summary |
| `src/app/pages/checkout/PaymentMethodsList.tsx` | Renders the OE payment accounts list |
| `src/app/pages/checkout/GuestCheckoutModal.tsx` | Auth gate modal |
| `src/app/pages/checkout/GuestContactForm.tsx` | Guest contact inputs |
| `src/app/components/CheckoutStepper.tsx` | Step indicator |
| `src/app/data/checkoutConfig.ts` | Pickup stores, lockers, time slots, coupon dict, delivery perks |
| `src/app/data/paymentMethodsConfig.ts` | Stylistic copy for payment badges |
| `src/lib/oneentry/auth/actions.ts` | `createOrderAction`, `updateAddressesAction`, `getCurrentUserAction`, `previewOrderAction` (returns `missingProductIds` on failure). `TIER_MARKERS` (`['bronze','silver','gold','platinum']`) is now a single module-scoped `const` consumed by `fetchLoyalty`, `previewOrderAction`, and `createOrderAction` — not exported (Next.js 16 `'use server'` files reject non-async exports). Exports `PreviewGiftItem` and an extended `PreviewOrderResult` with `giftItems: PreviewGiftItem[]` and a corrected `couponDiscountAmount` (zero for gift-only coupons — see §7a). |
| `src/app/components/CartUnavailableNotice.tsx` | Top-of-page banner that displays auto-pruned items and lets the shopper dismiss; mounted in `Providers.tsx` |
| `src/lib/oneentry/payments/accounts.ts` | `getPaymentAccountsAction` |
| `src/app/utils/guest-id.ts` | `getOrCreateGuestId()` |
| `src/app/utils/schemas.ts` | Zod schemas |

---

## 13. Cross-references

- [CART_WISHLIST.md](./CART_WISHLIST.md) — cart snapshot / sync semantics
- [AUTH.md](./AUTH.md) — the auth gate on the Delivery step
- [ONEENTRY_INTEGRATION.md](./ONEENTRY_INTEGRATION.md) — `createOrderAction`, `getPaymentAccountsAction`, `updateAddressesAction`
- [pages/checkout-delivery.md](./pages/checkout-delivery.md), [pages/checkout-payment.md](./pages/checkout-payment.md), [pages/checkout-confirmation.md](./pages/checkout-confirmation.md) — per-page UI specs
