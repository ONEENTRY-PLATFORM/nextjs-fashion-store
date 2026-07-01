# Next.js Fashion Store

An open-source e-commerce storefront built on **Next.js 16 / React 19** and powered by the [OneEntry Platform](https://oneentry.cloud) headless CMS. Includes catalog, product detail, cart, multi-step checkout (delivery → payment → confirmation), wishlist, waiting list, user account, guest checkout, Stripe hosted-checkout redirect, Google OAuth sign-in, and PWA support.

## Stack

| Layer              | Tech                                                                 |
| ------------------ | -------------------------------------------------------------------- |
| Framework          | Next.js 16 (App Router), React 19, TypeScript                        |
| CMS / API          | OneEntry Platform (`oneentry` SDK)                                   |
| State              | Redux Toolkit + RTK Query, React Context facades                     |
| Styling            | Tailwind CSS 4, `tw-animate-css`, `lucide-react`, `@heroicons/react` |
| Forms / validation | `zod`                                                                |
| Testing            | Vitest (unit), Playwright (e2e), Storybook                           |
| PWA                | Hand-rolled service worker (`public/sw.js`) + dynamic manifest       |

## Requirements

- Node.js 20+
- Yarn (recommended) or npm
- A OneEntry Platform tenant with an app token — see [OneEntry docs](https://oneentry.cloud/docs)

## Quick start

```bash
# 1. Install
yarn install

# 2. Configure env
cp .env.example .env.local
# then fill in ONEENTRY_URL, ONEENTRY_TOKEN, GOOGLE_CLIENT_ID, ...

# 3. Dev server (http://localhost:3000)
yarn dev

# 4. Production build + start
yarn build
yarn start
```

## Available scripts

| Command                                                       | Purpose                    |
| ------------------------------------------------------------- | -------------------------- |
| `yarn dev`                                                    | Next.js dev server         |
| `yarn build`                                                  | Production build           |
| `yarn start`                                                  | Serve the production build |
| `yarn lint` / `yarn lint:fix`                                 | ESLint                     |
| `yarn test` / `yarn test:watch`                               | Vitest (unit)              |
| `yarn test:e2e` / `yarn test:e2e:ui` / `yarn test:e2e:headed` | Playwright (e2e)           |
| `yarn storybook` / `yarn build-storybook`                     | Storybook                  |

## Environment variables

| Variable              | Required | Description                                                                 |
| --------------------- | -------- | --------------------------------------------------------------------------- |
| `ONEENTRY_URL`        | ✅       | Base URL of your OneEntry tenant, e.g. `https://your-tenant.oneentry.cloud` |
| `ONEENTRY_TOKEN`      | ✅       | App token from the OneEntry admin panel                                     |
| `NEXT_PUBLIC_API_URL` |          | Public API URL exposed to the browser                                       |
| `BASE_URL`            |          | Public site URL, used for sitemap / SEO / metadata                          |
| `GOOGLE_CLIENT_ID`    |          | Google OAuth client ID for one-tap / Sign in with Google                    |

See [`docs/ONEENTRY_INTEGRATION.md`](./docs/ONEENTRY_INTEGRATION.md) for the full CMS-to-storefront mapping (labels, forms, categories, blocks, orders).

## Directory map

```
app/                       Next.js App Router (layout, page, loading, error)
  ├ checkout/              Delivery → Payment → Confirmation funnel
  ├ product/[id]/          Product detail
  ├ [...slug]/             Catch-all for catalog / info / category pages
  ├ manifest.ts            PWA manifest
  ├ sitemap.ts             Dynamic sitemap
  └ robots.ts              robots.txt
src/app/
  ├ components/            UI components (organised by domain)
  ├ context/               Hook-only facades around Redux/RTK
  ├ store/                 Redux store + slices + RTK Query APIs
  ├ actions/               Server Actions
  ├ data/                  Mock product / page / block / menu / filter data
  ├ hooks/                 Reusable React hooks
  ├ utils/                 Helpers (locale, formatting, SEO)
  ├ constants/             Static enums and config
  └ pages/                 Page components consumed by app/* route shells
src/lib/oneentry/          OneEntry SDK integrations (auth, catalog, orders, payments, activity)
public/                    Static assets + service worker
e2e/                       Playwright specs
docs/                      Architecture and integration docs
guidelines/                Contributor guidelines
```

## Documentation

- [`docs/ARCHITECTURE.md`](./docs/ARCHITECTURE.md) — overall architecture
- [`docs/ONEENTRY_INTEGRATION.md`](./docs/ONEENTRY_INTEGRATION.md) — CMS ↔ storefront mapping
- [`docs/DEMO_LOGIN.md`](./docs/DEMO_LOGIN.md) — demo accounts & password reset script

## Contributing

Pull requests are welcome. For substantial changes, please open an issue first to discuss what you'd like to change.

1. Fork the repo and create a feature branch.
2. Run `yarn lint` and `yarn test` before opening a PR.
3. Keep commits focused and well-described.

## License

[MIT](./LICENSE) © 2026 OneEntry Platform
