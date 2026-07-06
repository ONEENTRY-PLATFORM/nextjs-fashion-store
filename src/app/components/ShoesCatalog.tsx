'use client'
/**
 * ShoesCatalog — thin wrapper over CatalogTemplate.
 *
 * Converts quickChips (string[]) + chipField + chipAliasMap into
 * ChipFilter[] objects for CatalogTemplate, and computes
 * genderLabel / breadcrumbs / scrollbarClass from the props.
 *
 * All rendering logic lives in CatalogTemplate.
 */
import {
  CatalogTemplate,
  type CatalogTemplateProps,
  type ChipFilter,
} from './CatalogTemplate';
import { ACCENT_MEN } from '../constants/colors';
import type { Product } from './ProductCard';
import { CATALOG_PAGE_LABELS as CL } from '../data/catalogPageLabels';
import type { CatalogFilters } from '../../lib/oneentry/catalog/filters';
import type { PageBlock } from '../../lib/oneentry/blocks/page-blocks';

/* ── Re-export types used by page files and AccessoriesCatalog ── */
export type {
  FilterOption,
  FilterGroup,
  CrossSellCategory,
  BreadcrumbItem,
  ChipFilter,
} from './CatalogTemplate';

export interface ShoesCatalogProps {
  catalogKey: string;
  gender: 'women' | 'men';
  accentColor: string;
  /** Mock-era hint; real pages drive the count from `total` (server-reported). */
  totalStyles?: number;
  productsPerPage?: number;
  quickChips: string[];
  filterGroups: CatalogTemplateProps['filterGroups'];
  products: Product[];
  crossSell?: CatalogTemplateProps['crossSell'];
  priceMax?: number;
  /** Server-reported total products matching `currentFilters`. */
  total?: number;
  /** 1-based page index from the URL on the server. */
  currentPage?: number;
  /** Parsed filters object (from URL `searchParams`). */
  currentFilters?: CatalogFilters;
  trendingBlock?: PageBlock | null;
  /** Override catalog title (default: "SHOES") */
  catalogTitle?: string;
  /** Override breadcrumb category label (default: "Shoes") */
  breadcrumbCategory?: string;
  /** Product field to match quick chips against (default: "shoeType") */
  chipField?: 'shoeType' | 'accessoryType';
  /** Alias map for chip labels → field values */
  chipAliasMap?: Record<string, string>;
}

const DEFAULT_SHOE_ALIAS_MAP: Record<string, string> = {
  'Chelsea': 'Chelsea Boots',
  'Oxford': 'Low Shoes',
};

export function ShoesCatalog({
  catalogKey,
  gender,
  accentColor,
  totalStyles,
  productsPerPage = 12,
  quickChips,
  filterGroups,
  products,
  crossSell,
  priceMax = 500,
  total,
  currentPage,
  currentFilters,
  trendingBlock,
  catalogTitle = CL.shoes,
  breadcrumbCategory = CL.breadcrumbShoes,
  chipField = 'shoeType',
  chipAliasMap,
}: ShoesCatalogProps) {
  const genderLabel = gender === 'women' ? CL.women : CL.men;
  const scrollbarClass = accentColor === ACCENT_MEN ? 'scrollbar-red' : 'scrollbar-pink';

  const breadcrumbs = [
    { label: genderLabel, href: gender === 'women' ? '/women/clothing' : '/men/clothing' },
    { label: breadcrumbCategory },
  ];

  const resolvedAliasMap = chipAliasMap ?? (chipField === 'shoeType' ? DEFAULT_SHOE_ALIAS_MAP : {});

  const chipFilters: ChipFilter[] = quickChips.map(chip => {
    const target = resolvedAliasMap[chip] ?? chip;
    return {
      chip,
      filter: (p: Product) => (p[chipField as keyof Product] as string | undefined) === target,
    };
  });

  return (
    <CatalogTemplate
      catalogKey={catalogKey}
      products={products}
      filterGroups={filterGroups}
      quickChips={chipFilters}
      accentColor={accentColor}
      title={catalogTitle}
      genderLabel={genderLabel}
      totalStyles={totalStyles}
      total={total}
      currentPage={currentPage}
      currentFilters={currentFilters}
      trendingBlock={trendingBlock}
      productsPerPage={productsPerPage}
      breadcrumbs={breadcrumbs}
      priceMax={priceMax}
      scrollbarClass={scrollbarClass}
      crossSell={crossSell}
    />
  );
}
