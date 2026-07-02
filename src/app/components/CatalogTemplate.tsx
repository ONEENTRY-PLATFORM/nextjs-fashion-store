'use client'
/**
 * CatalogTemplate — universal catalog engine.
 *
 * Receives configuration via props; all logic for filtering,
 * sorting, pagination and rendering lives here.
 * Each catalog page becomes ~30-50 lines of configuration.
 */
import { useState, useEffect, useRef, useCallback, useMemo, useTransition, useOptimistic } from 'react';
import { usePathname, useRouter, useSearchParams } from 'next/navigation';
import { Header } from './Header';
import { Footer } from './Footer';
import { ProductCard } from './ProductCard';
import { ProductCardSkeleton } from './ProductCardSkeleton';
import { ChevronDown, ChevronLeft, ChevronRight, X, Search } from 'lucide-react';
import { MobileFilterPanel } from './MobileFilterPanel';
import { NoFilterResults } from './NoFilterResults';
import { CatalogListProductCard } from './CatalogListProductCard';
import { CatalogCrossSell } from './CatalogCrossSell';
import { CatalogTrendBlocks } from './CatalogTrendBlocks';
import { NewArrivals } from './NewArrivals';
import { CatalogMobileSort } from './CatalogMobileSort';
import { COMMON_EMPTY_STATES, CATALOG_PAGINATION_LABELS, CATALOG_VIEW_LABELS as CVL } from '../data/commonLabels';
import { CURRENCY } from '../data/currencyConfig';
import { ColorSwatch } from './ColorSwatch';
import { PriceRangeSlider } from './PriceRangeSlider';
import { ColsIcon, CheckboxUI, SortOptionBtn } from './CatalogTemplate.parts';
import { SORT_OPTIONS, getPageNumbers, type CatalogTemplateProps, type FilterGroup } from './CatalogTemplate.types';
export type { FilterOption, FilterGroup, TrendBlock, ChipFilter, BreadcrumbItem, CrossSellCategory, CatalogTemplateProps } from './CatalogTemplate.types';
import { useAppDispatch, useAppSelector } from '../store/hooks';
import { CatalogAccentContext } from '../context/CatalogAccentContext';
import {
  setViewCols as dispatchSetViewCols,
  setListMode as dispatchSetListMode,
} from '../store/catalogSlice';
import {
  type CatalogFilters,
  countActiveFilters,
  getSelectedOptionsForGroup,
  isFilterGroupSupported,
  serializeCatalogSearchParams,
  toggleFilterOption,
} from '../../lib/oneentry/catalog/filters';
import { trackActivity } from '../utils/track-activity';

