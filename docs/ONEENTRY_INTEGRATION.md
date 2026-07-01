# ONEENTRY_INTEGRATION.md — OneEntry Platform integration

> Audit of how `apps/new-shop-nextjs` (Next.js 16 / React 19 / Redux Toolkit) talks to the OneEntry Platform. Audience: LLM agents that need to know which OneEntry calls are wired, which markers are referenced, and where the boundary between the OneEntry-backed code paths and the local-mock fallbacks sits.

---

## 1. Overview — TL;DR

> ⚠ **No SDK in dependencies.** The `oneentry` NPM package is **NOT** listed in `package.json` (verified — only `@reduxjs/toolkit`, `next`, `react`, `react-redux`, `zod`, etc.). There is no `getApi()` / `defineOneEntry()` / `oneentry/dist/api` bootstrap anywhere under `src/`. The project talks to OneEntry **through plain `fetch` against the Content REST API** (`/api/content/...`), wrapped either in RTK Query slices or in inline `fetch()` calls.

OneEntry's role in this project is **partial backend** for two domains:

- **Authentication** — `POST /users-auth-providers/marker/email/users/auth` exchanges credentials for a JWT pair.
- **User activity** — `GET/POST/PUT/DELETE /users/me/wishlist` and `/users/me/cart` persist per-user wishlist / cart state.

Everything else (product catalog, pages, blocks, forms beyond signin, menus, filters, integration collections) is served from **local TS mocks** under `src/app/data/*.ts`. The RTK Query slices that look like a catalog API (`productsApi`, `homepageApi`, `catalogConfigApi`) all use `fakeBaseQuery()` and import the same local mocks via `queryFn` — they are wire-ready scaffolding, not live calls.

Position in the stack:

```
┌─ Local TS mocks (data/*.ts) ─────────────┐    ┌─ OneEntry Platform ─────────────────────┐
│  women-clothing.ts, heroSlides.ts, ...   │    │  /api/content/users-auth-providers/...  │
│  ↓                                       │    │  /api/content/users/me/wishlist         │
│  RTK Query (fakeBaseQuery)               │    │  /api/content/users/me/cart             │
│  productsApi / homepageApi /             │    │  ↑                                       │
│  catalogConfigApi                        │    │  RTK Query (fetchBaseQuery + Bearer)    │
│                                          │    │  wishlistApi / cartApi                  │
│                                          │    │  ↑                                       │
│                                          │    │  AuthContext fetch (POST /auth)         │
└──────────────────────────────────────────┘    └─────────────────────────────────────────┘
                              ↓                                    ↓
                              Redux store (catalog / ui state)   user.data.authToken (JWT)
```

When `NEXT_PUBLIC_API_URL` is empty or the Platform is unreachable, every Platform-bound code path silently degrades to `localStorage` + mocks.

---

## 2. Environment variables

The project reads exactly **one** OneEntry-relevant env var.

| Variable | Inlined? | Where read | Purpose |
|---|---|---|---|
| `NEXT_PUBLIC_API_URL` | yes (build-time) | `cartApi.ts:22`, `wishlistApi.ts:32`, `AuthContext.tsx:45` | Base URL for the OneEntry Platform Content API. Must already include the `/api/content` prefix. Empty string → local-only mode. |

There are **NO** env vars named `NEXT_PUBLIC_ONEENTRY_PROJECT_URL`, `NEXT_PUBLIC_ONEENTRY_APP_TOKEN`, `NEXT_PUBLIC_ONEENTRY_TOKEN`, etc. — those typically belong to the OneEntry SDK initialization (`defineOneEntry({ project, token })`) which is **not used here**.

Example values (from `./DEMO_LOGIN.md`):

```bash
# .env.local — local OneEntry CMS via docker
NEXT_PUBLIC_API_URL=http://localhost:3013/api/content
```

`.env.example` / `.env.local.example` exist at the repo root but are outside the agent's allowed read paths in this audit — verified by reachable grep on `src/`, which confirms `NEXT_PUBLIC_API_URL` is the only consumer.

Because the project uses `process.env.NEXT_PUBLIC_*`, the value is **baked at build time** — change requires a rebuild of the Next.js bundle, not just a restart.

---

## 3. SDK initialization

