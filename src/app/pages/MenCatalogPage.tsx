'use client'
import { CatalogTemplate, type FilterGroup } from '../components/CatalogTemplate';
import type { Product } from '../components/ProductCard';
import { ACCENT_MEN as ACCENT } from '../constants/colors';
import { CATALOG_PAGE_LABELS as CL } from '../data/catalogPageLabels';
import type { CatalogFilters } from '../../lib/oneentry/catalog/filters';
import type { PageBlock } from '../../lib/oneentry/blocks/page-blocks';

const PRODUCTS_PER_PAGE = 16;

export function MenCatalogPage({
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
    <CatalogTemplate
      catalogKey="men-clothing"
      products={initialProducts ?? []}
      filterGroups={initialFilterGroups ?? []}
      quickChips={initialQuickChips ?? []}
      accentColor={ACCENT}
      title={CL.clothing}
      genderLabel={CL.men}
      totalStyles={initialTotalStyles}
      total={total}
      trendingBlock={trendingBlock}
      pageBlocks={pageBlocks}
      currentPage={currentPage}
      currentFilters={currentFilters}
      productsPerPage={PRODUCTS_PER_PAGE}
      showListMode={true}
      scrollbarClass="scrollbar-red"
      breadcrumbs={[
        { label: CL.breadcrumbHome, href: '/' },
        { label: CL.breadcrumbMen, href: '/men' },
        { label: CL.breadcrumbClothing },
      ]}
    />
  );
}
