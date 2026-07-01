# SEO & Performance Optimization

A summary of all SEO, performance and discoverability improvements applied to the ONEENTRY Fashion e-commerce project.

---

## Image Optimization

- Migrated all `<img>` tags across **20+ components and pages** to Next.js `<Image>` component
- Automatic WebP/AVIF conversion, lazy loading and responsive `srcset` generation
- `priority` prop on all above-the-fold images (hero banners, discount sections) for faster LCP
- Correct `sizes` attribute on every image for optimal bandwidth usage
- All images have descriptive `alt` text — no empty or missing alts

---

## Metadata & Open Graph

- Full Open Graph tags on every page (`og:title`, `og:description`, `og:image`, `og:url`, `og:type`)
- Twitter/X cards (`summary_large_image`) on all pages with product price and availability labels on product pages
- Facebook product namespace tags (`product:price:amount`, `product:price:currency`) on product pages
- All metadata values sourced from a single `seoData.ts` dataset — no hardcoded strings
- Absolute canonical URLs on every page
- `hreflang` tags for `en-GB` and `x-default`
- Shared `OG_IMAGE`, `TWITTER_HANDLE`, `CURRENCY` constants used site-wide

---

## Structured Data (JSON-LD)

| Schema type | Page |
|---|---|
| `ClothingStore` + `OfferCatalog` | Homepage |
| `WebSite` + `SearchAction` | Homepage |
| `Product` with `AggregateRating`, `Review[]`, `Offer`, `shippingDetails`, `hasMerchantReturnPolicy`, `additionalProperty` | Every product page |
| `BreadcrumbList` | Product, Info, Info index pages |
| `FAQPage` | FAQ info page |
| `LocalBusiness` (per store) | Store Locator page |
| `ItemList` | All category/catalog pages |

Product schema includes: full spec list as `PropertyValue`, all gallery images, material composition, real-time stock availability, shipping cost and delivery window, 28-day free return policy.

---

## Technical SEO

- `robots.ts` with proper `Disallow` for private routes (`/cart`, `/account`, `/checkout/`, etc.)
- Dynamic XML sitemap covering all static pages, all product pages and all info pages
- `preconnect` + `dns-prefetch` for Google Fonts and Unsplash CDN
- Extended `googleBot` directives: `max-snippet: -1`, `max-image-preview: large`, `max-video-preview: -1`
- Page titles under 60 characters across all catalog pages
- Navigation converted from `<a href>` to Next.js `<Link>` — SPA transitions, no full-page reloads

---

## Accessibility (impacts SEO)

- `aria-label` on all icon-only buttons (search, wishlist, bag, account, menu open/close)
- `<nav aria-label="…">` wrappers on all footer link groups and bottom bar
- Descriptive `alt` text on product gallery thumbnails and fullscreen viewer
- Mobile menu footer links replaced from `href="#"` placeholders to real routes

---

## AI & LLM Optimization

- **`/llms.txt`** endpoint — structured plain-text document for AI crawlers (ChatGPT, Claude, Perplexity, Gemini, Amazon Rufus, Apple Intelligence and others). Contains: brand overview, all shop categories with URLs, full store list with addresses, delivery and return conditions, policy links, social profiles, and explicit crawl permissions.
- **`robots.ts`** — dedicated rules for 12 AI user-agents (`GPTBot`, `ClaudeBot`, `PerplexityBot`, `Amazonbot`, `meta-externalagent`, `Applebot-Extended`, etc.) explicitly allowing product and category discovery.
- **Organization schema** extended with `knowsAbout`, `hasOfferCatalog`, `areaServed`, `paymentAccepted`, `potentialAction: BuyAction` — enables AI shopping assistants to understand the catalogue and recommend products.
- **Product schema** includes `shippingDetails` and `hasMerchantReturnPolicy` — allows Google Shopping, AI product cards and voice assistants to surface price, delivery cost and return policy without visiting the page.

---

## No Hardcoded Values

All SEO-relevant strings are exported from dataset files:

