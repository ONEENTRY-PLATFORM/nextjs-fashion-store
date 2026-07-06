# AUTH.md — Authentication

How the storefront authenticates users against the OneEntry Platform. Every user-facing flow — sign-in, sign-up, Google OAuth, session bootstrap, profile mutations, logout — goes through Server Actions in `src/lib/oneentry/auth/actions.ts`, and session state lives in httpOnly cookies managed server-side. Nothing sensitive is stored in `localStorage` or Redux.

---

## 1. Overview

```
┌───────── Client (React) ─────────┐        ┌──── Server Actions ('use server') ────┐        ┌── OneEntry ──┐
│  LoginModal, RegisterModal,      │        │  signInAction / signUpAction /        │        │  AuthProvider │
│  AuthContext.login/.signUp/…     │  RSC   │  getGoogleAuthUrlAction /             │ HTTPS  │  Users        │
│  useAuth().{isLoggedIn,user,…}   │  boundary │  exchangeGoogleCodeAction /         │ ────▶  │  Form-data    │
│                                  │ ────▶  │  getCurrentUserAction /               │        │  (users_addr, │
│  Cookies (readable but not       │        │  updateProfileAction /                │        │   subs, data) │
│  writable): oe_user              │        │  updateAddressesAction /              │        │               │
└──────────────────────────────────┘        │  updateSubscriptionsAction /          │        └──────────────┘
                                            │  updateConsentAction /                │
                                            │  syncCartAction / syncWishlistAction /│
                                            │  signOutAction                        │
                                            └───┬───────────────────────────────────┘
                                                │ writes/reads
                                                ▼
                                      httpOnly cookies (server-managed):
                                       - oe_access   (Bearer token)
                                       - oe_refresh  (refresh token)
                                       - oe_user     (identifier — non-httpOnly)
```

Zero direct fetches from browser to OneEntry — everything goes through Next.js Server Actions.

---

## 2. Environment

The auth path relies on the same three env vars as the rest of the OneEntry integration (see [ONEENTRY_INTEGRATION.md](./ONEENTRY_INTEGRATION.md) §2):

| Var | Purpose |
|---|---|
| `ONEENTRY_URL` | Platform base URL |
| `ONEENTRY_TOKEN` | App token |
| `NEXT_PUBLIC_DEFAULT_LOCALE` | `langCode` for `/me` bootstrap |

Google OAuth adds one more:

| Var | Purpose |
|---|---|
| `NEXT_PUBLIC_GOOGLE_CLIENT_ID` | Enables the "Continue with Google" button. Value must match the `client_id` configured on the OneEntry `google` auth provider. |

Without `NEXT_PUBLIC_GOOGLE_CLIENT_ID`, the Google button is hidden but email sign-in continues to work.

The `client_secret` for the Google OAuth client lives inside the OneEntry provider config (`AuthProvider.getAuthProviderByMarker('google').config`) — never in the Next.js env. In Google Cloud Console the OAuth client must list `${origin}/auth/callback/google` under **Authorised redirect URIs** for every deployed origin (not "Authorised JavaScript origins" — the implicit flow is no longer used).

---

## 3. Cookies

All cookies are set/cleared by Server Actions in `src/lib/oneentry/auth/actions.ts`.

| Cookie | Flags | Purpose |
|---|---|---|
| `oe_access` | httpOnly, secure, sameSite=lax | Short-lived access token — forwarded as Bearer to every authenticated OneEntry call. |
| `oe_refresh` | httpOnly, secure, sameSite=lax | Refresh token — used by `signOutAction` to invalidate the session on the Platform side. |
| `oe_user` | secure, sameSite=lax (readable) | User identifier — the client reads it (via cookie header on RSC) to render "Logged in as X" without waiting for `/me`. |

Tokens are **never** written to `localStorage`, Redux persisted state, or `sessionStorage`. Redux `userSlice` still declares `authToken` / `refreshToken` fields on `state.user.data` (both `null` initially; `setAuth` writes empty strings after successful sign-in) — legacy from an older client-side auth model, retained so components that read from selectors don't crash but no longer used on the live path.

