# Store Locations (`/stores`)

Page with a list of stores.

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
- **JSON-LD ClothingStore name**: string
- **JSON-LD ClothingStore image**: image
- **JSON-LD ClothingStore PostalAddress streetAddress**: string
- **JSON-LD ClothingStore PostalAddress addressLocality**: string
- **JSON-LD ClothingStore PostalAddress postalCode**: string
- **JSON-LD ClothingStore PostalAddress addressCountry**: string
- **JSON-LD ClothingStore telephone**: string
- **JSON-LD ClothingStore email**: string
- **JSON-LD ClothingStore openingHoursSpecification**: list (day of the week + time)
- **JSON-LD ClothingStore hasMap**: link
- **JSON-LD ClothingStore priceRange**: string
- **JSON-LD ClothingStore currenciesAccepted**: string
- **JSON-LD ClothingStore paymentAccepted**: string

## 1. Breadcrumbs

- `Home` › **`Store Locations`**

## 2. Heading

- **H1**: `"Store Locations"` (uppercase tracking)

## 3. Search Bar

- **Search field**: placeholder `"Search by city or postcode…"`
- Magnifier icon
- **Clear button**: aria-label `"Clear search"` (×)

## 4. Store Cards Grid

List of stores as cards (`StoreCard`).

Store card fields:
- Store image + alt = `name`
- **H3**: store `name` (e.g. `"London Flagship Store"`)
- **Address** (with `MapPin` icon): `address`
- **Phone** (with `Phone` icon): `phone`
- **Opening hours** (with `Clock` icon): hours
- **Button**: `"View Details"` (with `ChevronRight` icon)

## 5. No Results State (if nothing was found)

- `MapPin` icon
- **H3**: `"No stores found"`
- Hint
- **Button**: `"Clear search"` or `"Reset"`

## 6. Store Detail Modal (on card click)

- **H2**: store `name`
- **Close button** (×)
- **Subtitle**: `"Location"` + full address
- **Subtitle**: `"Opening Hours"` + schedule
- **Subtitle**: `"Contact"` + phone, email (if available)
- **Button**: `"Get Directions"` (with `ExternalLink` icon) → `mapUrl` link

> Note: there is **no** interactive map (Google Maps iframe) on the page — only the list of cards and outgoing `mapUrl` links.

## 7. Sub-header (below H1)

Description of the chain.

- Text: `"{N} locations across the UK — discover ONEENTRY FASHION in person."` (N = `STORES.length`)

## 8. Flagship Banner (at the bottom of the page)

Banner about the flagship store (image on the left + text block on the right).

- **Eyebrow**: `"Flagship Experience"`
- **H2**: `"Oxford Street"`
- **Text**: `"Our largest store across 3 floors. Book a free personal styling session with one of our expert stylists and discover the full ONEENTRY FASHION collection — women's, men's, and exclusive in-store edits."`
- **Button**: `"Get Directions"` (with `ExternalLink` icon) → `STORES[0].mapUrl`
- **Button**: `"Book Styling"` (secondary)

## 9. Bottom CTA

- **Text**: `"Can't make it in? Shop everything online with free UK delivery over £80."`
- **Link button**: `"Shop Online"` (with `ChevronRight` icon) → `/women/clothing`
