# ONEENTRY_INTEGRATION.md — OneEntry Platform integration

> Audit of how `apps/new-shop-nextjs` (Next.js 16 / React 19 / Redux Toolkit) talks to the OneEntry Platform. Audience: LLM agents that need to know which OneEntry calls are wired, which markers are referenced, which env vars must be set, and where the boundary sits between server-side loaders and client-side state.

---

## 1. Overview — TL;DR

The storefront is **fully wired** to OneEntry through the official SDK (`oneentry ^1.0.154`, `package.json:24`). Server-authoritative data — products, pages, blocks, menus, labels, user profile, orders, reviews, payment accounts — is fetched via `getApi()` from `src/lib/oneentry/`. Mutations (auth, sync-cart, sync-wishlist, submit-form, create-order, update-profile) run through Server Actions and manage `oe_access` / `oe_refresh` / `oe_user` cookies. Client state (cart / wishlist / recently-viewed / filters) stays in Redux and mirrors the CMS through debounced sync.

Position in the stack:

```
┌─────────────────── Next.js App Router ──────────────────┐
│  RSC route shells (app/**/page.tsx)                     │
│  Client components (src/app/{components,pages,context}) │
│  Redux store + slices (src/app/store)                   │
└───────────┬────────────────────┬────────────────────────┘
            │                    │
            │ RSC async fetch    │ Server Actions ('use server')
            │                    │
            ▼                    ▼
┌───────────────────────────────────────────────────────────┐
│  src/lib/oneentry/  (server-only integration layer)       │
│  ┌──────────────────────────────────────────────────────┐ │
│  │ index.ts     → getApi() = defineOneEntry singleton   │ │
│  │ auth/        → signIn / signUp / OAuth / me / order  │ │
│  │ activity/    → trackActivity                         │ │
│  │ blocks/      → hero, discount, collections, page-b.  │ │
│  │ catalog/     → products, filters, pages, reviews…    │ │
│  │ forms/       → placeholders, submit                  │ │
│  │ labels/      → 12 CMS-managed label sets             │ │
│  │ menus/       → header + footer                       │ │
│  │ payments/    → getAccounts                           │ │
│  └──────────────────────────────────────────────────────┘ │
└───────────┬───────────────────────────────────────────────┘
            │ HTTPS + Bearer <app-token> (+ session cookie)
            ▼
     OneEntry Platform (Content API)
```

When `ONEENTRY_URL` / `ONEENTRY_TOKEN` are missing at server startup, `getApi()` **throws** — deliberate loud failure to prevent silent degradation.

---

## 2. Environment variables

The integration reads three env vars.

| Variable | Scope | Where read | Purpose |
|---|---|---|---|
| `ONEENTRY_URL` | server | `src/lib/oneentry/index.ts:4` | Platform base URL, e.g. `http://localhost:3013`. **Do not** append `/api/content` — the SDK adds it. |
| `ONEENTRY_TOKEN` | server | `src/lib/oneentry/index.ts:5` | App token issued in OneEntry admin (`Marketplace → Applications`). Sent to the SDK as `token`. |
| `NEXT_PUBLIC_DEFAULT_LOCALE` | build-time | `src/lib/oneentry/locale.ts:11` | Default `langCode` for every SDK call (default `en_US`). |

Optional:

| Variable | Purpose |
|---|---|
| `NEXT_PUBLIC_GOOGLE_CLIENT_ID` | Enables the "Continue with Google" button. Full-page authorization-code flow: `getGoogleAuthUrlAction` builds the authorize URL from `AuthProvider.getAuthProviderByMarker('google').config.oauthAuthUrl` and the callback route `/auth/callback/google` calls `exchangeGoogleCodeAction`. Must match the OAuth client id in Google Cloud Console; the client secret lives inside the OneEntry provider config. |
| `OE_LOG_CAUGHT` | Set to `1` to enable `logCaught` breadcrumbs from swallowed OE loader errors (see §5 — `src/lib/oneentry/log.ts`). Off by default in production; on by default in `development`. Also activated when `OE_PROFILE=1`. |
| `OE_PROFILE` | Set to `1` to enable loader timing capture. Each wrapped loader logs to stdout and pushes into the in-memory ring buffer. Off by default — zero overhead in production. |
| `OE_PROFILE_SLOW_MS` | When `OE_PROFILE=1`, suppress stdout logs for calls faster than N ms (default `0` = log all). Does **not** affect the ring buffer — every call is recorded regardless. |
| `PERF_DUMP_TOKEN` | Shared secret required by `GET /api/perf-dump`. The endpoint returns 401 for every request when this var is unset. Keep the value out of the client bundle (server-only). |

Notes:

- **`NEXT_PUBLIC_API_URL` is no longer on the live cart/wishlist path** — sync goes through Server Actions (`syncCartAction` / `syncWishlistAction`) that read `oe_access` server-side. The variable is still *referenced* by the RTK Query scaffolding `cartApi` / `wishlistApi` (`fetchBaseQuery({baseUrl: process.env.NEXT_PUBLIC_API_URL})`) — it stays empty in production, `isCartApiEnabled()` / `isWishlistApiEnabled()` return `false`, and the query hooks are not called. Setting it enables the legacy client-side sync path; leaving it unset (the recommended state) has no effect on any user-visible feature.
- `ONEENTRY_URL` / `ONEENTRY_TOKEN` are **server-only** — they are never inlined into the client bundle. This is intentional: the storefront never opens a direct connection from the browser to OneEntry.
- Both `ONEENTRY_URL` and `ONEENTRY_TOKEN` are checked once at module load; a rebuild is not strictly required, but a dev-server restart is.

---

## 3. SDK bootstrap

`src/lib/oneentry/index.ts`:

```ts
import { defineOneEntry } from 'oneentry';
import type { IError } from 'oneentry/dist/base/utils';

const url = process.env.ONEENTRY_URL ?? '';
const token = process.env.ONEENTRY_TOKEN ?? '';

export const isOneEntryEnabled = Boolean(url && token);

export const oneentry = isOneEntryEnabled ? defineOneEntry(url, { token }) : null;

export type OneEntryClient = NonNullable<typeof oneentry>;

export function getApi(): OneEntryClient {
  if (!oneentry) {
    throw new Error('OneEntry SDK is not configured. Set ONEENTRY_URL and ONEENTRY_TOKEN.');
  }
  return oneentry;
}

export type OeError = IError;
export function isError<T>(value: T | IError): value is IError {
  return typeof value === 'object' && value !== null && 'statusCode' in value
      && typeof (value as { statusCode: unknown }).statusCode === 'number';
}
```

Consumers always import `getApi()` — never `oneentry` directly. That way we have one call site for future refactors (e.g. swapping in `reDefine()` after authorization).

**Locale:** `src/lib/oneentry/locale.ts` exports `DEFAULT_LOCALE`. Every fetcher already accepts `lang: Lang = DEFAULT_LOCALE`, so multi-locale routing (`app/[locale]/…`) becomes a mechanical swap.

---

## 4. Server Actions

All mutations live under `src/lib/oneentry/**/*.ts` and are marked `'use server'`. Grouped by domain:

### 4.1 Auth + user state (`src/lib/oneentry/auth/actions.ts`)

The file is the largest Server Action module (~1420 lines) and exposes **18 Server Actions** plus the shared types (`OeUser`, `OeAddress`, `OeSubscriptions`, `OeConsent`, `OeCartItem`, `OeWishlistItem`, `OeOrder`, `OeRecentlyViewedItem`, `ProfileUpdate`, `CheckoutMethod`, `CreateOrderInput`).

**Auth & session**