| Constant | Used in |
|---|---|
| `SITE_NAME`, `SITE_URL`, `SITE_DESCRIPTION` | All pages |
| `OG_IMAGE`, `TWITTER_HANDLE` | Layout, all pages |
| `CURRENCY`, `FREE_SHIPPING_THRESHOLD` | Product schema, Organization schema |
| `RETURN_WINDOW_DAYS`, `DELIVERY_MIN_DAYS`, `DELIVERY_MAX_DAYS` | Product schema, llms.txt |
| `OFFER_CATALOGUE` | Organization schema, llms.txt |
| `LOGO_ALT`, `HEADER_ARIA_LABELS`, `MOBILE_FOOTER_LINKS` | Header component |

---

## Runtime SEO: `app/sitemap.ts`

The sitemap is a Next.js `MetadataRoute.Sitemap` function exported from `app/sitemap.ts:6`. It runs on every request — there is **no `revalidate` export and no `force-static`** — so each request re-executes the function and serializes a fresh `lastModified = new Date().toISOString()` for every URL (`app/sitemap.ts:7`). In practice Next.js defaults still apply (ISR can cache the response between deploys), but the function itself does no explicit caching.

Three URL groups are concatenated and returned (`app/sitemap.ts:35`).

### Group 1 — Fixed static pages (`app/sitemap.ts:10-15`)

Hand-rolled list of top-level URLs that don't live in `PAGE_REGISTRY`.

| URL pattern | Source | `changeFrequency` | `priority` | `lastModified` |
|---|---|---|---|---|
| `/` | hardcoded | `daily` | `1.0` | request time |
| `/sale` | hardcoded | `daily` | `0.8` | request time |
| `/new` | hardcoded | `daily` | `0.8` | request time |
| `/stores` | hardcoded | `weekly` | `0.6` | request time |

### Group 2 — Registry pages (`app/sitemap.ts:18-25`)

Iterates `PAGE_REGISTRY` from `src/app/data/pageRegistry.ts` and filters out the info-hub stub (`entry.type === 'info' && entry.slug === '__hub'`). Each remaining entry becomes a `/${path}` URL where `path` is the registry key (e.g. `women/clothing`, `men/shoes`, `info/faq`).

| URL pattern | `entry.type` | `changeFrequency` | `priority` |
|---|---|---|---|
| `/{path}` (e.g. `/women/clothing`, `/men/bags`) | `'catalog'` | `daily` | `0.9` |
| `/info/{slug}` (e.g. `/info/faq`, `/info/delivery`) | `'info'` | `monthly` | `0.4` |

### Group 3 — Product pages (`app/sitemap.ts:28-33`)

One entry per key in `PRODUCT_CATALOG` (`src/app/data/productCatalog.ts`).

| URL pattern | Source | `changeFrequency` | `priority` |
|---|---|---|---|
| `/product/{id}` | `Object.keys(PRODUCT_CATALOG)` | `weekly` | `0.7` |

⚠ All `lastModified` values are stamped with the request timestamp — the sitemap doesn't reflect real per-entity edit times because there's no CMS layer yet.

---

## Runtime SEO: `app/robots.ts`

Generated by `app/robots.ts:6` as `MetadataRoute.Robots`. Two `rules[]` blocks are emitted plus a `sitemap` and `host` declaration.

### Sitemap + host
- `sitemap: ${SITE_URL}/sitemap.xml` (`app/robots.ts:35`)
- `host: SITE_URL` (`app/robots.ts:36`)

### Block 1 — `User-agent: *` (`app/robots.ts:10-14`)

| Field | Value |
|---|---|
| `userAgent` | `*` |
| `allow` | `/` |
| `disallow` | `/cart`, `/favorites`, `/account`, `/checkout/`, `/download/`, `/api/` (the `PRIVATE_PATHS` constant at `app/robots.ts:4`) |

### Block 2 — AI-crawler allowlist (`app/robots.ts:16-33`)

12 user-agents are explicitly enumerated to make crawl intent unambiguous (Next.js merges them into a single `User-agent:` group per output line).

| User-agent | Operator |
|---|---|
| `GPTBot` | OpenAI |
| `ChatGPT-User` | OpenAI (browsing) |
| `OAI-SearchBot` | OpenAI (search) |
| `ClaudeBot` | Anthropic |
| `anthropic-ai` | Anthropic (legacy) |
| `PerplexityBot` | Perplexity AI |
| `Amazonbot` | Amazon Alexa / Rufus |
| `meta-externalagent` | Meta AI |
| `Applebot-Extended` | Apple AI |
| `cohere-ai` | Cohere |
| `Bytespider` | TikTok / ByteDance |
| `YouBot` | You.com |

