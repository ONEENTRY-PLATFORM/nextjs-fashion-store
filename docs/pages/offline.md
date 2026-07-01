# Offline (`/offline`)

Fallback page for the service worker when there is no internet connection. Rendered without `Header` / `Footer` (minimal template).

## SEO / social networks

Metadata is not set — this is a technical service-worker fallback. The page is only accessible when there is no network and is not indexed by search engines.

## 1. Brand

- **Text label** (eyebrow): `"ONEENTRY FASHION"` (uppercase, tracking, gray)

## 2. Icon

- Wi-Fi SVG icon with a slash through it (no-signal indicator), aria-hidden

## 3. Heading + Subtitle

- **H1**: `"No Internet Connection"`
- **Subheading**: `"Check your Wi-Fi or mobile data and we'll get you back to shopping."`

## 4. Auto-Check Status

- **If a check is in progress** — text `"Checking connection..."` (with animated dots)
- **If waiting** — `"Next check in {NN}s"` (ticking counter)
- **Progress bar** (thin 160px line, fills based on timer)

## 5. Manual Retry Button

- **Button**: `"Try Now"` (enabled) / `"Checking…"` (disabled during check)

## 6. Footer Note

- Footnote at the bottom: `"Previously visited pages are available offline"`
