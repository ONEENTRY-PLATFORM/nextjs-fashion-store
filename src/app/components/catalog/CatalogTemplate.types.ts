import type { Product } from '@/app/components/product/ProductCard';

/** Every sort key a catalog must be able to word; the wording itself lives with the component that renders it. */
export type SortLabelKey = 'featured' | 'priceLowToHigh' | 'priceHighToLow' | 'popularity' | 'newArrivals';

export interface FilterOption {
  label: string;
  count: number;
  color?: string;
}

export interface FilterGroup {
  label: string;
  key: string;
  options: FilterOption[];
  type?: 'checkbox' | 'color' | 'section' | 'search_checkbox' | 'price_range' | 'size_chips' | 'measure_range';
  columns?: number;
  rangeMin?: number;
  rangeMax?: number;
  rangeStep?: number;
  rangeUnit?: string;
}

/** Quick-filter chip label. */
export type ChipFilter = string;

export interface BreadcrumbItem {
  label: string;
  href?: string;
}

export interface CrossSellCategory {
  label: string;
  image: string;
  href?: string;
}

export interface CatalogTemplateProps {
  /* Required */
  catalogKey: string;
  /** Products for the current page, already filtered server-side. */
  products: Product[];
  filterGroups: FilterGroup[];
  quickChips: string[];
  accentColor: string;
  title: string;
  genderLabel: string;

  /* Optional */
  /** Mock-era hint for the progress strip ("you've viewed N of TOTAL_STYLES"). */
  totalStyles?: number;
  /** Total products matching current filters (server-reported). */
  total?: number;
  /** 1-based page index pulled from the URL on the server. */
  currentPage?: number;
  /** Parsed filters object (from URL `searchParams`) — drives all client UI state. */
  currentFilters?: import('@/lib/oneentry/catalog/filters').CatalogFilters;
  productsPerPage?: number;
  /** OE-managed trending block (server-fetched). */
  trendingBlock?: import('@/lib/oneentry/blocks/page-blocks').PageBlock | null;
  /** All OE-attached page blocks for this catalog (`Pages.getBlocksByPageUrl`). */
  pageBlocks?: import('@/lib/oneentry/blocks/page-blocks').PageBlock[];
  breadcrumbs?: BreadcrumbItem[];
  priceMax?: number;
  priceDefault?: [number, number];
  showListMode?: boolean;
  urlQueryParam?: string;
  urlQueryKey?: string;
  scrollbarClass?: string;
  crossSell?: {
    title: string;
    subtitle: string;
    href: string;
    categories: CrossSellCategory[];
  };
}

/** Sort values paired with the label key that words them. */
export const SORT_OPTIONS = [
  { labelKey: 'featured', value: 'featured' },
  { labelKey: 'priceLowToHigh', value: 'price_asc' },
  { labelKey: 'priceHighToLow', value: 'price_desc' },
  { labelKey: 'popularity', value: 'popularity' },
  { labelKey: 'newArrivals', value: 'new' },
] as const satisfies readonly { labelKey: SortLabelKey; value: string }[];

export function getPageNumbers(current: number, total: number): (number | '...')[] {
  if (total <= 7) return Array.from({ length: total }, (_, i) => i + 1);
  if (current <= 3) return [1, 2, 3, 4, '...', total];
  if (current >= total - 2) return [1, '...', total - 3, total - 2, total - 1, total];
  return [1, '...', current - 1, current, current + 1, '...', total];
}
