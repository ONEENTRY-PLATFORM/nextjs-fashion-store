'use client'
import { AccessoriesCatalog, type FilterGroup } from '../components/AccessoriesCatalog';
import type { Product } from '../components/ProductCard';
import { ACCENT_WOMEN as ACCENT } from '../constants/colors';
import type { CatalogFilters } from '../../lib/oneentry/catalog/filters';
import type { PageBlock } from '../../lib/oneentry/blocks/page-blocks';

export function WomenAccessoriesPage({
  initialProducts,
  initialFilterGroups,
  initialQuickChips,
  initialTotalStyles,
  currentFilters,
  currentPage,
  total,
  trendingBlock,
}: {
  initialProducts?: Product[];
  initialFilterGroups?: FilterGroup[];
  initialQuickChips?: string[];
  initialTotalStyles?: number;
  currentFilters?: CatalogFilters;
  currentPage?: number;
  total?: number;
  trendingBlock?: PageBlock | null;
} = {}) {
  return (
    <AccessoriesCatalog
      catalogKey="women-accessories"
      gender="women"
      accentColor={ACCENT}
      totalStyles={initialTotalStyles}
      total={total}
      trendingBlock={trendingBlock}
      currentPage={currentPage}
      currentFilters={currentFilters}
      productsPerPage={16}
      quickChips={initialQuickChips ?? []}
      filterGroups={initialFilterGroups ?? []}
      products={initialProducts ?? []}
      priceMax={400}
    />
  );
}
