# AUTH.md — Authentication

How the storefront authenticates users against the OneEntry Platform.

The session lives **in the browser**, per the OneEntry MCP `auth-provider` / `tokens` rules: OneEntry binds every refresh token to the device fingerprint (`x-device-metadata`) of the request that issued it, so a token minted on the server carries a `Node.js/…` fingerprint the browser can never refresh. `AuthProvider.auth` / `signUp` therefore run in a Client Component, the SDK's `saveFunction` persists the rotating refresh token to `localStorage`, and `reDefine()` re-installs it on the singleton at every page load.

Only two things still run on the server: the Google `code → tokens` exchange (OneEntry holds the `client_secret`, and the CSRF `state` must be httpOnly) and ISR cache invalidation after an order.

---

## 1. Overview

```
┌──────────────── Client (React) ─────────────────┐         ┌── OneEntry ──┐
│  LoginModal / RegisterModal / AuthContext       │         │  AuthProvider │
│                                                 │  HTTPS  │  Users        │
│  getApi()  ← the SDK singleton                  │ ──────▶ │  Orders       │
│    ├─ AuthProvider.auth / signUp / logout       │         │  Payments     │
│    ├─ Users / Orders / Payments / UserActivity  │         │  Form-data    │
│    └─ reDefine(refresh) on mount                │         └──────────────┘
│                                                 │
│  localStorage:                                  │
│    refresh-token        (written by saveFunction)│
│    authProviderMarker   ('email' | 'google')     │
│    oe_user_identifier   (for form-data writes)   │
│    oe_guest_id          (anonymous visitors)     │
└───────────────────┬─────────────────────────────┘
                    │ only where the server is genuinely required
                    ▼
   'use server':  oauth-actions.ts       — CSRF state cookie + code exchange
                  revalidate-action.ts   — revalidateTag after an order
                  products-action.ts     — cached public catalogue reads
```

The app token reaches the browser by design (`NEXT_PUBLIC_ONEENTRY_TOKEN`) — that is how the OneEntry SDK is meant to be used, and it is what makes a browser-issued, browser-refreshable session possible.

---

## 2. Environment

The auth path relies on the same three env vars as the rest of the OneEntry integration (see [ONEENTRY_INTEGRATION.md](./ONEENTRY_INTEGRATION.md) §2):

| Var | Purpose |
| --- | --- |
| `NEXT_PUBLIC_ONEENTRY_URL` | Platform base URL |
| `NEXT_PUBLIC_ONEENTRY_TOKEN` | App token |
| — | `langCode` for `/me` bootstrap is the `DEFAULT_LOCALE` constant, not an env var |

The legacy server-only `ONEENTRY_URL` / `ONEENTRY_TOKEN` are still read as a fallback so an existing deployment keeps rendering while its env is migrated — but the browser cannot see them, so sign-in, cart and orders stay broken until the `NEXT_PUBLIC_` pair is set.

Google OAuth adds one more:

| Var | Purpose |
|---|---|
| `NEXT_PUBLIC_GOOGLE_CLIENT_ID` | Enables the "Continue with Google" button. Value must match the `client_id` configured on the OneEntry `google` auth provider. |

Without `NEXT_PUBLIC_GOOGLE_CLIENT_ID`, the Google button is hidden but email sign-in continues to work.

The `client_secret` for the Google OAuth client lives inside the OneEntry provider config (`AuthProvider.getAuthProviderByMarker('google').config`) — never in the Next.js env. In Google Cloud Console the OAuth client must list `${origin}/auth/callback/google` under **Authorised redirect URIs** for every deployed origin (not "Authorised JavaScript origins" — the implicit flow is no longer used).

---

## 3. Session storage

Session state lives in `localStorage`, written by the SDK and by three small helpers in `src/lib/oneentry/auth/browser-session.ts`.

