# Authentication

End-to-end reference for the auth flow of `apps/new-shop-nextjs`. This document is written for an LLM that will read and modify the code; every claim is backed by a real `file:line` citation. Anything not implemented is called out explicitly — do not assume features beyond what is described here.

## 1. Overview

OneEntry Platform implements authentication via "auth providers" (`users_auth_providers`) keyed by a `marker` and bound to one form of type `sing_in_up` (note the legacy typo from the `FormType` enum). The *same* form handles login AND signup; a single boolean attribute marked `isSignUp: true` toggles the behaviour at submission time. Sign-in fields are picked out by the system flags `isLogin: true` (email/phone/identifier) and `isPassword: true` (password). This is the canonical "signin = signup" pattern documented in `agents_datasets/rules/oneentry-invariants.md §1`.

In this playground, the OneEntry side of the contract is wired up *only* for the login path (see §3.1). Signup currently calls the same `login()` function in the `AuthContext` instead of a separate `/signup` endpoint — see §3.2 for the precise behaviour.

The frontend keeps state in two places that must be kept in sync:
- **React context** (`AuthProvider`) — holds `isLoggedIn`, the in-memory `User` object and the open/close state of the auth modals (`src/app/context/AuthContext.tsx:109`).
- **Redux user slice** — holds the JWT tokens that RTK Query reads via `prepareHeaders` (`src/app/store/userSlice.ts:51`).

There is no SSR-resolved session. All auth state is hydrated client-side after first render (see §5).

## 2. Auth providers

Only one OneEntry auth provider is exercised: marker **`email`** (`src/app/context/AuthContext.tsx:87`). The provider is bootstrapped on the Platform side by `./scripts/setup-demo-passwords.sh`, which also creates the matching attribute set (with `isLogin` on `login`, `isPassword` on `password`) and the binding form — without those rows the endpoint returns HTTP 400 ("auth provider not defined" / "form is not defined"). See `./DEMO_LOGIN.md` for the one-time setup.

Social providers (Google, Apple, Facebook) appear in the UI of `LoginModal` and `RegisterModal` but are pure mocks — clicking a social button calls `login(provider, 'social')` and the context short-circuits to the local mock user (`src/app/context/AuthContext.tsx:130-135`). There is no real OAuth implementation.

## 3. User journeys

### 3.1 Login (existing user)

1. User clicks the account icon in the header — `Header.tsx:188` dispatches `openLoginModal()` from `useAuth()`. The modal is mounted globally at `src/app/components/Header.tsx:266`.
2. User types email/phone/identifier + password into `LoginModal` (`src/app/components/LoginModal.tsx:120-160`). Zod schema `loginSchema` validates client-side (`src/app/utils/schemas.ts:34-46`); the schema explicitly allows three input shapes — email, phone, or a bare Platform `identifier` like `seed-demo-user-active-1`.
3. `handleLogin` waits `TIMINGS.LOGIN_MOCK_DELAY` (cosmetic) then calls `login(input, password)` (`LoginModal.tsx:53-72`).
4. `AuthContext.login` (`AuthContext.tsx:128-173`) executes three fallbacks in order:
   - **Social shortcut**: if `password === 'social'`, set the mock user and exit early (`AuthContext.tsx:130-135`).
   - **Real Platform call**: if `process.env.NEXT_PUBLIC_API_URL` is non-empty, call `cmsLogin()` (`AuthContext.tsx:80-105`). On 200 it dispatches `setAuth({accessToken, refreshToken, userIdentifier})` into the Redux user slice and sets a *mock* `User` object in the context (`AuthContext.tsx:143-152`). On 4xx it returns `false` *without* falling through to the mock — the failure surfaces as "Invalid email or password" in the modal (`LoginModal.tsx:70`). On a network throw it logs a warning and falls through.
   - **Mock fallback**: server action `validateCredentials()` (`src/app/actions/auth.ts:10-17`) compares against `USER_DATASET.credentials` (`test@test.com` / `111`).
