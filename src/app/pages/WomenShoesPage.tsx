'use client'
import { ShoesCatalog, type FilterGroup } from '../components/ShoesCatalog';
import type { Product } from '../components/ProductCard';
import { ACCENT_WOMEN as ACCENT } from '../constants/colors';
import { FILTER_QUICK_CHIPS as QC } from '../data/catalogFilterLabels';
import { TREND_BLOCKS_CATALOG } from '../data/trendBlocks';
import type { CatalogFilters } from '../../lib/oneentry/catalog/filters';
import type { PageBlock } from '../../lib/oneentry/blocks/page-blocks';

const QUICK_CHIPS = [QC.boots, QC.sneakers, QC.sandals, QC.loafers, QC.balletFlats, QC.pumps, QC.ankleBoots];
const TREND_BLOCKS = TREND_BLOCKS_CATALOG['women-shoes'];

export function WomenShoesPage({
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
    <ShoesCatalog
      catalogKey="women-shoes"
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
      priceMax={500}
    />
  );
}
