'use client';

/** CatalogTemplate — universal catalog engine. */
import { ChevronDown, ChevronLeft, ChevronRight, Search, X } from 'lucide-react';
import { usePathname, useSearchParams } from 'next/navigation';
import { useCallback, useEffect, useMemo, useOptimistic, useRef, useState, useTransition } from 'react';

import { PageBlocksRenderer } from '@/app/components/blocks/PageBlocksRenderer';
import { NewArrivals } from '@/app/components/home/NewArrivals';
import { ProductCard } from '@/app/components/product/ProductCard';
import { ProductCardSkeleton } from '@/app/components/product/ProductCardSkeleton';
import { ColorSwatch } from '@/app/components/ui/ColorSwatch';
import { fillTokens } from '@/app/utils/fillTokens';
import { useDict, useT } from '@/lib/oneentry/labels/DictContext';

import { CatalogCrossSell } from './CatalogCrossSell';
import { CatalogListProductCard } from './CatalogListProductCard';
import { CatalogMobileSort } from './CatalogMobileSort';
import { CheckboxUI, ColsIcon, SortOptionBtn } from './CatalogTemplate.parts';
import {
  type CatalogTemplateProps,
  type FilterGroup,
  getPageNumbers,
  SORT_OPTIONS,
  type SortLabelKey,
} from './CatalogTemplate.types';
import { MobileFilterPanel } from './MobileFilterPanel';
import { NoFilterResults } from './NoFilterResults';
import { PriceRangeSlider } from './PriceRangeSlider';

export type {
  BreadcrumbItem,
  CatalogTemplateProps,
  ChipFilter,
  CrossSellCategory,
  FilterGroup,
  FilterOption,
} from './CatalogTemplate.types';
import { CatalogAccentContext } from '@/app/context/CatalogAccentContext';
import { setListMode as dispatchSetListMode, setViewCols as dispatchSetViewCols } from '@/app/store/catalogSlice';
import { useAppDispatch, useAppSelector } from '@/app/store/hooks';
import { trackActivity } from '@/app/utils/track-activity';
import { Link, useRouter } from '@/lib/i18n/navigation';
import {
  type CatalogFilters,
  countActiveFilters,
  getSelectedOptionsForGroup,
  isFilterGroupSupported,
  serializeCatalogSearchParams,
  toggleFilterOption,
} from '@/lib/oneentry/catalog/filters';

export const CATALOG_PAGINATION_LABELS = {
  /** `%current%` / `%total%` — the 1-based page number and page count. */
  pageOf: 'Page %current% of %total%',
} as const;

export const CATALOG_TEMPLATE_LABELS = {
  view3ColAria: '3-column view',
  view4ColAria: '4-column view',
  viewPrefix: 'View:',
  activePrefix: 'Active:',
  pageOf: 'Page',
  pageOfMid: 'of',
  filtersHeading: 'FILTERS',
  sortHeading: 'SORT',
  clearAll: 'Clear All',
  clearAllLower: 'Clear all',
  youveViewedPrefix: "You've viewed ",
  youveViewedMid: ' of ',
  youveViewedSuffix: ' products',
} as const;

export const CATALOG_TEMPLATE_EMPTY_STATES = {
  noResultsFound: 'No results found',
  /** `%group%` — the filter group's label, lower-cased by the caller. */
  searchInGroup: 'Search %group%…',
} as const;