| Action | OneEntry call | Purpose |
|---|---|---|
| `signInAction(loginOrEmail, password)` | `AuthProvider.auth('email', {authData:[{marker:'login',value},{marker:'password',value}]})` | Email/password sign-in. On success, writes `oe_access` / `oe_refresh` / `oe_user` cookies and returns `{ok:true, user, userIdentifier}`. |
| `getGoogleAuthUrlAction(origin, returnTo?)` | `AuthProvider.getAuthProviderByMarker('google')` (reads `config.oauthAuthUrl`) | Builds Google's OAuth authorize URL (`response_type=code`, `scope=openid email profile`, `redirect_uri=${origin}/auth/callback/google`), sets httpOnly CSRF `oe_google_state` + `oe_google_return_to` cookies, returns `{url}`. Called from `startGoogleOAuth` in `src/lib/google-auth.ts` — the browser then navigates to `url`. |
| `exchangeGoogleCodeAction({code, state, origin})` | `AuthProvider.oauth('google', {code, redirect_uri})` | Called from the `app/auth/callback/google/route.ts` GET handler after Google redirects back. Verifies the `oe_google_state` cookie, exchanges the authorization `code` (OneEntry uses its stored `client_secret` server-side), sets `oe_access` / `oe_refresh` / `oe_user`, returns `{ok, user, userIdentifier, returnTo}`. Also handles Google-account linking: if `oe_access` is already present, OE associates the identity with the current user instead of creating a new session. |
| `signUpAction(input)` | `AuthProvider.signUp('signin', formData)` | Creates a new account. `input` follows the sign-up-form attribute-set schema (see 4.2). |
| `signOutAction()` | `AuthProvider.logout(refreshToken)` | Server-side logout, clears cookies. |
| `getCurrentUserAction()` | `Users.getUser(langCode)` + form-data reads (see below) | Bootstrap `/me`. Composes profile + addresses + subscriptions + consent + cart + wishlist + recently-viewed + orders. Called from `AuthContext` on mount and after every mutation. |

**Form-data module-config IDs used by `getCurrentUserAction` / `update*Action`:**

```ts
const USER_ADDRESSES_MODULE_CONFIG_ID = 24;      // user_addresses form
const USER_DATA_MODULE_CONFIG_ID = 3;             // user_data form (consent, extra profile bits)
const SUBSCRIPTION_MGMT_MODULE_CONFIG_ID = 32;    // subscription_management form
```

**Profile mutations**

| Action | Effect |
|---|---|
| `updateProfileAction(patch: ProfileUpdate)` | Persists a partial profile update. Fields (each optional): `firstName`, `lastName`, `email`, `phone`, `gender`, `dob`, `shoeSize`, `clothingSize`. Updates `Users` core fields + writes extras (dob/sizes) into `user_data` form-data. |
| `updateAddressesAction(addresses: OeAddress[])` | Full-replace upsert of the user's saved delivery addresses. Each `OeAddress` carries `recordId` once persisted — used to route inserts vs updates. Returns the canonical list from OE (mapped back to local UI shape). |
| `updateSubscriptionsAction(subs: OeSubscriptions)` | Upsert into `subscription_management` form-data. Fields: `emailNewsletter`, `smsNotifications`, `pushNotifications`, `orderUpdates`, `newArrivals`, `saleAlerts`, `loyaltyUpdates`. |
| `updateConsentAction(consent: OeConsent)` | Upsert into `user_data` form-data. Fields: `dataProcessing`, `crossBorder`. |

**Cart / wishlist / recently-viewed state**

| Action | Effect |
|---|---|
| `syncCartAction(items: OeCartItem[])` | Full-replace push of the client's cart snapshot into the user's OE state blob. Called from `CartContext` debounced 400 ms. |
| `getCartAction()` | Reads `OeCartItem[]` from the user state. Used by e2e tests and future warm-up refreshers. |
| `syncWishlistAction(items: OeWishlistItem[])` | Full-replace push for wishlist. |
| `getWishlistAction()` | Reads `OeWishlistItem[]` from the user state. |
| `pushRecentlyViewedAction(item: OeRecentlyViewedItem)` | Appends a single product view (`{productId, viewedAt}`) to the user state trail — used by `RecentlyViewedSection` when a signed-in user opens a PDP. |
| `getRecentlyViewedAction()` | Reads the server-side trail. Used to seed Redux `recentlyViewedSlice` after `/me` bootstrap. |
| `mergeRecentlyViewedAction(local: OeRecentlyViewedItem[])` | On login, combines the guest's local `recentlyViewed` list with the server trail (dedupe by `productId`, keep most recent `viewedAt`), pushes the merged list back, and returns it. |

**Checkout**

| Action | Effect |
|---|---|
| `createOrderAction(input: CreateOrderInput)` | `POST /api/content/orders-storage/marker/{storage}/orders` where `storage ∈ {home, store_pickup, locker}` (typed as `CheckoutMethod`). Returns `{ok:true, orderId, paymentUrl, paymentSessionError?}`. For Stripe accounts, a secondary `POST /api/content/payments/sessions` provisions the hosted-checkout URL. On success calls `revalidateTag('oe-products', 'max')` + `revalidateTag('oe-discounts', 'max')` so stock and discount-rule caches are cleared for the next visitor. |
| `cancelOrderAction(orderId: number, storage: string)` | Cancels an order from the account UI. Discovers the tenant's cancelled status marker dynamically via `getApi().Orders.getAllStatusesByStorageMarker(storage)` (regex `/cancel/i` on `identifier` or `localizeInfos.title`), falls back to `${storage}_cancelled` if the SDK returns nothing. Because `updateOrderByMarkerAndId` treats its `body` as a **full `IOrderData` replacement** (not a partial patch — sending only `{ statusIdentifier }` trips OE validators like `"Order must have a payment"`), the action first fetches the existing order via `getOrderByMarkerAndId(storage, orderId)` and round-trips `formIdentifier`, `paymentAccountIdentifier`, `formData`, `products`, and optional `currency` / `couponCode` / `bonusAmount` verbatim, swapping only `statusIdentifier` for the discovered cancellation marker. **Shape mismatch caveat:** the two SDK methods disagree on the product entry shape — `getOrderByMarkerAndId` returns `IOrderProducts` (`{ id, quantity, title, price, sku, previewImage }`), while `updateOrderByMarkerAndId` requires `IOrderProductData` (`{ productId, quantity }`). Passing the fetched products through verbatim yields `"products.0.productId must be a number conforming to the specified constraints"`. The action remaps `p.id → productId` (falling back to any already-set `productId`), coerces to `Number`, and filters entries where the resulting `productId` isn't a positive finite number. Returns `{ok:true}` or `{ok:false, error}`. Consumed by `MyOrdersSection`. |

Cookie policy:

| Cookie | Scope | Purpose |
|---|---|---|
| `oe_access` | httpOnly, secure, sameSite=lax | Short-lived access token (Bearer for authenticated OE calls) |
| `oe_refresh` | httpOnly, secure, sameSite=lax | Refresh token used by `signOutAction` |
| `oe_user` | non-httpOnly | User identifier — read by the client to render a user badge before the `/me` bootstrap resolves |

### 4.2 Sign-up form schema (`src/lib/oneentry/auth/sign-up-form.ts`)

Loads the attribute set `users_sign_in_sign_up` and exposes a typed schema for the registration form: email, password, first_name, phone, gender, promotional subscriptions, terms agreement. Consumed by `SignUpFormSchemaProvider` (`auth/SignUpFormSchemaContext.tsx`) and rendered by `RegisterModal`.

### 4.3 Activity tracking (`src/lib/oneentry/activity/actions.ts`)

Server Action: `trackActivityAction(input: TrackActivityInput)` — POSTs to `/api/content/user-activity/track`. Consumed via the client wrapper `src/app/utils/track-activity.ts::trackActivity(input)` (fire-and-forget, never throws). Ten event types:

`product_view`, `page_view`, `category_view`, `search`, `product_add_to_cart`, `product_remove_from_cart`, `product_add_to_wishlist`, `product_remove_from_wishlist`, `product_purchase`, `product_rating`.

Auth: signed users authenticate via `readAccessOrRefresh()` (from `src/lib/oneentry/auth/session.ts`), which transparently rotates the `oe_access` token from the 7-day refresh cookie if the 24-hour access token has expired; anonymous users are identified by an `x-guest-id` header (see 6.1). Previously, activity events fell silently into the guest branch after 24 hours even though the user was still logged in.

Client wrapper: `src/app/utils/track-activity.ts` — fire-and-forget, never throws.

### 4.4 Catalog (`src/lib/oneentry/catalog/*-action.ts`)

- `getProductsByIdsAction(ids)` — resolves numeric OE product IDs to UI-ready `Product[]` (used by cart / wishlist enrichment).
- `searchProductsAction(query)` — thin wrapper around vector + quick search.
- `submitServiceRequestAction(...)` — posts to form `service_request` (moduleConfigId=4). Uses `readAccessOrRefresh()` so the action remains authenticated beyond the 24-hour `oe_access` expiry.
- `getServiceRequestsAction()` — lists the current user's service requests.
- `getWaitingListAction()` — combines the user's wishlist with product stock inference.

### 4.5 Forms (`src/lib/oneentry/forms/`)

Three files:

- `submit.ts` — `submitForm(marker, fields, binding?, lang?)` Server Action. Calls `getApi().FormData.postFormsData({formIdentifier: marker, formModuleConfigId, moduleEntityIdentifier, replayTo: null, status: 'sent', formData: fields}, lang)`. `binding` is optional `{moduleConfigId?, moduleEntityIdentifier?}` and defaults to `{0, ''}`. When a form is bound to a page in the OE admin, both values must match one of the form's `moduleFormConfigs` entries — otherwise OE rejects with `Incorrect formIdentifier for provided config`. Find the pair via `getApi().Pages.getPageByUrl('<page>', lang)` → `page.moduleFormConfigs[N].id` (the numeric `moduleConfigId`) and `page.moduleFormConfigs[N].entityIdentifiers[0].id` (the `moduleEntityIdentifier`, usually the page's `pageUrl`). Returns `{ok:true}` or `{ok:false, error}`. `FormField.value` accepts `string | string[]` — OE `list` attributes (e.g. `occasions`) are passed as a `string[]` of marker values; the wire cast mirrors the existing sign-up action pattern. **Cache invalidation:** after any successful form submission, `submit.ts` calls `revalidateTag('oe-forms', 'max')`. For review submissions specifically it also calls `revalidateTag('oe-reviews', 'max')` so the `loadProductReviews` cache is cleared immediately and the new review appears on the next request.
- `placeholders.ts` — `loadFormPlaceholders(marker, lang)` cached loader (5 min TTL, dedupes inflight). Reads placeholders from `Forms.getFormByMarker` and returns a nested map `attribute → additionalField → string`.
- `FormPlaceholdersContext.tsx` — client-side `FormPlaceholdersProvider` + `useFormPlaceholder(formMarker, attrMarker, fieldMarker, fallback)` hook.

**Active `submitForm` call sites and their markers:**

| Consumer | Form marker | Page binding (`moduleConfigId` / `moduleEntityIdentifier`) | Fields |
|---|---|---|---|
| `NewsletterForm.tsx` | `subscribe_new_drops` | `52` / `'subscribe'` | `subscribe_new_drops_email` |
| `WriteReviewModal.tsx` (PDP) | `review_rating` + `review_feedback` (two calls in sequence) | `review_rating`: `moduleConfigId: 12`, `moduleEntityIdentifier: String(productId)` / `review_feedback`: `moduleConfigId: 13`, `moduleEntityIdentifier: String(productId)` | `rating` (`review_rating` form, type `integer`); `body` (text), `occasions` (list — `string[]` of OE marker values: `everyday \| work \| party \| travel \| sport`), `add_media` (groupOfImages, UI present but file upload is a follow-up) (`review_feedback` form). `headline`, `name`, `email` removed — no longer in the OE schema. **Important:** both bindings must use the product-scoped `moduleConfigId` / `moduleEntityIdentifier`; submitting with `formModuleConfigId=0` (the `{0,''}` default) means the read side (which filters on configId 12/13 + entityIdentifier) never surfaces the review. |
| `ReserveInStoreModal.tsx` (PDP) | `reserve_in_store` | — (unbound) | `size`, `first_name`, `last_name`, `phone`, `email`, `pickup_date`, `agreed_terms`, `reserve_in_store_form_select_store` |
| `FeedbackSection.tsx` (Account) | `user_account_feedback` (planned — currently local-only in UI) | — | rating, category, orderId, message |

Live verification: `NewsletterForm.tsx` submissions return `{id: 30196, actionMessage: 'Success'}` and render the green "Subscribed!" state. If the binding pair drifts in OE admin, look it up with `getApi().Pages.getPageByUrl('subscribe', lang)` → `page.moduleFormConfigs[0]` and update the `{ moduleConfigId, moduleEntityIdentifier }` object passed to `submitForm`.

Server Actions for domain-specific forms (`service_request`, `checkout_home_delivery`, `signin`) do NOT go through `submitForm` — they have dedicated actions in `catalog/service-request-submit-action.ts`, `auth/actions.ts::createOrderAction`, and `auth/actions.ts::signUpAction` respectively.

### 4.6 Payments (`src/lib/oneentry/payments/accounts.ts`)

`getPaymentAccountsAction()` returns visible `PaymentAccount[]` (`{id, identifier, type: 'stripe'|'custom', title, description}`) from `Payments.getAccounts()`. Consumed by `PaymentPage`.

---

## 5. Read-side loaders (cached, no side effects)

All loaders wrap the SDK. Most add React `cache()` for request-scoped deduplication. Homepage block loaders (`loadHeroSlides`, `loadHomepageCollections`, `loadDiscountBanner`, `loadCategorySection`) and `loadStores` use `unstable_cache` instead — persistent cross-request cache backed by the Next.js data cache, keyed by `(lang)`, with tag-based invalidation (`oe-block` for the four block loaders, `oe-stores` for `loadStores`) and TTLs from `src/lib/isr.ts` (`REVALIDATE_HOME` / `REVALIDATE_STORES`). Other high-traffic reads (attribute sets, product lists) additionally memoise with a 5-minute process-wide TTL inside `system-text.ts` and `catalog/products.ts`.

### 5.1 Blocks (`src/lib/oneentry/blocks/`)

