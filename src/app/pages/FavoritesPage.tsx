'use client'
import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { Header } from '../components/Header';
import { Footer } from '../components/Footer';
import { useWishlist } from '../context/WishlistContext';
import { useCart } from '../context/CartContext';
import {
  ShoppingBag, ChevronRight,
  ArrowRight, Trash2, AlertTriangle,
} from 'lucide-react';
import { ACCENT_WOMEN as ACCENT, SALE_COLOR } from '../constants/colors';
import { FavoriteCard } from './favorites/FavoriteCard';
import { FavoritesCarousel } from './favorites/FavoritesCarousel';
import { FavoritesEmptyState } from './favorites/FavoritesEmptyState';
import { RecentlyViewedSection } from './product/RecentlyViewedSection';
import { FAVORITES_PAGE_LABELS as L } from '../data/favoritesLabels';
import { useFavoritesPageT } from '../../lib/oneentry/labels/FavoritesPageLabelsContext';
import type { Product } from '../components/ProductCard';
import { useSelector } from 'react-redux';
import type { RootState } from '../store';
import { useAuth } from '../context/AuthContext';


/* ─── Main Page ─── */
export function FavoritesPage({
  recommended = [],
  trending = [],
}: {
  recommended?: Product[];
  trending?: Product[];
} = {}) {
  const RECOMMENDATION_PRODUCTS = recommended;
  const TRENDING_PRODUCTS = trending;
  const { items, clearAll, count } = useWishlist();
  const { addItem: addToCart } = useCart();
  const router = useRouter();
  const [showClearConfirm, setShowClearConfirm] = useState(false);
  const [mounted, setMounted] = useState(false);
  const lItems    = useFavoritesPageT('favorites_page_items',           L.itemPlural);
  const lMoveAll  = useFavoritesPageT('favorites_page_move_all_to_bag', L.moveAllToBag);
  const lClearAll = useFavoritesPageT('favorites_page_clear_all',       L.clearAll);
  const lBottom   = useFavoritesPageT('favorites_page_bottom_link',     L.ctaContinue);
  useEffect(() => { setMounted(true); }, []);

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
  const RECOMMENDATION_PRODUCTS_SCOPED = recommended.filter(matchesPreferredGender);
  const TRENDING_PRODUCTS_SCOPED = trending.filter(matchesPreferredGender);

  const handleMoveAllToCart = () => {
    items.filter(i => i.inStock).forEach(item => {
      addToCart({
        id: `${item.id}-auto`,
        name: item.name,
        price: parseFloat((item.salePrice ?? item.price).replace(/[^0-9.]/g, '')) || 0,
        image: item.image,
        size: item.sizes[0] ?? '',
        color: '',
        quantity: 1,
        brand: item.brand ?? '',
        sku: item.id,
      });
    });
  };

  return (
    <div
      className="min-h-screen bg-white font-[Inter,sans-serif]"
      style={{ '--sale': SALE_COLOR, '--accent': ACCENT } as React.CSSProperties}
    >
      <Header />

      <main id="main-content" className="pb-20">

        {/* Breadcrumb */}
        <nav className="flex items-center gap-2 text-xs text-gray-400 px-4 lg:px-8 pt-6 mb-6 tracking-wide">
          <button onClick={() => router.push('/')} className="hover:text-black transition-colors focus-visible:outline-none">{L.breadcrumbHome}</button>
          <ChevronRight size={12} />
          <span className="text-black font-semibold">{L.breadcrumbCurrent}</span>
        </nav>

        {/* Page Header */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-8 px-4 lg:px-8 border-b-2 border-black pb-4">
          <div className="flex items-baseline gap-3">
            <h1 className="text-2xl tracking-[0.12em] uppercase font-bold">{L.pageTitle}</h1>
            <span className="text-sm text-gray-400">({mounted ? count : 0} {mounted && count === 1 ? L.itemSingular : lItems})</span>
          </div>

          {mounted && count > 0 && (
            <div className="flex items-center gap-3">
              <button
                onClick={handleMoveAllToCart}
                className="flex items-center gap-2 px-4 py-2.5 text-white text-xs tracking-wider uppercase focus-visible:outline-none hover:opacity-90 transition-opacity bg-black font-bold"
              >
                <ShoppingBag size={13} />
                {lMoveAll}
              </button>
              {!showClearConfirm ? (
                <button
                  onClick={() => setShowClearConfirm(true)}
                  className="flex items-center gap-2 px-4 py-2.5 text-xs tracking-wider uppercase focus-visible:outline-none hover:bg-gray-50 transition-colors border border-[#d1d5db] text-[#666] font-semibold"
                >
                  <Trash2 size={12} />
                  {lClearAll}
                </button>
              ) : (
                <div className="flex items-center gap-2">
                  <span className="text-xs text-gray-500">{L.confirmClear}</span>
                  <button
                    onClick={() => { clearAll(); setShowClearConfirm(false); }}
                    className="px-3 py-1.5 text-white text-xs uppercase focus-visible:outline-none bg-[var(--sale)] font-bold"
                  >
                    {L.confirmYes}
                  </button>
                  <button
                    onClick={() => setShowClearConfirm(false)}
                    className="px-3 py-1.5 text-xs uppercase focus-visible:outline-none hover:bg-gray-50 border border-[#d1d5db]"
                  >
                    {L.confirmCancel}
                  </button>
                </div>
              )}
            </div>
          )}
        </div>

        {/* Content */}
        {!mounted ? (
          /* Skeleton grid — shown before hydration */
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-px bg-white px-4 lg:px-8" aria-hidden="true">
            {Array.from({ length: 8 }).map((_, i) => (
              <div
                key={i}
                className="flex flex-col bg-white [animation-delay:var(--delay)]"
                style={{ '--delay': `${i * 60}ms` } as React.CSSProperties}
              >
                <div className="aspect-[3/4] bg-gray-100 animate-pulse" />
                <div className="p-3 flex flex-col gap-2">
                  <div className="h-3 bg-gray-100 animate-pulse rounded w-1/3" />
                  <div className="h-3 bg-gray-100 animate-pulse rounded w-2/3" />
                  <div className="h-4 bg-gray-100 animate-pulse rounded w-1/4" />
                  <div className="h-9 bg-gray-100 animate-pulse rounded mt-1" />
                </div>
              </div>
            ))}
          </div>
        ) : count === 0 ? (
          <FavoritesEmptyState />
        ) : (
          <>
            {/* Price drop notice */}
            {items.some(i => i.priceAlert) && (
              <div className="flex items-center gap-3 px-4 py-3 mb-0 text-sm bg-[#FFFBEB] border border-[#FDE68A]">
                <AlertTriangle size={16} className="text-[#D97706] flex-shrink-0" />
                <p className="text-[#92400E]">
                  <span className="font-bold">{L.priceDropTitle}</span>
                  {' '}{L.priceDropBody}
                </p>
              </div>
            )}

            {/* Product Grid — edge to edge */}
            <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-px bg-white mb-16">
              {items.map(item => (
                <FavoriteCard key={item.id} item={item} />
              ))}
            </div>
          </>
        )}

        {/* Recommendations */}
        <div className="space-y-12 pt-12 px-4 lg:px-8 border-t border-gray-200">
          <FavoritesCarousel title={L.recommendedHeading} products={RECOMMENDATION_PRODUCTS_SCOPED} />
          <FavoritesCarousel title={L.trendingHeading} products={TRENDING_PRODUCTS_SCOPED} />
        </div>

        {/* Recently Viewed — reads the live Redux trail so what the shopper
            actually browsed on PDPs surfaces here (matches the PDP block
            visually and in content, deduped by title). */}
        {recentlyViewedUnique.length > 0 && (
          <RecentlyViewedSection products={recentlyViewedUnique} accentColor={ACCENT} />
        )}

        {/* Back to Catalog CTA */}
        <div className="mt-16 text-center px-4 lg:px-8">
          <button
            onClick={() => router.push(L.ctaContinueHref)}
            className="inline-flex items-center gap-2 text-sm tracking-wider uppercase focus-visible:outline-none hover:gap-3 transition-all font-bold"
          >
            {lBottom} <ArrowRight size={16} />
          </button>
        </div>
      </main>

      <Footer />
    </div>
  );
}
