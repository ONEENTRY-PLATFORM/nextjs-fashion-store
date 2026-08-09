'use client';
import type { PageBlock } from '../../lib/oneentry/blocks/page-blocks';
import type { CatalogFilters } from '../../lib/oneentry/catalog/filters';
import { AccessoriesCatalog, type FilterGroup } from '../components/catalog/AccessoriesCatalog';
import type { Product } from '../components/product/ProductCard';
import { ACCENT_MEN as ACCENT } from '../constants/colors';

export function MenAccessoriesPage({
  initialProducts,
  initialFilterGroups,
  initialQuickChips,
  initialTotalStyles,
  currentFilters,
  currentPage,
  total,
  trendingBlock,
  pageBlocks,
}: {
  initialProducts?: Product[];
  initialFilterGroups?: FilterGroup[];
  initialQuickChips?: string[];
  initialTotalStyles?: number;
  currentFilters?: CatalogFilters;
  currentPage?: number;
  total?: number;
  trendingBlock?: PageBlock | null;
  pageBlocks?: PageBlock[];
} = {}) {
  return (
    <AccessoriesCatalog
      pageBlocks={pageBlocks}
      catalogKey="men-accessories"
      gender="men"
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
