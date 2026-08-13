'use client';
import { ChevronDown, ChevronLeft, ChevronRight, SlidersHorizontal, X } from 'lucide-react';
import { useSearchParams } from 'next/navigation';
import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';

import { PageBlocksRenderer } from '@/app/components/blocks/PageBlocksRenderer';
import { ColsIcon, SortOptionBtn as SortOption } from '@/app/components/catalog/CatalogTemplate.parts';
import { MobileFilterPanel } from '@/app/components/catalog/MobileFilterPanel';
import { type Product, ProductCard } from '@/app/components/product/ProductCard';
import { ProductCardSkeleton } from '@/app/components/product/ProductCardSkeleton';
import CmsImage from '@/app/components/ui/CmsImage';
import { SALE_COLOR as SALE_RED } from '@/app/constants/colors';
import { CatalogAccentContext } from '@/app/context/CatalogAccentContext';
import {
  SALE_CATEGORIES,
  SALE_COLOR_OPTIONS,
  SALE_END_DATE,
  SALE_SORT_OPTIONS,
  type SaleCategory,
} from '@/app/data/saleConfig';
import { useMounted } from '@/app/hooks/useMounted';
import { SALE_DISCOUNT_LABELS as DL, SALE_PAGE_LABELS, SALE_SORT_LABELS } from '@/app/pages/sale/copy';
import {
  clearFilters,
  setFilters,
  setPage as dispatchSetPage,
  setSort,
  setViewCols as dispatchSetViewCols,
  toggleFilter as dispatchToggleFilter,
} from '@/app/store/catalogSlice';
import { useAppDispatch, useAppSelector } from '@/app/store/hooks';
import { genderFilterFromQuery, matchesGender } from '@/app/utils/gender-filter';
import { Link } from '@/lib/i18n/navigation';
import type { PageBlock } from '@/lib/oneentry/blocks/page-blocks';
import type { SalePageFromCms } from '@/lib/oneentry/catalog/sale-page';
import { useDict, useT } from '@/lib/oneentry/labels/DictContext';

import { useCountdown } from './sale/SaleCountdown';
import { ColorPillDropdown, PillDropdown } from './sale/SaleFilterDropdowns';
import { SaleHero } from './sale/SaleHero';

export const SALE_CATEGORY_LABELS = {
  all: 'All',
  womenClothing: "Women's Clothing",
  womenShoes: "Women's Shoes",
  menClothing: "Men's Clothing",
  menShoes: "Men's Shoes",
  bags: 'Bags',
  accessories: 'Accessories',
} as const;

const CAT_FALLBACK = SALE_CATEGORY_LABELS;

const SALE_KEY = 'sale';

// Stable empty defaults — a fresh `[]` / `{}` per render would invalidate every memo that depends on the derived filter arrays.
const EMPTY_FILTERS: Record<string, string[]> = {};
const EMPTY_VALUES: string[] = [];

/* ── Discount % from price/salePrice strings ── */
const priceNum = (s?: string) => {
  if (!s) return 0;
  const n = Number.parseFloat(s.replace(/[^0-9.]/g, ''));
  return Number.isFinite(n) ? n : 0;
};
/** Discount buckets, keyed by a code the admin panel cannot rename. */
const DISCOUNT_BUCKET_KEYS = ['d10_20', 'd20_30', 'd30_40', 'd40_50', 'd50plus'] as const;
type DiscountBucketKey = (typeof DISCOUNT_BUCKET_KEYS)[number];
const DISCOUNT_BUCKET_RANGES: Record<DiscountBucketKey, [number, number]> = {
  d10_20: [10, 20],
  d20_30: [20, 30],
  d30_40: [30, 40],
  d40_50: [40, 50],
  d50plus: [50, Infinity],
};
const inDiscountBucket = (key: string, pct: number): boolean => {
  const range = DISCOUNT_BUCKET_RANGES[key as DiscountBucketKey];
  return range ? pct >= range[0] && pct < range[1] : false;
};

type SaleProduct = Product & { category?: string };

const discountPct = (p: SaleProduct): number => {
  const orig = priceNum(p.price);
  const sale = priceNum(p.salePrice);
  if (!orig || !sale || sale >= orig) return 0;
  return ((orig - sale) / orig) * 100;
};

