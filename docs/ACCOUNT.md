# ACCOUNT.md — Account area

> Reference for the customer account dashboard at `/account`. Audience: LLM agents that need a code-level picture of the tabs, forms, Server Actions, and OneEntry form-data records powering each section.

---

## 1. Overview

`/account` renders a two-column shell (sticky sidebar + main pane on desktop, tab-strip on mobile). The active tab is driven by the `?tab=` URL param and one of nine sections is mounted below the shell. Session bootstrap is gated by `authReady`.

```
AccountPage
  ├── !authReady               → skeleton
  ├── authReady && !user       → <SignInPrompt> (CTA opens LoginModal)
  └── authReady && user        → sidebar + <SectionForTab />
```

Sections (query values — 9 active tabs, order matches sidebar):

| Tab | Section component | Source of truth |
|---|---|---|
| `my-data` (default) | `MyDataSection` (wraps 6 sub-forms) | `user.*` + form-data upserts |
| `my-orders` | `MyOrdersSection` | `user.oeOrders` (from `getCurrentUserAction`) |
| `my-bonuses` | `BonusesSection` | `user.status / discount / bonuses / totalPurchases / nextLevelAmount` — mock defaults |
| `service` | `ServiceMaintenanceSection` | `getServiceRequestsAction()` + `submitServiceRequestAction()` |
| `history` | `HistorySection` + `TrackingModal` | `user.oeOrders` (all statuses) |
| `wishlist` | `WishlistSection` | `useWishlist()` |
| `waiting-list` | `WaitingListSection` | `getWaitingListAction()` |
| `feedback` | `FeedbackSection` | Local state (form-data submission planned) |
| `subscriptions` | `SubscriptionsSection` | `user.subscriptions` + `updateSubscriptions(...)` |

Sidebar footer: `Loyalty card` (renders `LoyaltyCard` component inline within My Data), `Logout` (calls `AuthContext.logout()`).

**Note:** `ReferSection.tsx` exists under `pages/account/` but is not currently imported by `AccountPage` — the "Refer a friend" tab has been dropped from the active navigation while the referrals backend is pending. The file is retained for future re-activation.

Shared helpers live in `src/app/pages/account/shared.tsx` (section title, empty state, tab-strip).

---

## 2. My Data (`MyDataSection.tsx`)

Composite section: renders the `LoyaltyCard` header + the six sub-forms below.

| Sub-form file | OneEntry backing |
|---|---|
| `myData/PersonalInfoSection.tsx` | `updateProfileAction({firstName, lastName, email, phone, gender, dob, shoeSize, clothingSize})` — validated with `profileSchema` (Zod) |
| `myData/PasswordSection.tsx` | **Local only** — no `changePasswordAction` exists yet. The success state is simulated. |
| `myData/AddressesSection.tsx` | `updateAddressesAction(nextAddresses)` — full replace. Each `OeAddress` carries `recordId` when persisted; new addresses get `recordId: undefined`. Validated with `addressSchema`. |
| `myData/SocialNetworksSection.tsx` | "Connect" for Google calls `startGoogleOAuth('/account?googleLinked=1')` — the browser leaves for Google's authorize screen and returns via `app/auth/callback/google`; because `oe_access` is present, `exchangeGoogleCodeAction` links the Google identity to the current user instead of opening a new session. The mount effect reads `?googleLinked=1` and marks Google as linked. Apple / Facebook buttons are visual stubs. |
| `myData/ConsentSection.tsx` | `updateConsentAction({dataProcessing, crossBorder})` — the same `user_data` form-data record (moduleConfigId 3). |
| `myData/AccountDeletionSection.tsx` | **No deletion Server Action** — the "Delete account" CTA calls `AuthContext.logout()` and shows a warning. |

All mutations are optimistic in `AuthContext.user` state and reconciled by `getCurrentUserAction` refresh.

---

## 3. My Orders (`MyOrdersSection.tsx`)

Renders the six most-recent orders from `user.oeOrders`. `getCurrentUserAction` composes the list on the server by scanning the three orders storages (`home`, `store_pickup`, `locker`) — see `src/lib/oneentry/auth/actions.ts::getCurrentUserAction`.

Each order is adapted from `OeOrder` to the UI shape via `adaptOeOrder()` — a **private helper defined inside `MyOrdersSection.tsx`**:

