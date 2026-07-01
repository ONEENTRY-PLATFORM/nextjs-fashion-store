# Product Detail Page (typical, `/product/[id]`)

Product page. Consists of 8 blocks.

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
- **JSON-LD Product name**: string
- **JSON-LD Product description**: text
- **JSON-LD Product image**: images
- **JSON-LD Product brand**: string
- **JSON-LD Product sku**: string
- **JSON-LD Product mpn**: string
- **JSON-LD Product gtin**: string
- **JSON-LD Product material**: string
- **JSON-LD Product additionalProperty (specs)**: list of label/value
- **JSON-LD Offer price**: number
- **JSON-LD Offer priceCurrency**: string
- **JSON-LD Offer availability**: enum (InStock / OutOfStock / PreOrder)
- **JSON-LD Offer itemCondition**: enum (NewCondition / RefurbishedCondition / UsedCondition)
- **JSON-LD Review author**: string
- **JSON-LD Review rating**: number (1–5)
- **JSON-LD Review title**: string
- **JSON-LD Review body**: text
- **JSON-LD Review datePublished**: date

## 1. Breadcrumbs

4-level hierarchy + product name:

- `Home` › `Women` › `Clothing` › `Sweaters & Knitwear` › **`{Product Name}`** (truncated max 200px)
- Separator — `ChevronRight` icon

## 2. Product Gallery

Left side of the PDP.

- **Main image** + alt = `name` (cursor `zoom-in`, hover-to-zoom via `transformOrigin`)
- **Thumbnails** (×~5) — alt = `"View {idx+1}"` (vertical column on the left on desktop, horizontal on mobile)
- **Badge** — `"BESTSELLER"` / `"NEW"` / `"SALE -45%"`
- **Double-click / click** on the main image opens `FullscreenViewer`
- **Favorite button** — aria-label `"Add to wishlist"`

## 3. Product Info (right column)

### 3-0. Brand + Share row
- **Left**: brand link `"ONEENTRY"` (uppercase tracking) → `/women/clothing`
- **Right**: **`Share`** button (with `Share2` icon) — opens a dropdown
  - List of share links (`SHARE_LINKS` — Facebook, X/Twitter, Email, etc.)
  - At the bottom — the **`Copy link`** button → changes to **`Link copied!`** (with a green checkmark) after click

### 3-0a. Title + Rating + SKU
- **H1**: product name (`dynamicName`)
- **Rating row**:
  - Stars (`StarRating`)
  - Clickable link `"{N} reviews"` (smooth-scroll to the reviews section)
  - Separator `|`
  - **Availability status**: `"In Stock"` (green) / `"Out of Stock"`
- **SKU row**: `"SKU: {value}  ·  Article: {value}"` (e.g. `"SKU: 2024-156-1 · Article: OF-KW-156-BRG"`)

### 3-0b. Price Block
- Sale price + struck-through regular price + discount percentage

### 3a. Color Selection
- **Label**: `"Color: {selected color name}"`
- Swatches (hex circles) — aria-label `"Color {idx+1} (out of stock)"` for OOS

### 3b. Size Selection
- **Label**: `"Size{: M}"`
- **Link**: `"Size Guide"` (opens `SizeGuideModal`)
- Size buttons: `XS` `S` `M` `L` `XL` (disabled for OOS)
- On error — `"Please select a colour"` / `"Please select a size"`

### 3c. CTA buttons (Purchase Actions)

Stack of 3 buttons (or a disabled block if OOS):

- **`Add to Cart`** (with `ShoppingBag` icon) → changes to **`Added to Cart!`** (with `Check` icon) after click
  - If the item is OOS — instead of the button, a disabled block: `"Out of Stock"` (gray)
- **`Reserve in Store`** (with `Store` icon, outlined) — opens `ReserveInStoreModal`
- **`Save to Wishlist`** (with `Heart` icon) → **`Saved to Wishlist`** (heart filled with accent color)

### 3d. Special Offers (bundles)
- **Label**: `"Special Offers"` (uppercase tracking)
- Bundle cards (×2) — each with two items
  - Each item: name (line-clamp-2), `originalPrice` (struck-through), `salePrice` (sale color)
  - **Caption**: `"Bundle price"`
  - **Bundle price**: `bundlePrice` + savings (in green, e.g. `"Save $30"`)
  - **Button**: `"Complete the Look"`

### 3e. Quick Delivery Snippets

Short delivery hints under the bundles (`DELIVERY_SNIPPETS`).

- List of icons + short texts (e.g. `"Free delivery over £50"`, `"Free returns within 30 days"`, `"Try in store"`)

## 4. Accordion Sections

Expandable sections with information. Exact titles:

- **`"Product Specifications"`** (defaultOpen=true) — specifications (label: value table)
- **`"Product Description"`** — product description
- **`"Delivery & Returns"`** (defaultOpen=true) — delivery and return conditions
- **`"Care Instructions"`** — composition and care instructions

## 5. Product Reviews Section

- **H2**: `"Customer Reviews"`
- **Summary block** (left column):
  - Large number — average rating (`{N.N}`)
  - Stars (`StarRating`)
  - **Caption**: `"{N} reviews"`
  - Bar chart of distribution across 5/4/3/2/1 stars (with counts on the right)
  - **Button**: `"Write a Review"` (opens `WriteReviewModal`)
- **List of reviews** (right column) — `ReviewCard` cards:
  - Author name + avatar
  - Date
  - Stars
  - **Title** (review title)
  - Text
- **Button** (if there are >3 reviews): `"Show all {N} reviews"` (with number substitution)

## 6. Recommendations Carousel ("You may also like")

- **H2**: `"You may also like"` (exact text from `productDetail.tsx`: tracking-uppercase)
- Carousel of 6 recommended items (`ProductCard` cards)

## 7. Recently Viewed

- **Subtitle** (eyebrow): `"Your History"`
- **H2**: `"Recently Viewed"`
- Grid of product cards

## 8. Modals (invoked from this page)

### Reserve in Store Modal
- **H2**: `"Reserve in Store"`
- List of stores with radio selection
- Size selection field
- "Your details" form:
  - **Label**: `"First name *"` placeholder `"Jane"`
  - **Label**: `"Last name *"` placeholder `"Doe"`
  - **Label**: `"Phone number *"` placeholder `"+44 7700 900000"`
  - **Label**: `"Email address *"` placeholder `"jane@email.com"`
- **Button**: `"Reserve"`
- After submit — `"Reservation Confirmed"` screen

### Write Review Modal
- **H2**: `"Share your thoughts"`
- Stars for rating — aria-label `"{N} star"`
- Field `"Title"` placeholder `"Summarize your experience"`
- Textarea `"Review"` placeholder `"Tell us what you like or dislike"`
- Field `"Name"` placeholder `"Jane D."`
- Field `"Email"` placeholder `"jane@email.com"`
- **Label**: `"Add media"` — uploader, caption `"Upload photos or videos"`
- **Button**: `"Submit Review"`
- After submit — `"Review Submitted"` screen

### Size Guide Modal
- **H3**: `"Size Guide"`
- Table: columns `Size` / `Chest` / `Waist` / `Hips` (cm)
- Hint: `"Tip: If you are between sizes, we recommend choosing the larger size."`

### Quick View Modal (from the catalog)
- Opens from a product card in the catalogs
- **H2**: product name
- Image + thumbnails (alt = `"View {idx+1}"`)
- Color/Size selector (as in PDP)
- **Button**: `"Add to Cart"`
