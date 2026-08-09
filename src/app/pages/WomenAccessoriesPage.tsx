'use client';
import { AccessoriesCatalog, type FilterGroup } from '@/app/components/catalog/AccessoriesCatalog';
import type { Product } from '@/app/components/product/ProductCard';
import { ACCENT_WOMEN as ACCENT } from '@/app/constants/colors';
import type { PageBlock } from '@/lib/oneentry/blocks/page-blocks';
import type { CatalogFilters } from '@/lib/oneentry/catalog/filters';

export function WomenAccessoriesPage({
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
