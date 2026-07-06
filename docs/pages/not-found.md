# 404 / Page Not Found

404 error page (`NotFoundPage.tsx`). Rendered by Next.js when a route is not found (`app/not-found.tsx` → `<NotFoundPage />`, `SEO.notFound` metadata). Static UI — no CMS loaders. Mount effect: `window.scrollTo(0, 0)` to defeat scroll-restore when the client-side router lands on a missing route. All copy comes from `NOT_FOUND_LABELS` in `data/notFoundLabels.ts`.

## SEO / social networks

- **Meta title**: string
- **Meta description**: text

## 1. Large "404"

Decorative 404 number as background (aria-hidden).

## 2. Eyebrow + Heading

- **Eyebrow**: `"Error 404"` (uppercase tracking)
- **H1**: `"Page Not Found"`
- Divider (thin line)

## 3. Message

- Text: `"The page you're looking for doesn't exist or has been moved. Explore our collections instead."`

## 4. CTA Buttons

- **Button**: `"Back to Home"` → `/`
- **Button**: `"Women"` (with `ArrowRight` icon) → `/women/clothing`
- **Button**: `"Men"` (with `ArrowRight` icon) → `/men/clothing`

## 5. Trending Now

Page tail — quick links to popular pages.

- **Heading**: `"Trending Now"` (uppercase tracking, small)
- Links in a row: `"New Arrivals"` → `/new`, `"Sale"` → `/sale`, `"Bags"` → `/women/bags`, `"Shoes"` → `/women/shoes`, `"Accessories"` → `/women/accessories`