export function CatalogTemplate({
  catalogKey,
  products: filteredProducts,
  filterGroups: FILTER_GROUPS,
  quickChips: QUICK_CHIPS,
  accentColor: ACCENT,
  title,
  genderLabel,
  totalStyles: TOTAL_STYLES,
  total,
  currentPage: currentPageProp,
  currentFilters: currentFiltersProp,
  productsPerPage: PRODUCTS_PER_PAGE = 16,
  trendBlocks,
  trendingBlock,
  breadcrumbs,
  priceMax = 600,
  priceDefault,
  showListMode = false,
  scrollbarClass = 'scrollbar-pink',
  crossSell,
}: CatalogTemplateProps) {
  /* ── Local UI state ── */
  const [sortOpen, setSortOpen] = useState(false);
  const [openFilter, setOpenFilter] = useState<string | null>(null);
  const [filterSearch, setFilterSearch] = useState<Record<string, string>>({});
  const [mobileFilterOpen, setMobileFilterOpen] = useState(false);
  const [mobileSortOpen, setMobileSortOpen] = useState(false);

  /* ── URL is the source of truth for filter state ── */
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const [isPending, startTransition] = useTransition();

  // Server-rendered filters arrive via props (parsed there), but we always
  // re-derive from `useSearchParams` so client-side `router.replace` keeps
  // the UI in sync without waiting for the server round-trip.
  const currentFilters = useMemo<CatalogFilters>(() => {
    // Pull dynamic values out of useSearchParams; merge with server-parsed
    // defaults so unsupported keys (e.g. sort) still flow through. We use
    // the same parser here as on the server.
    const sp: Record<string, string> = {};
    searchParams.forEach((v, k) => { sp[k] = v; });
    // Inline parser instead of importing again — keeps client bundle slim.
    const inlineFilters: CatalogFilters = { ...(currentFiltersProp ?? {}) };
    // Wipe list fields so they reflect the current URL, not stale prop state.
    delete inlineFilters.colors; delete inlineFilters.sizes; delete inlineFilters.brands;
    delete inlineFilters.styles; delete inlineFilters.materials; delete inlineFilters.seasons;
    delete inlineFilters.fits; delete inlineFilters.liningMaterials;
    delete inlineFilters.brandCountries; delete inlineFilters.labels;
    delete inlineFilters.productDetails; delete inlineFilters.careInstructions; delete inlineFilters.insulations;
    delete inlineFilters.minPrice; delete inlineFilters.maxPrice;
    delete inlineFilters.inStockOnly; delete inlineFilters.sort; delete inlineFilters.page;
    delete inlineFilters.chip;
    const csv = (v?: string) => v?.split(',').map(s => s.trim()).filter(Boolean);
    const num = (v?: string) => { if (!v) return undefined; const n = Number(v); return Number.isFinite(n) ? n : undefined; };
    const mp = num(sp.minPrice); if (mp !== undefined) inlineFilters.minPrice = mp;
    const mxp = num(sp.maxPrice); if (mxp !== undefined) inlineFilters.maxPrice = mxp;
    if (sp.inStock === 'true') inlineFilters.inStockOnly = true;
    const colors = csv(sp.color); if (colors?.length) inlineFilters.colors = colors;
    const sizes = csv(sp.size); if (sizes?.length) inlineFilters.sizes = sizes;
    const brands = csv(sp.brand); if (brands?.length) inlineFilters.brands = brands;
    const styles = csv(sp.style); if (styles?.length) inlineFilters.styles = styles;
    const materials = csv(sp.material); if (materials?.length) inlineFilters.materials = materials;
    const seasons = csv(sp.season); if (seasons?.length) inlineFilters.seasons = seasons;
    const fits = csv(sp.fit); if (fits?.length) inlineFilters.fits = fits;
    const lining = csv(sp.liningMaterial); if (lining?.length) inlineFilters.liningMaterials = lining;
    const countries = csv(sp.brandCountry); if (countries?.length) inlineFilters.brandCountries = countries;
    const labels = csv(sp.label); if (labels?.length) inlineFilters.labels = labels;
    const details = csv(sp.details); if (details?.length) inlineFilters.productDetails = details;
    const care = csv(sp.careInstructions); if (care?.length) inlineFilters.careInstructions = care;
    const insulations = csv(sp.insulation); if (insulations?.length) inlineFilters.insulations = insulations;
    if (sp.sort) inlineFilters.sort = sp.sort;
    const page = num(sp.page); if (page !== undefined && page > 0) inlineFilters.page = Math.floor(page);
    if (sp.chip) inlineFilters.chip = sp.chip;
    return inlineFilters;
  }, [searchParams, currentFiltersProp]);

  // Optimistic mirror of `currentFilters`. The UI (checkboxes, chips, sort
  // pill, price slider) renders from this snapshot so a click flips the
  // visual state immediately, before the URL-driven server round-trip
  // resolves. React swaps it back to `currentFilters` automatically once
  // the transition that wrapped the optimistic update commits.
  const [optimisticFilters, applyOptimisticFilters] = useOptimistic<CatalogFilters, CatalogFilters>(
    currentFilters,
    (_prev, next) => next,
  );

  const selectedFiltersBySelfKey = useMemo(() => {
    const out: Record<string, string[]> = {};
    for (const group of FILTER_GROUPS) {
      const sel = getSelectedOptionsForGroup(optimisticFilters, group.key);
      if (sel.length > 0) out[group.key] = sel;
    }
    return out;
  }, [FILTER_GROUPS, optimisticFilters]);

  const sortBy = optimisticFilters.sort ?? 'featured';
  const currentPage = currentPageProp ?? optimisticFilters.page ?? 1;
  const activeChip = optimisticFilters.chip ?? '';
  const priceRange: [number, number] = [
    optimisticFilters.minPrice ?? (priceDefault?.[0] ?? 0),
    optimisticFilters.maxPrice ?? (priceDefault?.[1] ?? priceMax),
  ];
  const isPriceActive = optimisticFilters.minPrice !== undefined
    || optimisticFilters.maxPrice !== undefined;

  /* ── Redux retains UI-only prefs (view density, list mode) ── */
  const dispatch = useAppDispatch();
  const catalogState = useAppSelector(s => s.catalog[catalogKey]);
  const viewCols = (catalogState?.viewCols ?? 4) as 3 | 4;
  const listMode = showListMode ? (catalogState?.listMode ?? false) : false;

  const filterBarRef = useRef<HTMLDivElement>(null);
  const sortRef = useRef<HTMLDivElement>(null);

  // Fire a single category_view per catalog mount so analytics get an event
  // for every browsing session, regardless of auth state.
  useEffect(() => {
    trackActivity({ type: 'category_view', meta: { catalogKey } });
  }, [catalogKey]);

  const currentFilterGroup = FILTER_GROUPS.find(g => g.key === openFilter) ?? null;
  const totalActiveFilters = countActiveFilters(optimisticFilters);

  /* ── URL navigation helpers ─────────────────────────────────────────── */

  /** Push a new filter snapshot to the URL. Keeps non-filter params intact
   *  (utm_, etc.) so they don't get wiped when the user clicks a checkbox. */
  const pushFilters = useCallback((next: CatalogFilters) => {
    const baseQs = serializeCatalogSearchParams(next);
    // Preserve unrelated query params (e.g. analytics).
    const all = new URLSearchParams(searchParams.toString());
    const knownKeys = [
      'minPrice', 'maxPrice', 'inStock', 'sort', 'page', 'chip', 'category',
      'color', 'size', 'brand', 'style', 'material', 'season',
      'fit', 'liningMaterial', 'brandCountry', 'label',
      'details', 'careInstructions', 'insulation',
    ];
    knownKeys.forEach((k) => all.delete(k));
    const merged = new URLSearchParams(baseQs);
    all.forEach((v, k) => merged.append(k, v));
    const qs = merged.toString();
    startTransition(() => {
      // Flip the UI immediately so checkbox / chip / sort responds before
      // the server round-trip completes. `useOptimistic` requires the
      // dispatch to live inside a transition.
      applyOptimisticFilters(next);
      router.replace(qs ? `${pathname}?${qs}` : pathname, { scroll: false });
    });
  }, [router, pathname, searchParams, applyOptimisticFilters]);

  const toggleFilter = useCallback((key: string, option: string) => {
    pushFilters(toggleFilterOption(optimisticFilters, key, option));
  }, [optimisticFilters, pushFilters]);

  const clearAll = useCallback(() => {
    setFilterSearch({});
    // Keep sort/page out — they're cleared too on a full reset.
    pushFilters({});
  }, [pushFilters]);

  const changePage = (page: number) => {
    const next: CatalogFilters = { ...optimisticFilters };
    if (page > 1) next.page = page;
    else delete next.page;
    pushFilters(next);
    if (typeof window !== 'undefined') {
      window.scrollTo({ top: 0, behavior: 'smooth' });
    }
  };

  const setSortBy = (sort: string) => {
    const next: CatalogFilters = { ...optimisticFilters };
    if (sort === 'featured') delete next.sort; else next.sort = sort;
    delete next.page;
    pushFilters(next);
  };

  const setActiveChip = (chip: string) => {
    const next: CatalogFilters = { ...optimisticFilters };
    if (!chip) delete next.chip; else next.chip = chip;
    delete next.page;
    pushFilters(next);
  };

  // Debounced price-range update so dragging the slider doesn't fire a
  // navigation per pixel. 200 ms feels responsive and avoids re-rendering
  // the server tree under each mouse move.
  const pricePushTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const setPriceRange = useCallback((v: [number, number]) => {
    if (pricePushTimer.current) clearTimeout(pricePushTimer.current);
    pricePushTimer.current = setTimeout(() => {
      const next: CatalogFilters = { ...optimisticFilters };
      if (v[0] > 0) next.minPrice = v[0]; else delete next.minPrice;
      if (v[1] < priceMax) next.maxPrice = v[1]; else delete next.maxPrice;
      delete next.page;
      pushFilters(next);
    }, 200);
  }, [optimisticFilters, priceMax, pushFilters]);

  /* ── Closing dropdowns ── */
  useEffect(() => {
    const onMouse = (e: MouseEvent) => {
      if (filterBarRef.current && !filterBarRef.current.contains(e.target as Node)) setOpenFilter(null);
      if (sortRef.current && !sortRef.current.contains(e.target as Node)) setSortOpen(false);
    };
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') { setOpenFilter(null); setSortOpen(false); }
    };
    document.addEventListener('mousedown', onMouse);
    document.addEventListener('keydown', onKey);
    return () => { document.removeEventListener('mousedown', onMouse); document.removeEventListener('keydown', onKey); };
  }, []);

  const getFilteredOptions = (group: FilterGroup) => {
    const term = (filterSearch[group.key] ?? '').toLowerCase();
    if (!term) return group.options;
    return group.options.filter(o => o.label.toLowerCase().includes(term));
  };

  const gridCols = listMode ? '' : viewCols === 4 ? 'grid-cols-2 lg:grid-cols-4' : 'grid-cols-2 lg:grid-cols-3';

  const hasPriceRange = FILTER_GROUPS.some(g => g.type === 'price_range');
  // Drop filter groups whose key doesn't map to an OE attribute (productDetails,
  // careInstructions, insulation, and the mock-shoes-only keys). The user can
  // still see supported groups; unsupported groups would just be no-ops.
  const supportedGroups = useMemo(
    () => FILTER_GROUPS.filter(g => g.type === 'section' || g.type === 'price_range' || isFilterGroupSupported(g.key)),
    [FILTER_GROUPS],
  );
  const mobileFilterGroups = hasPriceRange
    ? supportedGroups.filter(g => g.type !== 'price_range')
    : supportedGroups;

  /* ── Pagination ── */
  const totalForPagination = total ?? TOTAL_STYLES ?? filteredProducts.length;
  const totalPages = Math.max(1, Math.ceil(totalForPagination / PRODUCTS_PER_PAGE));
  const pageNumbers = useMemo(() => getPageNumbers(currentPage, totalPages), [currentPage, totalPages]);

  const getPriceSelCount = () => isPriceActive ? 1 : 0;

  return (
    <CatalogAccentContext.Provider value={ACCENT}>
    <div
      className="min-h-screen bg-white font-[Inter,sans-serif]"
      style={{ '--accent': ACCENT } as React.CSSProperties}
    >
      <Header />

      <main id="main-content">
        {/* ══ Row 1: Title + Breadcrumbs ══ */}
        <div className="px-4 lg:px-8 py-4 flex items-center justify-between border-b border-gray-200">
          <div className="flex items-center gap-3">
            <span className="hidden md:block w-px h-6 bg-[var(--accent)]" />
            <h1 className="tracking-[0.15em] uppercase text-2xl font-bold">
              {title}
            </h1>
            <span className="hidden md:inline-flex items-center px-2 py-0.5 text-white text-xs tracking-widest uppercase bg-[var(--accent)] rounded-none">
              {genderLabel}
            </span>
          </div>
          {breadcrumbs && breadcrumbs.length > 0 && (
            <nav className="hidden md:flex items-center gap-1 text-xs text-gray-400">
              {breadcrumbs.map((crumb, i) => (
                <span key={i} className="flex items-center gap-1">
                  {i > 0 && <span className="mx-0.5">/</span>}
                  {crumb.href ? (
                    <a href={crumb.href} className="hover:text-black transition-colors">{crumb.label}</a>
                  ) : (
                    <span className="text-black">{crumb.label}</span>
                  )}
                </span>
              ))}
            </nav>
          )}
        </div>

        {/* ══ STICKY BLOCK — chips + filter bar ══ */}
        <div
          ref={filterBarRef}
          className="sticky top-16 md:top-24 lg:top-[132px] z-40 bg-white pt-2"
        >
          {/* ── Row 2: Chips + View/Sort ── */}
          <div className="px-4 lg:px-8 py-2 flex items-center justify-between gap-4">
            {/* Chips */}
            <div className="flex items-center gap-2 overflow-x-auto scrollbar-hide flex-1 min-w-0 py-1">
              {QUICK_CHIPS.map(({ chip }) => (
                <button
                  key={chip}
                  onClick={() => setActiveChip(activeChip === chip ? '' : chip)}
                  className={`flex-shrink-0 px-4 py-2 text-xs whitespace-nowrap focus-visible:outline-none border border-black rounded-md transition-[background-color,color] duration-150 ${
                    activeChip === chip ? 'bg-black text-white' : 'bg-transparent text-black'
                  }`}
                  aria-pressed={activeChip === chip}
                >
                  {chip}
                </button>
              ))}
            </div>

            {/* View + Sort — desktop only */}
            <div className="hidden md:flex items-center gap-4 flex-shrink-0">
              <div className="flex items-center gap-2">
                <span className="text-xs text-gray-500 mr-1">{CVL.viewPrefix}</span>
                <button
                  onClick={() => {
                    dispatch(dispatchSetViewCols({ catalogKey, cols: 3 }));
                    if (showListMode) dispatch(dispatchSetListMode({ catalogKey, listMode: false }));
                  }}
                  className={`p-1 focus-visible:outline-none transition-opacity duration-150 ${
                    !listMode && viewCols === 3 ? 'opacity-100' : 'opacity-40'
                  }`}
                  aria-label={CVL.view3ColAria}
                >
                  <ColsIcon cols={3} active={!listMode && viewCols === 3} />
                </button>
                <button
                  onClick={() => {
                    dispatch(dispatchSetViewCols({ catalogKey, cols: 4 }));
                    if (showListMode) dispatch(dispatchSetListMode({ catalogKey, listMode: false }));
                  }}
                  className={`p-1 focus-visible:outline-none transition-opacity duration-150 ${
                    !listMode && viewCols === 4 ? 'opacity-100' : 'opacity-40'
                  }`}
                  aria-label={CVL.view4ColAria}
                >
                  <ColsIcon cols={4} active={!listMode && viewCols === 4} />
                </button>
              </div>

              {/* Sort dropdown */}
              <div className="relative" ref={sortRef}>
                <button
                  onClick={() => setSortOpen(o => !o)}
                  className="flex items-center gap-1 text-xs focus-visible:outline-none"
                >
                  {SORT_OPTIONS.find(o => o.value === sortBy)?.label}
                  <ChevronDown
                    size={11}
                    className={`transition-transform duration-200 ${sortOpen ? 'rotate-180' : 'rotate-0'}`}
                  />
                </button>
                {sortOpen && (
                  <div className="absolute top-full right-0 bg-white z-50 min-w-[190px] border border-black rounded-none mt-1.5">
                    {SORT_OPTIONS.map(opt => (
                      <SortOptionBtn
                        key={opt.value}
                        label={opt.label}
                        active={sortBy === opt.value}
                        onClick={() => {
                          setSortBy(opt.value);
                          setSortOpen(false);
                        }}
                      />
                    ))}
                  </div>
                )}
              </div>

              <span className="hidden md:flex items-center gap-0.5 text-xs text-gray-500">
                {CVL.pageOf} {currentPage} {CVL.pageOfMid} {totalPages}
                <ChevronRight size={11} />
              </span>
            </div>
          </div>

          {/* ── Row 3 desktop: Filter buttons ── */}
          <div className="px-4 lg:px-8 hidden md:flex items-center border-b border-gray-200">
            <div className={`flex items-center flex-1 overflow-x-auto overflow-y-hidden gap-0 ${scrollbarClass}`}>
              {supportedGroups.map(group => {
                if (group.type === 'section') {
                  return (
                    <span
                      key={group.key}
                      className="flex-shrink-0 px-3 select-none border-l border-gray-200 text-[9px] tracking-[0.18em] uppercase font-bold text-[#bbb] whitespace-nowrap ml-1 py-3.5"
                    >
                      {group.label}
                    </span>
                  );
                }
                const isOpen = openFilter === group.key;
                const selCount = group.type === 'price_range'
                  ? getPriceSelCount()
                  : (selectedFiltersBySelfKey[group.key]?.length ?? 0);
                return (
                  <button
                    key={group.key}
                    onClick={() => setOpenFilter(isOpen ? null : group.key)}
                    className={`flex items-center gap-1 py-3 pr-7 text-xs whitespace-nowrap transition-colors focus-visible:outline-none ${
                      isOpen || selCount > 0 ? 'text-black' : 'text-[#555]'
                    }`}
                  >
                    <span className={selCount > 0 ? 'font-semibold' : 'font-normal'}>{group.label}</span>
                    {selCount > 0 && (
                      <span className="text-xs text-[var(--accent)]">({selCount})</span>
                    )}
                    <ChevronDown
                      size={11}
                      className={`flex-shrink-0 transition-transform duration-200 ${isOpen ? 'rotate-180' : 'rotate-0'}`}
                    />
                  </button>
                );
              })}
            </div>
            <span className="flex-shrink-0 text-xs text-gray-400 pl-4">
              {filteredProducts.length.toLocaleString()} {CVL.stylesCount}
            </span>
          </div>

          {/* ── Row 3 mobile: FILTERS | SORT ── */}
          <div className="flex md:hidden border-b border-black border-t border-t-[#e5e7eb]">
            <button
              onClick={() => setMobileFilterOpen(true)}
              className="flex-1 flex items-center justify-center gap-2 focus-visible:outline-none h-12 font-bold text-[11px] tracking-[0.2em] uppercase border-r border-black"
            >
              {CVL.filtersHeading}
              {totalActiveFilters > 0 && (
                <span className="text-xs px-1.5 py-0.5 text-white bg-[var(--accent)] rounded-none font-semibold">
                  {totalActiveFilters}
                </span>
              )}
            </button>
            <button
              onClick={() => setMobileSortOpen(true)}
              className="flex-1 flex items-center justify-center focus-visible:outline-none h-12 font-bold text-[11px] tracking-[0.2em] uppercase"
            >
              {CVL.sortHeading}
            </button>
          </div>

          {/* ── Mega Dropdown Panel ── */}
          {openFilter && currentFilterGroup && currentFilterGroup.type !== 'section' && (
            <div
              className="absolute left-0 right-0 bg-white z-50 top-full border-t-2 border-t-[var(--accent)] border-b border-b-[#e5e7eb] shadow-[0_8px_32px_rgba(0,0,0,0.09)]"
              onMouseLeave={() => setOpenFilter(null)}
            >
              <div className="flex">
                {/* Options area */}
                <div className="flex-1 px-6 py-5 overflow-y-auto max-h-[420px]">

                  {/* Price range */}
                  {currentFilterGroup.type === 'price_range' && (
                    <PriceRangeSlider
                      minBound={0}
                      maxBound={priceMax}
                      value={priceRange}
                      onChange={setPriceRange}
                    />
                  )}

                  {/* Searchable checkbox */}
                  {currentFilterGroup.type === 'search_checkbox' && (
                    <div>
                      <div className="relative mb-4">
                        <Search size={13} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
                        <input
                          type="text"
                          placeholder={COMMON_EMPTY_STATES.searchInGroupTpl(currentFilterGroup.label)}
                          value={filterSearch[currentFilterGroup.key] ?? ''}
                          onChange={e => setFilterSearch(prev => ({ ...prev, [currentFilterGroup.key]: e.target.value }))}
                          className="w-full pl-8 pr-3 py-1.5 text-xs border border-gray-200 focus-visible:outline-none focus:border-black transition-colors rounded-none"
                        />
                      </div>
                      <div
                        className="grid gap-x-10 gap-y-0.5"
                        style={{ gridTemplateColumns: `repeat(${currentFilterGroup.columns ?? 3}, 1fr)` }}
                      >
                        {getFilteredOptions(currentFilterGroup).map(option => {
                          const selected = !!(selectedFiltersBySelfKey[currentFilterGroup.key]?.includes(option.label));
                          return (
                            <label key={option.label} className="flex items-center gap-2 cursor-pointer py-1 group">
                              <input type="checkbox" checked={selected} onChange={() => toggleFilter(currentFilterGroup.key, option.label)} className="sr-only" />
                              <CheckboxUI checked={selected} />
                              <span className={`text-xs group-hover:text-black transition-colors ${selected ? 'text-black' : 'text-[#444]'}`}>
                                {option.label}
                              </span>
                              {option.count !== undefined && (
                                <span className="text-xs text-gray-400">({option.count.toLocaleString()})</span>
                              )}
                            </label>
                          );
                        })}
                        {getFilteredOptions(currentFilterGroup).length === 0 && (
                          <p className="text-xs text-gray-400 col-span-3 py-2">{COMMON_EMPTY_STATES.noResultsFound}</p>
                        )}
                      </div>
                    </div>
                  )}

                  {/* Color swatches */}
                  {currentFilterGroup.type === 'color' && (
                    <div
                      className="grid gap-x-10 gap-y-1.5"
                      style={{ gridTemplateColumns: `repeat(${currentFilterGroup.columns ?? 3}, 1fr)` }}
                    >
                      {currentFilterGroup.options.map(option => {
                        const selected = !!(selectedFiltersBySelfKey[currentFilterGroup.key]?.includes(option.label));
                        return (
                          <label key={option.label} className="flex items-center gap-2 cursor-pointer py-0.5 group">
                            <input type="checkbox" checked={selected} onChange={() => toggleFilter(currentFilterGroup.key, option.label)} className="sr-only" />
                            <CheckboxUI checked={selected} />
                            <ColorSwatch color={option.color!} selected={selected} size={14} />
                            <span className={`text-xs group-hover:text-black transition-colors ${selected ? 'text-black' : 'text-[#444]'}`}>
                              {option.label}
                            </span>
                            {option.count !== undefined && (
                              <span className="text-xs text-gray-400 ml-auto">({option.count.toLocaleString()})</span>
                            )}
                          </label>
                        );
                      })}
                    </div>
                  )}

                  {/* Standard checkboxes (default) */}
                  {(!currentFilterGroup.type || currentFilterGroup.type === 'checkbox') && (
                    <div
                      className="grid gap-x-10 gap-y-0.5"
                      style={{ gridTemplateColumns: `repeat(${currentFilterGroup.columns ?? 3}, 1fr)` }}
                    >
                      {currentFilterGroup.options.map(option => {
                        const selected = !!(selectedFiltersBySelfKey[currentFilterGroup.key]?.includes(option.label));
                        return (
                          <label key={option.label} className="flex items-center gap-2 cursor-pointer py-1 group">
                            <input type="checkbox" checked={selected} onChange={() => toggleFilter(currentFilterGroup.key, option.label)} className="sr-only" />
                            <CheckboxUI checked={selected} />
                            <span className={`text-xs group-hover:text-black transition-colors ${selected ? 'text-black' : 'text-[#444]'}`}>
                              {option.label}
                            </span>
                            {option.count !== undefined && (
                              <span className="text-xs text-gray-400">({option.count.toLocaleString()})</span>
                            )}
                          </label>
                        );
                      })}
                    </div>
                  )}
                </div>

                {/* Right action panel */}
                <div className="flex flex-col items-center justify-start gap-3 px-6 py-5 border-l border-[#e5e7eb] min-w-[160px]">
                  <button
                    onClick={clearAll}
                    className="w-full px-4 py-2 text-xs tracking-widest uppercase text-white bg-black hover:bg-gray-800 transition-colors focus-visible:outline-none rounded-none"
                  >
                    {CVL.clearAll}
                  </button>
                </div>
              </div>
            </div>
          )}
        </div>{/* end sticky block */}

        {/* ── Active filter chips ── */}
        {totalActiveFilters > 0 && (
          <div className="px-4 lg:px-8 py-2.5 flex flex-wrap items-center gap-2 border-b border-gray-100">
            <span className="text-xs text-gray-500 tracking-wider uppercase">{CVL.activePrefix}</span>
            {Object.entries(selectedFiltersBySelfKey).flatMap(([key, vals]) =>
              vals.map(val => {
                const group = FILTER_GROUPS.find(g => g.key === key);
                return (
                  <button
                    key={`${key}-${val}`}
                    onClick={() => toggleFilter(key, val)}
                    className="flex items-center gap-1.5 px-2.5 py-1 text-xs border border-gray-300 hover:border-black transition-colors group rounded-none"
                  >
                    <span className="text-gray-500 group-hover:text-black">{group?.label}: </span>
                    <span>{val}</span>
                    <X size={10} className="text-gray-400 group-hover:text-black" />
                  </button>
                );
              })
            )}
            <button onClick={clearAll} className="text-xs text-gray-400 hover:text-black underline ml-1 transition-colors">
              {CVL.clearAllLower}
            </button>
          </div>
        )}

        {/* ══ Product Grid ══ */}
        {/* While a filter / sort / page change is in-flight (transition
            started by `pushFilters`), swap the grid for skeletons so the
            shopper sees that something is loading and doesn't double-click
            checkboxes. The optimistic filters above already flipped the
            controls themselves. */}
        {isPending ? (
          <div className={`grid ${gridCols} gap-px bg-white`}>
            {Array.from({ length: PRODUCTS_PER_PAGE }).map((_, i) => (
              <div key={`skeleton-${i}`} className="bg-white">
                <ProductCardSkeleton />
              </div>
            ))}
          </div>
        ) : filteredProducts.length === 0 ? (
          <NoFilterResults onClearAll={clearAll} />
        ) : !listMode ? (
          <div className={`grid ${gridCols} gap-px bg-white`}>
            {filteredProducts.map((product, idx) => (
              <div key={product.id} className="bg-white">
                <ProductCard product={product} priority={idx < 4} />
              </div>
            ))}
          </div>
        ) : (
          /* List mode (only when showListMode=true) */
          <div className="border-t border-white">
            {filteredProducts.map(product => (
              <CatalogListProductCard key={product.id} product={product} accent={ACCENT} />
            ))}
          </div>
        )}

        {/* ══ Pagination + Progress ══ */}
        <div className="px-4 lg:px-8 py-12 border-t border-gray-200">
          <div className="max-w-xs mx-auto text-center mb-8">
            <p className="text-xs text-gray-500 mb-3">
              {CVL.youveViewedPrefix}
              <span className="text-black font-semibold">{Math.min(currentPage * PRODUCTS_PER_PAGE, totalForPagination)}</span>
              {CVL.youveViewedMid}
              <span className="text-black font-semibold">{totalForPagination.toLocaleString()}</span>
              {CVL.youveViewedSuffix}
            </p>
            <div className="w-full h-0.5 bg-gray-100">
              <div
                className="h-0.5 transition-all duration-500 bg-[var(--accent)]"
                style={{ width: `${Math.min(100, (PRODUCTS_PER_PAGE / totalForPagination) * 100)}%` }}
              />
            </div>
          </div>
          <div className="flex items-center justify-center">
            <button
              onClick={() => changePage(Math.max(1, currentPage - 1))}
              disabled={currentPage === 1}
              className="w-9 h-9 flex items-center justify-center border border-black hover:bg-black hover:text-white transition-colors disabled:opacity-30 disabled:cursor-not-allowed rounded-none"
            >
              <ChevronLeft size={14} />
            </button>
            {pageNumbers.map((page, i) => (
              <button
                key={`${page}-${i}`}
                onClick={() => typeof page === 'number' && changePage(page)}
                disabled={page === '...'}
                className={`w-9 h-9 flex items-center justify-center border text-xs transition-colors rounded-none border-black -ml-px ${
                  currentPage === page ? 'bg-black text-white' : 'bg-white text-black'
                } ${page === '...' ? 'cursor-default' : 'cursor-pointer'}`}
              >
                {page}
              </button>
            ))}
            <button
              onClick={() => changePage(Math.min(totalPages, currentPage + 1))}
              disabled={currentPage === totalPages}
              className="w-9 h-9 flex items-center justify-center border border-black hover:bg-black hover:text-white transition-colors disabled:opacity-30 disabled:cursor-not-allowed rounded-none -ml-px"
            >
              <ChevronRight size={14} />
            </button>
          </div>
          <p className="text-xs text-gray-400 text-center mt-4">{CATALOG_PAGINATION_LABELS.pageOfTpl(currentPage, totalPages)}</p>
        </div>

        {/* ══ Cross-sell (optional) ══ */}
        {crossSell && <CatalogCrossSell crossSell={crossSell} />}

        {/* ══ Trend Blocks (optional) ══ */}
        {trendingBlock && trendingBlock.products.length > 0 && (
          <NewArrivals products={trendingBlock.products} title={trendingBlock.title} />
        )}
        {trendBlocks && trendBlocks.length > 0 && <CatalogTrendBlocks trendBlocks={trendBlocks} />}
      </main>

      <Footer />

      {/* ── Mobile Filter Panel ── */}
      <MobileFilterPanel
        isOpen={mobileFilterOpen}
        onClose={() => setMobileFilterOpen(false)}
        filterGroups={mobileFilterGroups}
        selectedFilters={selectedFiltersBySelfKey}
        onToggleFilter={toggleFilter}
        onClearAll={clearAll}
      />

      {/* ── Mobile Sort Bottom Sheet ── */}
      <CatalogMobileSort
        isOpen={mobileSortOpen}
        onClose={() => setMobileSortOpen(false)}
        sortBy={sortBy}
        onSortChange={setSortBy}
      />
    </div>
    </CatalogAccentContext.Provider>
  );
}