| Key | Written by | Purpose |
| --- | --- | --- |
| `refresh-token` | the SDK's `saveFunction` (`src/lib/oneentry/index.ts`) | Rotating refresh token. The SDK rewrites it on every successful `/refresh`; the app only ever *clears* it (`clearTokens()`), because the SDK never touches storage on a failed refresh and a dead token would otherwise replay a `400` on every page load. |
| `authProviderMarker` | `storeSession()` on sign-in | Marker that minted the session (`'email'`, `'google'`, …). `AuthProvider.refresh` / `.logout` must be called with the same marker, otherwise OneEntry rejects the call and the shopper is silently signed out. |
| `oe_user_identifier` | `writeUserIdentifier()` on sign-in | OneEntry `userIdentifier`. Required as `moduleEntityIdentifier` when creating form-data records (addresses, profile extras, subscriptions, service requests) — there is no way back to it from the token alone without an extra `/me` round-trip. |
| `oe_guest_id` | `getOrCreateGuestId()` | Anonymous visitor fingerprint, sent as `x-guest-id`. The SDK drops the header automatically once an access token is present. |

The **access token is never persisted** — it lives only in SDK instance state, and `reDefine(refresh)` lets the SDK mint a fresh one proactively before the first user-auth request (a clean `POST /refresh 200 → 200`, with no stray `401`).

The only cookies left are the two short-lived, httpOnly CSRF cookies of the Google authorize round-trip (`oe_google_oauth_state`, `oe_google_oauth_return`) — see §4.2.

Redux `userSlice` still declares `authToken` / `refreshToken` fields on `state.user.data` (both empty by design — the SDK owns the tokens), retained so components reading those selectors don't crash.

---

## 4. Sign-in

### 4.1 Email + password

1. User submits `<LoginModal>` with `emailOrPhone` + `password`.
2. `AuthContext.login()` calls `signInAction(emailOrPhone, password)` — a plain async function that runs **in the browser**, not a Server Action.
3. Inside it:
   - `getApi().AuthProvider.auth('email', { authData: [{marker:'email',value},{marker:'password',value}] })`. Running here is what makes the issued refresh token refreshable later: OneEntry binds it to the fingerprint of this request.
   - `auth()` itself writes both tokens into SDK state and fires `saveFunction`, which persists `refresh-token`. The app only records `authProviderMarker` and `oe_user_identifier`.
   - `fetchMe()` then hydrates the full `OeUser` and the function returns `{ok:true, user, userIdentifier}`.
4. `AuthContext` sets `isLoggedIn = true`, closes the modal, dispatches `setAuth({userIdentifier})` to `userSlice`.

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
4. Google shows its account chooser / consent screen, then redirects to `/auth/callback/google?code=…&state=…` — a **Client Component page** (`app/auth/callback/google/page.tsx` → `GoogleCallbackClient`), not a route handler. It has to be client-side: the exchange must be stamped with *this browser's* fingerprint, and the returned tokens have to be installed in browser storage.
   The handler first calls `externalOrigin(request)` to reconstruct the externally-visible origin. Behind a reverse proxy (e.g. OE cloud hosting), `new URL(request.url).origin` returns the container-internal address (`http://localhost:3000`) because Node.js only sees the internal socket — not the public host the browser hit. `externalOrigin` reads `x-forwarded-host` (falling back to `host`) for the hostname. The scheme is determined purely by a **loopback check on the host value** — `x-forwarded-proto` is **not consulted**: `localhost`, `127.0.0.1`, and `[::1]` (with an optional port) use `http`; every other host unconditionally uses `https`. This avoids a class of bug observed on OE cloud hosting where the reverse proxy forwards `x-forwarded-proto: http` (the literal container-internal scheme, not the public-facing TLS scheme) — trusting that header produced `redirect_uri = http://nextjs-fashion-store.oneentry.cloud/auth/callback/google` at code-exchange time, which did not match the `https://…` used at Google authorization time, causing Google to reject the exchange and OE to surface "We couldn't pass the oauth authentication with provided data". In local dev there are no forwarded headers, so `request.headers.get('host')` is `localhost` and `http` is preserved — behaviour is unchanged. Passing the wrong origin as `redirect_uri` at code-exchange time causes Google to reject the exchange ("redirect_uri mismatch") and failure redirects to land on `http://localhost:3000/` instead of the real app URL.
5. The page calls `completeGoogleSignIn({code, state, origin})`, which captures `getApi().AuthProvider.getDeviceMetadata()` and forwards it to the Server Action `exchangeGoogleCodeAction` (`src/lib/oneentry/auth/oauth-actions.ts`). That action:
   - Verifies `state` against the httpOnly `oe_google_oauth_state` cookie and consumes both CSRF cookies immediately.
   - Creates a **throw-away** instance — `createRequestApi({ deviceMetadata })` — and calls `AuthProvider.oauth('google', { code, redirect_uri })` on it. A per-request instance is mandatory here: `setDeviceMetadata()` on the shared server singleton would apply to every concurrent visitor, and without the browser's fingerprint the issued refresh token would be bound to the server's Node identity and rejected on the first refresh from the browser.
   - Returns `{ok:true, userIdentifier, accessToken, refreshToken, returnTo}` — tokens, not cookies.
