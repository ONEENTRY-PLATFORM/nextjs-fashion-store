# Demo logins for OneEntry Platform integration

When the storefront is pointed at the local OneEntry Platform (`ONEENTRY_URL=http://localhost:3013`, `ONEENTRY_TOKEN=<app token>`), the sign-in / sign-up / cart / wishlist flows all go against the real backend. The seed data ships with demo users whose `password_hash` is `NULL` — sign-in fails until you run the bootstrap script.

## One-time setup

```bash
./scripts/setup-demo-passwords.sh
```

This is idempotent and does three things:

1. Sets `password_hash = bcrypt('demo123')` for every user whose `identifier` starts with `seed-demo-user-`.
2. Bootstraps the **email auth provider** (`users_auth_providers.identifier = 'email'`) plus its **attribute set** (with `isLogin: true` on `login`, `isPassword: true` on `password`) and the **form** that ties them together.
3. Ensures the storefront can reach `POST /api/content/users-auth-providers/marker/email/users/auth` — without the rows above, the endpoint returns 400 ("auth provider not defined" / "form is not defined").

The Platform must be running with `API_TYPE=/api/content` (the standard admin container `cms-backend-clean` is admin-mode by default — recreate it with `-e API_TYPE=/api/content` if the storefront gets 404s on wishlist / cart endpoints).

## Demo accounts

All accounts share the same password `demo123` after the setup script runs.

| Identifier (paste into "email / phone / identifier") | Scenario |
|------------------------------|-------------------------------------------------------------|
| `seed-demo-user-active-1`    | 3 wishlist items, 1 cart item, Bronze loyalty              |
| `seed-demo-user-active-2`    | Smaller wishlist and cart                                  |
| `seed-demo-user-vip`         | VIP loyalty, wishlist + cart populated                     |
| `seed-demo-user-cart`        | Cart-heavy user                                            |
| `seed-demo-user-viewer`      | Mostly browsing, wishlist populated                        |
| `seed-demo-user-abandoned`   | Abandoned cart scenario                                    |

The login form accepts `identifier`, `email`, or `phone` as the login value — the Platform's email auth provider resolves users via the `isLogin` flag on all three fields.

## Google OAuth

To exercise the "Continue with Google" flow, set:

```bash
NEXT_PUBLIC_GOOGLE_CLIENT_ID=<your Google OAuth client id>
```

The button appears in `LoginModal` when this env is set. A Google **`access_token`** (obtained via GIS token client from `requestGoogleAccessToken()`) is exchanged for a OneEntry session via `signInWithGoogleAction` → `getApi().AuthProvider.oauth('google', {accessToken})` (the Server Action falls back to `idToken` / `token` / `credential` field names if the tenant expects a different shape).

## What runs against the real API

**Everything.** The storefront is fully wired to OneEntry via the SDK:

- Auth (sign in, sign up, Google OAuth, logout, `/me` bootstrap)
- Product catalog, filters, PDP, reviews, vector + quick search
- Homepage blocks (hero, discount banner, collections, product carousels, category section)
- Header + footer menus
- All CMS-managed UI labels (12 label sets)
- User profile, addresses, subscriptions, consent
- Cart + wishlist per-user sync (debounced 400 ms)
- Payment accounts (Stripe + custom)
- Order creation (`orders-storage`)
- Reviews (form-data)
- Service maintenance requests
- Waiting list
- Activity tracking (`user-activity/track`) with `x-guest-id` for anonymous users

See [ONEENTRY_INTEGRATION.md](./ONEENTRY_INTEGRATION.md) for the full inventory.

## Fallback when the Platform is offline

If `ONEENTRY_URL` / `ONEENTRY_TOKEN` are unset, `getApi()` throws at first use. In this mode:

- The storefront is unusable — most pages fail to load.
- Storybook stories continue to work because they mock Server Actions.
- E2E tests can point at a mocked wrapper.

There is no automatic silent fallback to local mocks. Configure the env vars.

## Cross-references

- [AUTH.md](./AUTH.md) — full sign-in flow
- [ONEENTRY_INTEGRATION.md](./ONEENTRY_INTEGRATION.md) — env vars, marker registry
- [CART_WISHLIST.md](./CART_WISHLIST.md) — how demo user's server cart / wishlist merges with local state
