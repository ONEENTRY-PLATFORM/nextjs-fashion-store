'use client'
import { AccessoriesCatalog, type FilterGroup } from '../components/AccessoriesCatalog';
import type { Product } from '../components/ProductCard';
import { ACCENT_MEN as ACCENT } from '../constants/colors';
import { FILTER_QUICK_CHIPS as QC } from '../data/catalogFilterLabels';
import type { CatalogFilters } from '../../lib/oneentry/catalog/filters';
import type { PageBlock } from '../../lib/oneentry/blocks/page-blocks';

const QUICK_CHIPS = [QC.belts, QC.wallets, QC.scarves, QC.gloves, QC.caps, QC.sunglasses, QC.watches];

export function MenAccessoriesPage({
  initialProducts,
  initialFilterGroups,
  initialTotalStyles,
  currentFilters,
  currentPage,
  total,
  trendingBlock,
}: {
  initialProducts?: Product[];
  initialFilterGroups?: FilterGroup[];
  initialTotalStyles?: number;
  currentFilters?: CatalogFilters;
  currentPage?: number;
  total?: number;
  trendingBlock?: PageBlock | null;
} = {}) {
  return (
    <AccessoriesCatalog
      catalogKey="men-accessories"
      gender="men"
      accentColor={ACCENT}
      totalStyles={initialTotalStyles}
      total={total}
      trendingBlock={trendingBlock}
      currentPage={currentPage}
      currentFilters={currentFilters}
      productsPerPage={12}
      quickChips={QUICK_CHIPS}
      filterGroups={initialFilterGroups ?? []}
      products={initialProducts ?? []}
      priceMax={400}
    />
  );
}