---

## 4. Sign-in

### 4.1 Email + password

1. User submits `<LoginModal>` with `emailOrPhone` + `password`.
2. `AuthContext.login()` calls `signInAction(emailOrPhone, password)` (Server Action).
3. Inside the action:
   - `getApi().AuthProvider.auth('email', { authData: [{marker:'login',value},{marker:'password',value}] })`.
   - On success, response contains `accessToken`, `refreshToken`, `userIdentifier`.
   - Server sets the three cookies.
   - Server issues `getCurrentUserAction()` internally and returns `{ok:true, user, userIdentifier}` to the client.
4. `AuthContext` sets `isLoggedIn = true`, closes the modal, dispatches `setAuth({userIdentifier})` to `userSlice` (accessToken / refreshToken kept empty).

The action supports **email**, **phone**, and the raw OneEntry `identifier` as the login value — the Platform's email auth provider is configured with `isLogin` on both fields. Zod validation on the client is intentionally lenient (`loginSchema` in `src/app/utils/schemas.ts`).

### 4.2 Google OAuth

The Google integration is a **standard OAuth 2.0 authorization-code flow** — no browser SDK, no GIS popup, no implicit access token. The browser navigates to Google, Google redirects back to a Next.js route with a `code`, and the server exchanges that `code` for an OE session via `AuthProvider.oauth('google', …)`. This matches the OneEntry `auth-provider` MCP rule (server-side code exchange only).

**Sign-in flow (LoginModal / RegisterModal):**

