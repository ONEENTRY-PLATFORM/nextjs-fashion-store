# Demo logins for playground ↔ Platform integration

When `NEXT_PUBLIC_API_URL` is pointed at the local Platform (`http://localhost:3013/api/content`), the playground tries to talk to the real backend for `wishlist` and `cart`. The seed data for those features lives on **demo users** whose `password_hash` is `NULL` by default — login would not work out of the box.

## One-time setup

Run once after the Platform DB is seeded:

```bash
./scripts/setup-demo-passwords.sh
```

This bcrypts the password `demo123` into `password_hash` for every user with `identifier LIKE 'seed-demo-user-%'`. Additionally, the script bootstraps the **email auth provider**, a matching **attribute set** (with `isLogin` / `isPassword` markers on `login` / `password`) and the **form** that ties them together — without those rows the Platform endpoint `/api/content/users-auth-providers/marker/email/users/auth` returns 400 ("auth provider not defined" / "form is not defined"). The script is fully idempotent — running it multiple times is safe.

Backend must be running with `API_TYPE=/api/content` (the demo container `cms-backend-clean` started in admin mode by default — recreate it with `-e API_TYPE=/api/content` if your wishlist/cart endpoints 404).

## Demo accounts

All accounts share the same password `demo123` after running the script above.

| Identifier (use as "login")  | Notes                                                       |
|------------------------------|-------------------------------------------------------------|
| `seed-demo-user-active-1`    | 3 wishlist items (laptop, smartwatch, headphones), 1 cart   |
| `seed-demo-user-active-2`    | Smaller wishlist and cart                                   |
| `seed-demo-user-vip`         | VIP loyalty, wishlist + cart populated                      |
| `seed-demo-user-cart`        | Cart-heavy user                                             |
| `seed-demo-user-viewer`      | Mostly browsing, wishlist populated                         |
| `seed-demo-user-abandoned`   | Abandoned cart scenario                                     |

The login form in the playground accepts the `identifier` value in the "email/phone" field (Platform resolves users by `identifier`, not by an email address).

## What runs against the real API

Only `wishlist` and `cart` slices in the playground talk to the Platform through RTK Query. Everything else (catalog/homepage/products) still uses local mocks for now.

If `NEXT_PUBLIC_API_URL` is unset OR the API is unreachable, the app silently falls back to localStorage-backed mocks — `wishlistApi` / `cartApi` calls are skipped, and existing reducer logic keeps the UI working.