```ts
OeOrder → {
  id, date, status: 'Delivered' | 'Processing' | 'Cancelled',
  items, total, image, trackingNo?, estimatedDelivery?, orderItems,
  oeId?, oeStorage?
}
```

`oeId` and `oeStorage` (also declared on `UserOrder` in `src/app/data/userData.ts`) are carried through from the raw OE order so the row can address the SDK later. Each `UserOrderItem` also carries an optional numeric `productId` populated by the adapter — used by Reorder to look the product back up from the cart.

Status mapping (case-insensitive):

- `delivered` / `completed` → `Delivered`
- `cancelled` / `canceled` → `Cancelled`
- `processing` / `new` / `pending` → `Processing`

Actions per row:

- **Expand** — shows the `orderItems` grid.
- **Full History** — navigates to `?tab=history`. `AccountPage.tsx` subscribes to `useSearchParams()` and re-runs its tab-restore effect on every `?tab=` change, so the push updates both the URL and the visible section (previously the on-mount-only effect left the section stuck on `my-orders`).
- **Reorder** — `handleReorder(order)` iterates `order.orderItems`, calls `useCart().addItem(...)` for each row that carries a numeric `productId`, then routes to `/cart`. The button is hidden when no item has a `productId` (mock rows).
- **Cancel** — red link that opens a confirmation modal ("Do you want to cancel order X?" + Confirm / No). On confirm, calls the `cancelOrderAction(orderId, storage)` server action and, on `{ok:true}`, adds the order id to a local `locallyCancelledIds` set so the badge flips to `Cancelled` immediately without waiting for `oeOrders` to refetch. Server-side, `cancelOrderAction` first reads the existing order (OE's `updateOrderByMarkerAndId` requires a full `IOrderData` body, not a partial patch — otherwise validators reject with `"Order must have a payment"`) and resubmits it with only the `statusIdentifier` swapped for the tenant's cancellation marker.

Image fallback: if the OE order product lacks a `preview`, `MyOrdersSection` falls back to the catalog product image via `getProductsByIdsAction`. Guarded so the fallback runs once per order id.

---

## 4. My Bonuses (`BonusesSection.tsx`)

Loyalty summary card + empty transactions table.

**Real fields (from OE `user.*`):**
- `status` (`Bronze` / `Silver` / `Gold` / `Platinum`)
- `bonuses` (numeric points)
- `discount` (integer percent)
- `totalPurchases`, `nextLevelAmount` — progress-bar inputs

**Bonus transactions:** loaded via `fetchBonusHistoryAction()` (`src/lib/oneentry/auth/actions.ts`), which calls `api.Discounts.getBonusHistory()`. OE actually returns a paginated envelope `{ items: IBonusTransactionEntity[], total: number }` — the action unwraps `.items` (and still accepts a bare array as a graceful fallback) despite the SDK typing the return as a plain array. Each row maps to `OeBonusTransaction { amount, type, createdAt, comment, sign }`; `sign` is `+1` for accrual-family `type` values (see `POSITIVE_BONUS_TYPES`) and `-1` otherwise. Empty history still renders the "No bonus transactions yet" placeholder.

**Mock:**
- Points redemption UI is a placeholder.

The `LoyaltyCard` sub-component (`src/app/pages/account/LoyaltyCard.tsx`) also renders on the My Data page as the header banner and reads the same fields.

**Caveat:** on this tenant the loyalty attributes are not backed by real values. `AuthContext` seeds them from `EMPTY_USER_DEFAULTS` (zeros) — so a fresh signed-in user sees `Bronze / 0 pts / 0 % discount`. When the CMS loyalty attribute set lands, `getCurrentUserAction` will start returning real values without any client change.

---

## 5. Service Maintenance (`ServiceMaintenanceSection.tsx`)

Two-column view: existing requests on the left, submission form on the right.

**Load:** `getServiceRequestsAction()` (`src/lib/oneentry/catalog/service-requests-action.ts`) reads form-data records under marker `service_request` (moduleConfigId `4`), scoped to the current user. Maps each record to a UI `ServiceRequest`:

```ts
{
  id, item, category, description, status,
  submittedDate, refNo, cost?, photo?, expectedReady?
}
```

Status mapping (`ServiceStatus`):
- `open`, `in-progress`, `ready`, `completed`, `cancelled`

**Submit:** `submitServiceRequestAction({item, category, description, date, order_id?})` (`src/lib/oneentry/catalog/service-request-submit-action.ts`) POSTs form-data with the same marker/moduleConfigId. Categories: `alteration`, `repair`, `cleaning`, `restoration`, `other`. On success, the UI flashes a check-mark and collapses the form after 2.5 s.

Sub-components:
- `service/ServiceHowItWorks.tsx` — static 4-step explainer (Submit Request → Drop Off → We Get to Work → Collect).
- `service/ServiceRequestForm.tsx` — the actual form.

---

## 6. History (`HistorySection.tsx`)

Full purchase history (all statuses, not just recent). Adapts via `adaptOeToHistory()` — private helper inside `HistorySection.tsx`. Renders a filterable list with:

- Status filters: All / Delivered / Shipped / Cancelled / Returned
- Reorder CTA (same as My Orders)
- Tracking modal (below)

**Status bucketing.** OE namespaces status markers per storage (e.g. `home_paid`, `home_shipped`, `home_delivered`), so the exact-match dictionary used in My Orders would collapse everything to `Processing`. `HistorySection.tsx` instead runs `bucketOeStatus(statusIdentifier)` — regex substring buckets evaluated in priority order:

1. `returned` — matches `return`
2. `cancelled` — matches `cancel|refund|reject|void|fail|declin`
3. `delivered` — matches `deliver|complete|done|closed|finish|received|arrived`
4. `shipped` — matches `ship|dispatch|transit|out.?for.?delivery|paid`
5. `processing` — fallback

The bucket drives the filter tabs and the delivered-count. For the badge label the UI prefers the raw OE `statusLocalizeInfos.title` (preserved on `HistoryOrder.statusTitle` — see `src/app/data/userData.ts`), falling back to the bucket label. Result: badges read verbatim ("Home Paid", "Home Shipped") while filtering still works.

**Tracking modal** (`history/TrackingModal.tsx`) — reads `trackingNo` off the adapted order, shows a static Royal Mail deep-link and a copy-to-clipboard button. No polling / status refresh.

---

## 7. Wishlist (`WishlistSection.tsx`)

Grid of items from `useWishlist()`. Each card reuses `<FavoriteCard>`; interactions:

- Colour swatch selection updates `selectedColor` (persisted via `updateSelection`).
- Add-to-Cart / Remove / Quick-view.
- Empty state renders `<FavoritesEmptyState>` with a CTA to the women's catalog.

Server sync is handled by `WishlistContext` (see [CART_WISHLIST.md](./CART_WISHLIST.md) §5).

---

## 8. Waiting List (`WaitingListSection.tsx`)

Loads via `getWaitingListAction()` (`src/lib/oneentry/catalog/waiting-list-action.ts`). Logic:

1. Read wishlist via `getWishlistAction()`.
2. Fetch each wishlist product via `loadProductsByIds`.
3. Infer stock status per product: `in_stock`, `low_stock`, `out_of_stock`, `back_in_stock`.
4. Return only the items whose status is not `in_stock` (that's the "waiting" filter).

Row actions:
- **Bell** — local notification toggle (no server persistence).
- **Trash** — calls `useWishlist().removeItem(id)`.
- **Add to Cart** (only when status ≠ `out_of_stock`) — `useCart().addItem(...)`, with a 2 s success flash.

---

## 9. Feedback (`FeedbackSection.tsx`)

Star rating (required, 1–5) + category + related order dropdown (built from `user.oeOrders`) + free-text message (required, ≥ 20 chars).

Submission validates `rating > 0 && message.length >= 20`. Current implementation does **not** call a Server Action — it flips to a success card. A future patch should wire it through `submitForm('user_account_feedback', [...])` (form marker not yet provisioned on this tenant).

---

## 10. Subscriptions (`SubscriptionsSection.tsx`)

Seven toggle switches, each mapping to an `OeSubscriptions` boolean:

| Toggle | Field |
|---|---|
| Email newsletter | `emailNewsletter` |
| SMS notifications | `smsNotifications` |
| Push notifications | `pushNotifications` |
| Order updates | `orderUpdates` |
| New arrivals | `newArrivals` |
| Sale alerts | `saleAlerts` |
| Loyalty updates | `loyaltyUpdates` |

Every toggle immediately fires `updateSubscriptions(nextSubs)` → `updateSubscriptionsAction` → OE form-data `subscription_management` (moduleConfigId 32). Optimistic UI, silent rollback on error.

**Push notification wiring:** enabling `pushNotifications` currently only persists the flag. It does NOT request browser Notification permission or register an FCM token. See [PWA.md](./PWA.md) §8 for the push roadmap.

---

## 11. Refer a friend (`ReferSection.tsx`) — DARK CODE

The `ReferSection` component exists but is **not currently mounted by `AccountPage`** — the "Refer a friend" tab has been dropped from the sidebar while the referrals backend is pending.

If reactivated, the section is share-only — no backend integration on this tenant. Generates a synthetic code from the user's first name (`OE-XXXX2026`), exposes copy-link / copy-code buttons, and an email invite textarea that does not POST anywhere. All stats (`friendsInvited`, `ordersPlaced`, `creditsEarned`) are hard-coded zeros.

To make it real: (1) add the `refer` case back to the `AccountPage` section switch and the sidebar tabs, (2) provision an OE `referrals` form + a Server Action `submitReferralInvite(email)`, (3) swap the local `onSend()` handler.

---

## 12. Logout

`AccountPage`'s sidebar logout button calls `AuthContext.logout()`:

1. Clears local `isLoggedIn` / `user` state.
2. Dispatches `clearAuth()` to `userSlice`.
3. Fires `signOutAction()` in the background, which reads `oe_refresh` and calls `AuthProvider.logout(refreshToken)`, then clears `oe_access` / `oe_refresh` / `oe_user` cookies.
4. No redirect — the sidebar re-renders as the `SignInPrompt`.

---

## 13. Files touched

| File | Role |
|---|---|
| `src/app/pages/AccountPage.tsx` | Shell + tab dispatcher |
| `src/app/pages/account/{Bonuses,Feedback,History,LoyaltyCard,MyData,MyOrders,ServiceMaintenance,Subscriptions,WaitingList,Wishlist}Section.tsx` | Individual tab sections (10 rendered) |
| `src/app/pages/account/ReferSection.tsx` | Dark code — not imported by `AccountPage`; see §11 |
| `src/app/pages/account/shared.tsx` | Shared primitives (`SectionTitle`, `EditBtn`, `Field`, `FormInput`, `Sk`) + 10 per-tab loading skeletons + re-exports of `ACCENT` and `fmt`. **Does not contain the order adapters** — they are private inside `MyOrdersSection.tsx` (`adaptOeOrder`) and `HistorySection.tsx` (`adaptOeToHistory`). |
| `src/app/pages/account/myData/*.tsx` | Six sub-forms for My Data |
| `src/app/pages/account/history/TrackingModal.tsx` | Order tracking modal |
| `src/app/pages/account/service/{ServiceRequestForm,ServiceHowItWorks}.tsx` | Service tab pieces |
| `src/lib/oneentry/auth/actions.ts` | `updateProfile / updateAddresses / updateSubscriptions / updateConsent / getGoogleAuthUrl / exchangeGoogleCode / getCurrentUser / signOut / getCart / getWishlist / pushRecentlyViewed / getRecentlyViewed / mergeRecentlyViewed` |
| `src/lib/oneentry/catalog/service-requests-action.ts` + `service-request-submit-action.ts` | Service tab Server Actions |
| `src/lib/oneentry/catalog/waiting-list-action.ts` | Waiting list resolver |
| `src/lib/oneentry/catalog/products-action.ts` | `getProductsByIdsAction` — used by My Orders image fallback |
| `src/app/utils/schemas.ts` | `profileSchema`, `addressSchema`, `promoSchema` |
| `src/lib/google-auth.ts` | `startGoogleOAuth(returnTo?)` — server-action-driven authorize-URL redirect used by Social networks and by Login / Register modals |
| `app/auth/callback/google/route.ts` | GET route that receives Google's `?code=&state=`, calls `exchangeGoogleCodeAction`, redirects to `returnTo` or to `/?googleAuthError=` |

---

## 14. Cross-references

- [AUTH.md](./AUTH.md) — `/me` bootstrap and cookie session
- [CART_WISHLIST.md](./CART_WISHLIST.md) — how the wishlist tab synchronises
- [ONEENTRY_INTEGRATION.md](./ONEENTRY_INTEGRATION.md) — full Server Action list + form-data module-config ids
- [pages/account.md](./pages/account.md) — per-tab UI spec
