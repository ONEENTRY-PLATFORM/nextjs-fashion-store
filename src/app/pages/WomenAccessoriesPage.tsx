'use client'
import { AccessoriesCatalog, type FilterGroup } from '../components/AccessoriesCatalog';
import type { Product } from '../components/ProductCard';
import { ACCENT_WOMEN as ACCENT } from '../constants/colors';
import { FILTER_QUICK_CHIPS as QC } from '../data/catalogFilterLabels';
import { TREND_BLOCKS_CATALOG } from '../data/trendBlocks';
import type { CatalogFilters } from '../../lib/oneentry/catalog/filters';
import type { PageBlock } from '../../lib/oneentry/blocks/page-blocks';

const QUICK_CHIPS = [QC.jewelry, QC.scarves, QC.gloves, QC.belts, QC.sunglasses, QC.headwear, QC.wallets];
const TREND_BLOCKS = TREND_BLOCKS_CATALOG['women-accessories'];

export function WomenAccessoriesPage({
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
      catalogKey="women-accessories"
      gender="women"
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
      trendBlocks={TREND_BLOCKS}
      priceMax={400}
    />
  );
}
