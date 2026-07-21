# PRODUCT_DETAIL.md — Product Detail Page

> Reference for the PDP at `/product/[id]`. Audience: LLM agents that need a code-level picture of loading, variant selection, add-to-cart / reserve / wishlist / share flows, reviews, and the recommendation blocks. See [pages/product.md](./pages/product.md) for the CMS-shape spec.

---

## 1. Load

1. `app/product/[id]/page.tsx` (RSC) awaits `params.id`, then fires `loadProductById(id, DEFAULT_LOCALE)` and `loadPdpSystemTexts(DEFAULT_LOCALE)` **in parallel** via `Promise.all`. `adaptCatalogProductToPdpProduct` normalises the OE entity into a `CatalogProduct`. `loadPurchaseBonusForProduct` is still called sequentially after `Promise.all` resolves because it needs the product's `id`, `price`, and `categories`.
2. `generateMetadata` composes SEO metadata + Product JSON-LD (`priceCurrency: GBP`, `Offer`, `AggregateRating`, `Review[]`, `shippingDetails`, `hasMerchantReturnPolicy`).
3. The RSC renders `<ProductDetailPage initialProduct={...} reviewsSlot={<ReviewsAsync ...>} recommendationsSlot={<FrequentlyOrderedAsync ...>} />`. Both slots are wrapped in `<Suspense>` so they stream in independently.
4. On mount, `RecentlyViewedSection` fires `useRecentlyViewed().addProduct(product)` and — when signed in — `pushRecentlyViewedAction({productId, viewedAt})`.

**`#reviews` hash scroll.** `ProductDetailPage.tsx` mounts a `useEffect` that checks `window.location.hash === '#reviews'`. When true it smooth-scrolls to `reviewsRef` (the reviews section anchor). Because the reviews slot streams in under `<Suspense>`, the effect retries in a loop with short intervals for up to 4 seconds, so deep links from QuickView's "N reviews" / "Be the first to review" buttons land correctly even when the section hasn't rendered yet on first paint.

**Gender URL param.** The PDP URL accepts an optional `?gender=men|women` to keep the site `<Header>` highlighting the correct gender tab (Header reads `useSearchParams().get('gender')`). Ingress rules:
- `ProductCard.tsx` builds `cardHref` as `/product/{id}?gender=men|women` derived from `product.gender` (`'M'` → `men`, `'W'` → `women`), so clicks from any men's / women's catalog carry the gender forward.
- `ProductDetailPage.tsx` has a `useEffect` that, when `currentGender` is `'M'` or `'W'` and no `gender` param is present in the URL (deep link, search hit, external referrer), injects it via `router.replace(path, { scroll: false })` so the Header re-derives WOMEN/MEN correctly. Unisex / kids products leave the URL untouched.

**`salePrice` — optimistic overlay, set by the loader.** `loadProductById` calls `loadProductDiscounts()` to fetch the active OE Discounts rules, then passes each family member through `applyProductDiscount(p, rules)`. When a rule matches — by product id, category, or `ATTRIBUTE` condition (e.g. `discount_12 = "10"`) — the computed discounted price is written back as `p.salePrice`. This powers the PDP strike-through UX (original price crossed out, sale price highlighted). The overlay runs on every product in the family so per-variant sale prices are also populated correctly.

**Two sources of truth — intentional design.** The catalog/PDP `salePrice` is *optimistic*: it reflects what OE's discount engine *would* apply under ideal conditions. Cart and checkout summaries use this same field (`item.price` = the client-side sale price) for line-item display, mirroring the catalog / PDP / QuickView two-number UX (`item.price` with a strike-through on `item.originalPrice`). However, the summary **Total** uses OE's `totalDue` only when OE has applied an *extra* reduction beyond the client sale — a loyalty-tier discount or a coupon (`personalDiscount > 0 || couponDiscount > 0 ? totalDue : subtotal`). If a shopper sees `$31.50 / $35` on a PDP card and the same `$31.50` in the cart, but OE's `previewOrder` returns full price for that session (e.g. the rule is scoped to a user group the shopper doesn't belong to), the cart Total will show `$31.50` (the client subtotal). The `PaymentPage` pre-flight guard re-runs `previewOrderAction` immediately before placing the order and surfaces a "total changed" error if OE's charge differs — so the charge-accurate check happens at the last possible moment rather than during browsing. Do **not** remove the `applyProductDiscount` overlay from `loadProductById` or `fetchFullCatalog` — without it the catalog cards and PDP show no strike-through even when a discount rule matches. See [CART_WISHLIST.md §16–§17](./CART_WISHLIST.md) for the summary-side math and the `PaymentPage` guard detail.

