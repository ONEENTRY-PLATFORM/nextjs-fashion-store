import type { Product } from '../product/ProductCard';

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

/**
 * Quick-filter chip label. Now a plain string — chips no longer carry a
 *  per-page predicate. Kept as a named type for stable import sites.
 */
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
  /**
   * Mock-era hint for the progress strip ("you've viewed N of TOTAL_STYLES").
   *  Real catalog pages drive this from `total` (server-reported).
   */
  totalStyles?: number;
  /**
   * Total products matching current filters (server-reported). Falls back to
   *  `totalStyles` when omitted — useful for mock-driven story builds.
   */
  total?: number;
  /** 1-based page index pulled from the URL on the server. */
  currentPage?: number;
  /**
   * Parsed filters object (from URL `searchParams`) — drives all client UI
   *  state. Optional so storybook can render with an empty filter set.
   */
  currentFilters?: import('../../../lib/oneentry/catalog/filters').CatalogFilters;
  productsPerPage?: number;
  /**
   * OE-managed trending block (server-fetched). Rendered as a product
   *  carousel under the grid when products are present.
   */
  trendingBlock?: import('../../../lib/oneentry/blocks/page-blocks').PageBlock | null;
  /**
   * All OE-attached page blocks for this catalog (`Pages.getBlocksByPageUrl`).
   *  Rendered at the top of the main content area via `<PageBlocksRenderer>`
   *  in admin-defined `position` order. Empty when no blocks are attached.
   */
  pageBlocks?: import('../../../lib/oneentry/blocks/page-blocks').PageBlock[];
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

import { type CATALOG_SORT_LABELS } from '../../data/commonLabels';

/**
 * Sort values paired with the `CATALOG_SORT_LABELS` key that words them.
 *  The value is code-owned; the wording is admin-editable, so the component
 *  resolves `labelKey` through the dictionary rather than matching on text.
 */
export const SORT_OPTIONS = [
  { labelKey: 'featured', value: 'featured' },
  { labelKey: 'priceLowToHigh', value: 'price_asc' },
  { labelKey: 'priceHighToLow', value: 'price_desc' },
  { labelKey: 'popularity', value: 'popularity' },
  { labelKey: 'newArrivals', value: 'new' },
] as const satisfies readonly { labelKey: keyof typeof CATALOG_SORT_LABELS; value: string }[];

export function getPageNumbers(current: number, total: number): (number | '...')[] {
  if (total <= 7) return Array.from({ length: total }, (_, i) => i + 1);
  if (current <= 3) return [1, 2, 3, 4, '...', total];
  if (current >= total - 2) return [1, '...', total - 3, total - 2, total - 1, total];
  return [1, '...', current - 1, current, current + 1, '...', total];
}