1. `LoginModal` (and `RegisterModal`) render a "Continue with Google" button gated on `NEXT_PUBLIC_GOOGLE_CLIENT_ID`.
2. Click calls `startGoogleOAuth(returnTo?)` from `src/lib/google-auth.ts`, which calls the Server Action `getGoogleAuthUrlAction(origin, returnTo?)` and then does `window.location.href = url`.
3. `getGoogleAuthUrlAction`:
   - Reads `getApi().AuthProvider.getAuthProviderByMarker('google').config.oauthAuthUrl` (Google's authorize endpoint URL is stored in the OneEntry provider config, not hardcoded).
   - Builds the authorize URL with `client_id=NEXT_PUBLIC_GOOGLE_CLIENT_ID`, `redirect_uri=${origin}/auth/callback/google`, `response_type=code`, `scope=openid email profile`, and a CSRF `state`.
   - Sets two httpOnly cookies: `oe_google_state` (CSRF token — must match on callback) and `oe_google_return_to` (the `returnTo` path).
4. Google shows its account chooser / consent screen, then redirects to `GET /auth/callback/google?code=…&state=…` (route handler at `app/auth/callback/google/route.ts`).
5. The route handler calls `exchangeGoogleCodeAction({code, state, origin})`, which:
   - Verifies `state` matches the `oe_google_state` cookie (rejects on mismatch).
   - Calls `getApi().AuthProvider.oauth('google', { code, redirect_uri: `${origin}/auth/callback/google` })`. OneEntry performs the server-to-Google code exchange using the `client_secret` from its provider config, then resolves / creates the user.
   - On success writes `oe_access` / `oe_refresh` / `oe_user`, clears the two Google cookies, and returns `{ok:true, user, userIdentifier, returnTo}`.
6. The route handler `redirect()`s to `returnTo` on success, or to `/?googleAuthError=<code>` on failure. `AuthContext` re-bootstraps `/me` on the next mount and the user is signed in.

Because the browser navigates away, `AuthContext.startGoogleOAuth` does not return a result — the login modal never sees the outcome. Error surfacing happens on the landing page via the `?googleAuthError=` query param.

**Linking Google to an existing account:** `AccountPage → My Data → Social networks` also uses `startGoogleOAuth('/account?googleLinked=1')`. There is **no** separate "connect" Server Action — the same authorize / callback path is reused. Because `exchangeGoogleCodeAction` is called with an active `oe_access` cookie present, OneEntry associates the Google identity with the current user rather than opening a fresh session. The mount effect in `SocialNetworksSection` reads the `?googleLinked=1` query flag on return and marks Google as linked in local state.

Required env: `NEXT_PUBLIC_GOOGLE_CLIENT_ID`. In Google Cloud Console the OAuth client must list `${origin}/auth/callback/google` under **Authorised redirect URIs** for every deployed origin. Without the env, the buttons are hidden and no Google flow is attempted.

### 4.3 Social buttons (Apple / Facebook)

Currently stubbed. `AuthContext.login(_, 'social')` treats the sentinel password `'social'` as a synthetic success — sets `isLoggedIn = true` with an **empty** user object. No fake profile is injected. When Apple/Facebook OAuth providers are wired up on the Platform side, they should follow the same authorization-code pattern as Google: a `getAppleAuthUrlAction` / `getFacebookAuthUrlAction` that reads the provider config, a per-provider `/auth/callback/<name>` route, and an `exchange<Name>CodeAction` calling `AuthProvider.oauth(<marker>, {code, redirect_uri})`.

### 4.4 Forgot password

The "Forgot password?" link inside `LoginModal` currently fires `alert(L.forgotConfirm)` — a placeholder that tells the user to contact support. There is **no `requestPasswordResetAction`** yet. Wiring the real flow would need:

1. A new Server Action calling `getApi().AuthProvider.reset('email', {email})` (or the tenant-specific reset endpoint).
2. A follow-up `resetPasswordAction(token, newPassword)` triggered by the email link.
3. A `/reset-password/[token]` route to receive the deep link.

None of the above is implemented today.

---

## 5. Sign-up

### 5.1 Form schema

The sign-up form is driven by the CMS attribute set `users_sign_in_sign_up`. `loadSignUpFormSchema(lang)` (`src/lib/oneentry/auth/sign-up-form.ts`) reads it, and `SignUpFormSchemaProvider` (`src/lib/oneentry/auth/SignUpFormSchemaContext.tsx`) exposes it to `RegisterModal`.

Fields (all CMS-controlled):
- email
- password
- first_name
- phone
- gender
- promotional subscriptions (newsletter / SMS / topic switches)
- terms agreement

Field labels, placeholders, and validation copy come from the attribute-set metadata.

### 5.2 Submission

1. `RegisterModal` validates locally with Zod (`registerSchema` in `src/app/utils/schemas.ts`) — this catches obvious errors before hitting the Platform.
2. `AuthContext.signUp(input)` calls `signUpAction(input)`.
3. `signUpAction` builds `formData` and calls `getApi().AuthProvider.signUp('signin', formData)`.
4. On success — same cookie + user-load flow as sign-in. Modal closes.

Failures return `{ok:false, error}` with the Platform's error message surfaced verbatim.

No email verification / activation step is wired at this time — the Platform can be configured to require confirmation, in which case the sign-up returns a "pending activation" state and the modal would need a follow-up UI. This branch is not implemented.

---

## 6. Session bootstrap (`/me`)

On mount, `AuthContext` calls `getCurrentUserAction()`:

- If `oe_access` cookie is present and valid → the action calls `getApi().Users.getUser(langCode)`, plus form-data reads for `user_addresses`, `subscription_management` (and consent), plus orders lookups across storages `home`, `store_pickup`, `locker`. Returns a fully populated `OeUser`.
- If not authenticated → returns `null`.
- Either way, sets `authReady = true`.

`authReady` is critical: components that gate on "logged out for sure" (e.g. account page's sign-in prompt) must wait for `authReady === true` — otherwise they briefly flash sign-in UI during hydration.

---

## 7. Post-sign-in mutations

`src/lib/oneentry/auth/actions.ts` exports the auth Server Action set. `AuthContext` exposes **11 mutation methods** through the hook: `login`, `startGoogleOAuth`, `signUp`, `logout`, `updateUser` (local optimistic merge, no Server Action), `updateProfile`, `updateAddresses`, `updateSubscriptions`, `updateConsent`, `syncCart`, `syncWishlist` — plus 4 modal state helpers (`openLoginModal`, `closeLoginModal`, `openRegisterModal`, `closeRegisterModal`) and 3 state fields (`isLoggedIn`, `user`, `authReady`). `startGoogleOAuth` does **not** return a result — it navigates the browser to Google via `getGoogleAuthUrlAction`. The remaining Server Actions (`exchangeGoogleCodeAction`, `getCartAction`, `getWishlistAction`, `pushRecentlyViewedAction`, `getRecentlyViewedAction`, `mergeRecentlyViewedAction`, `createOrderAction`) are called **directly** — `exchangeGoogleCodeAction` from the `app/auth/callback/google/route.ts` route handler, the rest from components (PDP, ProductDetailPage bootstrap, PaymentPage). Grouped:

**Wrapped by `AuthContext` (exposed as hook methods):**

| Callback | Server Action | Effect |
|---|---|---|
| `updateProfile(patch)` | `updateProfileAction(patch)` | Persists `firstName / lastName / email / phone / gender / dob / shoeSize / clothingSize`. On success, calls `getCurrentUserAction()` and re-merges. |
| `updateAddresses(addresses)` | `updateAddressesAction(addresses)` | Full-replace upsert of the user's address list (form-data `user_addresses`, moduleConfigId 24). Returns the canonical list with populated `recordId`s. |
| `updateSubscriptions(subs)` | `updateSubscriptionsAction(subs)` | Persists the `OeSubscriptions` object into `subscription_management` (moduleConfigId 32). |
| `updateConsent(consent)` | `updateConsentAction(consent)` | Persists `{dataProcessing, crossBorder}` into `user_data` (moduleConfigId 3). |
| `syncCart(items)` | `syncCartAction(items)` | Full replace of the user's cart on OE. Debounced from `CartContext` (see [CART_WISHLIST.md](./CART_WISHLIST.md)). |
| `syncWishlist(items)` | `syncWishlistAction(items)` | Same, for wishlist. |

Each returns `{ok, error?}`; the `sync*` variants are fire-and-forget.

**Called directly from components (not wrapped in the context):**

| Action | Consumer | Effect |
|---|---|---|
| `exchangeGoogleCodeAction({code, state, origin})` | `app/auth/callback/google/route.ts` | Verifies CSRF `state` cookie, calls `AuthProvider.oauth('google', {code, redirect_uri})`, sets session cookies, returns `{ok, user, userIdentifier, returnTo}`. Also used to link Google to an already-authenticated user when `oe_access` is present. |
| `getCartAction()` | E2E specs, future refresher | Reads `OeCartItem[]` from user state. |
| `getWishlistAction()` | E2E specs, future refresher | Reads `OeWishlistItem[]` from user state. |
| `pushRecentlyViewedAction({productId, viewedAt})` | `RecentlyViewedSection` on PDP mount (when signed in) | Appends one product view to the server trail. |
| `getRecentlyViewedAction()` | `AuthContext` bootstrap; seeds Redux `recentlyViewedSlice.hydrate(...)` | Fetches the server trail on login. |
| `mergeRecentlyViewedAction(local)` | `AuthContext` on first login | Merges guest-local views with the server trail (dedupe by `productId`, keep the latest `viewedAt`), pushes back, returns the merged list. |
| `createOrderAction(input)` | `PaymentPage` | See [CHECKOUT.md](./CHECKOUT.md) §3.2. |

---

## 8. Logout

1. `AuthContext.logout()` sets local state to `{isLoggedIn:false, user:null}` immediately (optimistic).
2. Dispatches `clearAuth()` to `userSlice`.
3. Fires `signOutAction()` in the background — the action reads `oe_refresh`, calls `getApi().AuthProvider.logout(refreshToken)`, then clears all three cookies.
4. No redirect. The Header re-renders with the sign-in prompt.

Logout is optimistic on purpose: even if the Platform is unreachable, the user is logged out locally, and the cookies are best-effort cleared.

---

## 9. Guest sessions

Guest users are identified by a UUID minted client-side and stored in `localStorage` under `oe_guest_id`.

- `getOrCreateGuestId()` in `src/app/utils/guest-id.ts` mints `guest-{crypto.randomUUID()}` on first call and stores under `localStorage['oe_guest_id']`. Read-only accessor `readGuestId()` also exported for consumers that must not create one.
- Attached as `x-guest-id` header on:
  - `trackActivityAction` (all activity events)
  - `createOrderAction` (guest checkout)
- Persistent across sessions; cleared by users who wipe site data.

Guest cart / wishlist are held in Redux (persisted to `localStorage` via `oe_store`) but **not** synced to OneEntry — sync only turns on when `isLoggedIn === true`.

---

## 10. RegisterModal, LoginModal state

Modal open/close lives in `AuthContext` state, not Redux:

- `loginModalOpen`, `registerModalOpen`
- `openLoginModal()`, `closeLoginModal()`
- `openRegisterModal()`, `closeRegisterModal()`

Opening either modal closes the other — this prevents both from ever showing simultaneously.

Trigger points:
- Header "profile" icon → `openLoginModal()` when logged out.
- Checkout `<GuestCheckoutModal>` "Sign in" button → `openLoginModal()`.
- Header profile icon → `/account` when logged in (no modal).

---

## 11. Route protection

There is **no `middleware.ts`** for auth. Routes are not blocked at the network layer; instead:

- `/account/*` client component reads `useAuth().isLoggedIn`; if `authReady && !isLoggedIn`, renders a `<SignInPrompt>` block.
- `/checkout/*` routes show `<GuestCheckoutModal>` on load when `!isLoggedIn`, offering Sign In / Register / Continue-as-Guest.
- `/favorites`, `/cart` are accessible to guests; their content is guest-only Redux state until sign-in.

Server Actions themselves enforce auth via the `oe_access` cookie — anonymous calls to `updateProfileAction` etc. return `{ok:false, error:'unauthenticated'}`.

---

## 12. Error handling

| Failure | Behaviour |
|---|---|
| Wrong password (4xx from OE) | `signInAction` returns `{ok:false, error}`. Modal renders "Wrong credentials". |
| Google code exchange failure (bad `state`, Google denies, OE `oauth` throws) | `exchangeGoogleCodeAction` returns `{ok:false, error}`. `app/auth/callback/google/route.ts` redirects to `/?googleAuthError=<code>` — the landing page can surface the code inline. |
| Network failure to OneEntry | Server Action throws; Next.js surfaces it as `{ok:false}`. No mock fallback — configure `ONEENTRY_URL` / `ONEENTRY_TOKEN`. |
| Missing env vars at server boot | `getApi()` throws `'OneEntry SDK is not configured'`. Every auth action fails immediately. |
| `oe_access` expired | Any authenticated Server Action returns `{ok:false, error:'unauthenticated'}`. `AuthContext` shows the sign-in prompt on next mount. |

There is currently **no automatic token refresh** on the client. Sessions last as long as `oe_access` is valid, then the user must sign in again. Adding a refresh loop would require calling `AuthProvider.refresh(refreshToken)` from a middleware-level layer.

---

## 13. Cross-references

- [ONEENTRY_INTEGRATION.md](./ONEENTRY_INTEGRATION.md) — SDK inventory including the auth API surface (§4.1)
- [CART_WISHLIST.md](./CART_WISHLIST.md) — how `syncCart` / `syncWishlist` piggyback on the session cookie
- [CHECKOUT.md](./CHECKOUT.md) — guest checkout with `x-guest-id`
- [REDUX.md](./REDUX.md) — `userSlice` shape (auth tokens intentionally empty)
- [DEMO_LOGIN.md](./DEMO_LOGIN.md) — demo accounts + `setup-demo-passwords.sh`