/** Sort option wording; `SORT_OPTIONS[].labelKey` indexes into this. */
export const CATALOG_TEMPLATE_SORT_LABELS = {
  featured: 'Featured',
  priceLowToHigh: 'Price: Low to High',
  priceHighToLow: 'Price: High to Low',
  popularity: 'Popularity',
  newArrivals: 'New Arrivals',
} as const satisfies Record<SortLabelKey, string>;

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
  trendingBlock,
  pageBlocks,
  breadcrumbs,
  priceMax = 600,
  priceDefault,
  showListMode = false,
  scrollbarClass = 'scrollbar-pink',
  crossSell,
}: CatalogTemplateProps) {
  const CVL = useDict('interface_controls_view_', CATALOG_TEMPLATE_LABELS);
  const lNoResultsFound = useT('interface_controls_no_results_found', CATALOG_TEMPLATE_EMPTY_STATES.noResultsFound);
  const lSearchInGroup = useT('interface_controls_search_in_group', CATALOG_TEMPLATE_EMPTY_STATES.searchInGroup);
  const lPageOf = useT('interface_controls_page_of', CATALOG_PAGINATION_LABELS.pageOf);
  const CSL = useDict('interface_controls_sort_option_', CATALOG_TEMPLATE_SORT_LABELS);
  const sortOptions = useMemo(() => SORT_OPTIONS.map((o) => ({ value: o.value, label: CSL[o.labelKey] })), [CSL]);
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

  // Server-rendered filters arrive via props (parsed there), but we always re-derive from `useSearchParams` so client-side `router.replace` keeps the UI in sync without waiting for the server round-trip.
  const currentFilters = useMemo<CatalogFilters>(() => {
    // Pull dynamic values out of useSearchParams; merge with server-parsed defaults so unsupported keys (e.g. sort) still flow through.
    const sp: Record<string, string> = {};
    searchParams.forEach((v, k) => {
      sp[k] = v;
    });
    // Inline parser instead of importing again — keeps client bundle slim.
    const inlineFilters: CatalogFilters = { ...(currentFiltersProp ?? {}) };
    // Wipe list fields so they reflect the current URL, not stale prop state.
    delete inlineFilters.colors;
    delete inlineFilters.sizes;
    delete inlineFilters.brands;
    delete inlineFilters.styles;
    delete inlineFilters.materials;
    delete inlineFilters.seasons;
    delete inlineFilters.fits;
    delete inlineFilters.liningMaterials;
    delete inlineFilters.brandCountries;
    delete inlineFilters.labels;
    delete inlineFilters.productDetails;
    delete inlineFilters.careInstructions;
    delete inlineFilters.insulations;
    delete inlineFilters.minPrice;
    delete inlineFilters.maxPrice;
    delete inlineFilters.inStockOnly;
    delete inlineFilters.sort;
    delete inlineFilters.page;
    delete inlineFilters.chip;
    const csv = (v?: string) =>
      v
        ?.split(',')
        .map((s) => s.trim())
        .filter(Boolean);
    const num = (v?: string) => {
      if (!v) return undefined;
      const n = Number(v);
      return Number.isFinite(n) ? n : undefined;
    };
    const mp = num(sp.minPrice);
    if (mp !== undefined) inlineFilters.minPrice = mp;
    const mxp = num(sp.maxPrice);
    if (mxp !== undefined) inlineFilters.maxPrice = mxp;
    if (sp.inStock === 'true') inlineFilters.inStockOnly = true;
    const colors = csv(sp.color);
    if (colors?.length) inlineFilters.colors = colors;
    const sizes = csv(sp.size);
    if (sizes?.length) inlineFilters.sizes = sizes;
    const brands = csv(sp.brand);
    if (brands?.length) inlineFilters.brands = brands;
    const styles = csv(sp.style);
    if (styles?.length) inlineFilters.styles = styles;
    const materials = csv(sp.material);
    if (materials?.length) inlineFilters.materials = materials;
    const seasons = csv(sp.season);
    if (seasons?.length) inlineFilters.seasons = seasons;
    const fits = csv(sp.fit);
    if (fits?.length) inlineFilters.fits = fits;
    const lining = csv(sp.liningMaterial);
    if (lining?.length) inlineFilters.liningMaterials = lining;
    const countries = csv(sp.brandCountry);
    if (countries?.length) inlineFilters.brandCountries = countries;
    const labels = csv(sp.label);
    if (labels?.length) inlineFilters.labels = labels;
    const details = csv(sp.details);
    if (details?.length) inlineFilters.productDetails = details;
    const care = csv(sp.careInstructions);
    if (care?.length) inlineFilters.careInstructions = care;
    const insulations = csv(sp.insulation);
    if (insulations?.length) inlineFilters.insulations = insulations;
    if (sp.sort) inlineFilters.sort = sp.sort;
    const page = num(sp.page);
    if (page !== undefined && page > 0) inlineFilters.page = Math.floor(page);
    if (sp.chip) {
      inlineFilters.chip = sp.chip;
    } else {
      // Slug-based URLs like `/women/clothing/category/outerwear` carry the chosen sub-category in the path instead of the query.
      const parts = pathname.split('/').filter(Boolean);
      const idx = parts.lastIndexOf('category');
      if (idx >= 0 && idx < parts.length - 1) {
        inlineFilters.chip = parts[idx + 1]
          .split(/[-_]/)
          .filter(Boolean)
          .map((w) => w.charAt(0).toUpperCase() + w.slice(1))
          .join(' ');
      }
    }
    return inlineFilters;
  }, [searchParams, currentFiltersProp, pathname]);

  // Optimistic mirror of `currentFilters`. The UI (checkboxes, chips, sort pill, price slider) renders from this snapshot so a click flips the visual state immediately, before the URL-driven server round-trip resolves.
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
    optimisticFilters.minPrice ?? priceDefault?.[0] ?? 0,
    optimisticFilters.maxPrice ?? priceDefault?.[1] ?? priceMax,
  ];
  const isPriceActive = optimisticFilters.minPrice !== undefined || optimisticFilters.maxPrice !== undefined;

  /* ── Redux retains UI-only prefs (view density, list mode) ── */
  const dispatch = useAppDispatch();
  const catalogState = useAppSelector((s) => s.catalog[catalogKey]);
  const viewCols = (catalogState?.viewCols ?? 4) as 3 | 4;
  const listMode = showListMode ? (catalogState?.listMode ?? false) : false;

  const filterBarRef = useRef<HTMLDivElement>(null);
  const sortRef = useRef<HTMLDivElement>(null);

  // Fire a single category_view per catalog mount so analytics get an event for every browsing session, regardless of auth state.
  useEffect(() => {
    trackActivity({ type: 'category_view', meta: { catalogKey } });
  }, [catalogKey]);

  const currentFilterGroup = FILTER_GROUPS.find((g) => g.key === openFilter) ?? null;
  const totalActiveFilters = countActiveFilters(optimisticFilters);

  /* ── URL navigation helpers ─────────────────────────────────────────── */

  /** Push a new filter snapshot to the URL. */
  const pushFilters = useCallback(
    (next: CatalogFilters) => {
      const baseQs = serializeCatalogSearchParams(next);
      // Preserve unrelated query params (e.g. analytics).
      const all = new URLSearchParams(searchParams.toString());
      const knownKeys = [
        'minPrice',
        'maxPrice',
        'inStock',
        'sort',
        'page',
        'chip',
        'category',
        'color',
        'size',
        'brand',
        'style',
        'material',
        'season',
        'fit',
        'liningMaterial',
        'brandCountry',
        'label',
        'details',
        'careInstructions',
        'insulation',
      ];
      knownKeys.forEach((k) => all.delete(k));
      const merged = new URLSearchParams(baseQs);
      all.forEach((v, k) => merged.append(k, v));
      const qs = merged.toString();
      startTransition(() => {
        // Flip the UI immediately so checkbox / chip / sort responds before the server round-trip completes.
        applyOptimisticFilters(next);
        router.replace(qs ? `${pathname}?${qs}` : pathname, { scroll: false });
      });
    },
    [router, pathname, searchParams, applyOptimisticFilters],
  );

  const toggleFilter = useCallback(
    (key: string, option: string) => {
      pushFilters(toggleFilterOption(optimisticFilters, key, option));
    },
    [optimisticFilters, pushFilters],
  );

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
    if (sort === 'featured') delete next.sort;
    else next.sort = sort;
    delete next.page;
    pushFilters(next);
  };

  const setActiveChip = (chip: string) => {
    const next: CatalogFilters = { ...optimisticFilters };
    if (!chip) delete next.chip;
    else next.chip = chip;
    delete next.page;
    pushFilters(next);
  };

  // Debounced price-range update so dragging the slider doesn't fire a navigation per pixel.
  const pricePushTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const setPriceRange = useCallback(
    (v: [number, number]) => {
      if (pricePushTimer.current) clearTimeout(pricePushTimer.current);
      pricePushTimer.current = setTimeout(() => {
        const next: CatalogFilters = { ...optimisticFilters };
        if (v[0] > 0) next.minPrice = v[0];
        else delete next.minPrice;
        if (v[1] < priceMax) next.maxPrice = v[1];
        else delete next.maxPrice;
        delete next.page;
        pushFilters(next);
      }, 200);
    },
    [optimisticFilters, priceMax, pushFilters],
  );

  /* ── Closing dropdowns ── */
  useEffect(() => {
    const onMouse = (e: MouseEvent) => {
      if (filterBarRef.current && !filterBarRef.current.contains(e.target as Node)) setOpenFilter(null);
      if (sortRef.current && !sortRef.current.contains(e.target as Node)) setSortOpen(false);
    };
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        setOpenFilter(null);
        setSortOpen(false);
      }
    };
    document.addEventListener('mousedown', onMouse);
    document.addEventListener('keydown', onKey);
    return () => {
      document.removeEventListener('mousedown', onMouse);
      document.removeEventListener('keydown', onKey);
    };
  }, []);

  const getFilteredOptions = (group: FilterGroup) => {
    const term = (filterSearch[group.key] ?? '').toLowerCase();
    if (!term) return group.options;
    return group.options.filter((o) => o.label.toLowerCase().includes(term));
  };

  const gridCols = listMode ? '' : viewCols === 4 ? 'grid-cols-2 lg:grid-cols-4' : 'grid-cols-2 lg:grid-cols-3';

  const hasPriceRange = FILTER_GROUPS.some((g) => g.type === 'price_range');
  // Drop filter groups whose key doesn't map to an OE attribute (productDetails, careInstructions, insulation, and the mock-shoes-only keys).
  const supportedGroups = useMemo(
    () =>
      FILTER_GROUPS.filter((g) => g.type === 'section' || g.type === 'price_range' || isFilterGroupSupported(g.key)),
    [FILTER_GROUPS],
  );
  const mobileFilterGroups = hasPriceRange ? supportedGroups.filter((g) => g.type !== 'price_range') : supportedGroups;

  /* ── Pagination ── */
  const totalForPagination = total ?? TOTAL_STYLES ?? filteredProducts.length;
  const totalPages = Math.max(1, Math.ceil(totalForPagination / PRODUCTS_PER_PAGE));
  const pageNumbers = useMemo(() => getPageNumbers(currentPage, totalPages), [currentPage, totalPages]);

  const getPriceSelCount = () => (isPriceActive ? 1 : 0);

  return (
    <CatalogAccentContext.Provider value={ACCENT}>
      <div className="flex-1 bg-white font-sans" style={{ '--accent': ACCENT } as React.CSSProperties}>
        <main id="main-content">
          {/* ══ Row 1: Title + Breadcrumbs ══ */}
          <div className="flex items-center justify-between border-b border-gray-200 p-4 lg:px-8">
            <div className="flex items-center gap-3">
              <span className="hidden h-6 w-px bg-accent md:block" />
              <h1 className="text-2xl font-bold tracking-[0.15em] uppercase">{activeChip || title}</h1>
              <span className="hidden items-center rounded-none bg-accent px-2 py-0.5 text-xs tracking-widest text-white uppercase md:inline-flex">
                {genderLabel}
              </span>
            </div>
            {breadcrumbs &&
              breadcrumbs.length > 0 &&
              (() => {
                // Determine the terminal sub-category from two sources: 1) `activeChip` — chosen via chip filter on the current page.
                const pathParts = pathname.split('/').filter(Boolean);
                const catIdx = pathParts.lastIndexOf('category');
                const slugSubcategory = catIdx >= 0 && catIdx < pathParts.length - 1 ? pathParts[catIdx + 1] : '';
                const prettify = (s: string) =>
                  s
                    .split(/[-_]/)
                    .filter(Boolean)
                    .map((w) => w.charAt(0).toUpperCase() + w.slice(1))
                    .join(' ');
                const terminalLabel = activeChip || (slugSubcategory ? prettify(slugSubcategory) : '');
                // Parent link points to the catalog page without the trailing `/category/<slug>` when we arrived via slug-based URL.
                const parentHref =
                  catIdx >= 0
                    ? '/' + pathParts.slice(0, catIdx).join('/')
                    : (breadcrumbs[breadcrumbs.length - 1].href ?? pathname);
                const trail = terminalLabel
                  ? [
                      ...breadcrumbs.slice(0, -1),
                      { ...breadcrumbs[breadcrumbs.length - 1], href: parentHref },
                      { label: terminalLabel },
                    ]
                  : breadcrumbs;
                return (
                  <nav className="hidden items-center gap-1 text-xs text-gray-400 md:flex">
                    {trail.map((crumb, i) => (
                      <span key={i} className="flex items-center gap-1">
                        {i > 0 && <span className="mx-0.5">/</span>}
                        {crumb.href ? (
                          <Link href={crumb.href} className="transition-colors hover:text-black">
                            {crumb.label}
                          </Link>
                        ) : (
                          <span className="text-black">{crumb.label}</span>
                        )}
                      </span>
                    ))}
                  </nav>
                );
              })()}
          </div>

          {/* ══ STICKY BLOCK — chips + filter bar ══ */}
          <div ref={filterBarRef} className="sticky top-16 z-40 bg-white pt-2 md:top-24 lg:top-33">
            {/* ── Row 2: Chips + View/Sort ── */}
            <div className="flex items-center justify-between gap-4 px-4 py-2 lg:px-8">
              {/* Chips */}
              <div className="scrollbar-hide flex min-w-0 flex-1 items-center gap-2 overflow-x-auto py-1">
                {QUICK_CHIPS.map((chip) => (
                  <button
                    key={chip}
                    onClick={() => setActiveChip(activeChip === chip ? '' : chip)}
                    className={`shrink-0 rounded-md border border-black px-4 py-2 text-xs whitespace-nowrap transition-[background-color,color] duration-150 focus-visible:outline-none ${
                      activeChip === chip ? 'bg-black text-white' : 'bg-transparent text-black'
                    }`}
                    aria-pressed={activeChip === chip}
                  >
                    {chip}
                  </button>
                ))}
              </div>

              {/* View + Sort — desktop only */}
              <div className="hidden shrink-0 items-center gap-4 md:flex">
                <div className="flex items-center gap-2">
                  <span className="mr-1 text-xs text-gray-500">{CVL.viewPrefix}</span>
                  <button
                    onClick={() => {
                      dispatch(dispatchSetViewCols({ catalogKey, cols: 3 }));
                      if (showListMode) dispatch(dispatchSetListMode({ catalogKey, listMode: false }));
                    }}
                    className={`p-1 transition-opacity duration-150 focus-visible:outline-none ${
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
                    className={`p-1 transition-opacity duration-150 focus-visible:outline-none ${
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
                    onClick={() => setSortOpen((o) => !o)}
                    className="flex items-center gap-1 text-xs focus-visible:outline-none"
                  >
                    {sortOptions.find((o) => o.value === sortBy)?.label}
                    <ChevronDown
                      size={11}
                      className={`transition-transform duration-200 ${sortOpen ? 'rotate-180' : 'rotate-0'}`}
                    />
                  </button>
                  {sortOpen && (
                    <div className="absolute top-full right-0 z-50 mt-1.5 min-w-47.5 rounded-none border border-black bg-white">
                      {sortOptions.map((opt) => (
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

                <span className="hidden items-center gap-0.5 text-xs text-gray-500 md:flex">
                  {CVL.pageOf} {currentPage} {CVL.pageOfMid} {totalPages}
                  <ChevronRight size={11} />
                </span>
              </div>
            </div>

            {/* ── Row 3 desktop: Filter buttons ── */}
            {/* Only render this row when there is at least one real filter
              group. `section` entries are just visual separators and don't
              give the shopper anything actionable — a row filled with them
              (or entirely empty) reads as broken white space. Hides the
              styles counter too until a filter group re-appears. */}
            {supportedGroups.some((g) => g.type !== 'section') && (
              <div className="hidden items-center border-b border-gray-200 px-4 md:flex lg:px-8">
                <div className={`flex flex-1 items-center gap-0 overflow-x-auto overflow-y-hidden ${scrollbarClass}`}>
                  {supportedGroups.map((group) => {
                    if (group.type === 'section') {
                      return (
                        <span
                          key={group.key}
                          className="ml-1 shrink-0 border-l border-gray-200 px-3 py-3.5 text-[9px] font-bold tracking-[0.18em] whitespace-nowrap text-[#bbb] uppercase select-none"
                        >
                          {group.label}
                        </span>
                      );
                    }
                    const isOpen = openFilter === group.key;
                    const selCount =
                      group.type === 'price_range'
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
                        {selCount > 0 && <span className="text-xs text-accent">({selCount})</span>}
                        <ChevronDown
                          size={11}
                          className={`shrink-0 transition-transform duration-200 ${isOpen ? 'rotate-180' : 'rotate-0'}`}
                        />
                      </button>
                    );
                  })}
                </div>
              </div>
            )}

            {/* ── Row 3 mobile: FILTERS | SORT ── */}
            <div className="flex border-y border-black border-t-[#e5e7eb] md:hidden">
              <button
                onClick={() => setMobileFilterOpen(true)}
                className="flex h-12 flex-1 items-center justify-center gap-2 border-r border-black text-[11px] font-bold tracking-[0.2em] uppercase focus-visible:outline-none"
              >
                {CVL.filtersHeading}
                {totalActiveFilters > 0 && (
                  <span className="rounded-none bg-accent px-1.5 py-0.5 text-xs font-semibold text-white">
                    {totalActiveFilters}
                  </span>
                )}
              </button>
              <button
                onClick={() => setMobileSortOpen(true)}
                className="flex h-12 flex-1 items-center justify-center text-[11px] font-bold tracking-[0.2em] uppercase focus-visible:outline-none"
              >
                {CVL.sortHeading}
              </button>
            </div>

            {/* ── Mega Dropdown Panel ── */}
            {openFilter && currentFilterGroup && currentFilterGroup.type !== 'section' && (
              <div
                className="absolute inset-x-0 top-full z-50 border-t-2 border-b border-t-accent border-b-[#e5e7eb] bg-white shadow-[0_8px_32px_rgba(0,0,0,0.09)]"
                onMouseLeave={() => setOpenFilter(null)}
              >
                <div className="flex">
                  {/* Options area */}
                  <div className="max-h-105 flex-1 overflow-y-auto px-6 py-5">
                    {/* Price range */}
                    {currentFilterGroup.type === 'price_range' && (
                      <PriceRangeSlider minBound={0} maxBound={priceMax} value={priceRange} onChange={setPriceRange} />
                    )}

                    {/* Searchable checkbox */}
                    {currentFilterGroup.type === 'search_checkbox' && (
                      <div>
                        <div className="relative mb-4">
                          <Search size={13} className="absolute top-1/2 left-3 -translate-y-1/2 text-gray-400" />
                          <input
                            type="text"
                            placeholder={fillTokens(lSearchInGroup, { group: currentFilterGroup.label.toLowerCase() })}
                            value={filterSearch[currentFilterGroup.key] ?? ''}
                            onChange={(e) =>
                              setFilterSearch((prev) => ({ ...prev, [currentFilterGroup.key]: e.target.value }))
                            }
                            className="w-full rounded-none border border-gray-200 py-1.5 pr-3 pl-8 text-xs transition-colors focus:border-black focus-visible:outline-none"
                          />
                        </div>
                        <div
                          className="grid gap-x-10 gap-y-0.5"
                          style={{ gridTemplateColumns: `repeat(${currentFilterGroup.columns ?? 3}, 1fr)` }}
                        >
                          {getFilteredOptions(currentFilterGroup).map((option) => {
                            const selected = !!selectedFiltersBySelfKey[currentFilterGroup.key]?.includes(option.label);
                            return (
                              <label key={option.label} className="group flex cursor-pointer items-center gap-2 py-1">
                                <input
                                  type="checkbox"
                                  checked={selected}
                                  onChange={() => toggleFilter(currentFilterGroup.key, option.label)}
                                  className="sr-only"
                                />
                                <CheckboxUI checked={selected} />
                                <span
                                  className={`text-xs transition-colors group-hover:text-black ${selected ? 'text-black' : 'text-[#444]'}`}
                                >
                                  {option.label}
                                </span>
                                {option.count !== undefined && (
                                  <span className="text-xs text-gray-400">({option.count.toLocaleString()})</span>
                                )}
                              </label>
                            );
                          })}
                          {getFilteredOptions(currentFilterGroup).length === 0 && (
                            <p className="col-span-3 py-2 text-xs text-gray-400">{lNoResultsFound}</p>
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
                        {currentFilterGroup.options.map((option) => {
                          const selected = !!selectedFiltersBySelfKey[currentFilterGroup.key]?.includes(option.label);
                          return (
                            <label key={option.label} className="group flex cursor-pointer items-center gap-2 py-0.5">
                              <input
                                type="checkbox"
                                checked={selected}
                                onChange={() => toggleFilter(currentFilterGroup.key, option.label)}
                                className="sr-only"
                              />
                              <CheckboxUI checked={selected} />
                              <ColorSwatch color={option.color} selected={selected} size={14} />
                              <span
                                className={`text-xs transition-colors group-hover:text-black ${selected ? 'text-black' : 'text-[#444]'}`}
                              >
                                {option.label}
                              </span>
                              {option.count !== undefined && (
                                <span className="ml-auto text-xs text-gray-400">({option.count.toLocaleString()})</span>
                              )}
                            </label>
                          );
                        })}
                      </div>
                    )}

                    {/* Size chips — pressable pills instead of checkboxes. */}
                    {currentFilterGroup.type === 'size_chips' && (
                      <div className="flex flex-wrap gap-2">
                        {currentFilterGroup.options.map((option) => {
                          const selected = !!selectedFiltersBySelfKey[currentFilterGroup.key]?.includes(option.label);
                          return (
                            <button
                              key={option.label}
                              type="button"
                              onClick={() => toggleFilter(currentFilterGroup.key, option.label)}
                              aria-pressed={selected}
                              className={`border px-3 py-1.5 text-xs tracking-wider uppercase transition-colors ${
                                selected
                                  ? 'border-black bg-black text-white'
                                  : 'border-gray-300 bg-white text-black hover:border-black'
                              }`}
                            >
                              {option.label}
                              {option.count !== undefined && (
                                <span className={`ml-1 text-[10px] ${selected ? 'text-white/70' : 'text-gray-400'}`}>
                                  ({option.count})
                                </span>
                              )}
                            </button>
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
                        {currentFilterGroup.options.map((option) => {
                          const selected = !!selectedFiltersBySelfKey[currentFilterGroup.key]?.includes(option.label);
                          return (
                            <label key={option.label} className="group flex cursor-pointer items-center gap-2 py-1">
                              <input
                                type="checkbox"
                                checked={selected}
                                onChange={() => toggleFilter(currentFilterGroup.key, option.label)}
                                className="sr-only"
                              />
                              <CheckboxUI checked={selected} />
                              <span
                                className={`text-xs transition-colors group-hover:text-black ${selected ? 'text-black' : 'text-[#444]'}`}
                              >
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
                  <div className="flex min-w-40 flex-col items-center justify-start gap-3 border-l border-[#e5e7eb] px-6 py-5">
                    <button
                      onClick={clearAll}
                      className="w-full rounded-none bg-black px-4 py-2 text-xs tracking-widest text-white uppercase transition-colors hover:bg-gray-800 focus-visible:outline-none"
                    >
                      {CVL.clearAll}
                    </button>
                  </div>
                </div>
              </div>
            )}
          </div>
          {/* end sticky block */}

          {/* ── Active filter chips ── */}
          {totalActiveFilters > 0 && (
            <div className="flex flex-wrap items-center gap-2 border-b border-gray-100 px-4 py-2.5 lg:px-8">
              <span className="text-xs tracking-wider text-gray-500 uppercase">{CVL.activePrefix}</span>
              {Object.entries(selectedFiltersBySelfKey).flatMap(([key, vals]) =>
                vals.map((val) => {
                  const group = FILTER_GROUPS.find((g) => g.key === key);
                  return (
                    <button
                      key={`${key}-${val}`}
                      onClick={() => toggleFilter(key, val)}
                      className="group flex items-center gap-1.5 rounded-none border border-gray-300 px-2.5 py-1 text-xs transition-colors hover:border-black"
                    >
                      <span className="text-gray-500 group-hover:text-black">{group?.label}: </span>
                      <span>{val}</span>
                      <X size={10} className="text-gray-400 group-hover:text-black" />
                    </button>
                  );
                }),
              )}
              <button
                onClick={clearAll}
                className="ml-1 text-xs text-gray-400 underline transition-colors hover:text-black"
              >
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
              {filteredProducts.map((product) => (
                <CatalogListProductCard key={product.id} product={product} accent={ACCENT} />
              ))}
            </div>
          )}

          {/* ══ Pagination + Progress ══ */}
          <div className="border-t border-gray-200 px-4 py-12 lg:px-8">
            <div className="mx-auto mb-8 max-w-xs text-center">
              <p className="mb-3 text-xs text-gray-500">
                {CVL.youveViewedPrefix}
                <span className="font-semibold text-black">
                  {Math.min(currentPage * PRODUCTS_PER_PAGE, totalForPagination)}
                </span>
                {CVL.youveViewedMid}
                <span className="font-semibold text-black">{totalForPagination.toLocaleString()}</span>
                {CVL.youveViewedSuffix}
              </p>
              <div className="h-0.5 w-full bg-gray-100">
                <div
                  className="h-0.5 bg-accent transition-all duration-500"
                  style={{ width: `${Math.min(100, (PRODUCTS_PER_PAGE / totalForPagination) * 100)}%` }}
                />
              </div>
            </div>
            <div className="flex items-center justify-center">
              <button
                onClick={() => changePage(Math.max(1, currentPage - 1))}
                disabled={currentPage === 1}
                className="flex size-9 items-center justify-center rounded-none border border-black transition-colors hover:bg-black hover:text-white disabled:cursor-not-allowed disabled:opacity-30"
              >
                <ChevronLeft size={14} />
              </button>
              {pageNumbers.map((page, i) => (
                <button
                  key={`${page}-${i}`}
                  onClick={() => typeof page === 'number' && changePage(page)}
                  disabled={page === '...'}
                  className={`-ml-px flex size-9 items-center justify-center rounded-none border border-black text-xs transition-colors ${
                    currentPage === page ? 'bg-black text-white' : 'bg-white text-black'
                  } ${page === '...' ? 'cursor-default' : 'cursor-pointer'}`}
                >
                  {page}
                </button>
              ))}
              <button
                onClick={() => changePage(Math.min(totalPages, currentPage + 1))}
                disabled={currentPage === totalPages}
                className="-ml-px flex size-9 items-center justify-center rounded-none border border-black transition-colors hover:bg-black hover:text-white disabled:cursor-not-allowed disabled:opacity-30"
              >
                <ChevronRight size={14} />
              </button>
            </div>
            <p className="mt-4 text-center text-xs text-gray-400">
              {fillTokens(lPageOf, { current: currentPage, total: totalPages })}
            </p>
          </div>

          {/* ══ Cross-sell (optional) ══ */}
          {crossSell && <CatalogCrossSell crossSell={crossSell} />}

          {/* ══ Trend Blocks (optional) ══ */}
          {trendingBlock && trendingBlock.products.length > 0 && (
            <NewArrivals products={trendingBlock.products} title={trendingBlock.title} />
          )}

          {/* OE-attached page blocks (admin-ordered by `position`). Rendered
            at the bottom of the catalog UI — think of them as content the
            admin drops in below the grid rather than a hero. When no blocks
            are attached, `<PageBlocksRenderer>` collapses to nothing. */}
          {pageBlocks && pageBlocks.length > 0 && <PageBlocksRenderer blocks={pageBlocks} />}
        </main>

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