| File | Marker | Loader | Consumer |
|---|---|---|---|
| `hero-slides.ts` | `hero_slider` | `loadHeroSlides(lang)` | `HeroSlider` on Home |
| `homepage-collections.ts` | `homepage_collections` | `loadHomepageCollections(lang)` | Home "Shop Collections" grid |
| `discount-banner.ts` | `discount_banner` | `loadDiscountBanner(lang)` | `DiscountBanner` on Home. The loader reads the description from `attrs.hp_b_b_description ?? attrs.ph_b_b_description` — accepting both the canonical marker (`hp_b_b_description`) and the current OE admin typo (`ph_b_b_description`) so the banner stays live if the admin later fixes the typo without a code deploy. |
| `homepage-product-blocks.ts` | Multiple (`best_sellers`, `new_arrivals_home`, `sale_home`) | `loadHomepageProductBlock(lang)` (**singular** name in code — the plural form used in earlier revisions was renamed) | Home product carousels |
| `category-section.ts` | `category_section` | `loadCategorySection(lang)` | Home "Shop by Category" tabs |
| `page-blocks.ts` | Any page id or pageUrl marker | `loadPageBlocksById(pageId, lang?)` — via `Pages.getPageById` (homepage uses `HOME_PAGE_ID = 1`). `loadPageBlocksByUrl(pageUrl, lang?)` — via `Pages.getBlocksByPageUrl(pageUrl)` (catalog pages pass e.g. `women_clothing`; info pages pass their slug; `/sale` / `/new` / `/stores` / `/favorites` pass their literal marker). `loadProductBlocks(productId, lang?)` — via `Products.getProductBlockById(id)` (PDP). All three resolve each block's marker list through `loadBlockWithProducts` then return a sorted `PageBlock[]`. Also exports `loadFrequentlyOrderedBlock`, `getCachedTrending`, `PageBlock` type, `HOME_PAGE_ID = 1`. **`PageBlock` interface** now includes an `attributeValues?: Record<string, unknown>` field; all three block-returning code paths (`_loadBlockWithProducts` two return sites and `_loadFrequentlyOrderedBlock`) pass `block.attributeValues` through from the raw OE response so that downstream renderers can access it without an extra SDK call. Home-page `similar_products_block` markers `homepage_new_arrivals` / `homepage_best_sellers` / `homepage_sale` have no seed product for OE's similarity engine, so `loadBlockWithProducts` falls back through `loadHomepageBlockFallback` to `loadProducts({ tags: ['NEW' \| 'BESTSELLER' \| 'SALE'] })`; unknown markers stay empty (block hides silently). **`PRODUCT_BLOCK_TYPES`** is the internal set of block types that trigger product resolution: `trending_block`, `similar_products_block`, `product_block`. `cart_complement_block` is **deliberately excluded** from this set — OE's `getCartComplement` resolves the result against the caller's cart/activity context (access token or guest `x-guest-id`); the shared server singleton carries only the app token and therefore always returns an empty list. Resolution is delegated to the client-side `<CartComplementBlockSlot>` via `loadCartComplementProductsAction` (see `cart-complement-action.ts` below). Inside `loadBlockWithProducts` the remaining types are dispatched as follows: `trending_block` → `getCachedTrending` (calls `getApi().Blocks.getTrending(marker, lang)` — OE activity stream, not inlined by `getBlockByMarker`); all other types in the set → `block.similarProducts?.items ?? block.products` from the `getBlockByMarker` response. Product normalisation (`loadProducts` → `adaptCatalogProductToUiProduct`) is identical across all routing paths. **`common_block` type:** blocks with `type === 'common_block'` are not resolved for products and are passed through to the renderer with their `attributeValues` intact; `PageBlocksRenderer` routes them to `<GenericCommonBlock>`, which reads display fields from those attributes heuristically (see `COMPONENTS.md §1.2`). This means an admin can attach any `common_block` to any page in OE and it renders as a banner without a code deploy. **`slider_block` type:** blocks with `type === 'slider_block'` trigger an additional `getCachedSlides(marker)` call inside `_loadBlockWithProducts`; `getCachedSlides` wraps `Blocks.getSlides(marker)` in `unstable_cache` (tag `oe-block`, same TTL as the other block loaders). The resulting slides array is stored on `PageBlock.slides?: Array<{id?: number; attributeValues?: Record<string, unknown>}>` and forwarded to `PageBlocksRenderer`, which routes the block to `<GenericSliderBlock>` (see `COMPONENTS.md §1.2`). An admin can create any marker in OE with `type: 'slider_block'`, attach slides through OE's slides tree, and assign it to any page — it renders as a carousel without a code deploy. **`PageBlock` `slides` field** is specific to `slider_block`; all other block types leave this field undefined. | PDP "You may also like", PDP "Special Offers" (`bought_together`), homepage `pageBlocks`, account tab blocks, catalog `catalog_trend_blocks` trending slot, cart/checkout cross-sell blocks, and all content routes wired in the big block-rendering batch — including `/cart` (`'cart'`), `/checkout/delivery` (`'delivery_method'`), and `/checkout/payment` (`'payment'`) |
| `cart-complement-action.ts` | Marker passed by `<CartComplementBlockSlot>` | **`'use server'` action** `loadCartComplementProductsAction(marker, guestId?, lang?)`. Not cached — the response is per-user. Reads the `oe_access` cookie via `readAccessOrRefresh()`. If a valid access token is found, mints a user-scoped SDK instance via `getUserApi(access)` and calls `Blocks.getCartComplement(marker, lang)` on it; OE resolves the cross-sell against that user's cart and order history. If no access token is present and `guestId` is supplied, mints a guest-scoped instance via `getGuestApi(guestId)` that attaches `x-guest-id` to the request, so OE can use the anonymous visitor's trail. Returns `Product[]` (resolved via `loadProducts` + `adaptCatalogProductToUiProduct`); returns `[]` on error or when OE is not enabled. Called exclusively from `<CartComplementBlockSlot>` in `PageBlocksRenderer`. | `/cart`, `/checkout/delivery`, `/checkout/payment`, and any other page that loads `cart_complement_block` through `PageBlocksRenderer` |
| `clothing-filter.ts` | `clothing` filter marker | `loadClothingFilter(products, lang)` | `CatalogTemplate` — normalises OE filter attribute metadata into the UI `ClothingFilterGroup[]` shape (color / size_chips / checkbox / price_range / search_checkbox), maps OE color names to hex via `OE_COLOR_HEX`, computes per-option counts against the current product page |
| `filter-chips.ts` | `filter_chips_<catalogKey>` (e.g. `filter_chips_men_bags`) | `loadFilterChips(catalogKey, lang)` → `FilterChip[] | null`. Exports `FilterChip = { label, type: 'page' | 'attribute', url?, marker?, value? }`, `chipToFilterPatch(label, chips)` (returns `{ category }` for page-type chips or `{ attributeField, attributeValue }` for attribute-type chips), and the private `attributeMarkerToFilterField` helper (OE marker root → `CatalogFilters` field). | `app/[...slug]/page.tsx` — labels mapped to `initialQuickChips: string[]` for the UI; `chipToFilterPatch` used server-side to merge the active chip's effect into `CatalogFilters` before `loadFilteredProducts` is called |

Block types actually consumed on the PDP:

- `frequently_ordered_block` (marker `pdp_you_may_also_like`) — stats-driven cross-sell. `FrequentlyOrderedAsync` renders whatever OE returns and hides (returns `null`) when the block is empty; no category-tree backfill is performed. The underlying `getFrequentlyOrderedDedup` call is raced against a 2 000 ms timeout; on timeout the loader resolves to `null` (PDP streams without recommendations). The abandoned OE fetch still populates `unstable_cache` for future requests.
- `bought_together` (marker `special_offers`) — manually curated bundle set. Rendered by `ProductSpecialOffers`.

### 5.2 Catalog (`src/lib/oneentry/catalog/`)

