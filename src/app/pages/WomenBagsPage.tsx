'use client'
import { CatalogTemplate, type FilterGroup } from '../components/catalog/CatalogTemplate';
import type { Product } from '../components/product/ProductCard';
import { ACCENT_WOMEN as ACCENT } from '../constants/colors';
import { CATALOG_PAGE_LABELS as CL } from '../data/catalogPageLabels';
import { useCatalogPageT } from '../../lib/oneentry/labels/CatalogPageLabelsContext';
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
  const lTitle      = useCatalogPageT('catalog_page_bags',              CL.bags);
  const lGender     = useCatalogPageT('catalog_page_women',             CL.women);
  const lCrumbHome  = useCatalogPageT('catalog_page_breadcrumb_home',   CL.breadcrumbHome);
  const lCrumbWomen = useCatalogPageT('catalog_page_breadcrumb_women',  CL.breadcrumbWomen);
  const lCrumbCat   = useCatalogPageT('catalog_page_breadcrumb_bags',   CL.breadcrumbBags);
  return (
    <CatalogTemplate
      pageBlocks={pageBlocks}
      catalogKey="women-bags"
      products={initialProducts ?? []}
      filterGroups={initialFilterGroups ?? []}
      quickChips={initialQuickChips ?? []}
      accentColor={ACCENT}
      title={lTitle}
      genderLabel={lGender}
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
        { label: lCrumbHome, href: '/' },
        { label: lCrumbWomen, href: '/women' },
        { label: lCrumbCat },
      ]}
    />
  );
}