**PDP fetch pattern.** `loadProductById` does **not** download the full catalog. It issues at most three targeted OE calls, each wrapped in its own `unstable_cache` layer with `REVALIDATE_PRODUCT` TTL and tag `oe-products`:
1. `cachedGetProductById(id, lang)` — wraps `Products.getProductById()`.
2. `cachedGetRelated(id, lang)` — wraps `Products.getRelatedProductsById()`, used to reconstruct the colour/size family.
3. `cachedGetByIds(idsCsv, lang)` — wraps `Products.getProductsByIds()`, called only when the product record carries explicit `relatedIds` that weren't already covered by step 2.

The same aggregation logic (dedupe by id, union colours/sizes/variants, stock/status roll-up, `target` pushed first) applies as with the full-catalog path. Under 25 concurrent VUs this drops PDP p95 from ~50 s to the per-request cost of three small OE responses.

**ISR:** `app/product/[id]/page.tsx` declares `export const revalidate = 120` as a hard-coded literal and `export async function generateStaticParams() { return []; }`. Both exports are required together. Next.js 16 treats a dynamic-segment route that omits `generateStaticParams` as fully dynamic — `revalidate` is silently ignored and every request re-SSRs. With `generateStaticParams` present (even returning an empty array), Next.js classifies the route as on-demand ISR (`●` in the build output), product HTML is generated and cached per `id` on first cold hit, and subsequent requests within the 120 s window are served from the Next.js Data Cache (`x-nextjs-cache: HIT`, `Cache-Control: s-maxage=1, stale-while-revalidate=31535999`). The `generateStaticParams() { return []; }` export is therefore load-bearing — removing it reverts the route to fully dynamic even though `revalidate` remains. Next.js also requires `revalidate` to be a statically-analysable literal — importing a computed value (e.g. `import { REVALIDATE_PRODUCT } from 'src/lib/isr'`) causes "Invalid segment configuration export detected" and breaks the build. The `ISR_PRODUCT_TTL_SEC` env var tunes the `unstable_cache` TTL inside PDP data loaders only; it does not change the route-shell revalidate window. If you need a different route TTL, update the literal in the file directly and keep it in sync with the default in `src/lib/isr.ts`. Because PDP HTML may be up to ~2 minutes stale, critical stock/price re-validation is performed on the checkout side: `PaymentPage.handlePlaceOrder` runs a fresh `previewOrderAction` immediately before calling `createOrderAction` (see [CHECKOUT.md §3.5a](./CHECKOUT.md#35a-pre-flight-preview-check)).

---

## 2. Layout

- **Gallery (left, sticky on desktop)** — `ProductGallery` renders the main image with hover zoom, a thumbnail rail, and `FullscreenViewer` on tap. When the active variant has no usable images (`pictures_22` is absent or every URL is an empty string), the gallery renders a bag-placeholder block instead of `null`: an `aspect-[3/4]` container with `#f2f1ef` background and the `/icons/ui/bag-placeholder.svg` icon — the same placeholder used by catalog cards and `ImageWithFallback`, so the PDP column is never blank.
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

`ProductDetailPage.handleAddToCart` → `useCart().addItem({id, name, brand, color, sku, size, quantity: 1, price, originalPrice, image, stockLimit})`.

`stockLimit` is taken from `activeVariant?.stock` when the shopper has picked a specific variant, falling back to `catalogProduct?.stock` for products without variants. Both fields are populated by `adaptCatalogProductToPdpProduct` from OE inventory markers — see [CART_WISHLIST.md §3](./CART_WISHLIST.md) for capping behaviour.

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

**Price-block derivation.** `dynamicPrice` and `dynamicOriginalPrice` are both anchored to the same source to prevent a cross-source mismatch that previously rendered `−0%` sale badges. The rule is:

```ts
const effectiveFull = activeVariant?.price ?? catalogProduct?.price ?? 0;
const effectiveSale = activeVariant?.salePrice ?? catalogProduct?.salePrice;
const hasVisibleDiscount =
  typeof effectiveSale === 'number' &&
  effectiveFull > 0 &&
  effectiveSale < effectiveFull &&
  Math.round((1 - effectiveSale / effectiveFull) * 100) >= 1;
const dynamicPrice = hasVisibleDiscount ? effectiveSale! : effectiveFull;
const dynamicOriginalPrice = hasVisibleDiscount ? effectiveFull : null;
```

`hasVisibleDiscount` requires the rounded percentage to be ≥ 1% so a rounding artefact can never surface a `−0%` badge. The active `price` fed into the cart is `dynamicPrice`; `originalPrice` is only sent when `hasVisibleDiscount` is true. The gallery image seeded into the cart is `activeColorImage` — variant image → per-colour image → parent image, so the cart tile always matches the picked swatch.

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

Modal opens from the "Reserve in Store" CTA (below the primary Add-to-Cart button). The CTA is visible to all shoppers — including on OOS / coming-soon products — because a reserve is a lightweight lead, not a stock hold. However the CTA is **auth-gated**: guests who click it are bounced to `openLoginModal()` instead of seeing the form. On successful sign-in the shopper returns to the PDP and can open the modal. This matches the reviews auth gate (`ReviewsClient.requestWriteReview`) and ensures every reservation record has a registered owner on the OE side.

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

`app/product/[id]/page.tsx` does **not** call `loadProductReviews` during its own render — reviews are off the critical path entirely. The sub-title `<StarRating>` and review count are hydrated client-side by a `useEffect` that calls `getProductReviewSummary(productId)` (`src/lib/oneentry/catalog/reviews-actions.ts`, `'use server'`) immediately after mount. The chip and star row display `0` on initial paint and update to the real `{count, avg}` when the cached server action resolves (~100–300 ms after mount). This is independent of the `<ReviewsAsync>` streaming slot — the summary chip no longer depends on the Suspense boundary to become accurate.

`<ReviewsAsync productId={n} />` (RSC) calls `loadProductReviews(productId, 20)` from `src/lib/oneentry/catalog/reviews.ts` (page passes `limit=20`; the exported default is `100`). It is served through the `reviewsSlot` `<Suspense>` boundary and arrives as a streaming chunk roughly 100 ms after first byte — the same data, but removed from the synchronous render to reduce TTFB. Internals:

1. Parallel fetch of three sources via `Promise.all`:
   - `getFormsDataByMarker('review_feedback', 13, { entityIdentifier: productId }, 1, 'en_US', 0, limit)` — reads `body` and `occasions` from the current OE schema. `headline`, `name`, and `email` are accessed with `?? ''` / `?? 'Anonymous'` fallbacks to handle legacy seed records written before those attributes were removed from the form; new submissions no longer populate those fields.
   - `getFormsDataByMarker('review_rating', 12, { entityIdentifier: productId }, 1, 'en_US', 0, limit)` — field `rating` (1–5, coerced with `Number(...)`, clamped to `[1, 5]`).
   - `loadProductById(productId)` — needed only to get the `sizes[]` list for the deterministic size stamp.
2. **Filter empty-body records first** — earlier seed iterations left behind feedback rows with just a headline. If `withBody.length === 0` the function returns `[]` (client renders nothing).
3. **Join by user + chronological proximity**, not user alone:
   - Build `ratingsPerUser: Map<userIdentifier, Array<{rating, time}>>` — same reviewer may have posted multiple ratings over successive seed runs.
   - For each feedback, walk that user's rating list and pick the entry with the smallest `|rating.time - feedback.time|` that hasn't been consumed yet (`used = Set<'user:index'>`). Consumed pairs cannot rematch — guarantees 1-to-1 pairing per user.
   - **Fallback rating** when the user's rating list is empty or fully consumed: `Math.round(mean(allRatings))` clamped to `[1, 5]`; defaults to `5` when no ratings exist at all.
4. Field extraction via `value(item, marker)` — reads from `item.formData`. The SDK typing declares `formData` as a flat `FormDataType[]` array; older OE versions returned it wrapped as `{ en_US: FormDataType[] }`. The helper accepts both shapes (flat array primary, `en_US` key fallback) so the loader stays resilient if the wrapping toggles between OE releases. Body plain-text is then extracted via `textValue()` — OE `text`-type cells arrive as `[{plainValue|htmlValue|mdValue}]`; the helper prefers `plainValue`, then strips `<[^>]+>` from `htmlValue`, then `mdValue`.
5. Deterministic size stamp — `pickSize(reviewId, sizes) = sizes[reviewId % sizes.length]`. Same review id always maps to the same size, but different reviewers see different sizes.
6. Date formatting via `toLocaleDateString('en-GB', {day:'2-digit', month:'short', year:'numeric'})`.
7. Return `ProductReview[]` — `{id, author, rating, date, title, body, size, helpful: 0, verified: true}`.

The outer `loadProductReviews` is wrapped in React `cache()` for request-scoped deduplication. The inner form-data fetcher (`cachedFetchFormData`) is additionally wrapped in `unstable_cache` with tag `'oe-reviews'` and `REVALIDATE_HOME` (300 s) TTL — shared across all concurrent PDP renders, eliminating the per-request OE round-trips that dominated PDP p95 under load. When `isOneEntryEnabled === false` or the SDK returns an error the function short-circuits to `[]`.

**SSR wait ceiling.** The `Promise.all([cachedFetchFormData × 2, loadProductById])` is raced against a 2 000 ms timeout. On timeout `loadProductReviews` resolves to `[]` (client renders no reviews block). The abandoned OE fetches continue running behind `unstable_cache`, so their results still populate the Data Cache — the first cold request for a given `productId` may return empty reviews while subsequent requests receive the warm-cached data.

### 8.2 Render

`<ReviewsClient>` (`src/app/pages/product/ReviewsClient.tsx`) receives the array and is **always mounted** — the previous `if (reviews.length === 0) return null` early-return has been removed.

When `reviews.length > 0` it renders:

- `avgRating = round(mean(rating) * 10) / 10` — one-decimal average.
- `ratingCounts` — bucketed by `Math.round(r.rating)` for the 5→4→3→2→1 histogram, `pct = count / total * 100`.
- Left: average rating (5-star + numeric), star histogram.
- Right: `<ProductReviewsSection>` — see §8.2a below. Also renders `<WriteReviewModal>`.

`ReviewsClient` calls `useAuth()` and exposes a `requestWriteReview(_open: boolean)` callback that routes the shopper based on auth state: unauthenticated → `openLoginModal()`; authenticated → `setShowReviewModal(true)`. This is the section-level auth gate for the "Write a Review" CTA (see §8.2b).

### 8.2a Empty state (`ProductReviewsSection`)

When `productReviews.length === 0`, the right-hand column of `ProductReviewsSection` (`src/app/pages/product/ProductReviewsSection.tsx`) renders a dashed-border card containing:

- Heading: `L.emptyHeading` ("No reviews yet") from `PRODUCT_REVIEWS_LABELS` (`src/app/data/productPageLabels.ts`).
- Body copy: `L.emptyBody` ("Be the first to share your thoughts about this product.").

The empty-state card has no button of its own. The left-column bordered "Write a Review" CTA (auth-gated via `ReviewsClient.requestWriteReview`) is the sole entry point for submitting a review when the list is empty.

When `productReviews.length > 0`, the existing `visibleReviews.map` path renders `<ReviewCard>` tiles as before.

### 8.2b Section-level write-review gate

The "Write a Review" CTA inside the reviews section (the left-column button) routes through `requestWriteReview` in `ReviewsClient`, which applies a **three-way gate**:

| Shopper state | Behaviour |
|---|---|
| `isLoggedIn === false` | Calls `openLoginModal()` — shows the login modal. |
| Signed in, but `canReviewProduct(orders, productId) === false` | Sets the `purchaseNotice` state to `PRODUCT_REVIEWS_LABELS.purchaseRequired`. The notice text is forwarded to `<ProductReviewsSection>` via the `purchaseNotice` prop and rendered as a small amber paragraph under the left-column CTA. The notice auto-dismisses after 4 s. |
| Signed in AND has a qualifying delivered order | Calls `setShowReviewModal(true)` — opens `<WriteReviewModal>`. |

`canReviewProduct(orders, productId)` is defined in `src/app/utils/review-eligibility.ts`. It returns `true` when the shopper has at least one order whose `statusIdentifier` matches the regex `/deliver|complete|done|closed|finish|received|arrived/i` AND whose `products[]` list contains the given `productId`. The substring-match pattern follows the convention of `bucketOeStatus` / `computeLtv` so namespaced status markers (e.g. `home_done`, `pickup_delivered`) still resolve correctly.

### 8.3 Rating-row "N reviews" button (top-of-page)

The star row below the product title contains a clickable "N reviews" button that **always smooth-scrolls to `reviewsRef`** (the streaming reviews section anchor). There is no auth or purchase check at this level. All gating lives inside `ReviewsClient`.

`ProductDetailPage.tsx` no longer owns a `showWriteReview` state or a PDP-level `<WriteReviewModal>` mount. `<WriteReviewModal>` is rendered exclusively inside `<ReviewsClient>`.

### 8.3 Submit — `<WriteReviewModal>`

Fields match the live OE schema (probed via `Forms.getFormByMarker`):

- `review_rating` (id 7) — `rating` (integer).
- `review_feedback` (id 8) — `body` (text), `occasions` (list), `add_media` (groupOfImages).

Client-side validation checks that `body` is non-empty and `rating` is set (1–5). Per-field `errors[marker]` is set to `L.requiredFieldsNote` on failure. The Headline, Name, and Email inputs were removed when those attributes were dropped from the OE form — no validation for them exists.

Submit is wrapped in `useTransition` and runs **exactly two sequential** `submitForm` calls (default `moduleConfigId=0`):

1. `submitForm('review_rating', [{marker:'rating', value: String(rating), type:'integer'}])`.
   - Fails → `setSubmitError(res.error)` and **abort**. The second call is never made — orphaned ratings are impossible.
2. `submitForm('review_feedback', [{marker:'body', value: body, type:'text'}, {marker:'occasions', value: selectedOccasions, type:'list'}])` — `selectedOccasions` is a `string[]` of OE marker values (`everyday | work | party | travel | sport`). `FormField.value` accepts `string | string[]`; the wire cast follows the existing sign-up action pattern.
   - Fails → `setSubmitError(res.error)`; the `review_rating` record already exists but has no matching feedback. `loadProductReviews` filters it out via the empty-body guard.

Occasion chips display storefront-facing labels from `WRITE_REVIEW_LABELS.occasions` (`{ value, label }[]` in `src/app/data/productPageLabels.ts`); `value` matches the OE marker, `label` is the display copy rendered in the UI.

Success path (both calls `ok:true`):

- `trackActivity({type:'product_rating', productId, meta:{rating}})` (only when `productId !== undefined`).
- `setSubmitted(true)` — swaps the modal body to a thank-you card with a "Close" CTA.

Media upload input is present (`<input type="file" multiple accept="image/*,video/*" className="hidden" />`) but the current implementation does **not** attach the files to either submit call — it's a stub for a future OE media endpoint.

---

## 9. "You may also like" (`FrequentlyOrderedAsync`)

Loads the CMS block marker `pdp_you_may_also_like` (kind `frequently_ordered_block`) via `loadFrequentlyOrderedBlock(marker, productId)` (`src/lib/oneentry/blocks/page-blocks.ts`). Under the hood two `unstable_cache`-wrapped SDK calls run — `Blocks.getBlockByMarker` (title, position, quantity) and `Blocks.getFrequentlyOrderedProducts(productId, marker, lang)` (the statistics-driven item ids); the ids are then hydrated by `loadProducts({ids})` and mapped through `adaptCatalogProductToUiProduct`. Cache tag: `'oe-block'`; revalidate = `REVALIDATE_HOME`. A process-wide in-flight dedup layer (`getFrequentlyOrderedDedup`, backed by a `Map` pinned to `globalThis.__oneentryFrequentlyOrderedInflight__`) collapses concurrent cold misses on the same `(marker, productId, lang)` key onto a single OE call — the same pattern as `fullCatalogInflight` in `catalog/products.ts`.

**SSR wait ceiling.** The `getFrequentlyOrderedDedup(...)` call is raced against a 2 000 ms timeout. On timeout `_loadFrequentlyOrderedBlock` resolves to `null`, which triggers the existing "empty products array" path — the PDP body streams to completion without a recommendations carousel. The abandoned OE fetch keeps running behind `unstable_cache`, so its result still populates the Data Cache. The first cold request for a given `productId` may therefore see no recommendations; subsequent requests receive the warm-cached data.

**No backfill.** `FrequentlyOrderedAsync` renders whatever OE returns and hides (returns `null`) when the block is empty. The former category-tree walk that called `loadProducts({categoryPath, limit: 16, unique: true})` for each ancestor path has been removed. Under load that walk tunnelled through `loadFullCatalog` (the full 2 000-item / ~30 MB catalog dump) on every PDP render for any tenant where `frequently_ordered_block` returned fewer than 8 items — flooding OE and dragging PDP p95 into the 30-second range under 20 VU. The `categoryPath` prop and the `adaptCatalogProductToUiProduct` import have also been removed from `FrequentlyOrderedAsync`.

The gender-filter pass (`genderOk`) still applies to the products returned directly by OE. If the resulting list is empty, `FrequentlyOrderedAsync` returns `null` (Suspense fallback disappears, no carousel — cheaper failure mode than backfilling).

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
| `src/app/pages/product/FrequentlyOrderedAsync.tsx` + `FrequentlyOrderedClient.tsx` | You-may-also-like slot; hides when OE returns nothing (no backfill) |
| `src/app/pages/product/RecommendationsCarousel.tsx` + `RecommendationsSkeleton.tsx` | Horizontal carousel |
| `src/app/pages/product/RecentlyViewedSection.tsx` | Lazy-loaded recently-viewed |
| `src/lib/oneentry/discounts/purchase-bonus.ts` | `loadPurchaseBonusForProduct` — discount eligibility + points calculation |
| `src/lib/oneentry/catalog/products.ts` | `loadProductById`, adapter |
| `src/lib/oneentry/catalog/reviews.ts` | `loadProductReviews` |
| `src/lib/oneentry/blocks/page-blocks.ts` | `loadFrequentlyOrderedBlock`, `loadBlockWithProducts` |
| `src/lib/oneentry/forms/submit.ts` | `submitForm` for reviews + reserve |
| `src/app/utils/review-eligibility.ts` | `canReviewProduct(orders, productId)` — purchase-gate helper |
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

**Review summary (QuickView-only):** on modal open, `QuickViewModal` calls `getProductReviewSummary(productId)` (`src/lib/oneentry/catalog/reviews-actions.ts`, `'use server'`) and shows a pulse placeholder while in-flight. When the promise resolves:

The rating row layout matches the PDP sub-title: the shared `<StarRating>` SVG component is always rendered (empty grey strip when `count === 0`), followed by an underlined "N reviews" link (no parentheses), a `|` divider, and a stock-status label that mirrors the PDP four-way availability display: `out_of_stock` → grey "Out of Stock" (`PA.outOfStock`), `coming_soon` → grey "Coming soon" (`PA.comingSoon`), `preorder` → amber "Pre-order" (`PA.preOrder`), and any other value → green "In Stock" (`PA.inStock`). The label prefers `activeVariant.statusIdentifier` and falls back to `product.statusIdentifier` so a colour-specific pre-order shows the correct copy. `<StarRating>` is the same component used on the PDP — the two views are visually identical.

- `count === 0` — the "N reviews" link runs `startWriteReview` with a three-way gate: `isLoggedIn === false` → closes QuickView and calls `openLoginModal()`; signed in but `canReviewProduct(orders, productId) === false` → shows an inline amber `showPurchaseNotice` under the rating row (purchase required); signed in with a qualifying delivered order → opens `WriteReviewModal` stacked on top of QuickView. When `WriteReviewModal` closes, `getProductReviewSummary` is re-called and the row updates to reflect any just-submitted review.
- `count > 0` — the "N reviews" link navigates to `/product/{id}#reviews`. Viewing existing reviews is **not** auth-gated.

No hardcoded star or review-count values remain.

**Strike-through price guard.** `QuickViewModal` derives an `originalPriceRef` that anchors both numbers to the same source before deciding whether to render a sale pair:

- When the matched `activeVariant` carries its own `salePrice`, `originalPriceRef = activeVariant.price` and `activeSalePrice = activeVariant.salePrice`.
- Otherwise (family-level sale rule or no variant match), `originalPriceRef = product.price` and `activeSalePrice = activeVariant?.salePrice ?? product.salePrice`.

The strike pair renders **only** when `activeSalePrice < originalPriceRef`. If the family sale price is at or above the variant's "was" price (e.g. a bulk rule that already priced the variant lower), the modal falls back to a plain-price render rather than showing `−0%` or an inverted badge. This mirrors the `hasVisibleDiscount` guard on the PDP (§4).

**Deliberate omissions vs PDP:**
- No `product_view` analytics (Quick View isn't a page).
- No recently-viewed dispatch / hydrate.
- No full reviews stream, no "You May Also Like" carousel.
- No share dropdown.
- No URL sync for colour/size (all state is modal-local).
- No full reviews stream, no direct link-out to the PDP `#reviews` section for "Be the first" (that CTA now opens `WriteReviewModal` in-modal when logged in, or the login flow when logged out).

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
