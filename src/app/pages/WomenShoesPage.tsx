'use client';
import type { PageBlock } from '../../lib/oneentry/blocks/page-blocks';
import type { CatalogFilters } from '../../lib/oneentry/catalog/filters';
import { type FilterGroup, ShoesCatalog } from '../components/catalog/ShoesCatalog';
import type { Product } from '../components/product/ProductCard';
import { ACCENT_WOMEN as ACCENT } from '../constants/colors';

export function WomenShoesPage({
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
    <ShoesCatalog
      pageBlocks={pageBlocks}
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
