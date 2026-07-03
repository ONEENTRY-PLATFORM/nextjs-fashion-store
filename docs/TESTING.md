# TESTING.md — Vitest, Playwright, Storybook

Three test surfaces live in this repo, each with a distinct scope. This document lays out what runs where, how to invoke it, and how the surfaces cross-reference each other.

---

## 1. Unit / integration tests — Vitest

**Runner:** `vitest ^4.1.2` + `@vitejs/plugin-react` + `@storybook/addon-vitest/vitest-plugin`.

**Config:** `vitest.config.ts`. Two logical projects:
- **Main** (jsdom environment) — glob `src/**/*.{test,spec}.{ts,tsx}`. Excludes `node_modules`, `e2e`, `.next`, `playwright-report`, `storybook-static`.
- **Storybook addon** — runs every `*.stories.tsx` as a smoke test via the Storybook Vitest addon.

**Path alias:** `@/*` → `./src/*` (from `tsconfig.json`).

**Commands:**
```bash
yarn test         # vitest run — one-off
yarn test:watch   # vitest — watch mode
```

**What's tested (~30 spec files):**

| Area | Location |
|---|---|
| Redux slices | `src/app/store/__tests__/*.test.ts` |
| RTK Query APIs | `src/app/store/api/__tests__/*.test.ts` |
| OneEntry loaders | `src/lib/oneentry/**/*.test.ts` — `system-text`, `catalog/pages`, `catalog/products`, `blocks/{hero-slides,homepage-collections,category-section}`, `labels/*`, `menus/menus`, `forms/submit` |

Coverage focus is on data-shape guarantees (adapter output, filter marker mapping, cache TTL) rather than UI rendering — the UI is covered by Storybook + Playwright.

---

## 2. E2E tests — Playwright

**Runner:** `@playwright/test` / `playwright` ^1.60.0.

**Setup:**
```bash
npm install
npx playwright install
```

**Config:** `playwright.config.ts`.

| Setting | Value |
|---|---|
| `testDir` | `./e2e` |
| `baseURL` | `process.env.BASE_URL` or `http://localhost:3001` |
| `timeout` | 60 s per test |
| `expect.timeout` | 15 s per assertion |
| `retries` | **`1` always** — `retries: process.env.CI ? 2 : 0` on line 7 is overridden by a second `retries: 1` on line 12 of `playwright.config.ts` (config bug to clean up) |
| `reporter` | `html` |
| `trace` | `on-first-retry` |
| `screenshot` | `only-on-failure` |
| `video` | `retain-on-failure` |

Projects: `chromium` (Desktop Chrome 1280×720) and `mobile` (iPhone 14, 390×844). Dev server auto-starts on `http://localhost:3001` (`webServer` in the config); if already running, Playwright reuses it (`reuseExistingServer: true`).

**Commands:**
```bash
yarn test:e2e           # headless, chromium + mobile
yarn test:e2e:headed    # visible browser
yarn test:e2e:ui        # interactive Playwright UI

# individual files / tests
npx playwright test e2e/cart.spec.ts
npx playwright test -g "add to cart without size shows error"
npx playwright test --project=chromium
npx playwright test --project=mobile

# reports
npx playwright show-report
npx playwright show-trace test-results/<test-name>/trace.zip
```

**Environment for real end-to-end runs:**
```bash
ONEENTRY_URL=http://localhost:3013
ONEENTRY_TOKEN=<app token>
NEXT_PUBLIC_DEFAULT_LOCALE=en_US
```

Without them, tests that depend on real OneEntry data (`wishlist-cms-integration.spec.ts`, checkout with real order creation) will fail. Use `e2e/helpers.ts` to short-circuit auth / cart / wishlist state for tests that only care about UI transitions.

### Test files (302 tests total)

```
e2e/
├── helpers.ts                          — login, clearState, seedCart, addToCartFromCatalog utilities
├── input-validation.spec.ts            — 40 tests: login/register/address/payment/promo/review/profile field validation
├── edge-cases.spec.ts                  — 50 tests: 404, XSS, localStorage, responsive, a11y, mobile, back/forward
├── catalog.spec.ts                     — 38 tests: cards, QuickView, filters, sort, pagination
├── checkout.spec.ts                    — 33 tests: 3 delivery methods, 7 payment methods, confirmation, full logged-in flow
├── product-detail.spec.ts              — 27 tests: gallery, color, size, cart, bundles, reviews, share, reserve
├── cart.spec.ts                        — 24 tests: CRUD, promo, bundles, mini-cart, persistence
├── account.spec.ts                     — 23 tests: all 9 tabs, edit, logout, waiting list, mobile
├── header.spec.ts                      — 20 tests: mega-menu, search, badges, mobile menu
├── favorites.spec.ts                   — 17 tests: add/remove, color persistence, OOS, bulk actions, carousels
├── auth.spec.ts                        — 15 tests: login (email/phone), register, logout, XSS, SQL injection
├── homepage.spec.ts                    — 11 tests: hero slider, categories, sections, footer
└── wishlist-cms-integration.spec.ts    — 4 tests: OneEntry wishlist sync via syncWishlist Server Action (merge guest ↔ server, dedupe, sign-out clears cookies)
```

### Coverage

