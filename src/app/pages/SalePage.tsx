'use client'
import React, { useState, useEffect, useRef, useCallback, useMemo } from 'react';
import Image from 'next/image';
import Link from 'next/link';
import { Header } from '../components/Header';
import { Footer } from '../components/Footer';
import { ProductCard, type Product } from '../components/ProductCard';
import { MobileFilterPanel } from '../components/MobileFilterPanel';
import { ProductCardSkeleton } from '../components/ProductCardSkeleton';
import { ColsIcon, SortOptionBtn as SortOption } from '../components/CatalogTemplate.parts';
import {
  ChevronDown, ChevronLeft, ChevronRight, X, SlidersHorizontal,
} from 'lucide-react';
import { SALE_END_DATE, SALE_CATEGORIES, type SaleCategory, SALE_COLOR_OPTIONS, SALE_SORT_OPTIONS } from '../data/saleConfig';
import { SALE_DISCOUNT_LABELS as DL } from '../data/salePageLabels';
import { useAppDispatch, useAppSelector } from '../store/hooks';
import {
  toggleFilter as dispatchToggleFilter,
  setFilters,
  clearFilters,
  setSort,
  setPage as dispatchSetPage,
  setViewCols as dispatchSetViewCols,
} from '../store/catalogSlice';
import { SALE_COLOR as SALE_RED } from '../constants/colors';
import { CatalogAccentContext } from '../context/CatalogAccentContext';
import { PillDropdown, ColorPillDropdown } from './sale/SaleFilterDropdowns';
import { useCountdown } from './sale/SaleCountdown';
import { SaleHero } from './sale/SaleHero';
import { SALE_PAGE_LABELS as L, SALE_CATEGORY_LABELS as CAT } from '../data/salePageLabels';
import { useSalePageT } from '../../lib/oneentry/labels/SalePageLabelsContext';

const SALE_KEY = 'sale';

