'use client'
import { useState, useEffect, useRef } from 'react';
import { Header } from '../components/Header';
import { Footer } from '../components/Footer';
import { ProductCard, type Product } from '../components/ProductCard';
import { ProductCardSkeleton } from '../components/ProductCardSkeleton';
import { ColsIcon, SortOptionBtn as SortOption } from '../components/CatalogTemplate.parts';
import { ChevronDown } from 'lucide-react';
import { NEW_ARRIVALS_SORT_OPTIONS, NEW_ARRIVALS_CATEGORIES, type NewArrivalCategory } from '../data/newArrivalsConfig';
import { NewArrivalsHero } from './new/NewArrivalsHero';
import { useAppDispatch, useAppSelector } from '../store/hooks';
import {
  setFilters,
  setSort,
  setViewCols as dispatchSetViewCols,
} from '../store/catalogSlice';
import { ACCENT_WOMEN as ACCENT } from '../constants/colors';
import { NEW_ARRIVALS_PAGE_LABELS as L, NEW_ARRIVALS_CATEGORY_LABELS as NACL } from '../data/newArrivalsLabels';
import { CURRENCY } from '../data/currencyConfig';
import { useNewArrivalsPageT } from '../../lib/oneentry/labels/NewArrivalsPageLabelsContext';
import { PageBlocksRenderer } from '../components/PageBlocksRenderer';
import type { PageBlock } from '../../lib/oneentry/blocks/page-blocks';
import type { NewArrivalsPageFromCms } from '../../lib/oneentry/catalog/new-arrivals-page';

const NEW_KEY = 'new-arrivals';
type NewProduct = Product & { category: Exclude<NewArrivalCategory, 'All'> };

