'use client'
import { ShoesCatalog, type FilterGroup } from '../components/ShoesCatalog';
import type { Product } from '../components/ProductCard';
import { ACCENT_WOMEN as ACCENT } from '../constants/colors';
import type { CatalogFilters } from '../../lib/oneentry/catalog/filters';
import type { PageBlock } from '../../lib/oneentry/blocks/page-blocks';

export function WomenShoesPage({
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
    <ShoesCatalog
      catalogKey="women-shoes"
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
      priceMax={500}
    />
  );
}