5. On success the modal closes and the user is redirected to `/account`, unless they are already in `/checkout/*` (`LoginModal.tsx:71`).

Real-API payload (`AuthContext.tsx:88-100`):
```
POST {NEXT_PUBLIC_API_URL}/users-auth-providers/marker/email/users/auth
Headers:
  Content-Type: application/json
  X-Device-Metadata: { fingerprint, deviceInfo }   // see AuthContext.tsx:53-60
Body:
  { "authData": [
      { "marker": "login",    "value": "<emailOrPhone>" },
      { "marker": "password", "value": "<password>" }
  ] }
```
Response shape `CmsLoginResponse` (`AuthContext.tsx:67-72`): `{ accessToken, refreshToken, userIdentifier, authProviderIdentifier }`.

### 3.2 Signup (new user)

⚠ **Partial implementation.** `RegisterModal` (`src/app/components/RegisterModal.tsx`) collects first name, gender, email, password, phone, marketing consents and a verification code. It validates against `registerSchema` (`src/app/utils/schemas.ts:52-64`), then simulates a network delay and calls `await login(email, password)` (`RegisterModal.tsx:100`).

This means:
- The OneEntry signup endpoints (`/api/content/users-auth-providers/marker/email/users` for registration with `signUp: true`) are **not** called.
- Phone verification (`/users/generate-code` and `/users/check-code`) is **mocked** — `handleSendCode` just flips `codeSent` after an 800 ms delay (`RegisterModal.tsx:70-80`), and the typed `code` value is never validated.
- Activation (`/users/activate`) is **not implemented**.
- The collected `firstName`, `gender`, `phone`, marketing consents, etc. are **discarded** — they never reach the backend or `setAuth`.
- Effectively, "signup" in this playground is a login attempt with whatever email/password the user typed.

If you wire signup to the Platform, add a second branch in `AuthContext.login` (or a new `register()` method) that calls:
```
POST {NEXT_PUBLIC_API_URL}/users-auth-providers/marker/email/users
Body: { authData: [...], formData: [...], formIdentifier: '<signin form>', signUp: true }
```
plus the verification flow (`/generate-code` + `/check-code` + `/activate`) when the auth provider has `is_check_code: true`.

### 3.3 Logout

`logout()` (`AuthContext.tsx:175-179`) sets `isLoggedIn = false`, clears the in-memory `user`, and dispatches `clearAuth()` into the user slice (`userSlice.ts:74-78`), which nulls `authToken`, `refreshToken` and `userIdentifier`. There is no server-side logout call — the Platform `/users/logout` endpoint is **not** invoked. The refresh token is simply dropped client-side.

Logout is exposed from two places:
- The "Sign out" button in `AccountPage.tsx:154`, which also `router.push('/')`.
- The account-deletion confirmation in `AccountDeletionSection.tsx:44`, which logs out and navigates home after deletion (the deletion itself is not implemented server-side).

### 3.4 Token refresh

**Not implemented.** The Platform endpoint `/users-auth-providers/marker/email/users/refresh` is documented in `userData.ts:192` as "reserved for future refresh-on-401 flow", and the slice stores the refresh token, but no code reads it. When `accessToken` expires, RTK Query queries to `/users/me/cart` and `/users/me/wishlist` simply return 401 and the UI silently falls back to local Redux state (`cartApi.ts:34-40`, `wishlistApi.ts:46-53`). There is no retry interceptor, no automatic re-auth, and no proactive timer.

### 3.5 Get current user (`/users/me`)

**Not called.** The `User` object on the context is *always* the hard-coded `MOCK_USER_DATA` from `userData.ts:200-296`, regardless of the actual identifier returned by the Platform (`AuthContext.tsx:148`). After login, `userIdentifier` lands in the Redux slice but no follow-up `GET /users/me` request is issued.

