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

**ISR:** `export const revalidate = REVALIDATE_PRODUCT` (600 s in prod, from `src/lib/isr.ts`).

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
- `?size=` in the URL seeds the initial pick.

### 3.3 Variant states

| `statusIdentifier` | UI behavior |
|---|---|
| (`null` / normal) | Add-to-Cart primary CTA enabled once size is picked |
| `preorder` | CTA changes to "Pre-Order"; swatch stays selectable |
| `coming_soon` | Swatch selectable, CTA disabled + labelled "Coming soon" |
| `out_of_stock` | Swatch shown with strikethrough; CTA disabled |

---

## 4. Add-to-Cart

`ProductDetailPage` → `useCart().addItem({id, name, brand, color, sku, size, quantity: 1, price, originalPrice, image})`.

Business rules:

- If size is not selected, the primary CTA renders an inline error for 2 s (`markAddedToCart` is not called).
- On success, `openMiniCart()` fires and the CTA flashes "Added" with a check-mark for 2 s (`useProductPageUIState.addedToCart`).
- `trackActivity('product_add_to_cart', {productId: cmsId, meta: {quantity}})` — only when `getCmsProductId(product.id)` resolves.
- Sync to OE happens via the debounced 400 ms effect in `CartContext` (see [CART_WISHLIST.md](./CART_WISHLIST.md) §5).

---

## 5. Wishlist toggle

`useWishlist().toggleItem({id, name, brand, price, salePrice, image, colorImages, colors, colorStock, sizes, inStock})` — the heart CTA. Colour/size selection is persisted via `updateSelection(id, {selectedColor, selectedSize})` whenever the user picks a new variant on the PDP.

Server sync is fire-and-forget through `syncWishlistAction` (debounced 400 ms).

---

## 6. Share dropdown

`<ProductShareDropdown>` (`src/app/pages/product/ProductShareDropdown.tsx`):

- Copy link — `navigator.clipboard.writeText(window.location.href)` + 2 s "Copied!" toast.
- Facebook / X / Pinterest / WhatsApp — deep-link URLs with encoded title + image.

Click-outside close via `useProductPageUIState.shareRef`.

---

## 7. Reserve in store (`ReserveInStoreModal`)

Modal opens from the "Reserve in Store" CTA (below the primary Add-to-Cart button).

Flow:

1. Select store (renders in/low/out badges from the OE stock hint).
2. Select size (pre-populated from the main-form selection).
3. Fill first name, last name, phone, email, pickup date (min = tomorrow), accept T&Cs.
4. Submit → `submitForm('reserve_in_store', [size, first_name, last_name, phone, email, pickup_date, agreed_terms, reserve_in_store_form_select_store])`.
5. Success screen shows a reference code (`OE-${UUID.slice(0,6).toUpperCase()}`) + receipt summary.

Validation (client-side): phone regex `/^[+\d\s\-()\\.]{7,}$/`, basic email regex, all fields required.

No server-side inventory hold — the storefront just records the reservation as form-data. Fulfilment happens off-platform.

---

## 8. Reviews

### 8.1 Load

`<ReviewsAsync>` (RSC) calls `loadProductReviews(productId, limit=100)` from `src/lib/oneentry/catalog/reviews.ts`. Internals:

1. Parallel fetch of two form-data endpoints:
   - `review_feedback` (moduleConfigId `13`) — fields `headline`, `body`, `name`, `email`, `occasions`.
   - `review_rating` (moduleConfigId `12`) — field `rating` (1–5).
2. Join feedback + rating records by user + chronological proximity (each feedback pairs with the closest-timed rating from the same author).
3. Filter empty-body records.
4. Return `ProductReview[]` — `{id, author, rating, date, title, body, size (deterministic rotation), helpful: 0, verified: true}`.

Cached with React `cache()`; no additional TTL.

### 8.2 Render

`<ReviewsClient>` receives the array and renders:

- Left: average rating (5-star), star histogram (5→1 counts).
- Right: list of `<ReviewCard>` (initially 3, "Show All" reveals the rest), `<WriteReviewModal>` trigger.

