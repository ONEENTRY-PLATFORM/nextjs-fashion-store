'use client';
import { CatalogTemplate, type FilterGroup } from '@/app/components/catalog/CatalogTemplate';
import type { Product } from '@/app/components/product/ProductCard';
import { ACCENT_WOMEN as ACCENT } from '@/app/constants/colors';
import type { PageBlock } from '@/lib/oneentry/blocks/page-blocks';
import type { CatalogFilters } from '@/lib/oneentry/catalog/filters';
import { useT } from '@/lib/oneentry/labels/DictContext';

const PRODUCTS_PER_PAGE = 16;

export const WOMEN_CATALOG_PAGE_LABELS = {
  clothing: 'CLOTHING',
  women: 'WOMEN',
  breadcrumbHome: 'Home',
  breadcrumbClothing: 'Clothing',
} as const;

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
  // Catalog chrome resolves through the OE `catalog_page` set; the local labels are the offline fallback.
  const lTitle = useT('catalog_page_clothing', WOMEN_CATALOG_PAGE_LABELS.clothing);
  const lGender = useT('catalog_page_women', WOMEN_CATALOG_PAGE_LABELS.women);
  const lCrumbHome = useT('catalog_page_breadcrumb_home', WOMEN_CATALOG_PAGE_LABELS.breadcrumbHome);
  const lCrumbCat = useT('catalog_page_breadcrumb_clothing', WOMEN_CATALOG_PAGE_LABELS.breadcrumbClothing);
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
      breadcrumbs={[{ label: lCrumbHome, href: '/' }, { label: lCrumbCat }]}
    />
  );
}
