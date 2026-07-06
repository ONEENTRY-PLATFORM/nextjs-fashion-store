# Home (`/`)

RSC shell (`app/page.tsx`) is `dynamic = 'force-dynamic'` and `Promise.all`-awaits six loaders in parallel — `loadHeroSlides`, `loadHomepageCollections`, `loadDiscountBanner`, `loadCategorySection`, `loadPageBlocksById(HOME_PAGE_ID)` (id = 1) and `loadStores` — then emits two JSON-LD blobs (`Organization` with the flagship store's `contactPoint` / `address` + `WebSite` with a `SearchAction` targeting `/women/clothing?q={search_term_string}`). Blocks are re-ordered against `HOMEPAGE_MARKER_ORDER` before rendering; each is wrapped in an `AnimatedSection` with an `IntersectionObserver` fade-up (~650 ms), the hero using `immediate` to skip the observer. See CATALOG_FILTERS §15 (§ Homepage) for the full behavioural spec.

In OneEntry:
A page of type "Common page"

Attribute set — system type:

- **Meta title**: string
- **Meta description**: text
- **Keywords**: string
- **OpenGraph title**: string
- **OpenGraph description**: text
- **OpenGraph siteName**: string
- **OpenGraph images alt**: string
- **Twitter site**: string
- **Twitter creator**: string
- **Twitter title**: string
- **Twitter description**: text
- **JSON-LD Organization name**: string
- **JSON-LD Organization description**: text
- **JSON-LD Organization logo**: image
- **JSON-LD Organization sameAs (social networks)**: text
- **JSON-LD Organization priceRange**: string
- **JSON-LD Organization areaServed**: list of countries
- **JSON-LD Organization knowsAbout**: Entity from catalog categories
- **JSON-LD ContactPoint telephone**: string
- **JSON-LD ContactPoint email**: string
- **JSON-LD ContactPoint contactType**: string
- **JSON-LD ContactPoint availableLanguage**: string
- **JSON-LD PostalAddress streetAddress**: string
- **JSON-LD PostalAddress addressLocality**: string
- **JSON-LD PostalAddress postalCode**: string
- **JSON-LD PostalAddress addressCountry**: string
- **JSON-LD WebSite name**: string

## 1. Hero Slider

In OneEntry:
A block of type "Slider block", name: "Hero Slider", with three slides inside, each of which has an attribute set attached (block type):

- **Image** — image
- **Image alt** — string
- **Eyebrow** — string
- **Headline** — string
- **Subtext** — string
- **CTA button** — string
- **href** — string

validators for all attributes

## 2. Shop By Category

In OneEntry:
A block of type "Slider block", name: Shop By Category, containing 5 slides, each slide has:

- attribute set:
    - string: title chips
- 6 slides each with an attribute set containing attributes:
    - image with the selected preview template
    - string: alt
    - string: category name
    - string: category url

validators for all attributes

## 3. Best Sellers (MenCollection)

Horizontal scroll carousel.

- **Heading (H2)**: `SECTION_TITLES.bestSellers.title` = `"Best Sellers"`
- **Eyebrow**: `"Collection"`
- **View All** link → `/men/clothing?chip=Best+Sellers`
- **Product card** (ProductCard, ×~12): image + alt = `name`, brand, name, price/sale price, badges (`BESTSELLER`/`NEW`/`SALE`), color swatches, sizes
- **Arrows**: aria-label `"Scroll left"`, `"Scroll right"`

## 4. New Arrivals (WomenCollection)

Horizontal scroll carousel (structure identical to Best Sellers).

- **Heading (H2)**: `"New Arrivals"`
- **Eyebrow**: `"Collection"`
- **View All** → `/new`
- **Product card** (×~12)
- **Arrows**: aria-label `"Scroll left"`, `"Scroll right"`

## 5. Promo Block

Grid of 4 promo cards. Data arrives via prop `initialItems` from OneEntry `homepage-collections` (fetched server-side); `data/promoBlocks.ts` retains the `PromoItem` type only.

- **Promo card** (×4): image + alt = `title`
    - **Subtitle** (eyebrow) — e.g. `"Shop Dresses"`
    - **Title (H3)** — e.g. `"Best Dress for You"`
    - **CTA button** — e.g. `"Shop Dresses"` → category href

## 6. Sale (NewArrivals component)

Horizontal scroll with sale items.

- **Heading (H2)**: `"Sale"`
- **Subtitle**: `"Best prices – shop the sale now"`
- **View All** → `/sale`
- **Product card** (×~12) with a discount marker
- **Arrows**: aria-label `"Scroll left"`, `"Scroll right"`

## 7. Discount Banner

Final banner with a promotion.

- **Image** + alt from `banner.alt`
- **Heading (H2)** of the banner
- **CTA button** (`banner.cta`)