| File | SDK / endpoint | Exports |
|---|---|---|
| `products.ts` | `POST /products/all`, `POST /products/vector/search`, `POST /products/quick/search`; `GET /products/{id}`, `GET /products/{id}/related`, `GET /products/ids/{csv}` (PDP targeted path) | `loadProducts`, `loadProductById`, `loadProductsByIds`, `searchProducts` (+ alias `searchProductsByVector`), `loadFilteredProducts` (filter-body variant used by `app/[...slug]/page.tsx`), plus pure helpers `categoryPathToBreadcrumbs(path)` and `catalogKeyToPageUrl(catalogKey)`. Exports 6 types (`CatalogProduct`, `CatalogProductVariant`, `LoadProductsOptions`, `LoadProductsResult`, `LoadFilteredProductsOptions`, `LoadFilteredProductsResult`). **PDP cache detail:** `loadProductById` and `loadProductsByIds` no longer call `loadFullCatalog`; they use three internal `unstable_cache`-wrapped fetchers (`cachedGetProductById`, `cachedGetRelated`, `cachedGetByIds`) each tagged `oe-products` with `REVALIDATE_PRODUCT` TTL. `loadFullCatalog` is still used by `loadProducts` / `loadFilteredProducts` / `searchProducts` for the catalog grid and search enrichment. **`cachedGetByIds` response-shape guard:** the internal `cachedGetByIds` fetcher now accepts both a flat `IProductsEntity[]` array and a wrapped `{ items: IProductsEntity[], total: number }` envelope from `Products.getProductsByIds()`, matching the defensive parsing already applied to `vectorSearchIds` / `searchProduct` / form-data readers. This prevents silent empty-results when OE toggles its response shape (a regression that has occurred three times). **Error-hardening:** `fetchFullCatalog` is wrapped in try/catch with a null-guard on the OE response; `loadFullCatalog` returns `Promise<CatalogProduct[] | null>` — `null` signals an OE outage/error (not cached, next request retries), `[]` signals a successfully empty catalog. When null is returned, `loadProducts` and `loadFilteredProducts` emit `{ total: 0, items: [], fromCms: false }` instead of masking the failure as an OE-sourced empty result. |
| `sale-page.ts` | `Pages.getPageByUrl('sale', lang)` | `loadSalePage(lang?)` — cached with `unstable_cache` (60 s revalidate, tag `oe-page`). Returns `SalePageFromCms \| null`. Reads page `attributeValues` for the OE `sale` page: **hero block** — `page_sale_top_banner_lable` (eyebrow string), `page_sale_top_banner_text` (rich text — `htmlValue` used as `contentHtml`, `plainValue` used as `contentPlain`; `extractHtml` strips tags/whitespace and returns `''` when nothing meaningful remains so that OE's `"<p><br></p>"` empty-field sentinel is normalised to blank), `page_sale_top_banner_cta` (CTA label), `page_sale_top_banner_timer_lable` (countdown label), `page_sale_top_banner_timer_text` (free-form caption under countdown), `page_sale_top_banner_picture` (image array — `downloadLink` of first item), `page_sale_top_banner_timer` (dateTime — `fullDate` parsed to epoch ms as `saleEndsAt`); **promo block** — `page_sale_footer_banner_lable`, `page_sale_footer_banner_title`, `page_sale_footer_banner_sub_title`, `page_sale_footer_banner_picture`, `page_sale_footer_banner_cta`, `page_sale_footer_banner_cta_link`. **`SalePageFromCms.hero`** now carries both `contentHtml: string` and `contentPlain: string` for the `page_sale_top_banner_text` attribute. Returns `null` when OE is disabled or the API call fails. Consumed by `app/sale/page.tsx` which passes the result as `cmsPage` to `<SalePage>`. |
| `pages.ts` | `Pages.getPageByUrl(pageMarker, lang)` | `loadPageByUrl` — **exported but not currently consumed by any RSC or component** (dead code, retained for future info-page CMS wiring; today `InfoPage` reads from local `INFO_PAGE_LABELS` instead) |
| `stores.ts` | `Pages.getChildPagesByParentUrl('stores', lang)` | `loadStores` |
| `store-locations-page.ts` | `Pages` raw list | `loadStoreLocationsPage` |
| `reviews.ts` | Form-data for markers `review_feedback` (moduleConfigId=13) and `review_rating` (moduleConfigId=12) | `loadProductReviews` — the inner `Promise.all` is raced against a 2 000 ms timeout; on timeout returns `[]` (no reviews rendered for that request). Abandoned fetches still populate `unstable_cache` for future requests. |
| `reviews-actions.ts` | Wraps `loadProductReviews` | `getProductReviewSummary(productId: number)` — `'use server'` action that returns `{ count: number; avg: number \| null }`. Aggregates the full review list server-side so only the summary (not every review object) is serialised to the client. Consumed by `QuickViewModal` on modal open. |
| `filters.ts` | Pure module — URL ↔ OE filter payload | Attribute markers: `color_9`, `size_10`, `brand_7`, `style_3`, `material_15`, `season_19`, `fitrise_4`, `lining_16`, `country_20`, `lable_23`, `details_5`, `careinstructions_18`, `insulation_17`, `price_14`. Exports: `parseCatalogSearchParams`, `serializeCatalogSearchParams`, `isFilterGroupSupported`, `toggleFilterOption`, `getSelectedOptionsForGroup`, `countActiveFilters`. `matchesCatalogFilters` is a private in-memory matcher used by `loadFilteredProducts` (not exported). ⚠ **`buildOEFilterBody` is exported but has 0 consumers** — dead code left over from an earlier attempt to push the filter payload to OneEntry. |
| `adapt.ts` | Pure — maps `ProductEntity` → UI `Product` | Shared by every product consumer |

### 5.3 Menus (`src/lib/oneentry/menus/`)

| File | Marker | Loader / Adapter |
|---|---|---|
| `menus.ts` | Any menu marker | `loadMenu(marker, lang)` calling `Menus.getMenusByMarker` |
| `adapt-header.ts` | — | `adaptHeaderMenuToMega()` — OE tree → storefront mega-menu shape with keyword + positional fallback for `women/men` and `shoes/clothing/bags/accessories` |
| `adapt-footer.ts` | — | Footer column grouping |

Both are consumed on the client via `HeaderMenuContext` / `FooterMenuContext`.

### 5.4 Labels (`src/lib/oneentry/labels/`)

Twelve CMS-managed label sets. Each pair is `{name}-labels.ts` (loader) + `{name}-types.ts` (typed dict); each has a matching client `{Name}LabelsContext.tsx`.

| Label set | Attribute set marker |
|---|---|
| product-card | `product_card_set` |
| sign-in | `sign_in_set` |
| create-account | `create_account_set` |
| checkout | multiple markers under `CHECKOUT_SET_MARKERS` |
| your-bag | `your_bag_set` |
| pdp | `pdp_set` |
| favorites-page | `favorites_page_set` |
| new-arrivals-page | `new_arrivals_page_set` |
| sale-page | `sale_page_set` |
| stores | `stores_set` |
| account | `account_set` |
| interface-controls | `interface_controls_set` |

Each label loader uses `system-text.ts::getSystemSet(marker, lang)` → 5 min TTL + React request cache.

### 5.5 Forms placeholders (`src/lib/oneentry/forms/placeholders.ts`)

`loadFormPlaceholders(marker, lang)` returns a nested map `attribute → additionalField → string`. Consumed by `FormPlaceholdersContext` and shared by all form components.

### 5.5a Delivery method copy (`src/lib/oneentry/checkout/delivery-methods.ts`)

`loadDeliveryMethodInfo(lang?)` fetches `Forms.getFormByMarker('checkout_home_delivery', lang)`, reads the `delivery_method` attribute, and returns a `DeliveryMethodInfo` object:

```ts
interface DeliveryMethodInfo {
  home:   { title: string; subtitle: string; perks: string[] };
  store:  { title: string; subtitle: string; perks: string[] };
  locker: { title: string; subtitle: string; pinHint: string };
}
```

Titles/subtitles come from `listTitles[value=courier|pickup|locker].title` and `.extended.value`. Perks come from `additionalFields` keyed by `home_free_delivery`, `home_partial_purchase`, `home_in-home-fitting`, `store_pickup_free`, `store_pickup_partial_purchase`, `store_pickup_fitting_room`. The locker PIN hint uses `additionalFields.locaer_text` (admin-panel typo, preserved as-is).

Cached with `unstable_cache` (key `oe-delivery-method-info`, tag `oe-forms`, TTL `REVALIDATE_STORES`). Any OE error or SDK failure returns a typed `FALLBACK` built from the local literal constants in `checkoutLabels.ts` and `checkoutConfig.ts`. Call `revalidateTag('oe-forms')` to flush on content changes.

The accompanying client module `src/lib/oneentry/checkout/DeliveryMethodInfoContext.tsx` exports `DeliveryMethodInfoProvider` and `useDeliveryMethodInfo(): DeliveryMethodInfo | null`. The hook returns `null` when no provider is mounted (Storybook / unit tests), letting each method component fall back to its local labels.

### 5.6 System text (`src/lib/oneentry/system-text.ts` + `SystemText.tsx`)

Exports: `Lang` type (currently `'en_US'`), `SystemSchema` type, `readSystemValue(set, path)` (untyped accessor), `getSystemSet(marker, lang)` (cached attribute-set loader — 5-minute TTL + React cache), `t(set, path)` (dot-path accessor with safe fallback), plus `<SystemText>` RSC component in `SystemText.tsx` that renders a label directly.

**Cache-poisoning guard.** `getSystemSet` only writes a result into the in-memory cache when the fetched schema is non-empty (`Object.keys(value).length > 0`). Previously a transient OE hiccup — a brief network blip or 500 — would pin an empty `{}` schema for the full 5-minute TTL, killing every label render app-wide for that window. Now empty results fall through to the caller's `fallback` copy; the next request retries OE directly and populates the cache only on a successful non-empty response.

**LRU cap.** The process-wide `systemSetCache` map is capped at `SYSTEM_SET_MAX_ENTRIES = 200` entries via a `touchSystemSet` helper. On each cache write, `touchSystemSet` deletes the oldest inserted key when the map exceeds the cap. This prevents unbounded memory growth if a buggy or adversarial caller synthesises new marker strings at high volume. `src/lib/oneentry/forms/placeholders.ts` applies the same pattern (`FORM_CACHE_MAX_ENTRIES = 200`, `touchFormCache` helper) to the in-memory `formCache` used by `loadFormPlaceholders`.

### 5.7 Discounts (`src/lib/oneentry/discounts/`)

| File | Marker / filter | Loader | Consumer |
|---|---|---|---|
| `purchase-bonus.ts` | `purchase-of-goods` | `loadPurchaseBonusForProduct(oeProduct)` | `app/product/[id]/page.tsx` → `ProductDetailPage` |
| `product-discount.ts` | `type: DISCOUNT`, `applicability: TO_PRODUCT` (all active rules) | `loadProductDiscounts()` / `applyProductDiscount(product, rules)` | `catalog/products.ts` — `fetchFullCatalog` and `loadProductById` |

`loadPurchaseBonusForProduct` calls `getApi().Discounts.getDiscountByMarker('purchase-of-goods', DEFAULT_LOCALE)`, wrapped in `unstable_cache` with the `REVALIDATE_CATALOG` TTL and tag `oe-discounts`. The function checks the discount's `startDate`/`endDate` window, matches PRODUCT and CATEGORY conditions against the provided OE product (by `id` and `categories`), and computes the accrual: `PERCENT` rule → `Math.round(price * percent / 100)`; `FIXED_AMOUNT` rule → the fixed value. Cart-scoped conditions (`MIN_CART_AMOUNT`, `USER_LTV`) are intentionally ignored for the PDP badge. Returns `{ points: number }` when the discount applies to the product, or `null` otherwise.

**`product-discount.ts` — storefront-level `salePrice` overlay**

`loadProductDiscounts()` pages through `getApi().Discounts.getAllDiscounts(lang, offset, 200, 'DISCOUNT')`, then filters to rules where `type = DISCOUNT`, `applicability = TO_PRODUCT`, the current date falls within `startDate`/`endDate`, and at least one condition is of kind `PRODUCT`, `CATEGORY`, or `ATTRIBUTE`. The trimmed rule list is wrapped in `unstable_cache` (key `oe-product-discounts`, TTL `REVALIDATE_CATALOG`, tag `oe-discounts`) and wrapped with `withTiming('loadProductDiscounts', ...)`. Cart-scoped and user-scoped conditions (`MIN_CART_AMOUNT`, `PRODUCT_IN_CART`, `USER_LTV`, etc.) are intentionally excluded — they require cart/session context that is only available at checkout via `previewOrder`.

**ATTRIBUTE conditions.** When a rule's condition kind is `ATTRIBUTE`, `ruleAppliesTo` resolves the attribute marker from `condition.entityIds[0].id`, then looks up the corresponding value in `product.discountAttributes` (a `Record<string, string>` populated during `normalize()` from every OE attribute whose marker starts with `discount_` or equals `discount`). Values are forwarded **verbatim** (only surrounding whitespace is trimmed) — `"10%"` stays `"10%"`, `"10"` stays `"10"`. This mirrors OE's own strict `===` comparison: the storefront no longer silently strips `%` to manufacture a client-side match that OE will reject server-side. **Tenant data prerequisite:** for an ATTRIBUTE condition to match, the value stored in OE (e.g. `discount_13 = "10"`) must exactly equal the condition's `ATTRIBUTE.value.value` field (e.g. `"10"`). If the OE admin has entered `"10%"` instead of `"10"`, neither side matches and no sale price is applied — which is the correct behaviour (no fake discount). The comparison operator comes from `condition.operator`; supported operators are `eq`, `neq`/`ne`, `gt`, `gte`/`ge`, `lt`, `lte`/`le`, `lke`/`like`/`contains`, `exs`/`exists`, `nex`/`nexs`/`not_exists`; unknown operators fall back to `eq`. Comparisons are case-insensitive string form. When a rule mixes multiple condition kinds, the `conditionLogic` field (`AND` | `OR`, default `OR`) controls how they are combined.

`applyProductDiscount(product, rules)` iterates the loaded rule set and returns the lowest resulting price that is strictly below `product.price`, or `undefined` when nothing applies. Rules do **not** stack — best-for-shopper (lowest resulting price) wins. `PERCENT` and `FIXED_AMOUNT` discount types are supported; an optional `maxAmount` cap limits the absolute reduction. The returned value is rounded to two decimal places.

**Condition evaluation split — storefront vs checkout**

| Condition kind | Where evaluated | Notes |
|---|---|---|
| `PRODUCT` (product id match) | Storefront — `loadProductDiscounts` + `applyProductDiscount` | Applied per product at catalog load time |
| `CATEGORY` (category path / marker match) | Storefront — `loadProductDiscounts` + `applyProductDiscount` | Matched against `CatalogProduct.categories[]` |
| `ATTRIBUTE` (OE attribute value match) | Storefront — `loadProductDiscounts` + `applyProductDiscount` | Matched against `CatalogProduct.discountAttributes`; e.g. `discount_12` / `discount_13` values gate `off_N` rules |
| `MIN_CART_AMOUNT`, `PRODUCT_IN_CART`, `USER_LTV`, `TO_ORDER` rules | Checkout — `previewOrder` / `createOrderAction` | Cart and user context required; not evaluated storefront-side |

**`fetchFullCatalog` integration.** After normalising each `CatalogProduct`, `fetchFullCatalog` calls `loadProductDiscounts()` once and iterates every product through `applyProductDiscount`. The rules are cached cross-request (same 60 s TTL as the catalog list); the overlay adds negligible overhead even against a 2000-row dump.

**`loadProductById` integration.** `loadProductById` does not route through `fetchFullCatalog`, so the rules are applied independently: after collecting the product family (target + related siblings), it calls `loadProductDiscounts()` and applies `applyProductDiscount` to each family member. `salePrice` is forwarded into the `variants[]` slim descriptors when set.

**`adapt.ts` forwarding rules.** Both `adaptCatalogProductToUiProduct` (catalog grid) and `adaptCatalogProductToPdpProduct` (PDP) forward `salePrice` only when it is strictly below the original price. `adaptCatalogProductToUiProduct` formats the value via `formatPrice` (matching the `price` string field); `adaptCatalogProductToPdpProduct` forwards the raw number.

`adaptCatalogProductToUiProduct` also propagates `statusIdentifier` from `CatalogProduct` onto the UI `Product`, and from each `CatalogProductVariant` onto the corresponding UI `ProductVariant`. An optional-spread pattern is used so the field is omitted entirely when OE does not populate it. This allows `QuickViewModal` (and any other consumer of the catalog-adapted shape) to render the full four-way availability label (`in_stock` / `out_of_stock` / `coming_soon` / `preorder`) rather than a binary in/out flag.

---

## 6. Guest / authenticated dispatch

### 6.1 Guest identifier (`src/app/utils/guest-id.ts`)

`getOrCreateGuestId()` mints a UUID and stores it in `localStorage` under `oe_guest_id`. It is attached to Server Actions that support anonymous users:

- `trackActivity` — as `x-guest-id` header.
- `createOrderAction` (guest checkout) — as `x-guest-id` header plus the `_guest` form-identifier suffix.

`readGuestId()` is a read-only accessor for consumers that must not create a new ID. `clearGuestId()` removes `oe_guest_id` from `localStorage` and is called by `AuthContext.logout()` so that post-logout anonymous activity mints a fresh fingerprint instead of continuing under the previous user's identifier.

### 6.2 Authenticated dispatch

Signed-in requests use the `oe_access` cookie (Bearer forwarded server-side). Refresh is handled inside `signOutAction`; no client-side refresh loop exists — the current session lasts as long as `oe_access` remains valid, then requires a manual re-sign-in.

---

## 7. Marker registry

Every marker referenced in the codebase. Grouped by domain.

### 7.1 Auth
- Provider: `email`, `google`
- Sign-up form / attribute set: `signin` (form marker), `users_sign_in_sign_up` (attribute set)

### 7.2 Users / profile / preferences
- Form-data records: `user_addresses`, `user_data`, `subscription_management`

### 7.3 Pages
- Every route resolves to a page marker via `PAGE_REGISTRY` (`src/app/data/pageRegistry.ts`). Info pages: `about-us`, `careers`, `rewards`, `gift-certificates`, `refer-a-friend`, `corporate`, `faq`, `track-order`, `delivery`, `exchange`, `sizing-guide`, `care-guide`, `help-center`, `contact`, `privacy-policy`, `terms`, `terms-of-sale`, `terms-of-use`, `security`, `accessibility`, `user-content-policy`, `promo-terms`, `sitemap`. Hub: `info`.
- Store parent page: `stores`.

### 7.4 Blocks
- `hero_slider`, `homepage_collections`, `discount_banner`, `category_section`
- Homepage product blocks: `best_sellers`, `new_arrivals_home`, `sale_home` (names may drift — verify in the admin)

### 7.5 Products — attribute markers (used in filter / adapter)
- Mandatory: `gallery` / `pictures`, `brand`, `colors` / `color`, `sizes` / `size`, `material`, `style`, `label` / `lable`, `season`, `brand_country` / `country`, `price`, `sku`, `title`, `currency`
- Optional: `fit` / `fitrise`, `lining_material` / `lining`, `insulation`, `details`, `careinstructions`, `stockqty` / `units`, `description` / `productdescription`

  > **Stock reconciliation (`stockqty` / `units`):** OE tenants split inventory across two markers and neither is authoritative on every tenant (e.g. `stockqty=0, units=2` is valid seed data). The `normalize` function resolves this with `Math.max(asNumber(stockqty), asNumber(units))` so a non-zero reading in either field wins. A plain `||` fallback was previously used, but `'0'` is truthy in JS, causing `stockqty=0` to mask a valid `units=2`. The resolved numeric value is forwarded into `CatalogProduct.stock` and `PdpProductVariant.stock`; `adaptCatalogProductToPdpProduct` omits the field entirely when the resolved value is `0` (signals status-only tracking, not zero inventory).

Filter body markers (URL param ↔ marker in `src/lib/oneentry/catalog/filters.ts`): `color_9`, `size_10`, `brand_7`, `style_3`, `material_15`, `season_19`, `fitrise_4`, `lining_16`, `country_20`, `lable_23`, `details_5`, `careinstructions_18`, `insulation_17`, `price_14`.

### 7.6 Forms
- Auth: `signin`
- Reviews: `review_feedback` (moduleConfigId=13), `review_rating` (moduleConfigId=12)
- Service: `service_request` (moduleConfigId=4)
- Checkout order forms: `checkout_home_delivery`, `checkout_store_pickup`, `checkout_locker` (+ `_guest` variants) — used as `formIdentifier` in `createOrderAction`
- Checkout delivery copy: `checkout_home_delivery` is **also** read by `loadDeliveryMethodInfo()` via `Forms.getFormByMarker` to populate the delivery-picker radio card titles, subtitles, perks, and locker PIN hint. The `delivery_method` attribute's `listTitles` (values `courier`, `pickup`, `locker`) and `additionalFields` keys (`home_free_delivery`, `home_partial_purchase`, `home_in-home-fitting`, `store_pickup_free`, `store_pickup_partial_purchase`, `store_pickup_fitting_room`, `locaer_text`) carry the editable copy.

### 7.7 Orders storage
- `home`, `store_pickup`, `locker` — passed as `{storage}` in `POST /orders-storage/marker/{storage}/orders`

### 7.8 Payments
- Accounts identified by `identifier` returned from `Payments.getAccounts()`. Type: `stripe` or `custom`.

### 7.9 Menus
- Header + footer menu markers (site-specific — read via the admin `Menus` module)

### 7.10 Labels / attribute sets
See §5.4 for the full list.

---

## 8. Consumption on the client

### 8.1 In RSCs

RSC route shells / page components import loaders and pass results to client components as props. Example:

```tsx
// app/[...slug]/page.tsx (simplified — real route uses loadFilteredProducts + adapters)
export default async function Page({ params, searchParams }: {
  params: Promise<{ slug: string[] }>,
  searchParams: Promise<Record<string, string | string[]>>,
}) {
  const { slug } = await params;
  const entry = PAGE_REGISTRY[slug.join('/')];
  const filters = parseCatalogSearchParams(await searchParams);
  const { products, total } = await loadFilteredProducts({ pageUrl: entry.pageMarker, filters });
  return <CatalogTemplate initialProducts={products} total={total} currentFilters={filters} />;
}
```

Note: `loadPageByUrl` is **not** called by the current `app/[...slug]/page.tsx` — info pages read their content from local static tables (`INFO_PAGE_LABELS` etc.). See §5.2 for the dead-code caveat.

### 8.2 In client components

Server Actions are imported directly:

```tsx
'use client';
import { signInAction } from '@/lib/oneentry/auth/actions';

const res = await signInAction(email, password);
```

The Auth Server Actions are wrapped by `AuthContext` — components consume `useAuth().login()` / `.updateProfile()` / etc.

---

## 9. Error handling conventions

### 9.1 SDK-level errors

`isError(value)` (`src/lib/oneentry/index.ts:45`) narrows the SDK's union of `IError` vs the expected entity type. Pattern:

```ts
const res = await getApi().Products.getProductById(id);
if (isError(res)) {
  // handle 4xx / 5xx
  return null;
}
return res; // narrowed to IProductEntity
```

### 9.2 Server Action returns

Every Server Action returns a discriminated result: `{ok: true, ...}` or `{ok: false, error: string}`. Client callers never receive raw HTTP status codes.

### 9.3 Cart / wishlist sync

`syncCart` / `syncWishlist` are fire-and-forget from the client. Failures are logged; local Redux state is not rolled back (the debounced effect will re-push on the next change).

### 9.4 `emitSyncWarning` (`src/app/utils/syncWarnings.ts`)

Legacy hook — logs `console.warn` + dispatches a `CustomEvent('oe:sync-warning', {detail})`. Retained for a future toast subscriber; no listener exists today.

---

## 10. Caching / revalidation

- **React `cache()`** — most read loaders wrap their work in `cache()` so multiple RSCs on the same request share a single fetch.
- **`unstable_cache` (persistent cross-request)** — `loadHeroSlides`, `loadHomepageCollections`, `loadDiscountBanner`, `loadCategorySection` (tag `oe-block`, TTL `REVALIDATE_HOME`), `loadStores` (tag `oe-stores`, TTL `REVALIDATE_STORES`), and `loadDeliveryMethodInfo` (tag `oe-forms`, TTL `REVALIDATE_STORES`) use Next.js `unstable_cache` so their responses survive across requests within the ISR window. `loadProductReviews` also uses `unstable_cache` at the inner `cachedFetchFormData` layer (tag `oe-reviews`, TTL `REVALIDATE_HOME`) so form-data for the `review_feedback` / `review_rating` markers is shared across concurrent PDP renders rather than re-fetched per request. Call `revalidateTag('oe-block')`, `revalidateTag('oe-stores')`, `revalidateTag('oe-forms')`, or `revalidateTag('oe-reviews')` from an OE webhook route to purge on demand.
- **Process-wide TTL / in-flight dedup** — high-traffic reads (attribute sets, product lists) additionally memoise with a 5-minute TTL keyed by `(marker, lang)` inside `system-text.ts` and `catalog/products.ts`. `getCachedFrequentlyOrdered` (in `blocks/page-blocks.ts`) goes one step further: a `Map` pinned to `globalThis.__oneentryFrequentlyOrderedInflight__` deduplicates concurrent cold misses on the same `(marker, productId, lang)` key so only one OE call fires at a time — the same pattern as `fullCatalogInflight` in `catalog/products.ts`. The `globalThis` pin is required because Next.js bundle splitting would otherwise give each server bundle its own private map.
- **Next.js ISR** — `src/lib/isr.ts` exports revalidate constants via a `ttl(envKey, fallback)` helper. These constants are consumed **only** by `unstable_cache`-wrapped loader functions; they are not imported by route shells. Route-shell `export const revalidate` must be a statically-analysable literal — importing a computed value causes Next.js to throw "Invalid segment configuration export detected" and abort the build. The three ISR route shells therefore declare plain numeric literals: `app/page.tsx` → `300`, `app/product/[id]/page.tsx` → `120`, `app/[...slug]/page.tsx` → `60`. The `ISR_*_TTL_SEC` env vars tune only the loader-level `unstable_cache` TTLs, not the route-shell revalidate windows. Set `ISR_DISABLED=1` to collapse all loader TTLs to 1 s (has no effect on route-shell literals).

  **Next.js 16 gotcha — `generateStaticParams` required for ISR on dynamic segments.** A route with a `[param]` segment that does not export `generateStaticParams` is classified as fully dynamic regardless of `revalidate`: the value is silently ignored and every request re-SSRs. `app/product/[id]/page.tsx` exports `export async function generateStaticParams() { return []; }` alongside `revalidate = 120`; together they enable on-demand ISR — the first request for a given `id` generates and caches the HTML, all subsequent requests within the 120 s window are served from the Next.js Data Cache. The empty array means no ids are pre-built at deploy time. This export is load-bearing — removing it reverts the route to fully dynamic even though `revalidate` is still present.

  | Constant | Default TTL | Env override | Loader consumers | Route-shell literal |
  |---|---|---|---|---|
  | `REVALIDATE_HOME` | 300 s | `ISR_HOME_TTL_SEC` | `loadHeroSlides`, `loadHomepageCollections`, `loadDiscountBanner`, `loadCategorySection` | `app/page.tsx` → `300` |
  | `REVALIDATE_PRODUCT` | 120 s | `ISR_PRODUCT_TTL_SEC` | PDP loaders | `app/product/[id]/page.tsx` → `120` |
  | `REVALIDATE_CATALOG` | 60 s | `ISR_CATALOG_TTL_SEC` | `cachedProductList`, `loadPurchaseBonusForProduct`, `loadProductDiscounts` | `app/[...slug]/page.tsx` → `60` |
  | `REVALIDATE_SALE` | 60 s | `ISR_SALE_TTL_SEC` | `/sale` loaders | — (`force-dynamic`) |
  | `REVALIDATE_NEW` | 600 s | `ISR_NEW_TTL_SEC` | `/new` loaders | — (`force-dynamic`) |
  | `REVALIDATE_STORES` | 3600 s | `ISR_STORES_TTL_SEC` | `loadStores` | `app/stores/page.tsx` → `3600` (literal) |
  | `REVALIDATE_INFO` | 3600 s | `ISR_INFO_TTL_SEC` | info-page loaders | shared via `app/[...slug]/page.tsx` literal |

- **Error breadcrumbs (`logCaught`)** — `src/lib/oneentry/log.ts` exports `logCaught(scope: string, err: unknown): void`. Previously all OE loader `catch {}` blocks were silent, making transient OE errors invisible without enabling full profiling. `logCaught` is a lightweight alternative: a no-op in production unless `OE_LOG_CAUGHT=1` (or `OE_PROFILE=1`); logs at `console.error` level in `development` by default. Instrumented catches (14 total): `cachedFetchFormData` (`reviews.ts`), `fetchSystemSet` (`system-text.ts`), `fetchFormPlaceholders` (`placeholders.ts`), and the homepage/catalog block loaders (`homepage-collections.ts`, `clothing-filter.ts`, `hero-slides.ts`, `discount-banner.ts`, `filter-chips.ts`, `category-section.ts`, `seasonal-trend.ts`) plus `getPaymentAccountsAction` (`payments/accounts.ts`), and the three hottest catalog loaders: `fetchFullCatalog` (`catalog/products.ts` — the highest-traffic OE call in the app), `vectorSearchIds` (`catalog/products.ts`), and `quickSearchIds` (`catalog/products.ts`). Auth-action catches in `auth/actions.ts` were intentionally left uninstrumented — they are nested inside per-item `Promise.all` loops where silent continuation is the designed behaviour.

- **Loader profiling** — `src/lib/oneentry/profiling.ts` exports `withTiming(name, fn)`. Disabled by default (returns `fn` unchanged, zero production overhead). Enable with `OE_PROFILE=1`; each wrapped call then logs `[OE-timing] <name> ok <ms>ms` or `[OE-timing] <name> FAIL <ms>ms` to stdout (visible in Vercel Logs / container stdout) **and** pushes a `TimingRecord` into a 5000-entry in-memory ring buffer. Set `OE_PROFILE_SLOW_MS=N` to suppress stdout logs for calls faster than N ms — useful for isolating genuine cache misses during a scripted browse (playwright / k6). The ring buffer is always written to regardless of `OE_PROFILE_SLOW_MS`; it can be inspected at any time via `GET /api/perf-dump` without requiring shell access to the container or a live log stream. Ring-buffer state lives on `globalThis.__oneentryTimingRing__` rather than module scope, so the SSR bundles and the `/api/perf-dump` route handler share one instance across Next.js bundle splitting and `next dev` HMR reloads. Wrapped loaders: `loadHeroSlides`, `loadHomepageCollections`, `loadDiscountBanner`, `loadCategorySection`, `loadStores`, `loadProducts`, `loadProductById`, `loadProductsByIds`, `loadFilteredProducts`, `loadProductReviews`, `loadBlockWithProducts`, `loadPageBlocksById`, `loadPageBlocksByUrl`, `loadProductBlocks`, `loadFrequentlyOrderedBlock`, `loadHomepageProductBlock`, `loadPurchaseBonusForProduct`, `loadProductDiscounts`.

  **`GET /api/perf-dump` — ops endpoint** (see `app/api/perf-dump/route.ts`). Requires `Authorization: Bearer <PERF_DUMP_TOKEN>`. Returns 409 when `OE_PROFILE≠1`. `dynamic = 'force-dynamic'` + `runtime = 'nodejs'` — never cached.

  ```bash
  # Aggregated view — one row per loader, sorted by p95 desc
  curl -H "Authorization: Bearer $PERF_DUMP_TOKEN" \
       https://<host>/api/perf-dump

  # Raw record list — every captured call in insertion order (up to 5000)
  curl -H "Authorization: Bearer $PERF_DUMP_TOKEN" \
       "https://<host>/api/perf-dump?raw=1"

  # Reset the buffer before a fresh load-test run
  curl -X DELETE \
       -H "Authorization: Bearer $PERF_DUMP_TOKEN" \
       https://<host>/api/perf-dump
  ```

- **RTK Query tag invalidation** — `cartApi` / `wishlistApi` still declare `['Cart']` / `['Wishlist']` tags, but with the sync path having moved to Server Actions their query hooks are effectively unused.
- **`localStorage`** — `oe_store` v5 persists client-only Redux slices (cart minus `miniCartOpen`, wishlist, recentlyViewed, catalog). Auth tokens are **never** written to `localStorage`.

---

## 11. File map — every file touching OneEntry

Under `src/lib/oneentry/` (100+ files including tests). Top-level:

- `index.ts` — SDK singleton
- `locale.ts` — DEFAULT_LOCALE
- `system-text.ts` + `SystemText.tsx` + `system-text.test.ts`
- `auth/actions.ts`, `auth/sign-up-form.ts`, `auth/SignUpFormSchemaContext.tsx`
- `activity/actions.ts`
- `blocks/*.ts` (6 loaders + tests)
- `catalog/*.ts` (~14 files — see §5.2)
- `forms/*.ts` (3 files — placeholders, submit, context)
- `checkout/delivery-methods.ts` + `checkout/DeliveryMethodInfoContext.tsx` — delivery-picker copy loader and client context
- `labels/*.ts` (12 pairs of loader/types + 12 contexts + tests)
- `menus/*.ts` (menu loader, header adapter, footer adapter, 2 contexts)
- `payments/accounts.ts`

Files elsewhere that call into the integration:

| File | Role |
|---|---|
| `src/app/context/AuthContext.tsx` | Bootstraps `/me` on mount, drives `authReady`. Exposes **11 mutation methods** through the `useAuth()` hook — of which 10 wrap Server Actions (`login`, `startGoogleOAuth`, `signUp`, `logout`, `updateProfile`, `updateAddresses`, `updateSubscriptions`, `updateConsent`, `syncCart`, `syncWishlist`) and 1 is a local optimistic merge (`updateUser` — does not touch OneEntry). `startGoogleOAuth` is fire-and-navigate (the browser leaves for Google; the outcome is delivered by the `app/auth/callback/google` route). Plus `openLoginModal` / `openRegisterModal` state helpers. |
| `app/auth/callback/google/route.ts` | GET handler for Google's OAuth redirect (`?code=&state=&error=`). Calls `exchangeGoogleCodeAction` then `redirect()`s to `returnTo` on success or to `/?googleAuthError=<code>` on failure. |
| `src/app/context/CartContext.tsx` | Debounced 400 ms `syncCart`, one-shot server merge, product enrichment via `getProductsByIdsAction` |
| `src/app/context/WishlistContext.tsx` | Same pattern for wishlist |
| `src/app/pages/checkout/PaymentPage.tsx` | Calls `getPaymentAccountsAction` + `createOrderAction` |
| `src/app/pages/checkout/DeliveryPage.tsx` | Persists new addresses via `updateAddressesAction` |
| `src/app/utils/track-activity.ts` | Client wrapper over `trackActivityAction` |
| `src/app/utils/guest-id.ts` | Guest UUID — `getOrCreateGuestId`, `readGuestId`, `clearGuestId` (called on logout); passed to activity + guest-order Server Actions |
| `src/app/components/HeaderSearch.tsx` | Calls `searchProductsAction` (vector + quick) |
| `src/app/data/cms-product-id-map.ts` | String↔number id conversion helpers (`getCmsProductId`, `getPlaygroundProductId`) — static mapping table removed; all product ids are already OneEntry numeric ids as strings |

---

## 12. What is NOT wired (intentional gaps)

- **FCM / push notifications.** The backend exposes `POST /api/content/users/me/fcm-token/{token}`, but no client hook is registered. Adding push would mean a `firebase/messaging` bootstrap + a permission prompt + calling that endpoint.
- **Real-time updates.** No websocket / SSE consumer. All catalog / cart data is HTTP-only.
- **Multi-tenant / per-locale routing.** `DEFAULT_LOCALE` is currently a constant. Adding `app/[locale]/…` would require threading `lang` through every loader (already accepted as a parameter) and updating `PAGE_REGISTRY`.
- **Third-party analytics.** No `gtag` / GTM / Segment / Amplitude / Posthog / Mixpanel — the `user-activity/track` endpoint is the sole telemetry sink.

---

## 13. Cross-references

- [`./DEMO_LOGIN.md`](./DEMO_LOGIN.md) — demo accounts + `scripts/setup-demo-passwords.sh` bootstrap
- [`./REDUX.md`](./REDUX.md) — full Redux store layout, persistence schema (`'oe_store'` v5)
- [`./AUTH.md`](./AUTH.md) — login / signup / OAuth / cookie session model
- [`./CART_WISHLIST.md`](./CART_WISHLIST.md) — sync semantics, merge on login, product enrichment
- [`./CHECKOUT.md`](./CHECKOUT.md) — three-step funnel, real order creation, Stripe redirect
- [`./CATALOG_FILTERS.md`](./CATALOG_FILTERS.md) — filter markers, sort, URL sync
- [`./DATASETS.md`](./DATASETS.md) — remaining static datasets and their consumers
- [`./I18N.md`](./I18N.md) — single-locale (en_US), how `DEFAULT_LOCALE` is propagated
- [`./ARCHITECTURE.md`](./ARCHITECTURE.md) — overall project layout
- [`./E2E-TESTS.md`](./E2E-TESTS.md) — Playwright suite
