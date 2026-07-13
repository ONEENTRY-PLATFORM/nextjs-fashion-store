'use client'
import { CatalogTemplate, type FilterGroup } from '../components/CatalogTemplate';
import type { Product } from '../components/ProductCard';
import { ACCENT_WOMEN as ACCENT } from '../constants/colors';
import { CATALOG_PAGE_LABELS as CL } from '../data/catalogPageLabels';
import type { CatalogFilters } from '../../lib/oneentry/catalog/filters';
import type { PageBlock } from '../../lib/oneentry/blocks/page-blocks';

const PRODUCTS_PER_PAGE = 16;

export function WomenBagsPage({
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
    <CatalogTemplate
      catalogKey="women-bags"
      products={initialProducts ?? []}
      filterGroups={initialFilterGroups ?? []}
      quickChips={initialQuickChips ?? []}
      accentColor={ACCENT}
      title={CL.bags}
      genderLabel={CL.women}
      totalStyles={initialTotalStyles}
      total={total}
      trendingBlock={trendingBlock}
      currentPage={currentPage}
      currentFilters={currentFilters}
      productsPerPage={PRODUCTS_PER_PAGE}
      priceMax={600}
      priceDefault={[0, 600]}
      scrollbarClass="scrollbar-pink"
      breadcrumbs={[
        { label: CL.breadcrumbHome, href: '/' },
        { label: CL.breadcrumbWomen, href: '/women' },
        { label: CL.breadcrumbBags },
      ]}
    />
  );
}