type SaleProduct = Product & { category?: string };
export function SalePage({ initialProducts, saleEndsAt, gender }: { initialProducts?: SaleProduct[]; saleEndsAt?: number; gender?: 'W' | 'M' | null } = {}) {
  // Countdown target: OE-driven `page_sale_top_banner_timer` first, then the
  // hardcoded fallback so the banner still runs if the admin hasn't set it.
  const countdown = useCountdown(saleEndsAt ?? SALE_END_DATE);
  const saleEndsAtDate = saleEndsAt ?? SALE_END_DATE;
  const lView         = useSalePageT('sale_page_view',         L.viewLabel);
  const lItemsOnSale  = useSalePageT('sale_page_item_on_sale', L.itemsOnSaleSuffix);

  // UI-only state
  const [sortOpen, setSortOpen] = useState(false);
  const [mobileFilterOpen, setMobileFilterOpen] = useState(false);
  const [mounted, setMounted] = useState(false);

  // Redux state
  const dispatch = useAppDispatch();
  const catalogState = useAppSelector(s => s.catalog[SALE_KEY]);
  const selectedFilters = catalogState?.selectedFilters ?? {};
  const sortBy = catalogState?.sortBy ?? 'discount';
  const currentPage = catalogState?.currentPage ?? 1;
  const viewCols = (catalogState?.viewCols ?? 4) as 3 | 4;

  // Derived filter state
  const activeCategory = (selectedFilters['category']?.[0] ?? CAT.all) as SaleCategory;
  const selDiscount = selectedFilters['discount'] ?? [];
  const selSize = selectedFilters['size'] ?? [];
  const selColor = selectedFilters['color'] ?? [];
  const selBrand = selectedFilters['brand'] ?? [];

  const toggleDiscount = (v: string) => dispatch(dispatchToggleFilter({ catalogKey: SALE_KEY, filterKey: 'discount', value: v }));
  const toggleSize = (v: string) => dispatch(dispatchToggleFilter({ catalogKey: SALE_KEY, filterKey: 'size', value: v }));
  const toggleColor = (v: string) => dispatch(dispatchToggleFilter({ catalogKey: SALE_KEY, filterKey: 'color', value: v }));
  const toggleBrand = (v: string) => dispatch(dispatchToggleFilter({ catalogKey: SALE_KEY, filterKey: 'brand', value: v }));
  const clearFilter = (key: string) => dispatch(setFilters({ catalogKey: SALE_KEY, filters: { ...selectedFilters, [key]: [] } }));
  const setActiveCategory = (cat: SaleCategory) => {
    dispatch(setFilters({ catalogKey: SALE_KEY, filters: { ...selectedFilters, category: cat === CAT.all ? [] : [cat] } }));
  };

  const totalActive = selDiscount.length + selSize.length + selColor.length + selBrand.length;
  const clearAll = useCallback(() => { dispatch(clearFilters(SALE_KEY)); }, [dispatch]);

  const PRODUCTS: SaleProduct[] = initialProducts ?? [];
  const sortRef = useRef<HTMLDivElement>(null);
  const recRef = useRef<HTMLDivElement>(null);
  const recDragging = useRef(false);
  const recStartX = useRef(0);
  const recScrollStart = useRef(0);
  const onRecMouseDown = (e: React.MouseEvent) => {
    recDragging.current = true;
    recStartX.current = e.pageX;
    recScrollStart.current = recRef.current?.scrollLeft ?? 0;
    if (recRef.current) recRef.current.style.cursor = 'grabbing';
  };
  const onRecMouseMove = (e: React.MouseEvent) => {
    if (!recDragging.current || !recRef.current) return;
    e.preventDefault();
    recRef.current.scrollLeft = recScrollStart.current - (e.pageX - recStartX.current);
  };
  const stopRecDrag = () => {
    recDragging.current = false;
    if (recRef.current) recRef.current.style.cursor = 'grab';
  };
  const PRODUCTS_PER_PAGE = 16;

  useEffect(() => { setMounted(true); }, []);

  useEffect(() => {
    const fn = (e: MouseEvent) => { if (sortRef.current && !sortRef.current.contains(e.target as Node)) setSortOpen(false); };
    const ky = (e: KeyboardEvent) => { if (e.key === 'Escape') setSortOpen(false); };
    document.addEventListener('mousedown', fn);
    document.addEventListener('keydown', ky);
    return () => { document.removeEventListener('mousedown', fn); document.removeEventListener('keydown', ky); };
  }, []);

  /* ── Discount % from price/salePrice strings ── */
  const priceNum = (s?: string) => {
    if (!s) return 0;
    const n = Number.parseFloat(s.replace(/[^0-9.]/g, ''));
    return Number.isFinite(n) ? n : 0;
  };
  const discountPct = (p: SaleProduct): number => {
    const orig = priceNum(p.price);
    const sale = priceNum(p.salePrice);
    if (!orig || !sale || sale >= orig) return 0;
    return ((orig - sale) / orig) * 100;
  };
  const inDiscountBucket = (label: string, pct: number): boolean => {
    if (label === DL.d10_20) return pct >= 10 && pct < 20;
    if (label === DL.d20_30) return pct >= 20 && pct < 30;
    if (label === DL.d30_40) return pct >= 30 && pct < 40;
    if (label === DL.d40_50) return pct >= 40 && pct < 50;
    if (label === DL.d50plus) return pct >= 50;
    return false;
  };

  /* ── Filter options derived from the products that are actually on this
     page. `?gender=women` already narrowed the source list on the server,
     so buckets are guaranteed to reflect real inventory (no dead options). */
  const categoryScoped = useMemo(
    () => (activeCategory === CAT.all ? PRODUCTS : PRODUCTS.filter(p => p.category === activeCategory)),
    [PRODUCTS, activeCategory],
  );
  const discountOptions = useMemo(() => {
    const buckets = [DL.d10_20, DL.d20_30, DL.d30_40, DL.d40_50, DL.d50plus];
    return buckets.filter(bucket => categoryScoped.some(p => inDiscountBucket(bucket, discountPct(p))));
  }, [categoryScoped]);
  const sizeOptions = useMemo(() => {
    const order = ['XXS', 'XS', 'S', 'M', 'L', 'XL', 'XXL'];
    const seen = new Set<string>();
    categoryScoped.forEach(p => p.sizes?.forEach(s => seen.add(s)));
    const known = order.filter(s => seen.has(s));
    const numeric = [...seen].filter(s => !order.includes(s)).sort((a, b) => {
      const na = Number.parseFloat(a); const nb = Number.parseFloat(b);
      if (Number.isFinite(na) && Number.isFinite(nb)) return na - nb;
      return a.localeCompare(b);
    });
    return [...known, ...numeric];
  }, [categoryScoped]);
  const colorOptions = useMemo(() => {
    const seen = new Set<string>();
    categoryScoped.forEach(p => p.colors?.forEach(c => seen.add(c)));
    // Keep any pre-configured swatches whose hex actually appears; append
    // remaining unmapped hexes with the hex string itself as their label.
    const mapped = SALE_COLOR_OPTIONS.filter(o => seen.has(o.color));
    const knownHexes = new Set(SALE_COLOR_OPTIONS.map(o => o.color));
    const extras = [...seen].filter(h => !knownHexes.has(h)).map(h => ({ label: h, color: h }));
    return [...mapped, ...extras];
  }, [categoryScoped]);
  const brandOptions = useMemo(() => {
    const seen = new Set<string>();
    categoryScoped.forEach(p => { if (p.brand) seen.add(p.brand); });
    return [...seen].sort((a, b) => a.localeCompare(b));
  }, [categoryScoped]);

  // ColorPillDropdown emits the swatch label (e.g. "Black"); products store
  // raw hex in `p.colors`. Build a hex→label lookup once so the matcher can
  // translate before comparing. Falls through to the hex itself when the
  // color has no friendly label.
  const hexToLabel = useMemo(() => {
    const map: Record<string, string> = {};
    for (const opt of colorOptions) map[opt.color] = opt.label;
    return map;
  }, [colorOptions]);

  /* ── Filtered products (category + discount + size + color + brand) ── */
  const filtered = useMemo(() =>
    categoryScoped.filter(p => {
      if (selDiscount.length && !selDiscount.some(d => inDiscountBucket(d, discountPct(p)))) return false;
      if (selSize.length && !p.sizes?.some(s => selSize.includes(s))) return false;
      if (selColor.length && !p.colors?.some(c => selColor.includes(hexToLabel[c] ?? c))) return false;
      if (selBrand.length && !(p.brand && selBrand.includes(p.brand))) return false;
      return true;
    }),
    [categoryScoped, selDiscount, selSize, selColor, selBrand, hexToLabel],
  );

  /* ── Active filter chips (combined list for display below bar) ── */
  const activeChips = useMemo((): { key: string; label: string; remove: () => void }[] => [
    ...selDiscount.map(v => ({ key: `discount-${v}`, label: v, remove: () => toggleDiscount(v) })),
    ...selSize.map(v => ({ key: `size-${v}`, label: v, remove: () => toggleSize(v) })),
    ...selColor.map(v => ({ key: `color-${v}`, label: v, remove: () => toggleColor(v) })),
    ...selBrand.map(v => ({ key: `brand-${v}`, label: v, remove: () => toggleBrand(v) })),
  ], [selDiscount, selSize, selColor, selBrand, toggleDiscount, toggleSize, toggleColor, toggleBrand]);

  /* ── Mobile filter groups wired to MobileFilterPanel ── */
  const mobileSelectedFilters: Record<string, string[]> = {
    category: activeCategory === CAT.all ? [] : [activeCategory],
    discount: selDiscount,
    size: selSize,
    color: selColor,
    brand: selBrand,
  };
  const mobileFilterGroups = [
    { key: 'category', label: L.filterCategoryHeading, type: 'checkbox' as const, options: SALE_CATEGORIES.filter(c => c !== CAT.all).map(c => ({ label: c })) },
    { key: 'discount', label: L.filterDiscountHeading, type: 'checkbox' as const, options: discountOptions.map(o => ({ label: o })) },
    { key: 'size', label: L.filterSizeHeading, type: 'size_chips' as const, options: sizeOptions.map(o => ({ label: o })) },
    { key: 'color', label: L.filterColorHeading, type: 'color' as const, options: colorOptions },
    { key: 'brand', label: L.filterBrandHeading, type: 'checkbox' as const, options: brandOptions.map(o => ({ label: o })) },
  ];
  const handleMobileToggle = (key: string, val: string) => {
    if (key === 'category') { setActiveCategory(val as SaleCategory); return; }
    if (key === 'discount') { toggleDiscount(val); return; }
    if (key === 'size') { toggleSize(val); return; }
    if (key === 'color') { toggleColor(val); return; }
    if (key === 'brand') { toggleBrand(val); return; }
  };

  const gridCols = viewCols === 4
    ? 'grid-cols-2 md:grid-cols-3 lg:grid-cols-4'
    : 'grid-cols-2 lg:grid-cols-3';

  const activeSortLabel = SALE_SORT_OPTIONS.find(o => o.value === sortBy)?.label ?? L.sortFallback;

  /* ── Pagination derived from real filtered length ── */
  const totalPages = Math.max(1, Math.ceil(filtered.length / PRODUCTS_PER_PAGE));
  // Clamp `currentPage` if the shopper's saved page is now out of range
  // (e.g. after applying filters that shrink the list). Prefer the last
  // valid page over falling through to an empty grid.
  const safePage = Math.min(Math.max(1, currentPage), totalPages);
  useEffect(() => {
    if (safePage !== currentPage) {
      dispatch(dispatchSetPage({ catalogKey: SALE_KEY, page: safePage }));
    }
  }, [safePage, currentPage, dispatch]);
  const changePage = (p: number) => { dispatch(dispatchSetPage({ catalogKey: SALE_KEY, page: p })); window.scrollTo({ top: 0, behavior: 'smooth' }); };
  const pages = Array.from({ length: totalPages }, (_, i) => i + 1);
  const pagedFiltered = useMemo(() => {
    const start = (safePage - 1) * PRODUCTS_PER_PAGE;
    return filtered.slice(start, start + PRODUCTS_PER_PAGE);
  }, [filtered, safePage]);

  return (
    <div
      className="min-h-screen bg-white font-[Inter,sans-serif]"
      style={{ '--sale': SALE_RED, '--accent': SALE_RED } as React.CSSProperties}
    >
      <Header />

      <SaleHero countdown={countdown} endsAt={saleEndsAtDate} />

      {/* ── Breadcrumb ── */}
      <div className="px-4 lg:px-8 py-3 border-b border-gray-100">
        <nav className="flex items-center gap-1.5 text-xs text-gray-400 max-w-screen-2xl mx-auto">
          <Link href="/" className="hover:text-black transition-colors">{L.breadcrumbHome}</Link>
          <span>/</span>
          <span className="text-black font-semibold">{L.breadcrumbCurrent}</span>
        </nav>
      </div>

      {/* Sticky filter bar */}
      <div className="sticky top-16 md:top-24 lg:top-[132px] z-40 bg-white border-b border-gray-200 pt-2">
        <div className="max-w-screen-2xl mx-auto px-4 lg:px-8">
          <div className="flex items-center justify-between gap-4 py-0">

            {/* ── LEFT: category tabs (horizontally scrollable) ── */}
            {/* Note: `overflow-x-auto` per CSS spec also clips overflow-y, which
                would hide any absolute-positioned filter dropdowns rendered
                below the bar. Keep the scrollable strip narrow (tabs only) and
                lift the pill filters into the outer, unclipped flex row. */}
            <div className="flex items-center overflow-x-auto scrollbar-hide gap-0 min-w-0">
              {SALE_CATEGORIES.filter(cat => {
                // Hide the opposite gender's category tabs so the shopper's
                // filter navigation reflects the URL scope (`?gender=women`
                // → only Women's tabs, plus gender-neutral Bags / Accessories
                // and the "All" umbrella). No `gender` = show everything.
                if (!gender) return true;
                if (gender === 'W' && (cat === CAT.menClothing || cat === CAT.menShoes)) return false;
                if (gender === 'M' && (cat === CAT.womenClothing || cat === CAT.womenShoes)) return false;
                return true;
              }).map(cat => {
                const count = cat === CAT.all ? PRODUCTS.length : PRODUCTS.filter(p => p.category === cat).length;
                return (
                  <button
                    key={cat}
                    onClick={() => setActiveCategory(cat)}
                    className={[
                      'flex-shrink-0 px-4 py-3.5 text-xs tracking-widest uppercase whitespace-nowrap transition-all duration-150 focus-visible:outline-none',
                      activeCategory === cat
                        ? 'text-black border-b-2 border-black'
                        : 'text-gray-500 border-b-2 border-transparent hover:text-black',
                    ].join(' ')}
                  >
                    {cat}
                    {cat !== CAT.all && (
                      <span className="ml-1.5 text-gray-400 text-[10px]">({count})</span>
                    )}
                  </button>
                );
              })}
            </div>

            {/* Separator */}
            <span className="hidden md:block flex-shrink-0 w-px h-6 bg-gray-200 mx-1 self-center" />

            {/* Filter pills — desktop only, lives OUTSIDE the horizontally
                scrollable container so its dropdowns aren't clipped. */}
            <div className="hidden md:flex items-center gap-2 flex-shrink-0 py-2">
              <PillDropdown
                label={L.filterDiscount}
                options={discountOptions}
                selected={selDiscount}
                onToggle={toggleDiscount}
                onClear={() => clearFilter('discount')}
              />
              <PillDropdown
                label={L.filterSize}
                options={sizeOptions}
                selected={selSize}
                onToggle={toggleSize}
                onClear={() => clearFilter('size')}
              />
              <ColorPillDropdown
                options={colorOptions}
                selected={selColor}
                onToggle={toggleColor}
                onClear={() => clearFilter('color')}
              />
              <PillDropdown
                label={L.filterBrand}
                options={brandOptions}
                selected={selBrand}
                onToggle={toggleBrand}
                onClear={() => clearFilter('brand')}
              />
              {totalActive > 0 && (
                <button
                  onClick={clearAll}
                  className="flex items-center gap-1 text-xs text-gray-400 hover:text-black underline ml-1 focus-visible:outline-none whitespace-nowrap"
                >
                  <X size={10} /> {L.clearAll}
                </button>
              )}
            </div>

            {/* Spacer that eats leftover space between tabs and right controls */}
            <div className="flex-1 min-w-0" />

            {/* Mobile filter button */}
            <button
              onClick={() => setMobileFilterOpen(true)}
              className="md:hidden flex-shrink-0 flex items-center gap-1.5 px-3 py-2 ml-2 text-xs tracking-wider uppercase focus-visible:outline-none border border-[#d1d5db] rounded-none"
            >
              <SlidersHorizontal size={12} />
              {L.filtersCta}
              {totalActive > 0 && (
                <span className="bg-[var(--sale)] text-white rounded-none text-[9px] font-bold px-1 py-px">
                  {totalActive}
                </span>
              )}
            </button>

            {/* Right: column toggles + sort */}
            <div className="hidden md:flex items-center gap-4 flex-shrink-0 py-2">
              {/* Column toggles */}
              <div className="flex items-center gap-2">
                <span className="text-xs text-gray-500 mr-1">{lView}</span>
                <button
                  onClick={() => dispatch(dispatchSetViewCols({ catalogKey: SALE_KEY, cols: 3 }))}
                  className={`p-1 focus-visible:outline-none transition-opacity duration-150 ${
                    viewCols === 3 ? 'opacity-100' : 'opacity-[0.35]'
                  }`}
                  aria-label={L.view3ColAria}
                >
                  <ColsIcon cols={3} active={viewCols === 3} />
                </button>
                <button
                  onClick={() => dispatch(dispatchSetViewCols({ catalogKey: SALE_KEY, cols: 4 }))}
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
                  onClick={() => setSortOpen(o => !o)}
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
                    {SALE_SORT_OPTIONS.map(opt => (
                      <SortOption key={opt.value} label={opt.label} active={sortBy === opt.value} onClick={() => { dispatch(setSort({ catalogKey: SALE_KEY, sortBy: opt.value })); setSortOpen(false); }} />
                    ))}
                  </div>
                )}
              </div>
            </div>

            {/* Mobile sort pill */}
            <div className="md:hidden flex-shrink-0">
              <div ref={sortRef} className="relative">
                <button
                  onClick={() => setSortOpen(o => !o)}
                  className="flex items-center gap-1.5 px-3 py-2 text-xs tracking-wider uppercase border border-gray-300 focus-visible:outline-none rounded-none"
                >
                  {L.sortMobileCta} <ChevronDown size={11} />
                </button>
                {sortOpen && (
                  <div className="absolute right-0 top-full mt-1 bg-white border border-gray-200 shadow-lg z-50 min-w-[170px] rounded-none">
                    {SALE_SORT_OPTIONS.map(opt => (
                      <SortOption key={opt.value} label={opt.label} active={sortBy === opt.value} onClick={() => { dispatch(setSort({ catalogKey: SALE_KEY, sortBy: opt.value })); setSortOpen(false); }} />
                    ))}
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Main grid */}
      <div id="sale-grid" className="pb-16">

        {/* Results count + active filter chips */}
        <div className="px-4 lg:px-8 py-4 flex items-start justify-between gap-3 flex-wrap">
          <div className="flex items-center flex-wrap gap-2">
            <p className="text-xs text-gray-500 tracking-wider uppercase">
              <span className="text-black font-semibold">{filtered.length}</span> {lItemsOnSale}
              {activeCategory !== CAT.all && <span className="ml-2 text-gray-400">— {activeCategory}</span>}
            </p>
            {/* Active filter chips */}
            {activeChips.map(chip => (
              <button
                key={chip.key}
                onClick={chip.remove}
                className="flex items-center gap-1 px-2 py-0.5 border border-gray-300 hover:border-black text-xs transition-colors focus-visible:outline-none rounded-none"
              >
                {chip.label}
                <X size={9} className="text-gray-400" />
              </button>
            ))}
          </div>
          {/* Mobile: sort label */}
          <p className="md:hidden text-xs text-gray-400 uppercase tracking-wider">{activeSortLabel}</p>
        </div>

        {/* Product grid */}
        {!mounted ? (
          <div className={`grid ${gridCols} gap-px bg-white`}>
            {Array.from({ length: 8 }).map((_, i) => (
              <div key={i} className="bg-white">
                <ProductCardSkeleton />
              </div>
            ))}
          </div>
        ) : (
          <div className={`grid ${gridCols} gap-px bg-white`}>
            {pagedFiltered.map(product => (
              <div key={product.id} className="bg-white">
                <ProductCard product={product} accentColor={SALE_RED} />
              </div>
            ))}
          </div>
        )}

        {/* Mid promo block */}
        <div className="px-4 lg:px-8">
          <div className="my-10 relative overflow-hidden group min-h-[180px] max-h-[260px]">
            <Image
              src="https://images.unsplash.com/photo-1739424464070-63b6cc9086aa?crop=entropy&cs=tinysrgb&fit=max&fm=jpg&ixid=M3w3Nzg4Nzd8MHwxfHNlYXJjaHwxfHx3b21lbiUyMGZhc2hpb24lMjBlZGl0b3JpYWwlMjBtaW5pbWFsJTIwYmxhY2slMjBvdXRmaXR8ZW58MXx8fHwxNzcyMDMwNjUwfDA&ixlib=rb-4.1.0&q=80&w=1080"
              alt={L.promoImageAlt}
              fill
              sizes="(max-width: 1024px) 100vw, 80vw"
              className="object-cover object-center transition-transform duration-700 group-hover:scale-105"
            />
            <div className="absolute inset-0 bg-[linear-gradient(to_right,rgba(0,0,0,0.75)_35%,rgba(0,0,0,0.15))]" />
            <div className="absolute inset-0 flex flex-col justify-center px-8 md:px-16">
              <span className="inline-block mb-3 px-2.5 py-1 text-white tracking-widest uppercase bg-[var(--sale)] text-[10px] font-bold rounded-none w-fit">
                {L.promoLimitedTime}
              </span>
              <h3 className="text-white tracking-widest uppercase mb-2 text-[clamp(1rem,3vw,1.75rem)] font-extrabold">
                {L.promoHeading}
              </h3>
              <p className="text-white mb-4 text-xs opacity-75 max-w-[340px]">
                {L.promoBody}
              </p>
              <Link href={L.promoHref} className="inline-flex items-center gap-2 text-white text-xs tracking-widest uppercase hover:gap-3 transition-all no-underline font-bold">
                {L.promoCta} <ChevronRight size={13} />
              </Link>
            </div>
          </div>
        </div>

        {/* Pagination */}
        <div className="px-4 lg:px-8 flex items-center justify-center gap-0 mt-8">
          <button
            onClick={() => changePage(Math.max(1, safePage - 1))}
            disabled={safePage === 1}
            className="w-9 h-9 flex items-center justify-center border border-black hover:bg-black hover:text-white transition-colors disabled:opacity-30 focus-visible:outline-none rounded-none"
            aria-label={L.prevPageAria}
          >
            <ChevronLeft size={14} />
          </button>
          {pages.map(p => (
            <button
              key={p}
              onClick={() => changePage(p)}
              className={`w-9 h-9 flex items-center justify-center border text-xs focus-visible:outline-none transition-colors rounded-none border-black -ml-px ${
                safePage === p ? 'bg-black text-white' : 'bg-white text-black'
              }`}
            >
              {p}
            </button>
          ))}
          <button
            onClick={() => changePage(Math.min(totalPages, safePage + 1))}
            disabled={safePage === totalPages}
            className="w-9 h-9 flex items-center justify-center border border-black hover:bg-black hover:text-white transition-colors disabled:opacity-30 focus-visible:outline-none rounded-none -ml-px"
            aria-label={L.nextPageAria}
          >
            <ChevronRight size={14} />
          </button>
        </div>
      </div>

      {/* Recommendations */}
      <div className="border-t border-gray-100 py-12 px-4 lg:px-8 bg-gray-50">
        <div className="max-w-screen-2xl mx-auto">
          <div className="mb-6">
            <p className="text-xs tracking-[0.3em] uppercase text-gray-400 mb-1">{L.recsEyebrow}</p>
            <h2 className="tracking-widest uppercase text-[clamp(1rem,2vw,1.25rem)] font-bold">{L.recsHeading}</h2>
          </div>
          <div
            ref={recRef}
            className="flex gap-3 overflow-x-auto scrollbar-hide pb-2 select-none cursor-grab"
            onMouseDown={onRecMouseDown}
            onMouseMove={onRecMouseMove}
            onMouseUp={stopRecDrag}
            onMouseLeave={stopRecDrag}
          >
            {PRODUCTS.slice(0, 6).map(product => (
              <div key={`rec-${product.id}`} className="flex-shrink-0 w-[220px]">
                <ProductCard product={{ ...product, salePrice: undefined, label: undefined }} accentColor={SALE_RED} />
              </div>
            ))}
          </div>
        </div>
      </div>

      <Footer />

      {/* Mobile filter panel */}
      <CatalogAccentContext.Provider value={SALE_RED}>
        <MobileFilterPanel
          isOpen={mobileFilterOpen}
          onClose={() => setMobileFilterOpen(false)}
          filterGroups={mobileFilterGroups}
          selectedFilters={mobileSelectedFilters}
          onToggleFilter={handleMobileToggle}
          onClearAll={clearAll}
        />
      </CatalogAccentContext.Provider>
    </div>
  );
}