**There is none.** The `oneentry` package is not installed (`package.json:19-29`), no module imports from `'oneentry'` (verified by recursive grep over `src/` — only string matches are brand-name occurrences in `seoData.ts`, `productCatalog.ts` etc.).

The two integration points instead use direct `fetch`:

### 3.1 Auth — inline `fetch` in a Client Component context

`src/app/context/AuthContext.tsx:80-105` — `cmsLogin(emailOrPhone, password)`:

```ts
const url = `${API_BASE_URL}/users-auth-providers/marker/email/users/auth`;
const res = await fetch(url, {
  method: 'POST',
  headers: {
    'Content-Type': 'application/json',
    'X-Device-Metadata': DEVICE_METADATA,
  },
  body: JSON.stringify({
    authData: [
      { marker: 'login',    value: emailOrPhone },
      { marker: 'password', value: password },
    ],
  }),
});
```

Runs in the browser (`'use client'` at the top of the file). Returns a `CmsLoginResponse` (`{ accessToken, refreshToken, userIdentifier, authProviderIdentifier }`) mirroring `UserTokenType` from the CMS.

### 3.2 RTK Query slices — `fetchBaseQuery` with Bearer header

`src/app/store/api/wishlistApi.ts:42-54` and `src/app/store/api/cartApi.ts:29-41` both build a `fetchBaseQuery` from `NEXT_PUBLIC_API_URL` and inject the JWT via `prepareHeaders`:

```ts
baseQuery: fetchBaseQuery({
  baseUrl: API_BASE_URL,
  prepareHeaders: (headers, { getState }) => {
    const token = (getState() as RootState).user.data.authToken;
    if (token) headers.set('Authorization', `Bearer ${token}`);
    return headers;
  },
}),
```

Both slices export an `isXxxApiEnabled()` helper that returns `API_BASE_URL.length > 0` so consumers can short-circuit when the Platform isn't configured.

There is **no server-side helper** (no `getApi()` invoked inside `generateMetadata`, no Server Action that hits OneEntry). The only Server Action (`src/app/actions/auth.ts`) validates against the local `USER_DATASET` mock — it does not call the Platform.

---

## 4. Marker registry

Only the **email auth provider** and its `{login, password}` attribute markers are referenced in source. There are **no other OneEntry markers** wired into the codebase.

### 4.1 Auth provider markers

| Marker | Used in | API path |
|---|---|---|
| `email` | `AuthContext.tsx:87` | `POST /users-auth-providers/marker/email/users/auth` |

### 4.2 Form / attribute markers used in the auth body

| Marker | Role | Source |
|---|---|---|
| `login` | `isLogin` attribute (accepts email, phone, or Platform identifier) | `AuthContext.tsx:96` |
| `password` | `isPassword` attribute | `AuthContext.tsx:97` |

These are the attribute markers inside the email auth provider's attribute set — provisioned by `scripts/setup-demo-passwords.sh` together with the `auth_email_form` form, `auth_email_set` attribute set, and `users_auth_providers (identifier='email')`.

### 4.3 Page markers (`pageUrl`)

**None.** The project does not call `getApi().Pages.getPageByUrl(...)` or `/api/content/pages/url/:url`. All pages render from Next.js file-based routing (`src/app/pages/*.tsx`), and per-page content comes from the local mocks (`heroSlides.ts`, `categories.ts`, `infoPages.ts`, etc.).

### 4.4 Form markers (beyond signin)

**None.** No call to `/api/content/forms/marker/:marker` or `getApi().Forms.*`. The checkout, feedback, refer-a-friend, and reserve-in-store forms are validated client-side with Zod (`src/app/utils/schemas.ts`) and submitted to local Redux state only.

### 4.5 Block markers

**None.** Blocks (hero, trending, special offers, etc.) are pulled from `homepageApi` / `catalogConfigApi` queryFns that read TS files — not from `/api/content/blocks/marker/:marker`.

### 4.6 Product status markers

**None.** Product status / `status_id` is irrelevant client-side: the playground uses string identifiers (`wc-1`, `mc-3`, etc.) mapped to Platform integer IDs via `src/app/data/cms-product-id-map.ts`.

### 4.7 Menu / IntegrationCollection / Filter markers

**None.** Header / footer menus come from `headerConfig.ts` / `footerConfig.ts`. FAQ / stores / brands are TS arrays. The filter UI in catalog pages operates over local product data via Redux `catalogSlice`.