export function SalePage({
  initialProducts,
  saleEndsAt,
  pageBlocks,
  cmsPage,
}: {
  initialProducts?: SaleProduct[];
  saleEndsAt?: number;
  pageBlocks?: PageBlock[];
  cmsPage?: SalePageFromCms | null;
} = {}) {
  const L = useDict('sale_page_', SALE_PAGE_LABELS);
  // Gender scope comes from `?gender=` (set by the header switch).
  const searchParams = useSearchParams();
  const gender = genderFilterFromQuery(searchParams.get('gender'));
  // Countdown target: OE-driven `page_sale_top_banner_timer` first, then the hardcoded fallback so the banner still runs if the admin hasn't set it.
  const countdown = useCountdown(saleEndsAt ?? SALE_END_DATE);
  const saleEndsAtDate = saleEndsAt ?? SALE_END_DATE;
  const lView = useT('sale_page_view', L.viewLabel);
  const lItemsOnSale = useT('sale_page_item_on_sale', L.itemsOnSaleSuffix);

  // UI-only state
  const [sortOpen, setSortOpen] = useState(false);
  const [mobileFilterOpen, setMobileFilterOpen] = useState(false);
  const mounted = useMounted();

  // Redux state
  const dispatch = useAppDispatch();
  const catalogState = useAppSelector((s) => s.catalog[SALE_KEY]);
  const selectedFilters = catalogState?.selectedFilters ?? EMPTY_FILTERS;
  const sortBy = catalogState?.sortBy ?? 'discount';
  const currentPage = catalogState?.currentPage ?? 1;
  const viewCols = (catalogState?.viewCols ?? 4) as 3 | 4;

  // Derived filter state Category ids drive the filter.
  const CAT = useDict('sale_page_category_', CAT_FALLBACK);
  const DISC = useDict('sale_page_discount_', DL);
  const SORT = useDict('sale_page_sort_', SALE_SORT_LABELS);
  const sortOptions = useMemo(
    () => SALE_SORT_OPTIONS.map((o) => ({ value: o.value, label: SORT[o.labelKey] })),
    [SORT],
  );
  const activeCategory = (selectedFilters['category']?.[0] ?? 'all') as SaleCategory;
  // Memoised so the derived arrays keep a stable identity between renders — they feed the `filtered` / `activeChips` memos below.
  const selDiscount = useMemo(() => selectedFilters['discount'] ?? EMPTY_VALUES, [selectedFilters]);
  const selSize = useMemo(() => selectedFilters['size'] ?? EMPTY_VALUES, [selectedFilters]);
  const selColor = useMemo(() => selectedFilters['color'] ?? EMPTY_VALUES, [selectedFilters]);
  const selBrand = useMemo(() => selectedFilters['brand'] ?? EMPTY_VALUES, [selectedFilters]);

  const toggleDiscount = useCallback(
    (v: string) => dispatch(dispatchToggleFilter({ catalogKey: SALE_KEY, filterKey: 'discount', value: v })),
    [dispatch],
  );
  const toggleSize = useCallback(
    (v: string) => dispatch(dispatchToggleFilter({ catalogKey: SALE_KEY, filterKey: 'size', value: v })),
    [dispatch],
  );
  const toggleColor = useCallback(
    (v: string) => dispatch(dispatchToggleFilter({ catalogKey: SALE_KEY, filterKey: 'color', value: v })),
    [dispatch],
  );
  const toggleBrand = useCallback(
    (v: string) => dispatch(dispatchToggleFilter({ catalogKey: SALE_KEY, filterKey: 'brand', value: v })),
    [dispatch],
  );
  const clearFilter = (key: string) =>
    dispatch(setFilters({ catalogKey: SALE_KEY, filters: { ...selectedFilters, [key]: [] } }));
  const setActiveCategory = (cat: SaleCategory) => {
    dispatch(
      setFilters({ catalogKey: SALE_KEY, filters: { ...selectedFilters, category: cat === 'all' ? [] : [cat] } }),
    );
  };

  const totalActive = selDiscount.length + selSize.length + selColor.length + selBrand.length;
  const clearAll = useCallback(() => {
    dispatch(clearFilters(SALE_KEY));
  }, [dispatch]);

  const PRODUCTS: SaleProduct[] = useMemo(
    () => (initialProducts ?? []).filter((p) => matchesGender(p.gender, gender)),
    [initialProducts, gender],
  );
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

  useEffect(() => {
    const fn = (e: MouseEvent) => {
      if (sortRef.current && !sortRef.current.contains(e.target as Node)) setSortOpen(false);
    };
    const ky = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setSortOpen(false);
    };
    document.addEventListener('mousedown', fn);
    document.addEventListener('keydown', ky);
    return () => {
      document.removeEventListener('mousedown', fn);
      document.removeEventListener('keydown', ky);
    };
  }, []);

  /* ── Filter options derived from the products that are actually on this
     page. `?gender=women` already narrowed the source list on the server,
     so buckets are guaranteed to reflect real inventory (no dead options). */
  const categoryScoped = useMemo(
    () => (activeCategory === 'all' ? PRODUCTS : PRODUCTS.filter((p) => p.category === activeCategory)),
    [PRODUCTS, activeCategory],
  );
  // Values stay the stable bucket keys; `DISC[key]` supplies the wording.
  const discountOptions = useMemo(
    () => DISCOUNT_BUCKET_KEYS.filter((key) => categoryScoped.some((p) => inDiscountBucket(key, discountPct(p)))),
    [categoryScoped],
  );
  const discountOptionsForUi = useMemo(
    () => discountOptions.map((key) => ({ label: DISC[key], value: key })),
    [discountOptions, DISC],
  );
  const sizeOptions = useMemo(() => {
    const order = ['XXS', 'XS', 'S', 'M', 'L', 'XL', 'XXL'];
    const seen = new Set<string>();
    categoryScoped.forEach((p) => p.sizes?.forEach((s) => seen.add(s)));
    const known = order.filter((s) => seen.has(s));
    const numeric = [...seen]
      .filter((s) => !order.includes(s))
      .sort((a, b) => {
        const na = Number.parseFloat(a);
        const nb = Number.parseFloat(b);
        if (Number.isFinite(na) && Number.isFinite(nb)) return na - nb;
        return a.localeCompare(b);
      });
    return [...known, ...numeric];
  }, [categoryScoped]);
  const colorOptions = useMemo(() => {
    const seen = new Set<string>();
    categoryScoped.forEach((p) => p.colors?.forEach((c) => seen.add(c)));
    // Keep any pre-configured swatches whose hex actually appears; append remaining unmapped hexes with the hex string itself as their label.
    const mapped = SALE_COLOR_OPTIONS.filter((o) => seen.has(o.color));
    const knownHexes = new Set(SALE_COLOR_OPTIONS.map((o) => o.color));
    const extras = [...seen].filter((h) => !knownHexes.has(h)).map((h) => ({ label: h, color: h }));
    return [...mapped, ...extras];
  }, [categoryScoped]);
  const brandOptions = useMemo(() => {
    const seen = new Set<string>();
    categoryScoped.forEach((p) => {
      if (p.brand) seen.add(p.brand);
    });
    return [...seen].sort((a, b) => a.localeCompare(b));
  }, [categoryScoped]);

  // ColorPillDropdown emits the swatch label (e.g. "Black").
  const hexToLabel = useMemo(() => {
    const map: Record<string, string> = {};
    for (const opt of colorOptions) map[opt.color] = opt.label;
    return map;
  }, [colorOptions]);

  /* ── Filtered products (category + discount + size + color + brand) ── */
  const filtered = useMemo(
    () =>
      categoryScoped.filter((p) => {
        if (selDiscount.length && !selDiscount.some((d) => inDiscountBucket(d, discountPct(p)))) return false;
        if (selSize.length && !p.sizes?.some((s) => selSize.includes(s))) return false;
        if (selColor.length && !p.colors?.some((c) => selColor.includes(hexToLabel[c] ?? c))) return false;
        if (selBrand.length && !(p.brand && selBrand.includes(p.brand))) return false;
        return true;
      }),
    [categoryScoped, selDiscount, selSize, selColor, selBrand, hexToLabel],
  );

  /* ── Active filter chips (combined list for display below bar) ── */
  const activeChips = useMemo(
    (): { key: string; label: string; remove: () => void }[] => [
      ...selDiscount.map((v) => ({
        key: `discount-${v}`,
        label: DISC[v as DiscountBucketKey] ?? v,
        remove: () => toggleDiscount(v),
      })),
      ...selSize.map((v) => ({ key: `size-${v}`, label: v, remove: () => toggleSize(v) })),
      ...selColor.map((v) => ({ key: `color-${v}`, label: v, remove: () => toggleColor(v) })),
      ...selBrand.map((v) => ({ key: `brand-${v}`, label: v, remove: () => toggleBrand(v) })),
    ],
    [DISC, selDiscount, selSize, selColor, selBrand, toggleDiscount, toggleSize, toggleColor, toggleBrand],
  );

  /* ── Mobile filter groups wired to MobileFilterPanel ── */
  const mobileSelectedFilters: Record<string, string[]> = {
    category: activeCategory === 'all' ? [] : [activeCategory],
    discount: selDiscount,
    size: selSize,
    color: selColor,
    brand: selBrand,
  };
  const mobileFilterGroups = [
    {
      key: 'category',
      label: L.filterCategoryHeading,
      type: 'checkbox' as const,
      options: SALE_CATEGORIES.filter((c) => c !== 'all').map((c) => ({ label: CAT[c], value: c })),
    },
    { key: 'discount', label: L.filterDiscountHeading, type: 'checkbox' as const, options: discountOptionsForUi },
    {
      key: 'size',
      label: L.filterSizeHeading,
      type: 'size_chips' as const,
      options: sizeOptions.map((o) => ({ label: o })),
    },
    { key: 'color', label: L.filterColorHeading, type: 'color' as const, options: colorOptions },
    {
      key: 'brand',
      label: L.filterBrandHeading,
      type: 'checkbox' as const,
      options: brandOptions.map((o) => ({ label: o })),
    },
  ];
  const handleMobileToggle = (key: string, val: string) => {
    if (key === 'category') {
      setActiveCategory(val as SaleCategory);
      return;
    }
    if (key === 'discount') {
      toggleDiscount(val);
      return;
    }
    if (key === 'size') {
      toggleSize(val);
      return;
    }
    if (key === 'color') {
      toggleColor(val);
      return;
    }
    if (key === 'brand') {
      toggleBrand(val);
      return;
    }
  };

  const gridCols = viewCols === 4 ? 'grid-cols-2 md:grid-cols-3 lg:grid-cols-4' : 'grid-cols-2 lg:grid-cols-3';

  const activeSortLabel = sortOptions.find((o) => o.value === sortBy)?.label ?? L.sortFallback;

  /* ── Pagination derived from real filtered length ── */
  const totalPages = Math.max(1, Math.ceil(filtered.length / PRODUCTS_PER_PAGE));
  // Clamp `currentPage` if the shopper's saved page is now out of range (e.g. after applying filters that shrink the list).
  const safePage = Math.min(Math.max(1, currentPage), totalPages);
  useEffect(() => {
    if (safePage !== currentPage) {
      dispatch(dispatchSetPage({ catalogKey: SALE_KEY, page: safePage }));
    }
  }, [safePage, currentPage, dispatch]);
  const changePage = (p: number) => {
    dispatch(dispatchSetPage({ catalogKey: SALE_KEY, page: p }));
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };
  const pages = Array.from({ length: totalPages }, (_, i) => i + 1);
  const pagedFiltered = useMemo(() => {
    const start = (safePage - 1) * PRODUCTS_PER_PAGE;
    return filtered.slice(start, start + PRODUCTS_PER_PAGE);
  }, [filtered, safePage]);

  return (
    <div
      className="flex-1 bg-white font-sans"
      style={{ '--sale': SALE_RED, '--accent': SALE_RED } as React.CSSProperties}
    >
      <SaleHero countdown={countdown} endsAt={saleEndsAtDate} cms={cmsPage} />

      {/* ── Breadcrumb ── */}
      <div className="border-b border-gray-100 px-4 py-3 lg:px-8">
        <nav className="mx-auto flex max-w-384 items-center gap-1.5 text-xs text-gray-400">
          <Link href="/" className="transition-colors hover:text-black">
            {L.breadcrumbHome}
          </Link>
          <span>/</span>
          <span className="font-semibold text-black">{L.breadcrumbCurrent}</span>
        </nav>
      </div>

      {/* Sticky filter bar */}
      <div className="sticky top-16 z-40 border-b border-gray-200 bg-white pt-2 md:top-24 lg:top-33">
        <div className="mx-auto max-w-384 px-4 lg:px-8">
          <div className="flex items-center justify-between gap-4 py-0">
            {/* ── LEFT: category tabs (horizontally scrollable) ── */}
            {/* Note: `overflow-x-auto` per CSS spec also clips overflow-y, which
                would hide any absolute-positioned filter dropdowns rendered
                below the bar. Keep the scrollable strip narrow (tabs only) and
                lift the pill filters into the outer, unclipped flex row. */}
            <div className="scrollbar-hide flex min-w-0 items-center gap-0 overflow-x-auto">
              {SALE_CATEGORIES.filter((cat) => {
                // Hide the opposite gender's category tabs so the shopper's filter navigation reflects the URL scope.
                if (!gender) return true;
                if (gender === 'W' && (cat === 'menClothing' || cat === 'menShoes')) return false;
                if (gender === 'M' && (cat === 'womenClothing' || cat === 'womenShoes')) return false;
                return true;
              }).map((cat) => {
                const count = cat === 'all' ? PRODUCTS.length : PRODUCTS.filter((p) => p.category === cat).length;
                return (
                  <button
                    key={cat}
                    onClick={() => setActiveCategory(cat)}
                    className={[
                      'shrink-0 px-4 py-3.5 text-xs tracking-widest whitespace-nowrap uppercase transition-all duration-150 focus-visible:outline-none',
                      activeCategory === cat
                        ? 'border-b-2 border-black text-black'
                        : 'border-b-2 border-transparent text-gray-500 hover:text-black',
                    ].join(' ')}
                  >
                    {CAT[cat]}
                    {cat !== 'all' && <span className="ml-1.5 text-[10px] text-gray-400">({count})</span>}
                  </button>
                );
              })}
            </div>

            {/* Separator */}
            <span className="mx-1 hidden h-6 w-px shrink-0 self-center bg-gray-200 md:block" />

            {/* Filter pills — desktop only, lives OUTSIDE the horizontally
                scrollable container so its dropdowns aren't clipped. */}
            <div className="hidden shrink-0 items-center gap-2 py-2 md:flex">
              <PillDropdown
                label={L.filterDiscount}
                options={discountOptionsForUi}
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
                  className="ml-1 flex items-center gap-1 text-xs whitespace-nowrap text-gray-400 underline hover:text-black focus-visible:outline-none"
                >
                  <X size={10} /> {L.clearAll}
                </button>
              )}
            </div>

            {/* Spacer that eats leftover space between tabs and right controls */}
            <div className="min-w-0 flex-1" />

            {/* Mobile filter button */}
            <button
              onClick={() => setMobileFilterOpen(true)}
              className="ml-2 flex shrink-0 items-center gap-1.5 rounded-none border border-[#d1d5db] px-3 py-2 text-xs tracking-wider uppercase focus-visible:outline-none md:hidden"
            >
              <SlidersHorizontal size={12} />
              {L.filtersCta}
              {totalActive > 0 && (
                <span className="rounded-none bg-(--sale) px-1 py-px text-[9px] font-bold text-white">
                  {totalActive}
                </span>
              )}
            </button>

            {/* Right: column toggles + sort */}
            <div className="hidden shrink-0 items-center gap-4 py-2 md:flex">
              {/* Column toggles */}
              <div className="flex items-center gap-2">
                <span className="mr-1 text-xs text-gray-500">{lView}</span>
                <button
                  onClick={() => dispatch(dispatchSetViewCols({ catalogKey: SALE_KEY, cols: 3 }))}
                  className={`p-1 transition-opacity duration-150 focus-visible:outline-none ${
                    viewCols === 3 ? 'opacity-100' : 'opacity-35'
                  }`}
                  aria-label={L.view3ColAria}
                >
                  <ColsIcon cols={3} active={viewCols === 3} />
                </button>
                <button
                  onClick={() => dispatch(dispatchSetViewCols({ catalogKey: SALE_KEY, cols: 4 }))}
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
                          dispatch(setSort({ catalogKey: SALE_KEY, sortBy: opt.value }));
                          setSortOpen(false);
                        }}
                      />
                    ))}
                  </div>
                )}
              </div>
            </div>

            {/* Mobile sort pill */}
            <div className="shrink-0 md:hidden">
              <div ref={sortRef} className="relative">
                <button
                  onClick={() => setSortOpen((o) => !o)}
                  className="flex items-center gap-1.5 rounded-none border border-gray-300 px-3 py-2 text-xs tracking-wider uppercase focus-visible:outline-none"
                >
                  {L.sortMobileCta} <ChevronDown size={11} />
                </button>
                {sortOpen && (
                  <div className="absolute top-full right-0 z-50 mt-1 min-w-42.5 rounded-none border border-gray-200 bg-white shadow-lg">
                    {sortOptions.map((opt) => (
                      <SortOption
                        key={opt.value}
                        label={opt.label}
                        active={sortBy === opt.value}
                        onClick={() => {
                          dispatch(setSort({ catalogKey: SALE_KEY, sortBy: opt.value }));
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

      {/* Main grid */}
      <div id="sale-grid" className="pb-16">
        {/* Results count + active filter chips */}
        <div className="flex flex-wrap items-start justify-between gap-3 p-4 lg:px-8">
          <div className="flex flex-wrap items-center gap-2">
            <p className="text-xs tracking-wider text-gray-500 uppercase">
              <span className="font-semibold text-black">{filtered.length}</span> {lItemsOnSale}
              {activeCategory !== 'all' && <span className="ml-2 text-gray-400">— {CAT[activeCategory]}</span>}
            </p>
            {/* Active filter chips */}
            {activeChips.map((chip) => (
              <button
                key={chip.key}
                onClick={chip.remove}
                className="flex items-center gap-1 rounded-none border border-gray-300 px-2 py-0.5 text-xs transition-colors hover:border-black focus-visible:outline-none"
              >
                {chip.label}
                <X size={9} className="text-gray-400" />
              </button>
            ))}
          </div>
          {/* Mobile: sort label */}
          <p className="text-xs tracking-wider text-gray-400 uppercase md:hidden">{activeSortLabel}</p>
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
            {pagedFiltered.map((product) => (
              <div key={product.id} className="bg-white">
                <ProductCard product={product} accentColor={SALE_RED} />
              </div>
            ))}
          </div>
        )}

        {/* Mid promo block — copy + image pulled from OE `sale` page
            `page_sale_footer_banner_*` attributes; `L.promo*` are the
            fallbacks when the admin hasn't filled a field. */}
        <div className="px-4 lg:px-8">
          <div className="group relative my-10 max-h-65 min-h-45 overflow-hidden">
            <CmsImage
              src={
                cmsPage?.promo.image ||
                'https://images.unsplash.com/photo-1739424464070-63b6cc9086aa?crop=entropy&cs=tinysrgb&fit=max&fm=jpg&ixid=M3w3Nzg4Nzd8MHwxfHNlYXJjaHwxfHx3b21lbiUyMGZhc2hpb24lMjBlZGl0b3JpYWwlMjBtaW5pbWFsJTIwYmxhY2slMjBvdXRmaXR8ZW58MXx8fHwxNzcyMDMwNjUwfDA&ixlib=rb-4.1.0&q=80&w=1080'
              }
              // The Unsplash fallback has no LQIP, only the CMS picture does.
              blur={cmsPage?.promo.image ? cmsPage.promo.imageBlur : undefined}
              alt={L.promoImageAlt}
              fill
              sizes="(max-width: 1024px) 100vw, 80vw"
              className="object-cover object-center transition-transform duration-700 group-hover:scale-105"
            />
            <div className="absolute inset-0 bg-[linear-gradient(to_right,rgba(0,0,0,0.75)_35%,rgba(0,0,0,0.15))]" />
            <div className="absolute inset-0 flex flex-col justify-center px-8 md:px-16">
              <span className="mb-3 inline-block w-fit rounded-none bg-(--sale) px-2.5 py-1 text-[10px] font-bold tracking-widest text-white uppercase">
                {cmsPage?.promo.eyebrow || L.promoLimitedTime}
              </span>
              <h3 className="mb-2 text-[clamp(1rem,3vw,1.75rem)] font-extrabold tracking-widest text-white uppercase">
                {cmsPage?.promo.title || L.promoHeading}
              </h3>
              <p className="mb-4 max-w-85 text-xs text-white opacity-75">{cmsPage?.promo.subtitle || L.promoBody}</p>
              <Link
                href={cmsPage?.promo.ctaHref || L.promoHref}
                className="inline-flex items-center gap-2 text-xs font-bold tracking-widest text-white uppercase no-underline transition-all hover:gap-3"
              >
                {cmsPage?.promo.ctaLabel || L.promoCta} <ChevronRight size={13} />
              </Link>
            </div>
          </div>
        </div>

        {/* Pagination */}
        <div className="mt-8 flex items-center justify-center gap-0 px-4 lg:px-8">
          <button
            onClick={() => changePage(Math.max(1, safePage - 1))}
            disabled={safePage === 1}
            className="flex size-9 items-center justify-center rounded-none border border-black transition-colors hover:bg-black hover:text-white focus-visible:outline-none disabled:opacity-30"
            aria-label={L.prevPageAria}
          >
            <ChevronLeft size={14} />
          </button>
          {pages.map((p) => (
            <button
              key={p}
              onClick={() => changePage(p)}
              className={`-ml-px flex size-9 items-center justify-center rounded-none border border-black text-xs transition-colors focus-visible:outline-none ${
                safePage === p ? 'bg-black text-white' : 'bg-white text-black'
              }`}
            >
              {p}
            </button>
          ))}
          <button
            onClick={() => changePage(Math.min(totalPages, safePage + 1))}
            disabled={safePage === totalPages}
            className="-ml-px flex size-9 items-center justify-center rounded-none border border-black transition-colors hover:bg-black hover:text-white focus-visible:outline-none disabled:opacity-30"
            aria-label={L.nextPageAria}
          >
            <ChevronRight size={14} />
          </button>
        </div>
      </div>

      {/* Recommendations — driven by the OE block attached to the `sale`
          page (typically `pdp_you_may_also_like`, type `frequently_ordered_block`).
          Title comes from the block's `localizeInfos.title`; products from
          the block itself when OE resolved any, otherwise fall back to the
          first six sale products so the section never renders empty. */}
      {(() => {
        const recBlock = pageBlocks?.find((b) => b.type === 'frequently_ordered_block') ?? null;
        const recHeading = recBlock?.title || L.recsHeading;
        const recProducts = recBlock?.products?.length ? recBlock.products : PRODUCTS.slice(0, 6);
        if (recProducts.length === 0) return null;
        return (
          <div className="border-t border-gray-100 bg-gray-50 px-4 py-12 lg:px-8">
            <div className="mx-auto max-w-384">
              <div className="mb-6">
                <p className="mb-1 text-xs tracking-[0.3em] text-gray-400 uppercase">{L.recsEyebrow}</p>
                <h2 className="text-[clamp(1rem,2vw,1.25rem)] font-bold tracking-widest uppercase">{recHeading}</h2>
              </div>
              <div
                ref={recRef}
                className="scrollbar-hide flex cursor-grab gap-3 overflow-x-auto pb-2 select-none"
                onMouseDown={onRecMouseDown}
                onMouseMove={onRecMouseMove}
                onMouseUp={stopRecDrag}
                onMouseLeave={stopRecDrag}
              >
                {recProducts.map((product) => (
                  <div key={`rec-${product.id}`} className="w-55 shrink-0">
                    <ProductCard product={product as Product} accentColor={SALE_RED} />
                  </div>
                ))}
              </div>
            </div>
          </div>
        );
      })()}

      {/* OE-attached blocks for the sale page — rendered at the bottom so
          any promo / cross-sell content sits below the sale grid.
          `frequently_ordered_block` is already consumed above (recs
          section), so filter it out to avoid a duplicate "You May Also
          Like" header stub from PageBlocksRenderer's default branch. */}
      {(() => {
        const remaining = (pageBlocks ?? []).filter((b) => b.type !== 'frequently_ordered_block');
        return remaining.length > 0 ? <PageBlocksRenderer blocks={remaining} /> : null;
      })()}

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
