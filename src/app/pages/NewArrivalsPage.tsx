'use client';
import { ChevronDown } from 'lucide-react';
import { useSearchParams } from 'next/navigation';
import { useEffect, useMemo, useRef, useState } from 'react';

import { PageBlocksRenderer } from '@/app/components/blocks/PageBlocksRenderer';
import { ColsIcon, SortOptionBtn as SortOption } from '@/app/components/catalog/CatalogTemplate.parts';
import { type Product, ProductCard } from '@/app/components/product/ProductCard';
import { ProductCardSkeleton } from '@/app/components/product/ProductCardSkeleton';
import { ACCENT_WOMEN as ACCENT } from '@/app/constants/colors';
import { CURRENCY } from '@/app/data/currencyConfig';
import {
  NEW_ARRIVALS_CATEGORIES,
  NEW_ARRIVALS_SORT_OPTIONS,
  type NewArrivalCategory,
} from '@/app/data/newArrivalsConfig';
import { useMounted } from '@/app/hooks/useMounted';
import { NEW_ARRIVALS_SORT_LABELS } from '@/app/pages/new/copy';
import { setFilters, setSort, setViewCols as dispatchSetViewCols } from '@/app/store/catalogSlice';
import { useAppDispatch, useAppSelector } from '@/app/store/hooks';
import { genderFilterFromQuery, matchesGender } from '@/app/utils/gender-filter';
import { Link } from '@/lib/i18n/navigation';
import type { PageBlock } from '@/lib/oneentry/blocks/page-blocks';
import type { NewArrivalsPageFromCms } from '@/lib/oneentry/catalog/new-arrivals-page';
import { useDict, useT } from '@/lib/oneentry/labels/DictContext';

import { NewArrivalsHero } from './new/NewArrivalsHero';

export const NEW_ARRIVALS_PAGE_LABELS = {
  // Breadcrumb
  breadcrumbHome: 'Home',
  breadcrumbCurrent: 'New Arrivals',
  stylesSuffix: 'styles',
  // Sort/view controls
  viewLabel: 'View:',
  view3ColAria: '3-column view',
  view4ColAria: '4-column view',
  sortFallback: 'Sort',
  sortMobileCta: 'Sort',
  // Results
  resultSingular: 'Result',
  resultPlural: 'Results',
  emptyMessage: 'No products in this category yet.',
  // Editorial strip
  editorialEyebrow: 'Always in stock — never out of style',
  editorialHeading: 'New drops every week',
  editorialBody:
    'Subscribe to stay ahead of the curve. Get first access to new arrivals, exclusive launches, and members-only offers.',
  newsletterPlaceholder: 'Your email address',
  newsletterCta: 'Subscribe',
} as const;

export const NEW_ARRIVALS_CATEGORY_LABELS = {
  all: 'All',
  clothing: 'Clothing',
  shoes: 'Shoes',
  accessories: 'Accessories',
} as const;

const NACL_FALLBACK = NEW_ARRIVALS_CATEGORY_LABELS;

const NEW_KEY = 'new-arrivals';
type NewProduct = Product & { category: Exclude<NewArrivalCategory, 'All'> };

