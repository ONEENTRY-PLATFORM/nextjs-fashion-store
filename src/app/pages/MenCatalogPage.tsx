'use client'
import { CatalogTemplate, type FilterGroup } from '../components/catalog/CatalogTemplate';
import type { Product } from '../components/product/ProductCard';
import { ACCENT_MEN as ACCENT } from '../constants/colors';
import { CATALOG_PAGE_LABELS as CL } from '../data/catalogPageLabels';
import { useCatalogPageT } from '../../lib/oneentry/labels/CatalogPageLabelsContext';
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
  // Catalog chrome resolves through the OE `catalog_page` set; `CL` is the
  // offline fallback.
  const lTitle     = useCatalogPageT('catalog_page_clothing',            CL.clothing);
  const lGender    = useCatalogPageT('catalog_page_men',                 CL.men);
  const lCrumbHome = useCatalogPageT('catalog_page_breadcrumb_home',     CL.breadcrumbHome);
  const lCrumbMen  = useCatalogPageT('catalog_page_breadcrumb_men',      CL.breadcrumbMen);
  const lCrumbCat  = useCatalogPageT('catalog_page_breadcrumb_clothing', CL.breadcrumbClothing);
  return (
    <CatalogTemplate
      catalogKey="men-clothing"
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
      scrollbarClass="scrollbar-red"
      breadcrumbs={[
        { label: lCrumbHome, href: '/' },
        { label: lCrumbMen, href: '/men' },
        { label: lCrumbCat },
      ]}
    />
  );
}