For all of the above:
- `allow`: `/`, `/product/`, `/women/`, `/men/`, `/sale`, `/new`, `/info/`, `/stores`, `/llms.txt`
- `disallow`: same `PRIVATE_PATHS` array

⚠ The `allow` whitelist is positive-listing — public catalog + content surfaces only. The same `PRIVATE_PATHS` always trump it.

---

## Runtime SEO: `app/manifest.ts`

The PWA manifest itself is documented in [`./PWA.md`](./PWA.md) §2 ("Manifest") and §3 ("Icons") — including the verbatim field map and the missing-PNG caveat. Listed here only for SEO completeness: it is served at `/manifest.webmanifest`, advertises `ONEENTRY Fashion` / `standalone` / `categories: ['shopping', 'fashion', 'lifestyle']` and is the surface crawlers pick up for App Manifest signals.

---

## Runtime SEO: `app/opengraph-image.tsx`

A dynamic Open Graph image rendered on Vercel/Next.js Edge (`app/opengraph-image.tsx:4` → `export const runtime = 'edge'`).

| Field | Value |
|---|---|
| Runtime | `edge` (`ImageResponse` from `next/og`) |
| `size` | `{ width: OG_IMAGE.width, height: OG_IMAGE.height }` → `1200 × 630` (from `seoData.ts:46`) |
| `contentType` | `image/png` |
| `alt` | `OG_IMAGE.alt` — `'ONEENTRY Fashion – Premium clothing, shoes and accessories'` |
| Content | Brand mark + sub-label + tagline on a dark gradient with gold accent bars; copy lives in `OG_IMAGE_COPY` (`seoData.ts:54-58`) |

The image is dynamic per request (no caching directives), but the rendered content is fully static — every render produces the same pixels. Used by Next.js as the **default** OG image for every page that doesn't define its own (`SEO.*.openGraph.images = [OG_IMAGE]`).

⚠ Note the dual reference: `seoData.ts:47` lists `OG_IMAGE.url = '/og-image.jpg'` (a hypothetical static fallback that does **not** exist in `public/`), while Next.js actually serves the live edge-rendered PNG at `/opengraph-image`. Product pages override with the product's own image (`app/product/[id]/page.tsx:55-62`).

---

## Runtime SEO: `app/llms.txt/route.ts`

