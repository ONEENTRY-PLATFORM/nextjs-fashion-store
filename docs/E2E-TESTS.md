# E2E Tests (Playwright)

## Setup

```bash
npm install
npx playwright install
```

## Running

```bash
npm run test:e2e          # headless, Chromium + Mobile
npm run test:e2e:headed   # with visible browser
npm run test:e2e:ui       # interactive Playwright UI
```

The dev server is started automatically on `http://localhost:3001` (see `webServer` in `playwright.config.ts`). If it is already running, Playwright reuses it (`reuseExistingServer: true`).

### Running individual files / tests

```bash
npx playwright test e2e/cart.spec.ts                       # one file
npx playwright test -g "add to cart without size shows error"  # by test name
npx playwright test --project=chromium                     # desktop only
npx playwright test --project=mobile                       # mobile only
```

### Reports

```bash
npx playwright show-report
npx playwright show-trace test-results/<test-name>/trace.zip
```

## Configuration (`playwright.config.ts`)

| Setting | Value |
|---------|-------|
| `testDir` | `./e2e` |
| `baseURL` | `process.env.BASE_URL` or `http://localhost:3001` |
| `timeout` | 60 s per test |
| `expect.timeout` | 15 s per assertion |
| `retries` | 1 locally, 2 on CI |
| `reporter` | `html` |
| `trace` | `on-first-retry` |
| `screenshot` | `only-on-failure` |
| `video` | `retain-on-failure` |

Projects: `chromium` (Desktop Chrome 1280×720) and `mobile` (iPhone 14, 390×844).

## Test files

```
e2e/
├── helpers.ts                          — utilities (login, clearState, seedCart, addToCartFromCatalog)
├── input-validation.spec.ts            — 40 tests: field validation (login/register/address/payment/promo/review/profile)
├── edge-cases.spec.ts                  — 50 tests: 404, XSS, localStorage, responsive, a11y, mobile, back/forward
├── catalog.spec.ts                     — 38 tests: cards, QuickView, filters, sort, pagination
├── checkout.spec.ts                    — 33 tests: delivery (3 methods), payment (7 methods), confirmation, full logged-in flow
├── product-detail.spec.ts              — 27 tests: gallery, color, size, cart, bundles, reviews, share, reserve
├── cart.spec.ts                        — 24 tests: CRUD, promo, bundles, mini-cart, persistence
├── account.spec.ts                     — 23 tests: all tabs, edit, logout, waiting list, mobile
├── header.spec.ts                      — 20 tests: mega menu, search, badges, mobile menu
├── favorites.spec.ts                   — 17 tests: add/remove, color + persist, OOS, bulk actions, carousels
├── auth.spec.ts                        — 15 tests: login, register, logout, XSS, SQL injection
├── homepage.spec.ts                    — 11 tests: hero slider, categories, sections, footer
└── wishlist-cms-integration.spec.ts    — 4 tests: Platform wishlist sync (merge guest ↔ server, dedupe, sign-out)
```

Total: **302 tests**.

## Coverage

### User journeys
- Catalog browsing (all 8 catalogs): filters, sort, pagination.
- Product card: hover, color, wishlist, Quick View, Add to Cart.
- PDP: gallery, color/size, cart, bundles, reviews, share, reserve.
- Quick View: all buttons, accordion, size guide, validation, navigation.
- Cart: add, remove, quantity, promo, bundles, persistence.
- Favorites: add/remove, color persistence, OOS, bulk actions.
- Checkout: guest/auth, delivery (3 methods), payment (7 methods), confirmation.
- Account: all tabs (MyData, Orders, Addresses, Wishlist, Bonuses, Subscriptions, WaitingList, Feedback, Refer, Service Maintenance).
- Auth: login (email/phone), register, logout.
- Full logged-in journey: login → PDP → cart → delivery (saved address) → payment → confirmation.
- Wishlist sync against the Platform (merge guest items with server-side, dedupe, sign-out clears server state).

### Input validation (40 tests)
- **Login**: invalid email, whitespace, empty password, letters in phone, emoji, unicode/RTL, null-byte.
- **Register**: empty name, name >60 chars, invalid email, password <8, special characters in phone, submit without terms.
- **Address**: empty fields, invalid postcode, letters in phone, XSS/HTML in address, string >200 chars, empty city, name >100.
- **Payment**: letters in card number, invalid Luhn, invalid expiry format, expired card, CVV with letters/too short, empty name.
- **Promo**: empty, >30 chars, case-insensitive, special characters, emoji.
- **Review**: empty form, XSS in body, empty name, invalid email.
- **Profile**: invalid email, invalid phone.

### Edge cases / adversarial
- XSS injections in forms and URLs.
- SQL injection in auth fields.
- Very long input (10 000 characters).
- Corrupted / empty / overflowing `localStorage`.
- Rapid clicks (cart, wishlist).
- Browser back/forward navigation.
- 404 for non-existent pages and products.

### Responsive & accessibility
- Desktop 1280px and mobile 390px viewports.
- Mobile menu, filters, sort behavior.
- Skip-to-content link, alt attributes, ARIA labels, focus trap in modals, keyboard navigation.

## CI

Run `npx playwright install --with-deps` then `npm run test:e2e`. Upload the `playwright-report/` folder as the artifact.
