'use client';
import { AlertTriangle, ArrowRight, ChevronRight, ShoppingBag, Trash2 } from 'lucide-react';
import { useState } from 'react';
import { useSelector } from 'react-redux';

import { PageBlocksRenderer } from '@/app/components/blocks/PageBlocksRenderer';
import { Footer } from '@/app/components/footer/Footer';
import { Header } from '@/app/components/header/Header';
import type { Product } from '@/app/components/product/ProductCard';
import { ACCENT_WOMEN as ACCENT, SALE_COLOR } from '@/app/constants/colors';
import { useAuth } from '@/app/context/AuthContext';
import { useCart } from '@/app/context/CartContext';
import { useWishlist } from '@/app/context/WishlistContext';
import { extractCmsProductId } from '@/app/data/cms-product-id-map';
import { FAVORITES_PAGE_LABELS } from '@/app/data/favoritesLabels';
import { useMounted } from '@/app/hooks/useMounted';
import type { RootState } from '@/app/store';
import { useRouter } from '@/lib/i18n/navigation';
import type { PageBlock } from '@/lib/oneentry/blocks/page-blocks';
import { useDict, useT } from '@/lib/oneentry/labels/DictContext';

import { FavoriteCard } from './favorites/FavoriteCard';
import { FavoritesCarousel } from './favorites/FavoritesCarousel';
import { FavoritesEmptyState } from './favorites/FavoritesEmptyState';
import { RecentlyViewedSection } from './product/RecentlyViewedSection';