`fetchUserData` exists as a Redux thunk (`userSlice.ts:32-38`) and is dispatched by `AccountPage.tsx:81` on mount, but its body is still a mock that returns `USER_DATASET`. A `// TODO: replace with real API call` marker is left in place (`userSlice.ts:35`).

### 3.6 Activation code flow

**Not implemented.** `RegisterModal` renders the verification-code UI (`RegisterModal.tsx:249-265`) but the value is never POSTed anywhere. There is no call to `/users/generate-code`, `/users/check-code`, or `/users/activate`. Wire these up if the project's `users_auth_providers.is_check_code` is set to `true`.

### 3.7 Forgot / change password

- **Forgot password:** the "Forgot password?" link in `LoginModal.tsx:139` calls `alert(L.forgotConfirm)` — a literal browser alert reading "Password reset link sent!" (`authLabels.ts:36-37`). No reset email, no endpoint call.
- **Password change:** **Not implemented.** No `PUT /users-auth-providers/marker/email/users/password` / similar endpoint is wired up. The "My Data" account section (`src/app/pages/account/myData/`) lets users edit profile fields but does not expose password change.

## 4. Token model

| Field | Where stored | Lifetime | Notes |
|---|---|---|---|
| `accessToken` | `state.user.data.authToken` (Redux) — `userSlice.ts:69` | In-memory only | **Not persisted** to localStorage on purpose: `loadFromStorage()` strips the entire `user` slice when rehydrating (`store/index.ts:77`) and `saveToStorage()` only persists `userAddresses` (`store/index.ts:115`). Migration v3→v4 was a defensive bump that intentionally documents the no-persist policy (`store/index.ts:48-50`). |
| `refreshToken` | `state.user.data.refreshToken` (Redux) | In-memory only | Stored after login but never used to refresh. |
| `userIdentifier` | `state.user.data.userIdentifier` (Redux) | In-memory only | Echoed from the login response; consumed for display purposes only. |

Attachment to requests: RTK Query slices `wishlistApi` and `cartApi` read `state.user.data.authToken` inside `prepareHeaders` and set `Authorization: Bearer <token>` when present (`wishlistApi.ts:46-53`, `cartApi.ts:32-40`). Queries are also gated by `Boolean(authToken)` via the `apiOn` flag inside the contexts (`CartContext.tsx:80`, `WishlistContext.tsx:74`), so unauthenticated users never trigger requests.

There is no HttpOnly cookie or server-side session. Reloading the tab logs the user out — they must sign in again.

## 5. State propagation

**Hydration on first render.** `Providers` mounts the Redux store and the `AuthProvider` (`src/app/components/Providers.tsx:31-65`). `loadFromStorage()` runs synchronously to rehydrate `cart`, `wishlist`, `recentlyViewed`, `catalog` and `userAddresses` — **but not** the user slice with tokens. `useState(false)` inside `AuthProvider` (`AuthContext.tsx:111`) means every page starts as logged-out. There is no mechanism to detect a leftover refresh token or revive a previous session.

**Login result → state.** Success path in `AuthContext.login` dispatches `setAuth(...)` (Redux) AND calls `setUser(MOCK_USER)` + `setIsLoggedIn(true)` (React state) within the same callback (`AuthContext.tsx:143-152`). Components that read auth via `useAuth()` re-render from the React context; RTK Query slices invalidate via the user-slice subscription.

**Login → wishlist merge.** A side-effect component `WishlistSyncEffect` (`Providers.tsx:15-29`) watches `isLoggedIn` and, on transition to `true`, dispatches `wishlistActions.mergeUserWishlist({ wishlist, waitingList })` from `USER_DATASET`. This is the mock variant; when the real API is reachable, `WishlistContext` (`src/app/context/WishlistContext.tsx:79-106`) subscribes to `GET /users/me/wishlist` and merges the server snapshot into Redux (server-wins semantics for known IDs, local-only items preserved).