`/llms.txt` is a static-rendered (`export const dynamic = 'force-static'` at line 11) plain-text endpoint following the emerging [llms.txt](https://llmstxt.org/) convention. Consumed by Anthropic ClaudeBot, OpenAI GPTBot, Perplexity, Google Gemini and similar LLM crawlers as a single-shot brand overview.

Sections rendered (literal output, in order):
1. `# ONEENTRY Fashion` heading + blockquote tagline.
2. Free-form brand summary mentioning `CURRENCY`, `FREE_SHIPPING_THRESHOLD`, `RETURN_WINDOW_DAYS`.
3. `## Shop Categories` — bulleted `OFFER_CATALOGUE` from `seoData.ts:22-33`.
4. `## Product Catalogue` — total product count + URL templates + sitemap link.
5. `## Delivery & Returns` — uses `FREE_SHIPPING_THRESHOLD` + `RETURN_WINDOW_DAYS` (and **hardcoded `2–5` working days** at line 37, not the `DELIVERY_MIN/MAX_DAYS` constants).
6. `## Physical Stores` — count + cities + per-store address with `mapUrl`.
7. `## Information & Policies` — bulleted index of `INFO_PAGE_META`.
8. `## Social Media` — bulleted `ORG_SOCIALS`.
9. `## AI Crawl Policy` — explicit grant + pointer to `robots.txt`.

Cache headers: `Cache-Control: public, max-age=86400, stale-while-revalidate=3600`.

---

## Runtime SEO: JSON-LD per page

JSON-LD blocks are injected via the `<JsonLd>` helper (`src/app/components/JsonLd.tsx`). Schemas are computed at module evaluation time (homepage / sale / new) or per-request in `generateMetadata` / page-component scope (product / catalog).

| Page | `<JsonLd>` site | schema.org types emitted | Shape highlights |
|---|---|---|---|
| `/` (`app/page.tsx:75-82`) | `app/page.tsx:78-79` | `ClothingStore` (via `ORG_SCHEMA_COPY.schemaType`) + `WebSite` | Org: `contactPoint`, `address`, `hasOfferCatalog → OfferCatalog[]`, `potentialAction: BuyAction`, `knowsAbout[]`, `paymentAccepted`, `currenciesAccepted`. WebSite: `potentialAction: SearchAction` with `urlTemplate` pointing at `/women/clothing?q=…`. |
| `/sale` (`app/sale/page.tsx`) | line 20 | `BreadcrumbList` | Home → Sale |
| `/new` (`app/new/page.tsx`) | line 20 | `BreadcrumbList` | Home → New Arrivals |
| `/product/[id]` (`app/product/[id]/page.tsx`) | lines 200, 201 | `Product` + `BreadcrumbList` | Product: `name`, `image[]` (cover + gallery), `brand`, `sku`, `material`, `additionalProperty[] (PropertyValue)`, `aggregateRating`, `review[]`, `offers: Offer { price, priceCurrency=GBP, availability, shippingDetails, hasMerchantReturnPolicy }`. `priceValidUntil` = today + 30d. Breadcrumb: Home → Brand → Product. |
| `/[...slug]` catalog (`app/[...slug]/page.tsx:106-117`) | lines 112, 113 | `BreadcrumbList` + `ItemList` | `ItemList`: up to 10 in-stock products filtered by `entry.productIdPrefix`, each as `ListItem { position, url, name, image }`. |
| `/[...slug]` info/faq (`app/[...slug]/page.tsx:120-138`) | line 133 (+134 only for faq) | `BreadcrumbList`, conditionally `FAQPage` | FAQPage `mainEntity[]: Question → acceptedAnswer.Answer` from `FAQ_ITEMS`. |
| `/stores` (`app/stores/page.tsx`) | line 60 (one per store) | `ClothingStore` per store (reusing `ORG_SCHEMA_COPY.schemaType`) | `address`, `telephone`, `email`, `openingHoursSpecification[]` (day-of-week mapped via `mapDayLabel`), `hasMap`, `currenciesAccepted`, `paymentAccepted`, `priceRange`. |

Pages without JSON-LD: `/cart`, `/favorites`, `/account`, `/checkout/*`, `/download/*`, `/offline`, `/not-found`, `/error` — all are `noindex` per `SEO.*.robots`.

---

## SEO-only "claims" — non-runtime constants

⚠ The constants `FREE_SHIPPING_THRESHOLD`, `RETURN_WINDOW_DAYS`, `DELIVERY_COUNTRY`, `DELIVERY_MIN_DAYS`, `DELIVERY_MAX_DAYS` in `src/app/data/seoData.ts` are surfaced **only** via metadata / JSON-LD / `llms.txt`. They are NOT enforced anywhere in the UI, cart, or checkout business logic.

For the full table (where each constant is declared, where it surfaces, why it is not enforced) — see [`./CHECKOUT.md`](./CHECKOUT.md) §7.1 "SEO-only shipping & return constants". For an LLM consumer: **do not infer business rules from these values**.

---

## Currency mismatch — JSON-LD says GBP, UI shows USD

There are two independent currency declarations: `seoData.ts:11` (`CURRENCY = 'GBP'`, used in JSON-LD / OG / `llms.txt`) and `currencyConfig.ts:6-15` (`CURRENCY = { code: 'USD', symbol: '$' }`, used by every visible UI price). A crawler reading the structured data sees `priceCurrency: "GBP"`; a human sees `$99.00`.

Full divergence map, authoritative-runtime currency, and cleanup direction (collapse to one constant, fix copy strings, re-derive `llms.txt` delivery copy from `DELIVERY_MIN_DAYS` / `DELIVERY_MAX_DAYS`) — see [`./I18N.md`](./I18N.md) §6 "Currency authority conflict — UI says USD, JSON-LD says GBP".
