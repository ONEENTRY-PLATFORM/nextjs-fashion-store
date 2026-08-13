'use client';
import { CatalogTemplate, type FilterGroup } from '@/app/components/catalog/CatalogTemplate';
import type { Product } from '@/app/components/product/ProductCard';
import { ACCENT_MEN as ACCENT } from '@/app/constants/colors';
import type { PageBlock } from '@/lib/oneentry/blocks/page-blocks';
import type { CatalogFilters } from '@/lib/oneentry/catalog/filters';
import { useT } from '@/lib/oneentry/labels/DictContext';

const PRODUCTS_PER_PAGE = 16;

export const MEN_BAGS_PAGE_LABELS = {
  bags: 'BAGS',
  men: 'MEN',
  breadcrumbHome: 'Home',
  breadcrumbMen: 'Men',
  breadcrumbBags: 'Bags',
} as const;

export function MenBagsPage({
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
  // Catalog chrome resolves through the OE `catalog_page` set; `CL` is the offline fallback.
  const lTitle = useT('catalog_page_bags', MEN_BAGS_PAGE_LABELS.bags);
  const lGender = useT('catalog_page_men', MEN_BAGS_PAGE_LABELS.men);
  const lCrumbHome = useT('catalog_page_breadcrumb_home', MEN_BAGS_PAGE_LABELS.breadcrumbHome);
  const lCrumbMen = useT('catalog_page_breadcrumb_men', MEN_BAGS_PAGE_LABELS.breadcrumbMen);
  const lCrumbCat = useT('catalog_page_breadcrumb_bags', MEN_BAGS_PAGE_LABELS.breadcrumbBags);
  return (
    <CatalogTemplate
      pageBlocks={pageBlocks}
      catalogKey="men-bags"
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
      priceMax={500}
      priceDefault={[0, 500]}
      scrollbarClass="scrollbar-red"
      breadcrumbs={[{ label: lCrumbHome, href: '/' }, { label: lCrumbMen, href: '/men' }, { label: lCrumbCat }]}
    />
  );
}