6. Back in the browser, `storeSession()` installs both tokens (`oauth()`, unlike `auth()`, does **not** write them into SDK state itself), `fetchMe()` hydrates the profile, and the page `router.replace()`s to `returnTo` — or to `/?googleAuthError=<code>` on failure.

Because the browser navigates away, `AuthContext.startGoogleOAuth` does not return a result — the login modal never sees the outcome. Error surfacing happens on the landing page via the `?googleAuthError=` query param.

**`GoogleAuthErrorSurface` (in `src/app/components/system/Providers.tsx`).** A lightweight component mounted inside `Providers` reads `?googleAuthError=` from the URL on client mount. Because it calls `useSearchParams()`, it is wrapped in `<Suspense fallback={null}>` inside `Providers` — without this boundary `next build` fails to prerender static pages (including `/_not-found`) with a `missing-suspense-with-csr-bailout` error. When the param is present it calls `setAuthError(humaniseGoogleAuthError(rawErr))` — mapping the raw OAuth error code to a human-readable string — and then calls `openLoginModal()` so the shopper sees the auth modal already populated with the banner. `router.replace(pathname)` strips the query param immediately so a hard refresh does not loop.

`AuthContext` exposes `authError: string | null` and `setAuthError` as part of its public surface. `LoginModal` reads `authError` and renders it as a persistent banner with a dismiss button (`setAuthError(null)`). The banner takes priority over the transient inline validation error — only one of the two is shown at a time. `closeLoginModal()` calls `setAuthError(null)` so a re-open of the modal after the error was seen does not re-display the stale message.

Previously the shopper landed on `/` with the modal closed and no visible explanation of why the Google sign-in failed.

**Linking Google to an existing account:** `AccountPage → My Data → Social networks` also uses `startGoogleOAuth('/account?googleLinked=1')`. There is **no** separate "connect" Server Action — the same authorize / callback path is reused. Because the exchange runs while the SDK singleton still carries the current shopper's session, OneEntry associates the Google identity with that user rather than opening a fresh session. The mount effect in `SocialNetworksSection` reads the `?googleLinked=1` query flag on return and marks Google as linked in local state.

Required env: `NEXT_PUBLIC_GOOGLE_CLIENT_ID`. In Google Cloud Console the OAuth client must list `${origin}/auth/callback/google` under **Authorised redirect URIs** for every deployed origin. Without the env, the buttons are hidden and no Google flow is attempted.

### 4.3 Social buttons (Apple / Facebook)

Currently stubbed. `AuthContext.login(_, 'social')` treats the sentinel password `'social'` as a synthetic success — sets `isLoggedIn = true` with an **empty** user object. No fake profile is injected. When Apple/Facebook OAuth providers are wired up on the Platform side, they should follow the same authorization-code pattern as Google: a `getAppleAuthUrlAction` / `getFacebookAuthUrlAction` that reads the provider config, a per-provider `/auth/callback/<name>` route, and an `exchange<Name>CodeAction` calling `AuthProvider.oauth(<marker>, {code, redirect_uri})`.

### 4.4 Forgot password

OneEntry has **no reset link**: there is no tokenised URL to mail out and no endpoint that would consume one, so there is no `/reset-password/[token]` route to build. Recovery is a one-time **code**, and the flow is three calls on the shopper's auth provider — all in the browser, for the same fingerprint reason as sign-in:

| Step | Call | Notes |
| --- | --- | --- |
| 1. Request | `AuthProvider.generateCode(marker, email, 'send_code')` | OE mints a code and delivers it to the account's notification channel. A second request while the first code lives answers `User already has a code`. |
| 2. Verify | `AuthProvider.checkCode(marker, email, 'send_code', code)` | A wrong code is **`201 false`**, not an error object. Verification does not spend the code. |
| 3. Change | `AuthProvider.changePassword(marker, email, 'send_code', 2, code, pw, pw)` | `type: 2` is recovery; `1` would be an authenticated change. |