/* ─── Main Page ─── */
export function FavoritesPage({
  recommended = [],
  trending = [],
  pageBlocks,
}: {
  recommended?: Product[];
  trending?: Product[];
  /**
   * OE-attached blocks for the `favorites` page. Rendered above the
   *  wishlist header via `<PageBlocksRenderer>`.
   */
  pageBlocks?: PageBlock[];
} = {}) {
  const L = useDict('favorites_page_', FAVORITES_PAGE_LABELS);
  const { items, clearAll, count } = useWishlist();
  const { addItem: addToCart } = useCart();
  const router = useRouter();
  const [showClearConfirm, setShowClearConfirm] = useState(false);
  const mounted = useMounted();
  // Every visible string resolves through the OE `favorites_page` set, with the
  // local dictionary as the offline fallback — a partially wired page would let
  // an editor change some labels while others stayed frozen in code.
  const lItems = useT('favorites_page_items', L.itemPlural);
  const lItem = useT('favorites_page_item', L.itemSingular);
  const lMoveAll = useT('favorites_page_move_all_to_bag', L.moveAllToBag);
  const lClearAll = useT('favorites_page_clear_all', L.clearAll);
  const lBottom = useT('favorites_page_bottom_link', L.ctaContinue);
  const lCrumbHome = useT('favorites_page_breadcrumb_home', L.breadcrumbHome);
  const lCrumbCurr = useT('favorites_page_breadcrumb_current', L.breadcrumbCurrent);
  const lTitle = useT('favorites_page_title', L.pageTitle);
  const lConfirm = useT('favorites_page_confirm_clear', L.confirmClear);
  const lYes = useT('favorites_page_confirm_yes', L.confirmYes);
  const lCancel = useT('favorites_page_confirm_cancel', L.confirmCancel);
  const lDropTitle = useT('favorites_page_price_drop_title', L.priceDropTitle);
  const lDropBody = useT('favorites_page_price_drop_body', L.priceDropBody);
  const lRecommend = useT('favorites_page_recommended', L.recommendedHeading);
  const lTrending = useT('favorites_page_trending', L.trendingHeading);

  // Live Recently-Viewed trail from Redux (shared with PDP). Dedupe by title
  // so different variants of the same product (Pink XL / White M / …) don't
  // each surface as separate tiles.
  const recentlyViewed = useSelector((s: RootState) => s.recentlyViewed.items);
  const recentlyViewedUnique = (() => {
    const seen = new Set<string>();
    const out: Product[] = [];
    for (const p of recentlyViewed) {
      const key = (p.name || p.id).toLowerCase().trim();
      if (seen.has(key)) continue;
      seen.add(key);
      out.push(p);
    }
    return out;
  })();

  // Gender preference for the recommended / trending carousels:
  //   1. Logged-in user with an explicit `gender` — use it.
  //   2. Guest (or user without gender): infer from the Redux Recently-Viewed
  //      trail — pick the majority side. Older items may have blank `gender`
  //      (pushed before the adapter fallback existed), so we also parse the
  //      product name (`Men ...` / `Women ...`) as a last-resort hint.
  //   3. Nothing to go on — leave both feeds unfiltered.
  const { isLoggedIn, user } = useAuth();
  const genderOf = (p: Product): 'W' | 'M' | 'U' | '' => {
    if (p.gender === 'W' || p.gender === 'M' || p.gender === 'U') return p.gender;
    const name = (p.name || '').toLowerCase();
    if (/\bmen('s)?\b/.test(name)) return 'M';
    if (/\bwomen('s)?\b/.test(name)) return 'W';
    // Older Redux entries persisted before the adapter carried gender don't
    // have anything on the `Product` object — fall back to OE's file-code
    // convention baked into image URLs: `SO-W-…`, `O-W-…`, `OE-W-…` mark
    // women, `-M-` marks men.
    const img = (p.image || '').toLowerCase();
    const m = img.match(/\/[a-z]+-([wm])-[a-z0-9]/);
    if (m?.[1] === 'w') return 'W';
    if (m?.[1] === 'm') return 'M';
    return '';
  };
  const preferredGender: 'W' | 'M' | null = (() => {
    if (isLoggedIn && user?.gender === 'female') return 'W';
    if (isLoggedIn && user?.gender === 'male') return 'M';
    let w = 0;
    let m = 0;
    for (const p of recentlyViewed) {
      const g = genderOf(p);
      if (g === 'W') w++;
      else if (g === 'M') m++;
    }
    if (w > m) return 'W';
    if (m > w) return 'M';
    return null;
  })();
  const matchesPreferredGender = (p: Product) => {
    if (!preferredGender) return true;
    const g = genderOf(p);
    // Unisex or truly unknown items always show.
    if (!g || g === 'U') return true;
    return g === preferredGender;
  };
  // Gender-scoped filtering only kicks in after mount — `preferredGender` is
  // computed from client-only state (Redux Recently-Viewed hydrates from
  // localStorage, auth resolves via async bootstrap), so applying it during
  // SSR / the first client render would swap product tiles between the two
  // passes and trip React's hydration mismatch warning. Same shape either
  // way so the empty-first-paint doesn't jump.
  const RECOMMENDATION_PRODUCTS_SCOPED = mounted ? recommended.filter(matchesPreferredGender) : recommended;
  const TRENDING_PRODUCTS_SCOPED = mounted ? trending.filter(matchesPreferredGender) : trending;

  const handleMoveAllToCart = () => {
    // Forward `originalPrice` so sale items keep the strike-through UX
    // downstream; strip suffix from id so `syncCart` / preview see a
    // clean numeric productId (previous `${id}-auto` id dropped the
    // line from `getCmsProductId`-based checks).
    const parsePrice = (s?: string) => parseFloat(String(s ?? '').replace(/[^0-9.]/g, '')) || 0;
    items
      .filter((i) => i.inStock)
      .forEach((item) => {
        const priceNumber = parsePrice(item.salePrice ?? item.price);
        const originalPrice = item.salePrice ? parsePrice(item.price) : undefined;
        const cmsId = extractCmsProductId(item.id);
        const cartId = cmsId !== null ? String(cmsId) : item.id;
        addToCart({
          id: cartId,
          name: item.name,
          price: priceNumber,
          ...(originalPrice !== undefined && { originalPrice }),
          image: item.image,
          size: item.selectedSize ?? item.sizes[0] ?? '',
          color: item.colors[0] ?? '',
          quantity: 1,
          brand: item.brand ?? '',
          sku: cartId,
        });
      });
  };

  return (
    <div
      className="min-h-screen bg-white font-sans"
      style={{ '--sale': SALE_COLOR, '--accent': ACCENT } as React.CSSProperties}
    >
      <Header />

      <main id="main-content" className="pb-20">
        {/* Breadcrumb */}
        <nav className="mb-6 flex items-center gap-2 px-4 pt-6 text-xs tracking-wide text-gray-400 lg:px-8">
          <button
            onClick={() => router.push('/')}
            className="transition-colors hover:text-black focus-visible:outline-none"
            data-testid="favorites-breadcrumb-home"
          >
            {lCrumbHome}
          </button>
          <ChevronRight size={12} />
          <span className="font-semibold text-black" data-testid="favorites-breadcrumb-current">
            {lCrumbCurr}
          </span>
        </nav>

        {/* Page Header */}
        <div className="mb-8 flex flex-col justify-between gap-4 border-b-2 border-black px-4 pb-4 sm:flex-row sm:items-center lg:px-8">
          <div className="flex items-baseline gap-3">
            <h1 className="text-2xl font-bold tracking-[0.12em] uppercase" data-testid="favorites-title">
              {lTitle}
            </h1>
            <span className="text-sm text-gray-400">
              ({mounted ? count : 0} {mounted && count === 1 ? lItem : lItems})
            </span>
          </div>

          {mounted && count > 0 && (
            <div className="flex items-center gap-3">
              <button
                onClick={handleMoveAllToCart}
                className="flex items-center gap-2 bg-black px-4 py-2.5 text-xs font-bold tracking-wider text-white uppercase transition-opacity hover:opacity-90 focus-visible:outline-none"
              >
                <ShoppingBag size={13} />
                {lMoveAll}
              </button>
              {!showClearConfirm ? (
                <button
                  onClick={() => setShowClearConfirm(true)}
                  className="flex items-center gap-2 border border-[#d1d5db] px-4 py-2.5 text-xs font-semibold tracking-wider text-[#666] uppercase transition-colors hover:bg-gray-50 focus-visible:outline-none"
                >
                  <Trash2 size={12} />
                  {lClearAll}
                </button>
              ) : (
                <div className="flex items-center gap-2">
                  <span className="text-xs text-gray-500">{lConfirm}</span>
                  <button
                    onClick={() => {
                      clearAll();
                      setShowClearConfirm(false);
                    }}
                    className="bg-(--sale) px-3 py-1.5 text-xs font-bold text-white uppercase focus-visible:outline-none"
                  >
                    {lYes}
                  </button>
                  <button
                    onClick={() => setShowClearConfirm(false)}
                    className="border border-[#d1d5db] px-3 py-1.5 text-xs uppercase hover:bg-gray-50 focus-visible:outline-none"
                  >
                    {lCancel}
                  </button>
                </div>
              )}
            </div>
          )}
        </div>

        {/* Content */}
        {!mounted ? (
          /* Skeleton grid — shown before hydration */
          <div
            className="grid grid-cols-2 gap-px bg-white px-4 sm:grid-cols-3 lg:grid-cols-4 lg:px-8"
            aria-hidden="true"
          >
            {Array.from({ length: 8 }).map((_, i) => (
              <div
                key={i}
                className="flex flex-col bg-white [animation-delay:var(--delay)]"
                style={{ '--delay': `${i * 60}ms` } as React.CSSProperties}
              >
                <div className="aspect-3/4 animate-pulse bg-gray-100" />
                <div className="flex flex-col gap-2 p-3">
                  <div className="h-3 w-1/3 animate-pulse rounded bg-gray-100" />
                  <div className="h-3 w-2/3 animate-pulse rounded bg-gray-100" />
                  <div className="h-4 w-1/4 animate-pulse rounded bg-gray-100" />
                  <div className="mt-1 h-9 animate-pulse rounded bg-gray-100" />
                </div>
              </div>
            ))}
          </div>
        ) : count === 0 ? (
          <FavoritesEmptyState />
        ) : (
          <>
            {/* Price drop notice */}
            {items.some((i) => i.priceAlert) && (
              <div className="mb-0 flex items-center gap-3 border border-[#FDE68A] bg-[#FFFBEB] px-4 py-3 text-sm">
                <AlertTriangle size={16} className="shrink-0 text-[#D97706]" />
                <p className="text-[#92400E]">
                  <span className="font-bold">{lDropTitle}</span> {lDropBody}
                </p>
              </div>
            )}

            {/* Product Grid — edge to edge */}
            <div className="mb-16 grid grid-cols-2 gap-px bg-white sm:grid-cols-3 lg:grid-cols-4">
              {items.map((item) => (
                <FavoriteCard key={item.id} item={item} />
              ))}
            </div>
          </>
        )}

        {/* Recommendations */}
        <div className="space-y-12 border-t border-gray-200 px-4 pt-12 lg:px-8">
          <FavoritesCarousel title={lRecommend} products={RECOMMENDATION_PRODUCTS_SCOPED} />
          <FavoritesCarousel title={lTrending} products={TRENDING_PRODUCTS_SCOPED} />
        </div>

        {/* Recently Viewed — reads the live Redux trail so what the shopper
            actually browsed on PDPs surfaces here (matches the PDP block
            visually and in content, deduped by title). */}
        {recentlyViewedUnique.length > 0 && (
          <RecentlyViewedSection products={recentlyViewedUnique} accentColor={ACCENT} />
        )}

        {/* Back to Catalog CTA */}
        <div className="mt-16 px-4 text-center lg:px-8">
          <button
            onClick={() => router.push(L.ctaContinueHref)}
            className="inline-flex items-center gap-2 text-sm font-bold tracking-wider uppercase transition-all hover:gap-3 focus-visible:outline-none"
          >
            {lBottom} <ArrowRight size={16} />
          </button>
        </div>

        {/* OE-attached blocks for the `favorites` page — rendered at the
            bottom below the wishlist / recommendations. Empty → nothing. */}
        {pageBlocks && pageBlocks.length > 0 && <PageBlocksRenderer blocks={pageBlocks} />}
      </main>

      <Footer />
    </div>
  );
}
