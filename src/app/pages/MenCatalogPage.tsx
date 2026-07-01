'use client'
import { CatalogTemplate, type FilterGroup, type ChipFilter } from '../components/CatalogTemplate';
import type { Product } from '../components/ProductCard';
import { ACCENT_MEN as ACCENT } from '../constants/colors';
import { CATALOG_PAGE_LABELS as CL } from '../data/catalogPageLabels';
import { FILTER_QUICK_CHIPS as QC } from '../data/catalogFilterLabels';
import type { CatalogFilters } from '../../lib/oneentry/catalog/filters';
import type { PageBlock } from '../../lib/oneentry/blocks/page-blocks';

const PRODUCTS_PER_PAGE = 16;

const QUICK_CHIPS: ChipFilter[] = [
  { chip: QC.bestSellers, filter: p => p.label === 'BESTSELLER' },
  { chip: QC.suits,       filter: p => p.clothingType === 'Suits' },
  { chip: QC.jeans,       filter: p => p.clothingType === 'Jeans' },
  { chip: QC.shirts,      filter: p => ['Shirts', 'T-Shirts / Polo Shirts'].includes(p.clothingType ?? '') },
  { chip: QC.outerwear,   filter: p => ['Outerwear', 'Blazers', 'Vests'].includes(p.clothingType ?? '') },
  { chip: QC.sportswear,  filter: p => p.clothingType === 'Sportswear' },
  { chip: QC.casualWear,  filter: p => p.style === 'Casual' },
];

export function MenCatalogPage({
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
    <CatalogTemplate
      catalogKey="men-clothing"
      products={initialProducts ?? []}
      filterGroups={initialFilterGroups ?? []}
      quickChips={QUICK_CHIPS}
      accentColor={ACCENT}
      title={CL.clothing}
      genderLabel={CL.men}
      totalStyles={initialTotalStyles}
      total={total}
      trendingBlock={trendingBlock}
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