### 8.3 Submit

`<WriteReviewModal>` submits in sequence:

1. `submitForm('review_rating', [{marker:'rating', value: rating.toString(), type:'string'}])`.
2. `submitForm('review_feedback', [{marker:'headline'...}, {marker:'body'}, {marker:'name'}, {marker:'email'}, {marker:'occasions'}])`.

Success → `trackActivity('product_rating', {productId, meta:{rating}})` and the modal closes with a thank-you card.

Failure surfaces a per-form error; the second submit is not attempted if the first fails.

---

## 9. "You may also like" (`FrequentlyOrderedAsync`)

Loads the CMS block marker `pdp_you_may_also_like` (kind `frequently_ordered_block`) via `loadFrequentlyOrderedBlock(pageId)` (`src/lib/oneentry/blocks/page-blocks.ts`).

Backfill: if the block returns fewer than 8 items, `FrequentlyOrderedAsync` walks up the category tree (e.g. `/women/women_clothing/outerwear` → `/women/women_clothing` → `/women`) fetching category shelf items via `loadProducts` until it hits 8. Dedupes by product id and gender-filters (women / men / unisex).

Rendered by `<FrequentlyOrderedClient>` in a horizontal carousel (`<RecommendationsCarousel>`). "View All" points at the deepest matched category page.

---

## 10. Special Offers (`ProductSpecialOffers`)

Loads the CMS block marker `special_offers` (kind `bought_together`) — manually curated bundle set, not statistics-driven. Each entry is a `{title, price, image, href}` product tile that opens in a new tab.

---

## 11. Recently viewed

`<RecentlyViewedSection>` reads `useAppSelector(selectRecentlyViewed)`. On mount it:

- Filters by gender (same as current product) and dedupes by product name.
- Excludes the currently viewed product.
- Renders up to 5 tiles in a grid; scrolls into view via `IntersectionObserver` (lazy-loaded).

For signed-in users, mount also fires `pushRecentlyViewedAction({productId, viewedAt: Date.now()})` (see [CART_WISHLIST.md](./CART_WISHLIST.md) §8.1).

---

## 12. Size Guide (`SizeGuideModal`)

Read-only table showing XS → XL conversions (US size, bust / waist / hip in inches). Data source: `src/app/data/sizeGuide.ts` (women's clothing). Modal trigger sits above the size grid.

`<QuickViewSizeGuide>` is a compact variant embedded in the Quick View modal.

---

## 13. Analytics events

The PDP emits the following via `trackActivity`:

- `product_view` on mount.
- `product_add_to_cart` when Add-to-Cart succeeds.
- `product_add_to_wishlist` / `product_remove_from_wishlist` via the wishlist toggle.
- `product_rating` after a successful review submit.
- `product_purchase` — dispatched from `ConfirmationPage`, not the PDP.

`page_view` for `/product/*` is **suppressed** in `PageViewTracker.tsx` to avoid double counting with `product_view`.

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
- `useFocusTrap(isOpen, closeQuickView)` — Tab/Shift-Tab confined, Escape closes, previous focus restored.
- Variant look-up runs on every change: `product.variants.find(v => v.colors.includes(hex))`, sizes further filtered by `v.sizes.includes(selectedSize)`.

**Actions:**
- **Add to Cart** — same rules as PDP: size required, opens MiniCart on success, tracks `product_add_to_cart`.
- **Save to Wishlist** — persists `{selectedColor, selectedSize}` via `updateSelection`.
- **View full details** — closes modal and `router.push('/product/[id]?color=&size=')` with the current variant.
- **Size guide** — swaps modal content in-place via `QuickViewSizeGuide` (no nested modal).

**A11y:** all icon buttons carry `aria-label`s from `MINI_CART_ARIA_LABELS`; focus trap runs while `isOpen`.

QuickView deliberately does NOT stream reviews / recommendations / recently-viewed — that's a PDP-only concern.

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