---

## 5. RTK Query endpoints

The store assembles four `createApi` slices. **Only two talk to OneEntry.**

### 5.1 `wishlistApi` — OneEntry-backed (real)

`src/app/store/api/wishlistApi.ts`, `reducerPath: 'wishlistApi'`, `tagTypes: ['Wishlist']`.

| Endpoint | Hook | HTTP | OneEntry path |
|---|---|---|---|
| `getWishlist` | `useGetWishlistQuery()` | GET | `/users/me/wishlist` |
| `addWishlistItem` | `useAddWishlistItemMutation()` | POST | `/users/me/wishlist/items` |
| `removeWishlistItem` | `useRemoveWishlistItemMutation()` | DELETE | `/users/me/wishlist/items/:productId` |
| `setWishlist` | `useSetWishlistMutation()` | PUT | `/users/me/wishlist` |

Cache tag: `'Wishlist'` (every mutation invalidates it). Wire-types are in `store/api/types/wishlist.ts` and mirror `WishlistItemDto` / `WishlistResponseDto` from `cms/src/modules/user-activity/dto/wishlist.dto.ts`.

### 5.2 `cartApi` — OneEntry-backed (real)

`src/app/store/api/cartApi.ts`, `reducerPath: 'cartApi'`, `tagTypes: ['Cart']`.

| Endpoint | Hook | HTTP | OneEntry path |
|---|---|---|---|
| `getCart` | `useGetCartQuery()` | GET | `/users/me/cart` |
| `addCartItem` | `useAddCartItemMutation()` | POST | `/users/me/cart/items` |
| `removeCartItem` | `useRemoveCartItemMutation()` | DELETE | `/users/me/cart/items/:productId` |
| `setCart` | `useSetCartMutation()` | PUT | `/users/me/cart` (used by `clearCart()` since no DELETE-all exists) |

`addCartItem.qty` is **absolute**, not a delta — `CartContext` computes the resulting total client-side. Wire-types in `store/api/types/cart.ts`.

### 5.3 `productsApi` — fakeBaseQuery (NOT OneEntry)

`src/app/store/api/productsApi.ts` — 8 endpoints (`getWomenClothing`, `getMenClothing`, `getWomenBags`, `getMenBags`, `getWomenShoes`, `getMenShoes`, `getWomenAccessories`, `getMenAccessories`) all using `queryFn` to dynamic-import a TS module. No OneEntry calls.

### 5.4 `homepageApi` — fakeBaseQuery (NOT OneEntry)

`src/app/store/api/homepageApi.ts` — 6 endpoints (`getHeroSlides`, `getPromoItems`, `getDiscountBanner`, `getBestSellers`, `getHomepageNewArrivals`, `getHomepageSaleProducts`). All `queryFn` over local data. No OneEntry calls.

### 5.5 `catalogConfigApi` — fakeBaseQuery (NOT OneEntry)

`src/app/store/api/catalogConfigApi.ts` — 10 endpoints (`getShopCategories`, `getCategoryFilterChips`, `getTrendBlocks`, `getStores`, `getRecommended`, `getSpecialOffers`, `getSaleConfig`, `getNewArrivalsConfig`, `getSalePageProducts`, `getNewArrivalsPageProducts`). All `queryFn` over local data. No OneEntry calls.

---

## 6. Server Actions

`src/app/actions/` contains exactly one file:

### 6.1 `actions/auth.ts` — `validateCredentials(emailOrPhone, password)`

```ts
'use server'
import { USER_DATASET } from '../data/userData';

export async function validateCredentials(emailOrPhone: string, password: string): Promise<boolean> {
  const { email, password: validPassword } = USER_DATASET.credentials;
  const emailMatch = emailOrPhone.trim().toLowerCase() === email.toLowerCase();
  return emailMatch && password === validPassword;
}
```

This Server Action does **NOT** call OneEntry. It compares the input against the hardcoded `USER_DATASET.credentials` (the `test@test.com` / `111` mock). Used as a fallback in `AuthContext.login()` (`AuthContext.tsx:163-172`) for two cases:

1. `NEXT_PUBLIC_API_URL` is empty.
2. The Platform login at step 2 threw a network error (not a 4xx — only true network failures fall through).

