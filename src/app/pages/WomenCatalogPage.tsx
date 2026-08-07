'use client'
import { CatalogTemplate, type FilterGroup } from '../components/catalog/CatalogTemplate';
import type { Product } from '../components/product/ProductCard';
import { ACCENT_WOMEN as ACCENT } from '../constants/colors';
import { CATALOG_PAGE_LABELS as CL } from '../data/catalogPageLabels';
import { useT } from '../../lib/oneentry/labels/DictContext';
import type { CatalogFilters } from '../../lib/oneentry/catalog/filters';
import type { PageBlock } from '../../lib/oneentry/blocks/page-blocks';

const PRODUCTS_PER_PAGE = 16;

export function WomenCatalogPage({
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
  // Catalog chrome resolves through the OE `catalog_page` set; `CL` is the
  // offline fallback.
  const lTitle      = useT('catalog_page_clothing',          CL.clothing);
  const lGender     = useT('catalog_page_women',             CL.women);
  const lCrumbHome  = useT('catalog_page_breadcrumb_home',   CL.breadcrumbHome);
  const lCrumbCat   = useT('catalog_page_breadcrumb_clothing', CL.breadcrumbClothing);
  return (
    <CatalogTemplate
      catalogKey="women-clothing"
      products={initialProducts ?? []}
      filterGroups={initialFilterGroups ?? []}
      quickChips={initialQuickChips ?? []}
      accentColor={ACCENT}
      title={lTitle}
      genderLabel={lGender}
      totalStyles={initialTotalStyles}
      total={total}
      trendingBlock={trendingBlock}
      pageBlocks={pageBlocks}
      currentPage={currentPage}
      currentFilters={currentFilters}
      productsPerPage={PRODUCTS_PER_PAGE}
      showListMode={true}
      scrollbarClass="scrollbar-pink"
      breadcrumbs={[
        { label: lCrumbHome, href: '/' },
        { label: lCrumbCat },
      ]}
    />
  );
}
