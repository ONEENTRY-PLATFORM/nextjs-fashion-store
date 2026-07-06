# PRODUCT_DETAIL.md — Product Detail Page

> Reference for the PDP at `/product/[id]`. Audience: LLM agents that need a code-level picture of loading, variant selection, add-to-cart / reserve / wishlist / share flows, reviews, and the recommendation blocks. See [pages/product.md](./pages/product.md) for the CMS-shape spec.

---

## 1. Load

1. `app/product/[id]/page.tsx` (RSC) awaits `params.id`, calls `loadProductById(id, DEFAULT_LOCALE)` (`src/lib/oneentry/catalog/products.ts`), and `adaptCatalogProductToPdpProduct` to normalise the OE entity into a `CatalogProduct`.
2. `generateMetadata` composes SEO metadata + Product JSON-LD (`priceCurrency: GBP`, `Offer`, `AggregateRating`, `Review[]`, `shippingDetails`, `hasMerchantReturnPolicy`).
3. The RSC renders `<ProductDetailPage initialProduct={...} reviewsSlot={<ReviewsAsync ...>} recommendationsSlot={<FrequentlyOrderedAsync ...>} />`. Both slots are wrapped in `<Suspense>` so they stream in independently.
4. On mount, `RecentlyViewedSection` fires `useRecentlyViewed().addProduct(product)` and — when signed in — `pushRecentlyViewedAction({productId, viewedAt})`.

**Gender URL param.** The PDP URL accepts an optional `?gender=men|women` to keep the site `<Header>` highlighting the correct gender tab (Header reads `useSearchParams().get('gender')`). Ingress rules:
- `ProductCard.tsx` builds `cardHref` as `/product/{id}?gender=men|women` derived from `product.gender` (`'M'` → `men`, `'W'` → `women`), so clicks from any men's / women's catalog carry the gender forward.
- `ProductDetailPage.tsx` has a `useEffect` that, when `currentGender` is `'M'` or `'W'` and no `gender` param is present in the URL (deep link, search hit, external referrer), injects it via `router.replace(path, { scroll: false })` so the Header re-derives WOMEN/MEN correctly. Unisex / kids products leave the URL untouched.