There are no other Server Actions. There is no Server Action for order creation, form submissions, page lookups, etc. — all of those either stay client-side (Redux) or are not wired up.

### 6.2 Login flow summary (where the Platform comes in)

`AuthContext.login(emailOrPhone, password)` (`AuthContext.tsx:128-173`):

1. If `password === 'social'` → bypass everything, set the mock user (used by the Google/Apple/Facebook buttons).
2. If `API_BASE_URL` is set → `await cmsLogin(...)`:
   - 200 + token payload → `dispatch(setAuth({ accessToken, refreshToken, userIdentifier }))`, mount `MOCK_USER`, return true.
   - 4xx → return false (do **not** fall through to the mock validator — that would mask wrong-password errors).
   - Network error → log warn, fall through to step 3.
3. `await validateCredentials(...)` (the Server Action) — local mock check.

---

## 7. `attributeValues` access pattern

The codebase does NOT consume entities with `attributeValues` payloads — neither pages nor products nor blocks are fetched from OneEntry, so there is no concrete reader in source. The auth response (`CmsLoginResponse`, `AuthContext.tsx:67-72`) is the only OneEntry payload actually parsed, and it carries flat fields, not `attributeValues`.

If/when the project starts consuming `Pages` / `Products` / `Forms` / `Blocks` from OneEntry, the canonical safe-access template (per SDK conventions documented under `.claude/rules/attribute-values.md` in this repo's agent ruleset) is:

```ts
// Generic helpers — recommended when wiring up real fetches.
function attr<T = unknown>(entity: { attributeValues?: Record<string, { value?: unknown }> }, marker: string): T | undefined {
  return entity.attributeValues?.[marker]?.value as T | undefined;
}

// string / textarea
const title = attr<string>(page, 'title') ?? '';

// text (rich) — value is an object { htmlValue, plainValue, mdValue, params }
const body = attr<{ htmlValue: string; plainValue: string }>(page, 'body');
const html = body?.htmlValue ?? '';

// integer / real — stored as STRING in admin shape
const price = Number(attr<string>(product, 'price') ?? 0);

// list (single or multi) — array of { value }
const sizes = (attr<Array<{ value: string }>>(product, 'sizes') ?? []).map(o => o.value);

// radioButton — object { value }
const flag = attr<{ value: string }>(product, 'is_featured')?.value === 'YES';

// image / groupOfImages — array of file descriptors with previewLink tuples
const cover = attr<Array<{ filename: string; downloadLink: string }>>(product, 'preview')?.[0]?.downloadLink;

// entity — array of { id, type }
const refs = attr<Array<{ id: number; type: string }>>(product, 'related') ?? [];
```

The per-type shape contract is enforced by the admin UI renderers — see `agents_datasets/rules/attribute-shapes-reference.md` in this repo for the full table (text → `{htmlValue, plainValue, mdValue, params}`, integer/real → string, list → `[{value}]`, image.previewLink → `{1: [url, url]}` tuples, etc.).

---

## 8. Locale propagation

The application is **single-locale (en-GB)** — see `./I18N.md`. There is no locale segment in the URL, no `locale` parameter passed into Platform calls, and no `langCode=` query parameter on any OneEntry request.

The auth call body (`AuthContext.tsx:88-100`) sends no language hint; the response is taken at face value. The Platform's `Accept-Language` header is not set.

If multi-locale support is added later, the natural insertion points are:

- Read `locale` from `app/[locale]/...` route params.
- Thread `locale` into RTK Query args (`useGetWishlistQuery({ locale })`).
- Append `?langCode={locale}` to every wishlist / cart / future page-content endpoint URL inside `prepareHeaders` or the `query` factory.
- Pass the same `locale` as `langCode` whenever consuming `Pages` / `Products` / `Blocks` from the SDK or REST.

None of this is wired today.

---

## 9. Error handling conventions

### 9.1 Auth (`AuthContext.cmsLogin`)

- 4xx → `cmsLogin` returns `null`. `login()` returns `false` (rendered as "wrong credentials" by the modal).
- Network error → `cmsLogin` throws, `login()` catches, logs `console.warn('[AuthContext] Platform login network failure, falling back to mock', err)`, and falls through to the Server Action mock.

### 9.2 wishlist / cart RTK Query mutations

`WishlistContext.tsx:134-145` and the analogous `CartContext.tsx` paths follow the same pattern:

1. **Optimistic Redux update** before the network call.
2. `.unwrap().catch(err => ...)` rolls back the Redux change and calls `emitSyncWarning(...)`.

`emitSyncWarning(kind, message, context)` (`src/app/utils/syncWarnings.ts`):

- `kind='unmapped'` — playground product has no `cmsProductId` (mapping missing in `cms-product-id-map.ts`). Mutation stays local-only.
- `kind='mutation'` — server returned an error; optimistic state has been rolled back.
- `kind='connectivity'` — fetch itself failed; local state preserved.

Implementation: `console.warn` + `window.dispatchEvent(new CustomEvent('oe:sync-warning', { detail }))`. A toast container could subscribe to that event; none exists today.

Helper `isFetchBaseQueryError(error)` in `wishlistApi.ts:101-107` narrows RTK Query errors to the `{ status, data }` shape for catch-block handling.

### 9.3 Read queries

`useGetWishlistQuery` / `useGetCartQuery` are gated by `skip: !apiOn` where `apiOn = isXxxApiEnabled() && Boolean(authToken)`. Without a token, no GET fires.

When the GET returns, `WishlistContext` merges server items into Redux on first arrival (via `useRef` to avoid re-merging on every render — see `WishlistContext.tsx:86-106`). Server items win on conflict (deduped by id), local-only items are kept.

---

## 10. Caching / revalidation

- **No Next.js `revalidate`** is set anywhere for OneEntry data — there are no Server Components that fetch from the Platform.
- **No `unstable_cache`** wrappers, no `tag` invalidation via `revalidateTag()`. Server Action `validateCredentials` does not call `revalidatePath()`.
- **RTK Query cache** is configured per slice:
  - `wishlistApi` — `tagTypes: ['Wishlist']`. Every mutation calls `invalidatesTags: ['Wishlist']`, refetching `getWishlist`.
  - `cartApi` — `tagTypes: ['Cart']`. Same pattern.
- **localStorage persistence** (`'oe_store'`, schema version 4, see `./REDUX.md` §7) writes `cart`, `wishlist`, `recentlyViewed`, `catalog` UI state, and `userAddresses` on every Redux change via `store.subscribe`. Auth tokens are **intentionally excluded** from localStorage.

---

## 11. File map — every file touching OneEntry

| File | Lines | Role |
|---|---|---|
| `src/app/context/AuthContext.tsx` | 45, 80-105, 128-173 | `cmsLogin()` and the 3-tier login flow (social → Platform → mock Server Action). Reads `NEXT_PUBLIC_API_URL`, dispatches `setAuth`/`clearAuth`. |
| `src/app/store/api/wishlistApi.ts` | full file (107 lines) | `createApi` for `/users/me/wishlist*`. Exports `isWishlistApiEnabled()`, `useGetWishlistQuery`, `useAddWishlistItemMutation`, `useRemoveWishlistItemMutation`, `useSetWishlistMutation`, `isFetchBaseQueryError`. |
| `src/app/store/api/cartApi.ts` | full file (79 lines) | `createApi` for `/users/me/cart*`. Exports `isCartApiEnabled()` plus the four query/mutation hooks. |
| `src/app/store/api/types/wishlist.ts` | full file (33 lines) | Wire types: `WishlistApiItem`, `WishlistApiResponse`, `WishlistAddItemArgs`, `WishlistRemoveItemArgs`, `WishlistSetArgs`. |
| `src/app/store/api/types/cart.ts` | full file (35 lines) | Wire types for the cart endpoint family. |
| `src/app/store/userSlice.ts` | 15-24, 45-49, 68-78, 102 | Stores `authToken` / `refreshToken` / `userIdentifier` on `user.data`. Action creators `setAuth`, `clearAuth`. |
| `src/app/context/WishlistContext.tsx` | 47-65 (`placeholderFromCmsId`), 67-106 (server merge), 118-172 (sync logic) | Optimistic-update + rollback wrapping over `wishlistApi`. Uses `CMS_PRODUCT_ID_MAP` for playground↔Platform id resolution. |
| `src/app/context/CartContext.tsx` | analogous structure | Optimistic-update + rollback wrapping over `cartApi`. Handles cart bundles by syncing each constituent item individually. |
| `src/app/data/cms-product-id-map.ts` | full file (103 lines) | Static `playgroundId → Platform products.id` mapping plus `getCmsProductId(id)` / `getPlaygroundProductId(id)`. 25 entries covering the `seed-demo-prod-*` seed. |
| `src/app/utils/syncWarnings.ts` | full file (50 lines) | `emitSyncWarning(kind, message, context)` for unmapped / mutation / connectivity issues. CustomEvent name: `'oe:sync-warning'`. |
| `src/app/actions/auth.ts` | full file (18 lines) | Server Action `validateCredentials(emailOrPhone, password)` — local mock fallback. Does NOT call OneEntry. |
| `src/app/utils/schemas.ts` | full file (157 lines) | Zod schemas — `loginSchema` accepts email/phone/Platform identifier (`AuthContext.tsx` consumes this implicitly). |
| `scripts/setup-demo-passwords.sh` | full file | Provisions `users_auth_providers(identifier='email')`, the `auth_email_set` attribute set with `isLogin`/`isPassword` markers on `login`/`password`, the `auth_email_form` form, and bcrypts `demo123` for every `seed-demo-user-*`. Idempotent. |
| `./DEMO_LOGIN.md` | full file | Demo accounts (`seed-demo-user-active-1` etc.), all sharing `demo123` after running the setup script. |
| `package.json` | 19-29 | **Confirms** the `oneentry` SDK is NOT a dependency. |

---

## 12. What is NOT wired (gaps & intentional non-integrations)

For LLM agents that may be tempted to assume a feature exists:

- **No `Pages` API consumer** — page content comes from Next.js routes + TS data files, not `/api/content/pages/url/...`.
- **No `Products` API consumer** — catalog comes from `src/app/data/{women,men}-{clothing,shoes,bags,accessories}.ts`. The `cms-product-id-map.ts` only maps **synthetic IDs** for the wishlist/cart sync — it does not fetch product details from the Platform.
- **No `Forms` API consumer** beyond signin (which goes through `users-auth-providers`, not `/forms/marker/...`).
- **No `Menus` API consumer** — `headerConfig.ts` / `footerConfig.ts` / `MEGA_DATA` in `data/categories.ts` are static.
- **No `Filters` API consumer** — filtering happens client-side over the Redux `catalog` slice.
- **No `IntegrationCollections` consumer** — FAQ, stores, brands, partners come from `faqData.ts`, `stores.ts`, etc.
- **No `Orders` API consumer** — checkout writes only into Redux (`cart` + `userAddresses`); order persistence to OneEntry is not implemented.
- **No `Categories` API consumer** — `SHOP_CATEGORIES` is a TS constant.
- **No SDK package** — `oneentry` is absent from `package.json` (confirmed line 19-29).
- **No bootstrap module** — there is no equivalent of `lib/oneentry.ts` exporting `getApi()` / `defineOneEntry({ project, token })`.

If a future task is to "add OneEntry SDK calls for X", the first step is `yarn add oneentry`, then create the bootstrap helper, then add new RTK Query slices following the `wishlistApi` / `cartApi` template.

---

## 13. Cross-references

- `./DEMO_LOGIN.md` — demo accounts + one-time `scripts/setup-demo-passwords.sh` provisioning.
- `./REDUX.md` — full Redux store layout, persistence schema (`'oe_store'` v4), RTK Query swap recipe (§9 of that doc explains step-by-step how to migrate the fake-baseQuery slices to real fetches).
- `./DATASETS.md` — the inventory of `src/app/data/*.ts` files that currently substitute for OneEntry Products / Pages / Blocks / Forms / Menus / Collections.
- `./I18N.md` — confirms single-locale; relevant context for understanding why no `langCode` is threaded into Platform calls.
- `./ARCHITECTURE.md` — overall project layout.
- `./E2E-TESTS.md` — Playwright E2E that exercises the login modal (touches the auth flow, but does not require a running Platform).
- `./AUTH.md` — login / signup / token model (the single real Platform call lives here).
- `./CHECKOUT.md` — three-step checkout funnel (entirely client-side; no Platform order persistence).
- `./FILTER_SYSTEM.md`, `./SEO_OPTIMIZATION.md`, `./DESIGN_REQUESTS.md` — domain notes, no OneEntry touchpoints.