**SSR.** Auth is purely client-side. `RootLayout` at `app/layout.tsx` mounts the providers and nothing else; there is no Next.js middleware (`find` confirms none exists at the project root), no server-action revalidation, no cookie-based session check.

## 6. Protected routes

There is no route-level guard. Protection happens **inside the page component**:

- `AccountPage.tsx:91-108` — when `!user`, renders a "Sign in to access your account" prompt with a button that calls `openLoginModal()`. The route `/account` is still reachable to logged-out users.
- `DeliveryPage.tsx:50-190` — accepts both logged-in and guest users. When `!isLoggedIn`, it shows the `GuestCheckoutModal` (`DeliveryPage.tsx:188`) so the visitor can either log in, register, or supply guest contact details.

There is **no** Next.js `middleware.ts` file. Server components never see the JWT (it lives only in client Redux). If you need server-side route gating you will need to introduce cookie-backed sessions first.

## 7. Error handling

The `LoginModal` surfaces a single string error in `setError(...)`:

- **Validation errors** — Zod `safeParse` failure produces the field-level message (`LoginModal.tsx:55-57`).
- **Wrong credentials** — when the Platform returns non-2xx OR the mock validator returns `false`, `login()` returns `false` and the modal displays the literal `'Invalid email or password.'` (`LoginModal.tsx:70`). The original Platform error code/body is *not* surfaced — `cmsLogin` discards the response body on failure (`AuthContext.tsx:101-103`).
- **Network failure** — caught inside `AuthContext.login` and logged as `console.warn('[AuthContext] Platform login network failure, falling back to mock', err)` (`AuthContext.tsx:159`). The fall-through silently switches to the local mock validator, so a user with `test@test.com` / `111` will appear to log in even when the Platform is down.

Typical OneEntry error codes you should expect if you wire signup/refresh in:
- **`USER_NOT_FOUND`** (HTTP 404) — identifier missing.
- **`INCORRECT_PASSWORD`** (HTTP 400) — wrong password.
- **`USER_NOT_ACTIVATED`** (HTTP 403) — when `users_auth_providers.is_check_code: true` and the user has not run `/users/activate`.
- **`INVALID_REFRESH_TOKEN`** (HTTP 401) — for `/users/refresh`.

None of these are handled today. Add a branching map inside `cmsLogin` (or a future `cmsSignup`/`cmsRefresh`) to expose them to the modal.

## 8. Integration with cart / wishlist on login

The cart and wishlist intentionally avoid clearing the guest state on login. Both contexts merge the server snapshot **into** the existing local store rather than replacing it.

**Wishlist** (`WishlistContext.tsx:79-113`):
- Subscribes to `GET /users/me/wishlist` once `apiOn === true` (= API URL configured AND token present).
- For each server `productId`, dispatches `wishlistActions.addItem(placeholder)`. The slice de-dupes by `id`, so existing local entries are preserved.
- Items that exist *only* locally (guest additions, items removed on another device) are kept — same semantics as the mock `mergeUserWishlist`.
- A `lastMergedRef` guard prevents re-running on every render; it is reset whenever `authToken` becomes `null`, so a re-login triggers a fresh merge.