export function NewArrivalsPage({ initialProducts, pageBlocks, cmsPage }: { initialProducts?: NewProduct[]; pageBlocks?: PageBlock[]; cmsPage?: NewArrivalsPageFromCms | null } = {}) {
  // UI-only state
  const [sortOpen, setSortOpen] = useState(false);
  const [mounted, setMounted] = useState(false);
  const lStyles  = useNewArrivalsPageT('new_arrivals_page_styles',  L.stylesSuffix);
  const lView    = useNewArrivalsPageT('new_arrivals_page_view',    L.viewLabel);
  const lResults = useNewArrivalsPageT('new_arrivals_page_results', L.resultPlural);

  // Redux state
  const dispatch = useAppDispatch();
  const catalogState = useAppSelector(s => s.catalog[NEW_KEY]);
  const selectedFilters = catalogState?.selectedFilters ?? {};
  const sortBy = catalogState?.sortBy ?? 'newest';
  const viewCols = (catalogState?.viewCols ?? 4) as 3 | 4;

  const activeCategory = (selectedFilters['category']?.[0] ?? NACL.all) as NewArrivalCategory;
  const setActiveCategory = (cat: NewArrivalCategory) => {
    dispatch(setFilters({ catalogKey: NEW_KEY, filters: { ...selectedFilters, category: cat === NACL.all ? [] : [cat] } }));
  };

  const ALL_PRODUCTS: NewProduct[] = initialProducts ?? [];

  const sortRef = useRef<HTMLDivElement>(null);
  const filterBarRef = useRef<HTMLDivElement>(null);

  useEffect(() => { setMounted(true); }, []);

  /* Close sort on outside click / Escape */
  useEffect(() => {
    const onMouse = (e: MouseEvent) => {
      if (sortRef.current && !sortRef.current.contains(e.target as Node)) setSortOpen(false);
    };
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setSortOpen(false);
    };
    document.addEventListener('mousedown', onMouse);
    document.addEventListener('keydown', onKey);
    return () => {
      document.removeEventListener('mousedown', onMouse);
      document.removeEventListener('keydown', onKey);
    };
  }, []);

  /* Filtered + sorted products */
  const filtered =
    activeCategory === NACL.all
      ? ALL_PRODUCTS
      : ALL_PRODUCTS.filter((p) => p.category === activeCategory);

  const sorted = [...filtered].sort((a, b) => {
    const aPrice = parseFloat((a.salePrice ?? a.price).replace(CURRENCY.symbol, ''));
    const bPrice = parseFloat((b.salePrice ?? b.price).replace(CURRENCY.symbol, ''));
    if (sortBy === 'price_asc') return aPrice - bPrice;
    if (sortBy === 'price_desc') return bPrice - aPrice;
    if (sortBy === 'brand_az') return (a.brand ?? '').localeCompare(b.brand ?? '');
    return 0; // newest / popularity keep insertion order
  });

  const activeSortLabel = NEW_ARRIVALS_SORT_OPTIONS.find((o) => o.value === sortBy)?.label ?? L.sortFallback;
  const gridCols = viewCols === 4 ? 'grid-cols-2 md:grid-cols-3 lg:grid-cols-4' : 'grid-cols-2 lg:grid-cols-3';

  return (
    <div
      className="min-h-screen bg-white font-[Inter,sans-serif]"
      style={{ '--accent': ACCENT } as React.CSSProperties}
    >
      <Header />

      <main id="main-content">
        <NewArrivalsHero cms={cmsPage} />

        {/* ── Breadcrumb ── */}
        <div className="px-4 lg:px-8 py-3 flex items-center justify-between border-b border-gray-100">
          <nav className="flex items-center gap-1 text-xs text-gray-400">
            <a href="/" className="hover:text-black transition-colors">
              {L.breadcrumbHome}
            </a>
            <span className="mx-0.5">/</span>
            <span className="text-black">{L.breadcrumbCurrent}</span>
          </nav>
          <span className="text-xs text-gray-400">{sorted.length} {lStyles}</span>
        </div>

        {/* ── Sticky filter / sort bar ── */}
        <div
          ref={filterBarRef}
          className="sticky top-16 md:top-24 lg:top-[132px] z-40 bg-white border-b border-gray-200 pt-2"
          onMouseLeave={() => { setSortOpen(false); }}
        >
          <div className="max-w-screen-2xl mx-auto px-4 lg:px-8">
            <div className="flex items-center justify-between gap-4 py-0">
              {/* Category tabs — horizontal scroll on mobile */}
              <div className="flex items-center overflow-x-auto scrollbar-hide gap-0 flex-1 min-w-0">
                {NEW_ARRIVALS_CATEGORIES.map((cat) => (
                  <button
                    key={cat}
                    onClick={() => setActiveCategory(cat)}
                    className={[
                      'flex-shrink-0 px-5 py-3.5 text-xs tracking-widest uppercase whitespace-nowrap transition-all duration-150 focus-visible:outline-none',
                      activeCategory === cat
                        ? 'text-black border-b-2 border-black'
                        : 'text-gray-500 border-b-2 border-transparent hover:text-black',
                    ].join(' ')}
                  >
                    {cat}
                    {cat !== NACL.all && (
                      <span className="ml-1.5 text-gray-400 text-[10px]">
                        ({ALL_PRODUCTS.filter((p) => p.category === cat).length})
                      </span>
                    )}
                  </button>
                ))}
              </div>

              {/* Sort + view controls */}
              <div className="hidden md:flex items-center gap-4 flex-shrink-0 py-2">
                {/* Column toggles */}
                <div className="flex items-center gap-2">
                  <span className="text-xs text-gray-500 mr-1">{lView}</span>
                  <button
                    onClick={() => dispatch(dispatchSetViewCols({ catalogKey: NEW_KEY, cols: 3 }))}
                    className={`p-1 focus-visible:outline-none transition-opacity duration-150 ${
                      viewCols === 3 ? 'opacity-100' : 'opacity-[0.35]'
                    }`}
                    aria-label={L.view3ColAria}
                  >
                    <ColsIcon cols={3} active={viewCols === 3} />
                  </button>
                  <button
                    onClick={() => dispatch(dispatchSetViewCols({ catalogKey: NEW_KEY, cols: 4 }))}
                    className={`p-1 focus-visible:outline-none transition-opacity duration-150 ${
                      viewCols === 4 ? 'opacity-100' : 'opacity-[0.35]'
                    }`}
                    aria-label={L.view4ColAria}
                  >
                    <ColsIcon cols={4} active={viewCols === 4} />
                  </button>
                </div>

                {/* Sort dropdown */}
                <div ref={sortRef} className="relative">
                  <button
                    onClick={() => setSortOpen((o) => !o)}
                    className="flex items-center gap-2 px-4 py-1.5 text-xs tracking-wider uppercase border border-gray-300 hover:border-black transition-colors focus-visible:outline-none rounded-none"
                  >
                    <span>{activeSortLabel}</span>
                    <ChevronDown
                      size={12}
                      className={`transition-transform duration-200 ${sortOpen ? 'rotate-180' : 'rotate-0'}`}
                    />
                  </button>
                  {sortOpen && (
                    <div className="absolute right-0 top-full mt-1 bg-white border border-gray-200 shadow-lg z-50 min-w-[180px] rounded-none">
                      {NEW_ARRIVALS_SORT_OPTIONS.map((opt) => (
                        <SortOption
                          key={opt.value}
                          label={opt.label}
                          active={sortBy === opt.value}
                          onClick={() => {
                            dispatch(setSort({ catalogKey: NEW_KEY, sortBy: opt.value }));
                            setSortOpen(false);
                          }}
                        />
                      ))}
                    </div>
                  )}
                </div>
              </div>

              {/* Mobile: sort pill */}
              <div className="md:hidden flex-shrink-0">
                <div ref={sortRef} className="relative">
                  <button
                    onClick={() => setSortOpen((o) => !o)}
                    className="flex items-center gap-1.5 px-3 py-2 text-xs tracking-wider uppercase border border-gray-300 focus-visible:outline-none rounded-none"
                  >
                    {L.sortMobileCta}
                    <ChevronDown size={11} />
                  </button>
                  {sortOpen && (
                    <div className="absolute right-0 top-full mt-1 bg-white border border-gray-200 shadow-lg z-50 min-w-[170px] rounded-none">
                      {NEW_ARRIVALS_SORT_OPTIONS.map((opt) => (
                        <SortOption
                          key={opt.value}
                          label={opt.label}
                          active={sortBy === opt.value}
                          onClick={() => {
                            dispatch(setSort({ catalogKey: NEW_KEY, sortBy: opt.value }));
                            setSortOpen(false);
                          }}
                        />
                      ))}
                    </div>
                  )}
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* ── Product count row ── */}
        <div className="max-w-screen-2xl mx-auto px-4 lg:px-8 py-4 flex items-center justify-between">
          <p className="text-xs text-gray-500 tracking-wider uppercase">
            {sorted.length} {sorted.length === 1 ? L.resultSingular : lResults}
            {activeCategory !== NACL.all && (
              <span className="ml-2 text-gray-400">— {activeCategory}</span>
            )}
          </p>
          {/* Mobile sort label */}
          <p className="md:hidden text-xs text-gray-400 uppercase tracking-wider">
            {activeSortLabel}
          </p>
        </div>

        {/* ── Product grid ── */}
        <div className="pb-16">
          {sorted.length === 0 ? (
            <div className="py-24 text-center">
              <p className="text-sm text-gray-400 tracking-wider uppercase">
                {L.emptyMessage}
              </p>
            </div>
          ) : !mounted ? (
            <div className={`grid ${gridCols} gap-px bg-white`}>
              {Array.from({ length: 8 }).map((_, i) => (
                <div key={i} className="bg-white">
                  <ProductCardSkeleton />
                </div>
              ))}
            </div>
          ) : (
            <div className={`grid ${gridCols} gap-px bg-white`}>
              {sorted.map((product) => (
                <div key={product.id} className="bg-white">
                  <ProductCard product={product} accentColor={ACCENT} />
                </div>
              ))}
            </div>
          )}
        </div>

        {/* ── Editorial strip — copy pulled from OE `new` page
             `page_new_arrivals_footer_banner_*` attributes; `L.editorial*`
             are the fallbacks when the admin hasn't filled a field. */}
        <div className="border-t border-gray-100 py-12 px-4 lg:px-8 text-center bg-[#e4e8ee]">
          <p className="text-xs tracking-[0.3em] uppercase text-gray-400 mb-3">
            {cmsPage?.footer.eyebrow || L.editorialEyebrow}
          </p>
          <h2 className="tracking-widest uppercase text-black text-[clamp(1.1rem,2.5vw,1.5rem)] font-semibold">
            {cmsPage?.footer.heading || L.editorialHeading}
          </h2>
          <p className="mt-3 text-xs text-gray-500 max-w-sm mx-auto leading-relaxed">
            {cmsPage?.footer.body || L.editorialBody}
          </p>
          <div className="mt-6 flex items-center justify-center gap-0 max-w-sm mx-auto">
            <input
              type="email"
              placeholder={L.newsletterPlaceholder}
              className="flex-1 border border-gray-300 px-4 py-2.5 text-xs focus-visible:outline-none focus:border-black transition-colors rounded-none"
            />
            <button className="px-5 py-2.5 text-xs tracking-widest uppercase text-white bg-black hover:bg-gray-800 transition-colors focus-visible:outline-none whitespace-nowrap rounded-none">
              {L.newsletterCta}
            </button>
          </div>
        </div>

        {/* OE-attached blocks for the `new` page — rendered at the bottom
            below the main new-arrivals grid. Empty → nothing renders. */}
        {pageBlocks && pageBlocks.length > 0 && (
          <PageBlocksRenderer blocks={pageBlocks} />
        )}
      </main>

      <Footer />
    </div>
  );
}