- **User journeys** — all 8 catalogs, ProductCard interactions, PDP (gallery / colour / size / cart / bundles / reviews / share / reserve), QuickView, Cart CRUD + promo + bundles + persistence, Favourites (colour persistence, OOS, bulk actions), Guest / authenticated checkout with 3 delivery methods × 7 payment methods, Account tabs (MyData / Orders / Addresses / Wishlist / Bonuses / Subscriptions / WaitingList / Feedback / Refer / Service Maintenance), Auth (email / phone / register / logout), full logged-in journey (login → PDP → cart → delivery → payment → confirmation), OneEntry wishlist sync.
- **Input validation** (40 tests) — email / phone / password / postcode / card / promo / review / profile fields.
- **Edge / adversarial** — XSS in forms and URLs, SQL injection in auth, 10 000-char inputs, corrupted localStorage, rapid clicks, browser back/forward, 404s.
- **Responsive & a11y** — 1280 px + 390 px viewports, mobile menu / filters / sort, skip-to-content, alt attributes, ARIA labels, focus trap in modals, keyboard navigation.

### CI

```bash
npx playwright install --with-deps
npm run test:e2e
```

Upload `playwright-report/` as the artifact.

---

## 3. Storybook

**Framework:** `@storybook/nextjs-vite` ^10.3.4 with Vite as the builder.

**Config files:**
- `.storybook/main.ts` — glob `../src/**/*.stories.@(js|jsx|mjs|ts|tsx)`, static dir `../public`.
- `.storybook/preview.ts` — global decorator wraps every story in `<Provider store={makeStore()}>` + `<AuthProvider>` + `<CatalogAccentContext.Provider>`. Wipes `localStorage['oe_store']` before mounting each story so state does not bleed.
- `.storybook/remarkGfmPreset.js` — adds `remark-gfm` for Markdown in `*.mdx` files.

**Addons:**
- `@storybook/addon-a11y` — axe-based accessibility checks per story.
- `@storybook/addon-docs` — Autodocs + custom MDX pages under `src/stories/`.
- `@storybook/addon-vitest` — runs every story as a smoke test in the Vitest pipeline (see §1).
- `@storybook/addon-onboarding` — dev-only onboarding tour.
- `@chromatic-com/storybook` — Chromatic visual regression hooks.

**Commands:**
```bash
yarn storybook          # dev server on port 6006
yarn build-storybook    # static build → storybook-static/
```

**Stories (34 files under `src/stories/`)**:

Layout: `Header`, `Footer`, `CheckoutStepper`, `HeroSlider`, `DiscountBanner`.
Catalog: `CatalogTemplate`, `CatalogTrendBlocks`, `CatalogCrossSell`, `CatalogListProductCard`, `CatalogMobileSort`, `CategorySection`, `MobileFilterBody`, `MobileFilterPanel`, `NoFilterResults`.
Cards & products: `ProductCard`, `ProductCardSkeleton`, `ColorSwatch`, `SizeDropdown`, `QtyControl`, `RadioCard`.
Collection wrappers: `WomenCollection`, `MenCollection`, `AccessoriesCatalog`, `ShoesCatalog`.
Interactive: `LoginModal`, `RegisterModal`, `QuickViewModal`, `MiniCart`, `PromoBlock`, `NewArrivals`.
Widgets: `FormField`, `JsonLd`, `ErrorBoundary`, `ImageWithFallback`.

**MDX docs** — long-form architectural reference pages rendered under Autodocs:

- **Redux / Overview** (`redux/01-Overview.mdx`) — data flow, RootState, env vars.
- **Redux / Slices** (`redux/02-Slices.mdx`) — every slice's actions with payloads.
- **Redux / RTK Query** (`redux/03-RTKQuery.mdx`) — the 2 remaining API slices (`cartApi`, `wishlistApi`) as scaffolding; the live sync path via Server Actions.
- **Redux / Persistence** (`redux/04-Persistence.mdx`) — `oe_store` v5 schema + all 4 migration steps (v1→v2, v2→v3, v3→v4, v4→v5).
- **Redux / Contexts** (`redux/05-Contexts.mdx`) — the 5 context modules; full `AuthContext` interface (11 mutation methods + 4 modal helpers + 3 state fields wrapping 11 of the 18 auth Server Actions).
- **Redux / Server Actions** (`redux/06-ServerActions.mdx`) — inventory of the 18 auth actions + activity + catalog + blocks + forms + payments + labels + menus loaders.
- **Diagrams / Wishlist / Account / Cart / Site** (`diagrams/01-*` … `04-*.mdx`) — Mermaid flowcharts for each domain.

Support: `mockData.ts` (shared `MOCK_PRODUCT`, `MOCK_CART_ITEM`, etc.), `MermaidDiagram.tsx` (Mermaid renderer used by diagrams), `diagrams/wishlist.md` (redirect stub to the MDX version).

Storybook is the primary sandbox for component-level design and a11y auditing; each story renders the component in isolation with mocked props. The MDX pages are the canonical narrative reference — they must stay in sync with the runtime code (last full sync: state layer migrated to Server Actions).

---

## 4. Recommended workflow

- **Editing a slice / RTK Query API / OneEntry loader** — write / update the Vitest spec first, then implement.
- **Editing a component's visual state** — open the Storybook story; if none exists, add one.
- **Editing a flow that crosses pages (checkout, sign-in, account)** — write an e2e spec.
- **Editing an accessibility affordance** — verify with the Storybook a11y addon AND run the mobile Playwright project.

---

## 5. Cross-references

- [ARCHITECTURE.md](./ARCHITECTURE.md) §7 — build / dev commands
- [ONEENTRY_INTEGRATION.md](./ONEENTRY_INTEGRATION.md) — Server Actions exercised by the e2e integration test
- [DEMO_LOGIN.md](./DEMO_LOGIN.md) — demo accounts for authenticated e2e runs
- [`e2e/helpers.ts`](../e2e/helpers.ts) — shared test utilities