**ISR:** `app/product/[id]/page.tsx` declares `export const revalidate = 120` as a hard-coded literal. Next.js requires route-segment `revalidate` to be a statically-analysable literal — importing a computed value (e.g. `import { REVALIDATE_PRODUCT } from 'src/lib/isr'`) causes "Invalid segment configuration export detected" and breaks the build. The `ISR_PRODUCT_TTL_SEC` env var tunes the `unstable_cache` TTL inside PDP data loaders only; it does not change the route-shell revalidate window. If you need a different route TTL, update the literal in the file directly and keep it in sync with the default in `src/lib/isr.ts`. Because PDP HTML may be up to ~2 minutes stale, critical stock/price re-validation is performed on the checkout side: `PaymentPage.handlePlaceOrder` runs a fresh `previewOrderAction` immediately before calling `createOrderAction` (see [CHECKOUT.md §3.5a](./CHECKOUT.md#35a-pre-flight-preview-check)).

---

## 2. Layout

- **Gallery (left, sticky on desktop)** — `ProductGallery` renders the main image with hover zoom, a thumbnail rail, and `FullscreenViewer` on tap.
- **Info column (right)** — brand link, product name, `<StarRating>`, review count, SKU + article, price block (sale price / original / discount %), bonus-points loyalty callout, color swatches, size grid, store city dropdown, primary CTAs, delivery / free-shipping snippets, share dropdown.
- **Below the fold** — Accordions (Specifications open by default; Description; Delivery & Returns; Care Instructions) → `ProductSpecialOffers` (bundle block) → `<Suspense fallback={<ReviewsSkeleton/>}>{reviewsSlot}</Suspense>` → `<Suspense fallback={<RecommendationsSkeleton/>}>{recommendationsSlot}</Suspense>` → `RecentlyViewedSection`.

All transient UI state (modals, hover flags, share dropdown, added-flash) is centralised in `useProductPageUIState()` (`src/app/pages/product/useProductPageUIState.ts`).

---

## 3. Variant selection

### 3.1 Color

- `colors[i]: string` — hex code.
- `colorImages[i]?: string[]` — per-colour gallery (falls back to the main `gallery`).
- `colorStock[i]?: number` — per-colour inventory count.
- Selecting a colour updates `?color=` in the URL, swaps the gallery, and re-evaluates size availability.
- Out-of-stock colours are rendered as strikethrough swatches.

### 3.2 Size

- Sizes are derived from `variants[]` (each variant has `size`, `color`, `sku`, `stock`, `statusIdentifier`).
- Only sizes available in the currently selected colour are enabled; unavailable sizes show a strikethrough.
- `?size=` in the URL seeds the initial pick. When the URL carries no `?size=` and the product has exactly one size option, `initSize` falls back to that single size label so the shopper never has to make a trivial selection.

### 3.3 Variant states

Availability is signalled per active variant via `activeVariantStatus = activeVariant?.statusIdentifier` plus a product-level `productIsOOS = catalogProduct.inStock === false` short-circuit. When the whole product is OOS, all variant statuses collapse to the out-of-stock render regardless of `statusIdentifier`.

| `statusIdentifier` | Stock chip (green/amber/grey) | Swatches | Primary CTA | Reserve-in-Store CTA |
|---|---|---|---|---|
| (`null` / normal, in stock) | Green "In stock" | Selectable | Black "Add to Cart" (turns sale-colour + check-mark on success) | Enabled |
| `preorder` | Amber `#B8860B` "Pre-order" | Selectable | Black "Pre-Order" (`lPreOrderButton`, still fires `handleAddToCart`) | Enabled |
| `coming_soon` | Grey `#8B8B8B` "Coming soon" | Selectable | Grey non-button `<div>` "Coming soon", not clickable | Still enabled (shopper can reserve) |
| `out_of_stock` (per-variant) | Green in-stock chip persists because the other variants are still in stock; only affected size renders strikethrough | Colour swatch strikethrough when whole colour is OOS; individual size button `.line-through` when the size is OOS for the selected colour | Depends on currently-selected variant | Enabled |
| product-level `inStock === false` | Green chip (chip only reads active-variant status) | All swatches disabled (strikethrough) | Grey non-button `<div>` "Out of stock" (`lOutOfStock`) | Still opens the reserve modal |

Colour-vs-size cross-check runs in `dynamicSizeOptions` via `variants.some(v => v.colors.includes(selectedHex) && v.sizes.includes(s.label) && v.inStock)`. When the shopper switches to a colour that no longer stocks the previously-picked size, a `useEffect` clears `selectedSize` so the "size selected" pill never lives over a struck-through size.

---

## 4. Add-to-Cart

`ProductDetailPage.handleAddToCart` → `useCart().addItem({id, name, brand, color, sku, size, quantity: 1, price, originalPrice, image})`.

Preconditions:

- **Size required.** `if (!selectedSize)` sets `sizeError=true` for 2 s (via `sizeErrorTimerRef`) — the size row switches to sale-colour borders, an inline "select a size" error appears next to the SIZE label, and no `addItem` call is made.
- **Colour required only implicitly.** `selectedColor` is initialised to `0` (or the URL's `?color=` match), so the button is always able to derive `dynamicColors[selectedColor].name`. There's no "colour not selected" error branch on the PDP (unlike `QuickViewModal`, which enforces both).
- **Quantity fixed at `1`.** PDP has no quantity stepper — bumping goes through the mini-cart's `updateQuantity(id, delta)`.

Side effects on success:

- `cart.openMiniCart()` slides in the drawer.
- `markAddedToCart()` flashes the CTA sale-colour + check-mark for 2 s (`useProductPageUIState.addedToCart`).
- `announce(PRODUCT_ACTION_LABELS.announceAddedToCart(dynamicName))` — SR-only sink via `useAnnounce()`.
- `trackActivity({type:'product_add_to_cart', productId, meta:{quantity}})` is emitted by `CartContext.addItem` itself (not the PDP file) — resolved via `getCmsProductId(item.id)` and skipped when the id isn't numeric.
- Debounced 400 ms sync to OE user-state via `CartContext`'s effect (see [CART_WISHLIST.md](./CART_WISHLIST.md) §5).

The active `price` fed into the cart follows the active variant when the linked product carries its own copy (`activeVariant?.price ?? catalogProduct.salePrice ?? catalogProduct.price`); `originalPrice` is only sent when the product has a sale price. The gallery image seeded into the cart is `activeColorImage` — variant image → per-colour image → parent image, so the cart tile always matches the picked swatch.

---

## 5. Wishlist toggle

`useWishlist().toggleItem({...})` — the heart CTA. Payload built by the PDP:

```ts
toggleItem({
  id: productId || 'pdp-ribbed-cashmere-knit',
  name: dynamicName,
  brand: dynamicBrand,
  price: CURRENCY.format(dynamicPrice),
  image: activeColorImage,
  colors: dynamicColors.map(c => c.hex),
  colorImages: dynamicColors.map(c => firstVariantMatch?.image || catalogProduct.colorImages?.[i] || dynamicImage),
  colorStock: dynamicColors.map(c => c.available),
  sizes: dynamicSizeOptions.map(s => s.label),
  inStock: !productIsOOS,
  selectedColor: dynamicColors[selectedColor]?.hex,
  selectedSize: selectedSize ?? undefined,
})
```

Selection persistence:

- After first mount, a `useEffect([selectedColor, selectedSize])` calls `updateSelection(productId, dynamicColors[selectedColor]?.hex, selectedSize ?? undefined)` — but only when the product is already wishlisted (`isWishlisted(productId)`), so a fresh colour/size flip on a non-favourited item doesn't create a phantom entry.
- `isFirstMount` guard ref prevents `updateSelection` firing on the initial hydrate (avoids re-writing the entry to server state on every page open).
- Wishlist analytics — `product_add_to_wishlist` / `product_remove_from_wishlist` — are emitted by `WishlistContext.toggleItem`, not by the PDP file.

Server sync is fire-and-forget through `syncWishlistAction` (debounced 400 ms — see [CART_WISHLIST.md](./CART_WISHLIST.md) §5).

### 5.1 URL synchronisation for colour + size

A separate `useEffect([selectedColor, selectedSize])` mirrors the picks into the URL via `window.history.replaceState`:

- Writes / clears `?color=<hex>` and `?size=<label>` in place.
- Bypasses Next.js router (no re-render, no scroll, no server round-trip).
- `useSearchParams()` re-reads on the next mount because it reads from `window.location`, so a full reload restores the exact variant view.
- The `?gender=` sync (§ Gender URL param above) is the only place that uses `router.replace` — needed so `<Header>` re-derives WOMEN vs MEN.

---

## 6. Share dropdown

`<ProductShareDropdown>` (`src/app/pages/product/ProductShareDropdown.tsx`):

Renders a `<Share2>` trigger next to the brand link. Dropdown lists four social channels (icons from `/icons/share/*.svg`, `unoptimized` so Next.js Image doesn't rewrite them) and a copy-link row:

| Channel | href template (URL-encoded `window.location.href`) |
|---|---|
| Facebook | `https://www.facebook.com/sharer/sharer.php?u=${encoded}` |
| X (Twitter) | `https://twitter.com/intent/tweet?url=${encoded}` |
| Pinterest | `https://pinterest.com/pin/create/button/?url=${encoded}` |
| WhatsApp | `https://wa.me/?text=${encoded}` |

Note: only the URL is encoded — no title/description/image params are appended. Preview scraping falls back to the PDP's `<meta>` tags. Every social link opens in a new tab (`target="_blank" rel="noopener noreferrer"`) and closes the dropdown after click.

**Copy link** — `handleCopyLink()` in `useProductPageUIState` calls `navigator.clipboard.writeText(window.location.href)`; on resolve, `copied` flips true for 2 s (`copiedTimerRef`) and the row switches to a green tick + "Link copied" copy.

**Click-outside close** — a `mousedown` listener in `useProductPageUIState` closes the dropdown when the click target is outside `shareRef`. Timers are cleared on unmount.

Trigger label goes through `useProductCardT('product-card_share', L.triggerLabel)` so admins can override the CTA copy.

---

## 7. Reserve in store (`ReserveInStoreModal`)

Modal opens from the "Reserve in Store" CTA (below the primary Add-to-Cart button). CTA is always enabled — including on OOS / coming-soon products — because a reserve is a lightweight lead, not a stock hold.

Flow:

1. **Select store.** Rendered as a radio-card list (`RESERVE_MODAL_LABELS.stores`). Each store carries a `stock: 'in' | 'low' | 'out'` badge coloured green / amber / grey. Stores with `stock: 'out'` are `disabled` and opacity-50.
2. **Select size.** Pre-populated from the main-form `preselectedSize`. The size grid receives `sizeOptions` from PDP so the same availability strikethrough logic applies inside the modal.
3. **Enter details** — first name, last name, phone, email, pickup date (`min = tomorrow` computed as `new Date().setDate(+1).toISOString().split('T')[0]`), accept T&Cs (`agreed`).
4. **Submit** → `submitForm('reserve_in_store', [...])` with an explicit `moduleConfigId=0` (default). Fields in submit order:

   | marker | source | type |
   |---|---|---|
   | `size` | `size ?? ''` | string |
   | `first_name` | `firstName.trim()` | string |
   | `last_name` | `lastName.trim()` | string |
   | `phone` | `phone.trim()` | string |
   | `email` | `email.trim()` | string |
   | `pickup_date` | `pickupDate` (ISO date) | string |
   | `agreed_terms` | `String(agreed)` (`"true"` / `"false"`) | string |
   | `reserve_in_store_form_select_store` | `String(selectedStore)` (store id) | string |

5. **Success screen.** Shows a **reference code** `refCode = 'OE-' + crypto.randomUUID().slice(0,6).toUpperCase()` frozen at modal-mount time via `useState(() => ...)` — the code is picked before submit so the same code renders on the receipt regardless of network latency, but it is **not sent** to OE with the form submission. Receipt lists store name, address, size, pickup date, and full name; a "we've emailed you at `{email}`" note appears below.

Validation (client-side, all required):

- Store: `!selectedStore` → `errorRequired`.
- Size: `!size` → `errorRequired`.
- First/last name: `.trim()` non-empty.
- Phone: `/^[+\d\s\-()\\.]{7,}$/` (allows `+`, digits, spaces, dashes, parens, backslashes, dots; min 7 chars) — `errorInvalidPhone` when the format check fails.
- Email: `/\S+@\S+\.\S+/` — `errorInvalidEmail` on format failure.
- Pickup date: `!pickupDate`.
- Agreed: `!agreed` → `errorMustAgree`.

`useTransition` gates the submit — CTA shows `'...'` while pending. Submit failure surfaces `result.error` inline in the footer.

Labels: title/section headings come from OE via `usePdpT('reserve_in_store', ...)`; error copy + store list are in `RESERVE_MODAL_LABELS`.

No server-side inventory hold — the storefront just records the reservation as form-data. Fulfilment happens off-platform.

---

## 8. Reviews

### 8.1 Load

`<ReviewsAsync productId={n} />` (RSC) calls `loadProductReviews(productId, 20)` from `src/lib/oneentry/catalog/reviews.ts` (page passes `limit=20`; the exported default is `100`). Internals:

1. Parallel fetch of three sources via `Promise.all`:
   - `getFormsDataByMarker('review_feedback', 13, { entityIdentifier: productId }, 1, 'en_US', 0, limit)` — fields `headline`, `body`, `name`, `email`, `occasions`.
   - `getFormsDataByMarker('review_rating', 12, { entityIdentifier: productId }, 1, 'en_US', 0, limit)` — field `rating` (1–5, coerced with `Number(...)`, clamped to `[1, 5]`).
   - `loadProductById(productId)` — needed only to get the `sizes[]` list for the deterministic size stamp.
2. **Filter empty-body records first** — earlier seed iterations left behind feedback rows with just a headline. If `withBody.length === 0` the function returns `[]` (client renders nothing).
3. **Join by user + chronological proximity**, not user alone:
   - Build `ratingsPerUser: Map<userIdentifier, Array<{rating, time}>>` — same reviewer may have posted multiple ratings over successive seed runs.
   - For each feedback, walk that user's rating list and pick the entry with the smallest `|rating.time - feedback.time|` that hasn't been consumed yet (`used = Set<'user:index'>`). Consumed pairs cannot rematch — guarantees 1-to-1 pairing per user.
   - **Fallback rating** when the user's rating list is empty or fully consumed: `Math.round(mean(allRatings))` clamped to `[1, 5]`; defaults to `5` when no ratings exist at all.
4. Body plain-text extraction via `textValue()` — OE `text`-type cells arrive as `[{plainValue|htmlValue|mdValue}]`; the helper prefers `plainValue`, then strips `<[^>]+>` from `htmlValue`, then `mdValue`.
5. Deterministic size stamp — `pickSize(reviewId, sizes) = sizes[reviewId % sizes.length]`. Same review id always maps to the same size, but different reviewers see different sizes.
6. Date formatting via `toLocaleDateString('en-GB', {day:'2-digit', month:'short', year:'numeric'})`.
7. Return `ProductReview[]` — `{id, author, rating, date, title, body, size, helpful: 0, verified: true}`.

Wrapped in React `cache()` — request-scoped memoisation only; no additional TTL. When `isOneEntryEnabled === false` or the SDK returns an error the function short-circuits to `[]`.

### 8.2 Render

`<ReviewsClient>` (`src/app/pages/product/ReviewsClient.tsx`) receives the array and renders:

- `avgRating = round(mean(rating) * 10) / 10` — one-decimal average.
- `ratingCounts` — bucketed by `Math.round(r.rating)` for the 5→4→3→2→1 histogram, `pct = count / total * 100`.
- Left: average rating (5-star + numeric), star histogram.
- Right: `<ReviewCard>` list, initially sliced to the first `3` (`showAllReviews ? reviews : reviews.slice(0, 3)`); the "Show All" toggle reveals the rest. Also renders the `<WriteReviewModal>` trigger.
- If `reviews.length === 0` the whole block returns `null` (no empty state).

### 8.3 Submit — `<WriteReviewModal>`

Client-side validation first — all six fields required, plus email regex `/\S+@\S+\.\S+/`. On any failure, per-field `errors[marker]` is set to `L.requiredFieldsNote`.

Submit is wrapped in `useTransition` and runs **exactly two sequential** `submitForm` calls (default `moduleConfigId=0`):

1. `submitForm('review_rating', [{marker:'rating', value: String(rating), type:'string'}])`.
   - Fails → `setSubmitError(res.error)` and **abort**. The second call is never made — orphaned ratings are impossible.
2. `submitForm('review_feedback', [{'headline'}, {'body'}, {'name'}, {'email'}, {'occasions'}])` with `occasions.join(', ')`.
   - Fails → `setSubmitError(res.error)`; the review_rating record already exists but has no matching feedback. `loadProductReviews` filters it out via the empty-body guard.

Success path (both calls `ok:true`):

- `trackActivity({type:'product_rating', productId, meta:{rating}})` (only when `productId !== undefined`).
- `setSubmitted(true)` — swaps the modal body to a thank-you card with a "Close" CTA.

Media upload input is present (`<input type="file" multiple accept="image/*,video/*" className="hidden" />`) but the current implementation does **not** attach the files to either submit call — it's a stub for a future OE media endpoint.

---

## 9. "You may also like" (`FrequentlyOrderedAsync`)

Loads the CMS block marker `pdp_you_may_also_like` (kind `frequently_ordered_block`) via `loadFrequentlyOrderedBlock(marker, productId)` (`src/lib/oneentry/blocks/page-blocks.ts`). Under the hood two `unstable_cache`-wrapped SDK calls run — `Blocks.getBlockByMarker` (title, position, quantity) and `Blocks.getFrequentlyOrderedProducts(productId, marker, lang)` (the statistics-driven item ids); the ids are then hydrated by `loadProducts({ids})` and mapped through `adaptCatalogProductToUiProduct`. Cache tag: `'oe-block'`; revalidate = `REVALIDATE_HOME`.

**Backfill algorithm** (`CAROUSEL_TARGET = 8`):

1. Start with the OE block's products, gender-filtered by `genderOk(p) = !productGender || productGender === 'U' || !p.gender || p.gender === productGender || p.gender === 'U'`.
2. If `products.length < 8` and a `categoryPath` was passed, split it into segments and walk **up** from the leaf while `i >= 2` (`i` = number of leading segments kept). E.g. `/women/women_clothing/outerwear` yields `['/women/women_clothing/outerwear', '/women/women_clothing']` — the walk stops at depth 2, so `/women` alone is never queried (that would be too broad).
3. For each candidate path, call `loadProducts({categoryPath, limit: 16, unique: true})` and iterate items:
   - Skip anything already in `seen` (seeded with `[String(productId), ...primary.map(p => p.id)]`).
   - Skip anything failing `genderOk`.
   - Adapt via `adaptCatalogProductToUiProduct` and append.
   - Break out as soon as `products.length + extras.length >= 8`.
4. **Final dedupe by id** — a second `Set` pass because an item can belong to overlapping categories and appear twice; React would otherwise choke on duplicate keys.
5. If the merged list is empty, `FrequentlyOrderedAsync` returns `null` (no empty state — Suspense fallback disappears, no carousel).

Rendered by `<FrequentlyOrderedClient>` in a horizontal carousel (`<RecommendationsCarousel>`). "View All" points at `categoryViewAllHref`, a prop passed from `app/product/[id]/page.tsx` that is derived from `oeProductRaw?.categories[0]` (the OE taxonomy path). Fallback is `'/'` when no category is available. The same prop is also used for the brand-pill `<a>` above the product name.

---

## 10. Special Offers (`ProductSpecialOffers`)

Bundle block sits between the primary CTAs and the delivery snippets on the info column. Currently the PDP feeds it a hardcoded `specialOffers: SpecialOffer[] = []` (`availableOffers = productIsOOS ? [] : specialOffers`) — the block is wired but the tenant hasn't populated it, so `ProductSpecialOffers` short-circuits (`if (offers.length === 0) return null`).

When populated, the block renders:

- Container marked with `data-block-identifier="special_offers"`, `data-block-kind="bought_together"`, `data-block-title={L.sectionTitle}` — used both for QA discovery and to keep it distinct from the "You May Also Like" carousel further down (`data-block-identifier="recommendations_carousel"`, `data-block-kind="similar"`).
- One card per `SpecialOffer` — two product tiles separated by a `+` glyph, with a "Bundle" badge and a "Limited time" pill (`usePdpT('special_offers_product_card', 'lable', ...)`).
- Bundle price + savings + "Complete the Look" CTA. Clicking a product tile does `window.open('/product/{id}', '_blank')` — new tab; the CTA fires `onAddBundle(offer.id)` which resolves to `handleAddBundle` on the PDP.
- `handleAddBundle` builds a `cart.addBundle` call, seeding the first product with the currently-selected colour + size and the rest with empty string defaults for colour and size. Bundle rows share the same `bundleId` in the mini-cart so a single quantity control drives them.

---

## 11. Recently viewed

Three-way flow — Redux slice + server-persisted state + client render:

**Dispatch on PDP mount** (`useEffect([productId, catalogProduct, dispatch, isLoggedIn])`):

- `dispatch(recentlyViewedActions.addProduct({id, name, brand, price: CURRENCY.format(price), salePrice?, image, colors, label?, gender?}))` — prepends to the Redux trail. Prices are stored as formatted strings so the RecentlyViewedSection ProductCard can render them without re-parsing.
- `trackActivity({type:'product_view', productId: numeric})` — fires only when `Number(catalogProduct.id) > 0`.
- `pushRecentlyViewedAction(numeric)` — signed-in only; server appends `{productId, viewedAt}` to `user.state.recentlyViewedItems`.

**Hydrate from server on login** (`hydratedRef` guarded `useEffect`):

- Runs once when `isLoggedIn && user.recentlyViewedItems.length > 0`.
- `getProductsByIdsAction(ids)` enriches the `{productId, viewedAt}` pairs into full ProductCard payloads.
- `dispatch(recentlyViewedActions.hydrate(items))` — merges into the trail.
- A second effect resets `hydratedRef.current = false` when the user logs out so the next sign-in re-hydrates.

**Render** — `<RecentlyViewedSection>` (`src/app/pages/product/RecentlyViewedSection.tsx`):

- Reads from a pre-filtered `allRecentlyViewed` list built on the PDP: excludes `productId`, filters by gender against `currentGender` (`'U'` bypasses), then dedupes by `(name || id).toLowerCase().trim()` so re-viewing variants of the same title doesn't stack duplicates.
- `RV_PER_ROW = 5`. Starts with `rowsShown = 1` (5 tiles). An `IntersectionObserver` on a sentinel `<div>` at the bottom of the section increments `rowsShown` when 10% visible, up to `Math.ceil(products.length / 5)` rows. So the section is not capped at 5 — it lazy-grows.
- `mounted` gate (`useEffect(() => setMounted(true), [])`) hides the section during SSR to avoid hydration mismatch with the client-only Redux trail.
- Renders nothing (`return null`) when `products.length === 0` or before mount.

---

## 12. Size Guide (`SizeGuideModal`)

Read-only table showing XS → XL conversions (US size, bust / waist / hip in inches). Data source: `src/app/data/sizeGuide.ts` (women's clothing). Modal trigger sits above the size grid.

`<QuickViewSizeGuide>` is a compact variant embedded in the Quick View modal.

---

## 13. Analytics events

Only two events fire from the PDP file itself:

- `product_view` — dispatched from `ProductDetailPage` mount effect, only when `Number(catalogProduct.id) > 0`. Payload: `{type:'product_view', productId: numeric}`.
- `product_rating` — dispatched from `WriteReviewModal` after both `submitForm` calls succeed. Payload: `{type:'product_rating', productId?, meta:{rating}}`.

Downstream events triggered by user actions on the PDP but emitted from the context layer (not the PDP component):

- `product_add_to_cart` — emitted by `CartContext.addItem` when `getCmsProductId(item.id) !== null`. Payload: `{type:'product_add_to_cart', productId: cmsId, meta:{quantity}}`. Bundle adds send `meta.bundle = true` from `CartContext.addBundle`.
- `product_add_to_wishlist` / `product_remove_from_wishlist` — emitted by `WishlistContext.toggleItem` on the transition, using `getCmsProductId(item.id)` as guard.
- `product_purchase` — emitted from `ConfirmationPage`, not the PDP.

`page_view` for `/product/*` is **suppressed** in `PageViewTracker.tsx` to avoid double-counting with `product_view`.

### 13.1 Loyalty points on the PDP

The "Earn N bonus points" callout on the PDP is **conditionally rendered** — it only appears when the OE `Discounts` rule with marker `purchase-of-goods` is active and applies to the current product. The point value is computed server-side per product.

**Loading (`src/lib/oneentry/discounts/purchase-bonus.ts`):**

`loadPurchaseBonusForProduct(oeProduct)` calls `getApi().Discounts.getDiscountByMarker('purchase-of-goods', DEFAULT_LOCALE)`, cached via `unstable_cache` with the `REVALIDATE_CATALOG` TTL and tag `oe-discounts`. It then:

1. Checks `startDate` / `endDate` — returns `null` if the discount is outside its active window.
2. Matches PRODUCT and CATEGORY conditions against the OE product (`id` / `categories`). Cart-scoped conditions such as `MIN_CART_AMOUNT` and `USER_LTV` are ignored — they do not gate the PDP badge.
3. Computes points: `PERCENT` rule → `Math.round(price * percent / 100)`; `FIXED_AMOUNT` rule → the fixed value.
4. Returns `{ points }` on a match, or `null` when the discount doesn't apply.

**Page integration (`app/product/[id]/page.tsx`):** calls `loadPurchaseBonusForProduct` for the fetched OE product and passes `bonusPoints` down to `ProductDetailPage`.

**Component (`src/app/pages/ProductDetailPage.tsx`):** accepts a new optional prop `bonusPoints?: number`. The "Purchase Bonus" block renders only when `bonusPoints > 0`. The heading substitutes `{count}` in the OE-managed system-text with the computed value. The fallback label in `src/app/data/productPageLabels.ts` (`PRODUCT_ACTION_LABELS.bonusHeading`) is `'Earn {count} bonus points'` — the `{count}` placeholder is honoured when OE hasn't overridden it.

The `Math.floor(total * 10)` formula (1 point per £0.10) is applied only downstream on:

- `CartPage.tsx` — `Math.floor(finalTotal * 10)` in the "You'll earn" pill next to the cart summary.
- `ConfirmationPage.tsx` — `Math.floor(total * 10)` in the order-confirmation thank-you.

---

## 14. Files touched

| File | Role |
|---|---|
| `src/app/pages/ProductDetailPage.tsx` | Main PDP component |
| `src/app/pages/product/useProductPageUIState.ts` | UI-state hook |
| `src/app/pages/product/ProductGallery.tsx`, `FullscreenViewer.tsx` | Gallery + zoom + fullscreen |
| `src/app/pages/product/AccordionSection.tsx` | Specs / Description / Delivery / Care accordions |
| `src/app/pages/product/ProductSpecialOffers.tsx` | `special_offers` block |
| `src/app/pages/product/ProductShareDropdown.tsx` | Copy link + social share |
| `src/app/pages/product/ReserveInStoreModal.tsx` | Reserve-in-store form |
| `src/app/pages/product/SizeGuideModal.tsx` | Size-conversion table |
| `src/app/pages/product/ReviewsAsync.tsx` + `ReviewsClient.tsx` + `ReviewsSkeleton.tsx` | Streamed reviews slot |
| `src/app/pages/product/ProductReviewsSection.tsx` + `ReviewCard.tsx` + `StarRating.tsx` | Review UI pieces |
| `src/app/pages/product/WriteReviewModal.tsx` | Review submit form |
| `src/app/pages/product/FrequentlyOrderedAsync.tsx` + `FrequentlyOrderedClient.tsx` | You-may-also-like slot with backfill |
| `src/app/pages/product/RecommendationsCarousel.tsx` + `RecommendationsSkeleton.tsx` | Horizontal carousel |
| `src/app/pages/product/RecentlyViewedSection.tsx` | Lazy-loaded recently-viewed |
| `src/lib/oneentry/discounts/purchase-bonus.ts` | `loadPurchaseBonusForProduct` — discount eligibility + points calculation |
| `src/lib/oneentry/catalog/products.ts` | `loadProductById`, adapter |
| `src/lib/oneentry/catalog/reviews.ts` | `loadProductReviews` |
| `src/lib/oneentry/blocks/page-blocks.ts` | `loadFrequentlyOrderedBlock`, `loadBlockWithProducts` |
| `src/lib/oneentry/forms/submit.ts` | `submitForm` for reviews + reserve |
| `src/lib/oneentry/auth/actions.ts` | `pushRecentlyViewedAction` |

---

## 15. Quick View (`QuickViewModal`)

`src/app/components/QuickViewModal.tsx` (~430 lines) is a modal-scale PDP surrogate opened from product cards on the catalog and homepage. It shares mental model with the PDP but has no dedicated route.

**Open trigger:** `openQuickView(product, initialColorIndex?)` from `QuickViewContext` (`src/app/context/QuickViewContext.tsx`) — invoked by the ProductCard "eye" button. The modal reads its state from `useQuickView()`.

**State:**
- Local `selectedColor: number | null`, `selectedSize: string | null` (initialised from `initialColorIndex` and product defaults).
- On modal open (`useEffect` on `isOpen`), if `product.sizes.length === 1` the single size is pre-selected as `selectedSize`; otherwise `selectedSize` starts as `null`.
- `useFocusTrap(isOpen, closeQuickView)` — Tab/Shift-Tab confined, Escape closes, previous focus restored.
- Variant look-up runs on every change: `product.variants.find(v => v.colors.includes(hex))`, sizes further filtered by `v.sizes.includes(selectedSize)`.

**Actions:**
- **Add to Cart** — **stricter** than PDP: both `selectedColor` AND `selectedSize` must be picked (`colorErr = hasColors && selectedColor === null; sizeErr = selectedSize === null`). Either failure sets the corresponding `errors.color` / `errors.size` and outlines the whole picker sale-colour. On success: adds to cart with `id = activeVariant?.id ?? '${product.id}-quick'`, `sku = activeVariant?.sku || product.id`, `quantity: 1`; then `closeQuickView()` and `openMiniCart()` (used to jump to `/checkout/delivery` but guest checkout is gated, so MiniCart is the current terminal state).
- **Save to Wishlist** — persists `selectedColor` (as hex) and `selectedSize` via the same `toggleItem({..., selectedColor, selectedSize})` shape as PDP.
- **View full details** — closes modal and `router.push('/product/[id]?color=&size=')` — preserves both variant params so PDP mounts on the same swatch.
- **Size guide** — swaps modal content in-place via `QuickViewSizeGuide` (no nested modal). Escape key closes it via a dedicated `keydown` listener.

**Colour / size availability:**
- Colours read `product.colorStock?.[idx] === false` for OOS strikethrough.
- Sizes cross-check `product.variants` when present: `variants.some(v => v.sizes.includes(size) && (currentColorHex ? v.colors.includes(currentColorHex) : true) && v.inStock !== false)`. When no variants — fall back to the global `product.inStock` flag.
- Picking a new colour resets `selectedImage = 0` (gallery snaps to the first frame of the new colour). `selectedSize` is reset to `null` unless the product has exactly one size, in which case it is re-set to that size so the single-size pre-selection survives a colour switch.

**A11y:** all icon buttons carry `aria-label`s from `QUICK_VIEW_LABELS` + `MINI_CART_ARIA_LABELS`; `useFocusTrap(isOpen, closeQuickView)` runs while open; `role="dialog"`, `aria-modal="true"`, `aria-labelledby="quick-view-title"`.

**Deliberate omissions vs PDP:**
- No `product_view` analytics (Quick View isn't a page).
- No recently-viewed dispatch / hydrate.
- No reviews stream, no "You May Also Like" carousel.
- No share dropdown.
- No URL sync for colour/size (all state is modal-local).
- No `product_rating` because there's no write-review flow.

## 16. Mini Cart (`MiniCart`)

`src/app/components/MiniCart.tsx` (~223 lines). Slide-in drawer opened from the header cart badge and after any Add-to-Cart action.

**State:** driven by `useCart()`:
- `items`, `subtotal`, `totalItems`, `miniCartOpen`
- `removeItem(id)`, `removeBundle(bundleId)`, `updateQuantity(id, delta)`

Backdrop click and Escape close the drawer via `useFocusTrap(miniCartOpen, closeMiniCart)`.

**Rendering rules:**
- Bundle rows render once per `bundleId` — a single quantity control drives the whole bundle (see [CART_WISHLIST.md](./CART_WISHLIST.md) §13).
- Empty state renders a "Your bag is empty" copy with a CTA to `/women/clothing`.
- Subtotal + total-items badge + primary CTA "Checkout" (routes to `/checkout/delivery` if signed in, otherwise opens `<GuestCheckoutModal>` on the delivery page).

**ARIA:** `MINI_CART_ARIA_LABELS` + `MINI_CART_DYNAMIC_ARIA` seed all icon-only buttons + the announce sink for count changes (via `useAnnounce()`).

## 17. Cross-references

- [pages/product.md](./pages/product.md) — CMS shape and per-block spec
- [CATALOG_FILTERS.md](./CATALOG_FILTERS.md) — how variants map to filter markers
- [CART_WISHLIST.md](./CART_WISHLIST.md) — cart / wishlist sync + recently-viewed sync
- [ONEENTRY_INTEGRATION.md](./ONEENTRY_INTEGRATION.md) §5.1, §7.6 — block markers and product attribute markers
