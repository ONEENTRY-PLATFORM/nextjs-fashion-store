# Info Page (typical, `/[...slug]`)

Catch-all route for all info pages. A single template `InfoPage.tsx` serves 23+ slugs from `infoPages.ts`.

> **Implementation note:** the current `InfoPage.tsx` reads content **entirely from local static datasets** (`INFO_PAGE_LABELS`, `INFO_PAGE_DEMO_NOTICE`, `INFO_PAGE_HERO`, `INFO_PAGE_CTA`, `INFO_PAGE_SECTIONS`, `INFO_PAGE_FEATURE_CARDS` in `data/infoPageLabels.ts`) — no OneEntry loader is called from the component today. The "OneEntry Demo Notice" bar is a design element, not a live CMS binding. `loadPageByUrl` exists in `src/lib/oneentry/catalog/pages.ts` as scaffolding for future CMS wiring but is not on the request path.

- `about-us`, `careers`, `rewards`, `gift-certificates`, `refer-a-friend`, `corporate`
- `faq`, `track-order`, `delivery`, `exchange`, `sizing-guide`, `care-guide`, `help-center`, `contact`
- `privacy-policy`, `terms`, `terms-of-sale`, `terms-of-use`, `security`, `accessibility`, `user-content-policy`, `promo-terms`, `sitemap`

## SEO / social networks

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
- **JSON-LD FAQPage Question name** (for slug `faq`): string
- **JSON-LD FAQPage Answer text** (for slug `faq`): text

## 1. Hero (top section)

- **Image** — alt = `"ONEENTRY Fashion editorial"`
- Dark overlay
- **Breadcrumb label**: `Home › Info` (for example, for `about-us`)
- **H1**: `INFO_PAGE_META[slug].title` (e.g. `"About Us"`, `"FAQ"`, `"Privacy Policy"`)
- **Subheading** (subtitle) — text below H1

## 2. Hero Breadcrumb

Inside the Hero (overlaid on the image):
- `Home` › **`Info`**

## 3. Demo Notice (banner below Hero)

Light-beige bar with information about Platform.

- `Edit3` icon
- **Text**: `"Demo page — This content is managed through the OneEntry Platform. Edit text, images and layout from your dashboard — no code required."`
- **Link on the right**: `"Explore OneEntry →"` → https://oneentry.cloud (target=_blank)

## 4. Lead Paragraph

Introductory paragraph (after Demo Notice).

- Intro text about the company, ~3 sentences
- Example: `"ONEENTRY Fashion was born from a simple belief: great style should never come at the expense of quality or conscience..."`

## 5. Content Sections (×N) — Alternating Text/Image

Alternating "text / image" sections (image alternates between left/right). Each section:

- **Eyebrow** (above the heading) — for example `"About Us"`, `"Sustainability"`, `"Delivery & Returns"`, `"Sizing & Care"`
- **H2** (heading) — for example `"Fashion Crafted with Purpose"`, `"Our Values, Our Responsibility"`, `"Fast Shipping. Hassle-Free Returns."`, `"Find Your Perfect Fit, Keep It for Years"`
- **Body** — several paragraphs
- **Image** — alt = `imageAlt` (e.g. `"Fashion boutique with curated clothing"`)
- Image position: left/right (alternates)

## 6. Stats Block (dark section)

Statistics grid on a dark background.

- Statistic card (×N): large number (`stat.value`) + label (`stat.label`, uppercase tracking)

## 7. Feature Cards (Platform Capabilities)

Grid of 4 cards with icons — demonstrating Platform capabilities.

- Card `"Edit Any Content"` (icon `Edit3`) — description
- Card `"Flexible Layouts"` (icon `LayoutTemplate`)
- Card `"Instant Publish"` (icon `Zap`)
- Card `"Multi-Language"` (icon `Globe`)

## 8. Section Headline + Description (above Feature Cards)

- **Eyebrow** (uppercase tracking): section eyebrow text
- **H2** (uppercase): section heading
- **Description**: ~2 sentences (centered)

## 9. CTA Buttons (at the bottom of the page)

Final block with transitions.

- **Button** (primary): CTA link with `ChevronRight` icon

---

## Note on hub mode (`__hub`)

When `slug === '__hub'`, the page becomes a listing of all info sections with link cards to each one.