export function NewArrivalsPage({
  initialProducts,
  pageBlocks,
  cmsPage,
}: { initialProducts?: NewProduct[]; pageBlocks?: PageBlock[]; cmsPage?: NewArrivalsPageFromCms | null } = {}) {
  const L = useDict('new_arrivals_page_', NEW_ARRIVALS_PAGE_LABELS);
  // UI-only state
  const [sortOpen, setSortOpen] = useState(false);
  const mounted = useMounted();
  const lStyles = useT('new_arrivals_page_styles', L.stylesSuffix);
  const lView = useT('new_arrivals_page_view', L.viewLabel);
  const lResults = useT('new_arrivals_page_results', L.resultPlural);

  // Redux state
  const dispatch = useAppDispatch();
  const catalogState = useAppSelector((s) => s.catalog[NEW_KEY]);
  const selectedFilters = catalogState?.selectedFilters ?? {};
  const sortBy = catalogState?.sortBy ?? 'newest';
  const viewCols = (catalogState?.viewCols ?? 4) as 3 | 4;

  // Category ids drive the filter; the wording comes from the OE `sale`-style set, so renaming "Clothing" in the admin panel cannot break matching.
  const NACL = useDict('new_arrivals_page_category_', NACL_FALLBACK);
  const activeCategory = (selectedFilters['category']?.[0] ?? 'all') as NewArrivalCategory;
  const setActiveCategory = (cat: NewArrivalCategory) => {
    dispatch(
      setFilters({ catalogKey: NEW_KEY, filters: { ...selectedFilters, category: cat === 'all' ? [] : [cat] } }),
    );
  };

  // Gender scope comes from `?gender=` (set by the header switch).
  const searchParams = useSearchParams();
  const genderFilter = genderFilterFromQuery(searchParams.get('gender'));
  const ALL_PRODUCTS: NewProduct[] = useMemo(
    () => (initialProducts ?? []).filter((p) => matchesGender(p.gender, genderFilter)),
    [initialProducts, genderFilter],
  );

  const sortRef = useRef<HTMLDivElement>(null);
  const filterBarRef = useRef<HTMLDivElement>(null);

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
  const filtered = activeCategory === 'all' ? ALL_PRODUCTS : ALL_PRODUCTS.filter((p) => p.category === activeCategory);

  const sorted = [...filtered].sort((a, b) => {
    const aPrice = parseFloat((a.salePrice ?? a.price).replace(CURRENCY.symbol, ''));
    const bPrice = parseFloat((b.salePrice ?? b.price).replace(CURRENCY.symbol, ''));
    if (sortBy === 'price_asc') return aPrice - bPrice;
    if (sortBy === 'price_desc') return bPrice - aPrice;
    if (sortBy === 'brand_az') return (a.brand ?? '').localeCompare(b.brand ?? '');
    return 0; // newest / popularity keep insertion order
  });

  // Sort keys stay in code (they are OE query values); only their wording is editable — `new_arrivals_page_sort_<key>`.
  const sortLabels = useDict('new_arrivals_page_sort_', NEW_ARRIVALS_SORT_LABELS);
  const sortOptions = useMemo(
    () => NEW_ARRIVALS_SORT_OPTIONS.map((o) => ({ value: o.value, label: sortLabels[o.labelKey] })),
    [sortLabels],
  );
  const activeSortLabel = sortOptions.find((o) => o.value === sortBy)?.label ?? L.sortFallback;
  const gridCols = viewCols === 4 ? 'grid-cols-2 md:grid-cols-3 lg:grid-cols-4' : 'grid-cols-2 lg:grid-cols-3';

  return (
    <div className="flex-1 bg-white font-sans" style={{ '--accent': ACCENT } as React.CSSProperties}>
      <main id="main-content">
        <NewArrivalsHero cms={cmsPage} />

        {/* ── Breadcrumb ── */}
        <div className="flex items-center justify-between border-b border-gray-100 px-4 py-3 lg:px-8">
          <nav className="flex items-center gap-1 text-xs text-gray-400">
            <Link href="/" className="transition-colors hover:text-black">
              {L.breadcrumbHome}
            </Link>
            <span className="mx-0.5">/</span>
            <span className="text-black">{L.breadcrumbCurrent}</span>
          </nav>
          <span className="text-xs text-gray-400">
            {sorted.length} {lStyles}
          </span>
        </div>

        {/* ── Sticky filter / sort bar ── */}
        <div
          ref={filterBarRef}
          className="sticky top-16 z-40 border-b border-gray-200 bg-white pt-2 md:top-24 lg:top-33"
          onMouseLeave={() => {
            setSortOpen(false);
          }}
        >
          <div className="mx-auto max-w-384 px-4 lg:px-8">
            <div className="flex items-center justify-between gap-4 py-0">
              {/* Category tabs — horizontal scroll on mobile */}
              <div className="scrollbar-hide flex min-w-0 flex-1 items-center gap-0 overflow-x-auto">
                {NEW_ARRIVALS_CATEGORIES.map((cat) => (
                  <button
                    key={cat}
                    onClick={() => setActiveCategory(cat)}
                    className={[
                      'shrink-0 px-5 py-3.5 text-xs tracking-widest whitespace-nowrap uppercase transition-all duration-150 focus-visible:outline-none',
                      activeCategory === cat
                        ? 'border-b-2 border-black text-black'
                        : 'border-b-2 border-transparent text-gray-500 hover:text-black',
                    ].join(' ')}
                  >
                    {NACL[cat]}
                    {cat !== 'all' && (
                      <span className="ml-1.5 text-[10px] text-gray-400">
                        ({ALL_PRODUCTS.filter((p) => p.category === cat).length})
                      </span>
                    )}
                  </button>
                ))}
              </div>

              {/* Sort + view controls */}
              <div className="hidden shrink-0 items-center gap-4 py-2 md:flex">
                {/* Column toggles */}
                <div className="flex items-center gap-2">
                  <span className="mr-1 text-xs text-gray-500">{lView}</span>
                  <button
                    onClick={() => dispatch(dispatchSetViewCols({ catalogKey: NEW_KEY, cols: 3 }))}
                    className={`p-1 transition-opacity duration-150 focus-visible:outline-none ${
                      viewCols === 3 ? 'opacity-100' : 'opacity-35'
                    }`}
                    aria-label={L.view3ColAria}
                  >
                    <ColsIcon cols={3} active={viewCols === 3} />
                  </button>
                  <button
                    onClick={() => dispatch(dispatchSetViewCols({ catalogKey: NEW_KEY, cols: 4 }))}
                    className={`p-1 transition-opacity duration-150 focus-visible:outline-none ${
                      viewCols === 4 ? 'opacity-100' : 'opacity-35'
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
                    className="flex items-center gap-2 rounded-none border border-gray-300 px-4 py-1.5 text-xs tracking-wider uppercase transition-colors hover:border-black focus-visible:outline-none"
                  >
                    <span>{activeSortLabel}</span>
                    <ChevronDown
                      size={12}
                      className={`transition-transform duration-200 ${sortOpen ? 'rotate-180' : 'rotate-0'}`}
                    />
                  </button>
                  {sortOpen && (
                    <div className="absolute top-full right-0 z-50 mt-1 min-w-45 rounded-none border border-gray-200 bg-white shadow-lg">
                      {sortOptions.map((opt) => (
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
              <div className="shrink-0 md:hidden">
                <div ref={sortRef} className="relative">
                  <button
                    onClick={() => setSortOpen((o) => !o)}
                    className="flex items-center gap-1.5 rounded-none border border-gray-300 px-3 py-2 text-xs tracking-wider uppercase focus-visible:outline-none"
                  >
                    {L.sortMobileCta}
                    <ChevronDown size={11} />
                  </button>
                  {sortOpen && (
                    <div className="absolute top-full right-0 z-50 mt-1 min-w-42.5 rounded-none border border-gray-200 bg-white shadow-lg">
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
        <div className="mx-auto flex max-w-384 items-center justify-between p-4 lg:px-8">
          <p className="text-xs tracking-wider text-gray-500 uppercase">
            {sorted.length} {sorted.length === 1 ? L.resultSingular : lResults}
            {activeCategory !== 'all' && <span className="ml-2 text-gray-400">— {NACL[activeCategory]}</span>}
          </p>
          {/* Mobile sort label */}
          <p className="text-xs tracking-wider text-gray-400 uppercase md:hidden">{activeSortLabel}</p>
        </div>

        {/* ── Product grid ── */}
        <div className="pb-16">
          {sorted.length === 0 ? (
            <div className="py-24 text-center">
              <p className="text-sm tracking-wider text-gray-400 uppercase">{L.emptyMessage}</p>
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
        <div className="border-t border-gray-100 bg-[#e4e8ee] px-4 py-12 text-center lg:px-8">
          <p className="mb-3 text-xs tracking-[0.3em] text-gray-400 uppercase">
            {cmsPage?.footer.eyebrow || L.editorialEyebrow}
          </p>
          <h2 className="text-[clamp(1.1rem,2.5vw,1.5rem)] font-semibold tracking-widest text-black uppercase">
            {cmsPage?.footer.heading || L.editorialHeading}
          </h2>
          <p className="mx-auto mt-3 max-w-sm text-xs leading-relaxed text-gray-500">
            {cmsPage?.footer.body || L.editorialBody}
          </p>
          <div className="mx-auto mt-6 flex max-w-sm items-center justify-center gap-0">
            <input
              type="email"
              placeholder={L.newsletterPlaceholder}
              className="flex-1 rounded-none border border-gray-300 px-4 py-2.5 text-xs transition-colors focus:border-black focus-visible:outline-none"
            />
            <button className="rounded-none bg-black px-5 py-2.5 text-xs tracking-widest whitespace-nowrap text-white uppercase transition-colors hover:bg-gray-800 focus-visible:outline-none">
              {L.newsletterCta}
            </button>
          </div>
        </div>

        {/* OE-attached blocks for the `new` page — rendered at the bottom
            below the main new-arrivals grid. Empty → nothing renders. */}
        {pageBlocks && pageBlocks.length > 0 && <PageBlocksRenderer blocks={pageBlocks} />}
      </main>
    </div>
  );
}