`send_code` is OE's built-in service-code event — not a CMS marker. The provider marker is resolved by `type === 'email'`, never hardcoded, so renaming the provider in the panel does not break recovery.

Implementation:

- `src/lib/oneentry/auth/password-reset.ts` — the three actions plus `getPasswordResetPolicy()`, which reads `config.systemCodeLength` / `config.systemCodeTlsSec` off the provider. The code input sizes itself from the first and the resend countdown from the second, so neither is guessed.
- `src/app/components/auth/ResetPasswordModal.tsx` — the three steps, opened from `LoginModal`'s "Forgot password?" via `openResetPasswordModal(email)` on `AuthContext`. On success it signs the shopper straight in with the new password.
- Copy: `sign_in_reset_*` in the CMS `sign_in` set (`PASSWORD_RESET_LABELS` are the offline fallbacks). Placeholders are `%email%` / `%seconds%` — a `{` in an attribute value breaks OE's public read of the whole set.

Notes for the tenant side: the flow works with `isCheckCode: false` (no account-activation feature needed — verified against this tenant, where `generate-code` answers `201`). What the panel *does* control is delivery: the mail an editor attaches to the `send_code` event is what actually carries the code to the shopper.

OE's own answers are surfaced verbatim, including `User not found`. Account existence is therefore not hidden here — the same as the sign-in form, which already tells a visitor when credentials are wrong. Hiding it would mean stranding a genuine shopper on a code screen that can never accept anything.

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

- `AuthContext` first installs the stored refresh token with `reDefine(refresh)` (guarded by `hasActiveSession()` so an already-live session is not needlessly re-created).
- `getCurrentUserAction()` then calls `getApi().Users.getUser(langCode)`, plus form-data reads for `user_addresses`, `subscription_management` (and consent), plus orders lookups across storages `home`, `store_pickup`, `locker`. Returns a fully populated `OeUser`.
- If there is no stored token — or the stored one is dead — it returns `null` and calls `clearTokens()`, so the next load doesn't replay a failing `/refresh`.
- Either way, sets `authReady = true`.

