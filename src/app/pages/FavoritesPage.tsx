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
import { FAVORITES_PAGE_LABELS as L } from '../data/favoritesLabels';
import { useFavoritesPageT } from '../../lib/oneentry/labels/FavoritesPageLabelsContext';
import type { Product } from '../components/ProductCard';


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
                <div className="aspect-[3/4] bg-accent animate-pulse" />
                <div className="p-3 flex flex-col gap-2">
                  <div className="h-3 bg-accent animate-pulse rounded w-1/3" />
                  <div className="h-3 bg-accent animate-pulse rounded w-2/3" />
                  <div className="h-4 bg-accent animate-pulse rounded w-1/4" />
                  <div className="h-9 bg-accent animate-pulse rounded mt-1" />
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
          <FavoritesCarousel title={L.recommendedHeading} products={RECOMMENDATION_PRODUCTS} />
          <FavoritesCarousel title={L.trendingHeading} products={TRENDING_PRODUCTS} />
        </div>

        {/* Recently Viewed — TRENDING NOW style */}
        <div className="border-t border-gray-100 py-12 px-4 lg:px-8 bg-gray-50">
          <div className="max-w-screen-2xl mx-auto">
            <div className="mb-6">
              <p className="text-xs tracking-[0.3em] uppercase text-gray-400 mb-1">{L.recentlyViewedEyebrow}</p>
              <h2 className="tracking-widest uppercase text-[clamp(1rem,2vw,1.25rem)] font-bold">{L.recentlyViewedHeading}</h2>
            </div>
            <FavoritesCarousel title="" products={[...RECOMMENDATION_PRODUCTS].reverse()} />
          </div>
        </div>

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