**Cart** (`CartContext.tsx:80-116`):
- Same `apiOn` gating.
- On `GET /users/me/cart`, the server quantity is treated as authoritative for any product that *also* exists locally (the slice's `addItem` increments rather than overwrites, so the merge first dispatches `removeItem(id)` then `addItem(placeholderFromCmsId(srv.productId, srv.qty))`) — `CartContext.tsx:96-107`.
- Items only present locally remain.

**Logout** does *not* clear cart or wishlist Redux state. The `apiOn` flag flips to `false`, so no further server calls are made, but the items continue to render and live in localStorage (cart and wishlist *are* persisted by `saveToStorage`, `store/index.ts:107-120`). This deliberately lets a logged-out user keep building a guest cart.

## 9. File map

- `app/layout.tsx:1-105` — root layout, mounts `<Providers>`.
- `src/app/components/Providers.tsx:1-66` — Redux store, `AuthProvider`, `WishlistSyncEffect`.
- `src/app/context/AuthContext.tsx:1-203` — context, `cmsLogin()` REST call, `login()` / `logout()` / modal state.
- `src/app/actions/auth.ts:1-18` — mock `validateCredentials()` server action.
- `src/app/components/LoginModal.tsx:1-189` — login UI, Zod validation, redirect logic.
- `src/app/components/RegisterModal.tsx:1-311` — registration UI; currently calls `login()` instead of a real signup endpoint (see §3.2).
- `src/app/components/Header.tsx:69,188,266-267` — account icon, modal mount, `openLoginModal()` trigger.
- `src/app/store/userSlice.ts:1-104` — `setAuth`, `clearAuth`, token storage, `fetchUserData` mock thunk.
- `src/app/store/index.ts:1-159` — store assembly, **deliberate non-persistence** of the user slice (see comments at `:48-50` and `:77`).
- `src/app/store/api/wishlistApi.ts:1-108` — Bearer header via `prepareHeaders`; `isWishlistApiEnabled()`.
- `src/app/store/api/cartApi.ts:1-79` — same pattern for cart.
- `src/app/context/WishlistContext.tsx:67-113` — server→local merge on login.
- `src/app/context/CartContext.tsx:75-116` — server→local merge on login, with quantity override.
- `src/app/utils/schemas.ts:34-66` — `loginSchema` and `registerSchema` Zod definitions.
- `src/app/data/userData.ts:152-196,200-296` — mock `USER_DATASET` (used for both the demo credentials and the placeholder `User` object after login).
- `src/app/data/authLabels.ts:26-42` — UI copy.
- `src/app/pages/AccountPage.tsx:57,91-108,154` — gated rendering and sign-out button.
- `src/app/pages/DeliveryPage.tsx:50,188` — checkout gating + guest modal trigger.
- `src/app/pages/account/myData/AccountDeletionSection.tsx:10,44` — logout on deletion.
- `scripts/setup-demo-passwords.sh` — Platform-side bootstrap of email provider, attribute set, and form (see `./DEMO_LOGIN.md`).

## 10. Cross-references

- `./DEMO_LOGIN.md` — credentials for the `seed-demo-user-*` accounts and one-time `setup-demo-passwords.sh` bootstrap (required before real Platform logins succeed).
- `./ONEENTRY_INTEGRATION.md` — wider Platform integration: cart/wishlist endpoints (§5.1–§5.2), attribute schemas, marker map, env vars.
- `./CART_WISHLIST.md` — full Redux merge semantics referenced in §8 (`mergeUserWishlist` reducer, optimistic updates, login-merge order).
- `agents_datasets/rules/oneentry-invariants.md §1` — canonical "signin = signup" invariant.
- `agents_datasets/rules/users-architecture.md` — `forUsers` schema rules (NARROW: auth + base identity only; everything else moves to account-section data-forms via `form_module_config`).

## 11. Summary of "Not implemented" items

The following Platform-side flows are referenced by the UI or types but are **not** wired up. Treat them as TODOs when extending auth:

1. Real signup endpoint (`/users-auth-providers/marker/email/users` with `signUp: true`).
2. Phone verification (`/users/generate-code`, `/users/check-code`).
3. Account activation (`/users/activate`).
4. Token refresh (`/users-auth-providers/marker/email/users/refresh`).
5. Server-side logout (`/users-auth-providers/marker/email/users/logout`).
6. `GET /users/me` — current user fetch (the displayed `User` is always `MOCK_USER_DATA`).
7. Password change / forgot-password reset (UI shows an `alert()` only).
8. Persistent session across reloads (tokens live in-memory only by design).
9. Server-side / middleware route guards.