`authReady` is critical: components that gate on "logged out for sure" (e.g. account page's sign-in prompt) must wait for `authReady === true` — otherwise they briefly flash sign-in UI during hydration.

`AuthContext` also exposes `authError: string | null` (default `null`) and `setAuthError(msg)`. `authError` carries a human-readable OAuth failure message set by `GoogleAuthErrorSurface` in `Providers.tsx`; `LoginModal` renders it as a dismissible banner. `closeLoginModal()` clears `authError` so the next open is clean.

---

## 7. Post-sign-in mutations

`src/lib/oneentry/auth/actions.ts` exports the auth Server Action set. `AuthContext` exposes **11 mutation methods** through the hook: `login`, `startGoogleOAuth`, `signUp`, `logout`, `updateUser` (local optimistic merge, no Server Action), `updateProfile`, `updateAddresses`, `updateSubscriptions`, `updateConsent`, `syncCart`, `syncWishlist` — plus 4 modal state helpers (`openLoginModal`, `closeLoginModal`, `openRegisterModal`, `closeRegisterModal`) and 3 state fields (`isLoggedIn`, `user`, `authReady`). `startGoogleOAuth` does **not** return a result — it navigates the browser to Google via `getGoogleAuthUrlAction`. The remaining Server Actions (`exchangeGoogleCodeAction`, `getCartAction`, `getWishlistAction`, `pushRecentlyViewedAction`, `getRecentlyViewedAction`, `mergeRecentlyViewedAction`, `createOrderAction`) are called **directly** — `exchangeGoogleCodeAction` from the `app/auth/callback/google/page.tsx` route handler, the rest from components (PDP, ProductDetailPage bootstrap, PaymentPage). Grouped:

**Wrapped by `AuthContext` (exposed as hook methods):**

| Callback | Server Action | Effect |
| --- | --- | --- |
| `updateProfile(patch)` | `updateProfileAction(patch)` | Persists `firstName / lastName / email / phone / gender / dob / shoeSize / clothingSize`. On success, calls `getCurrentUserAction()` and re-merges. |
| `updateAddresses(addresses)` | `updateAddressesAction(addresses)` | Full-replace upsert of the user's address list (form-data `user_addresses`, moduleConfigId 24). Returns the canonical list with populated `recordId`s. |
| `updateSubscriptions(subs)` | `updateSubscriptionsAction(subs)` | Persists the `OeSubscriptions` object into `subscription_management` (moduleConfigId 32). |
| `updateConsent(consent)` | `updateConsentAction(consent)` | Persists `{dataProcessing, crossBorder}` into `user_data` (moduleConfigId 3). |
| `syncCart(items)` | `syncCartAction(items)` | Full replace of the user's cart on OE. Debounced from `CartContext` (see [CART_WISHLIST.md](./CART_WISHLIST.md)). |
| `syncWishlist(items)` | `syncWishlistAction(items)` | Same, for wishlist. |

Each returns `{ok, error?}`; the `sync*` variants are fire-and-forget.

**Called directly from components (not wrapped in the context):**

| Action | Consumer | Effect |
| --- | --- | --- |
| `completeGoogleSignIn({code, state, origin})` | `GoogleCallbackClient` (`app/auth/callback/google/page.tsx`) | Captures the browser fingerprint, delegates the exchange to the `exchangeGoogleCodeAction` Server Action, then installs the returned tokens locally and hydrates `/me`. Also links Google to an already-authenticated shopper when a session is live. |
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
3. Dispatches `cartActions.clearCart()`, `wishlistActions.clearAll()`, and `recentlyViewedActions.hydrate([])` to wipe in-memory state immediately.
4. Clears `oe_cart_merged`, `oe_wishlist_merged`, `oe_checkout_payload`, `oe_coupon_code`, and `oe_last_order_id` from `sessionStorage` so a subsequent user-B sign-in on the same browser starts with a clean state and does not inherit user-A's cart, wishlist, or checkout data.
5. Calls `clearGuestId()` (`src/app/utils/guest-id.ts`) to remove `oe_guest_id` from `localStorage`. This ensures that any post-logout anonymous activity mints a fresh guest fingerprint rather than being aggregated under the previous authenticated user's identifier.
6. Fires `signOutAction()` in the background — it reads `refresh-token` and `authProviderMarker` from storage, calls `getApi().AuthProvider.logout(providerMarker, refreshToken)`, then `clearTokens()` wipes the tokens and resets the SDK singleton back to app-token-only.
7. No redirect. The Header re-renders with the sign-in prompt.

Logout is optimistic on purpose: even if the Platform is unreachable, the user is logged out locally and the stored tokens are cleared regardless. The in-memory + `sessionStorage` wipe in steps 3–4 is the primary cross-user data-leakage guard — without it, user B signing in after user A would inherit A's cart / wishlist / recently-viewed via `localStorage 'oe_store'` and the sync effects would push them into B's OE account. Step 5 closes a separate gap: without the `oe_guest_id` reset, OneEntry would attribute the signed-out shopper's guest activity to the same visitor as the previously logged-in user.

---

## 9. Guest sessions

Guest users are identified by a UUID minted client-side and stored in `localStorage` under `oe_guest_id`.

- `getOrCreateGuestId()` in `src/app/utils/guest-id.ts` mints `guest-{crypto.randomUUID()}` on first call and stores under `localStorage['oe_guest_id']`. Read-only accessor `readGuestId()` also exported for consumers that must not create one.
- Attached as `x-guest-id` header on:
  - `trackActivityAction` (all activity events)
  - `createOrderAction` (guest checkout)
- Persistent across sessions; cleared automatically on logout via `clearGuestId()`, or manually by users who wipe site data.

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
- QuickView "Be the first to review" button → closes QuickView, calls `openLoginModal()` when `isLoggedIn === false`; if signed in but no delivered order, shows an inline amber notice instead of opening `WriteReviewModal`.
- PDP "N reviews" button (top-of-page, sub-title area) → always smooth-scrolls to the reviews section. All auth and purchase gating is handled inside `ReviewsClient`.
- PDP reviews section "Write a Review" CTA → `ReviewsClient.requestWriteReview` runs a **three-way gate**: (1) `isLoggedIn === false` → `openLoginModal()`; (2) signed in but `canReviewProduct(orders, productId) === false` → sets an inline amber `purchaseRequired` notice that auto-dismisses after 4 s; (3) signed in with a qualifying delivered order → opens `WriteReviewModal`. `canReviewProduct` (`src/app/utils/review-eligibility.ts`) returns `true` when the shopper has at least one order whose `statusIdentifier` matches `/deliver|complete|done|closed|finish|received|arrived/i` and whose `products[]` contains the given `productId`.
- Header profile icon → `/account` when logged in (no modal).

**Modal X buttons.** Both `LoginModal` and `RegisterModal` render a visible close `×` button that calls `closeLoginModal()` / `closeRegisterModal()`. The buttons had been commented out under a stale note claiming "guest checkout is disabled" — that is no longer true. Backdrop click already closed the modals; the X button now matches expected behaviour and is the primary keyboard-accessible close affordance.

---

## 11. Route protection

There is **no `middleware.ts`** for auth. Routes are not blocked at the network layer; instead:

- `/account/*` client component reads `useAuth().isLoggedIn`; if `authReady && !isLoggedIn`, renders a `<SignInPrompt>` block.
- `/checkout/*` routes show `<GuestCheckoutModal>` on load when `!isLoggedIn`, offering Sign In / Register / Continue-as-Guest. Both `/checkout/delivery` and `/checkout/payment` additionally redirect to `/cart` when `items.length === 0` on mount (see [CHECKOUT.md §2.0](./CHECKOUT.md)).
- `/favorites`, `/cart` are accessible to guests; their content is guest-only Redux state until sign-in.
- **Reserve in Store** (PDP) — the "Reserve in Store" CTA now calls `openLoginModal()` and returns early when `!isLoggedIn`, mirroring the reviews auth gate (`ReviewsClient.requestWriteReview`). The reservation form collects contact info that OE ties to the shopper; without a session the record has no owner. On successful sign-in the shopper returns to the PDP with the reserve modal intact.

Every shopper-scoped call opens with `hasStoredSession()` and returns `{ok:false, error:'Not authenticated'}` when there is no session, so an anonymous `updateProfileAction` never reaches OneEntry.

---

## 12. Error handling

| Failure | Behaviour |
| --- | --- |
| Wrong password (4xx from OE) | `signInAction` returns `{ok:false, error}`. Modal renders "Wrong credentials". |
| Google code exchange failure (bad `state`, Google denies, OE `oauth` throws) | `exchangeGoogleCodeAction` returns `{ok:false, error}`. `app/auth/callback/google/page.tsx` redirects to `/?googleAuthError=<code>` — the landing page can surface the code inline. |
| Network failure to OneEntry | Server Action throws; Next.js surfaces it as `{ok:false}`. No mock fallback — configure `ONEENTRY_URL` / `ONEENTRY_TOKEN`. |
| Missing env vars at server boot | `getApi()` throws `'OneEntry SDK is not configured'`. Every auth action fails immediately. |
| Refresh token dead / revoked | `getCurrentUserAction()` returns `null` and calls `clearTokens()`; `AuthContext` shows the sign-in prompt on the next mount. |

**Token refresh — handled by the SDK.** With a refresh token in state the SDK proactively mints an access token *before* the first user-auth request (a clean `POST /refresh 200 → 200`, no stray `401`) and rotates it through `saveFunction`. Parallel requests on one instance share a single in-flight refresh, so a burst of calls cannot burn the one-time token.

What the app still owns is the failure path: `saveFunction` fires **only on success**, so a dead token would otherwise sit in `localStorage` and replay `POST /refresh 400` on every page load. `getCurrentUserAction()` detects the empty result and calls `clearTokens()`, which also resets the singleton back to app-token-only.

Because the provider marker (`authProviderMarker`) is what builds the `/marker/{provider}/users/refresh` URL, it is stored at sign-in and read back by `logout`. Passing `'email'` for a Google-issued token makes OneEntry reject the call and silently ends the session.

---

## 13. Cross-references

- [ONEENTRY_INTEGRATION.md](./ONEENTRY_INTEGRATION.md) — SDK inventory including the auth API surface (§4.1)
- [CART_WISHLIST.md](./CART_WISHLIST.md) — how `syncCart` / `syncWishlist` piggyback on the session cookie
- [CHECKOUT.md](./CHECKOUT.md) — guest checkout with `x-guest-id`
- [REDUX.md](./REDUX.md) — `userSlice` shape (auth tokens intentionally empty)
- [DEMO_LOGIN.md](./DEMO_LOGIN.md) — demo accounts + `setup-demo-passwords.sh`
