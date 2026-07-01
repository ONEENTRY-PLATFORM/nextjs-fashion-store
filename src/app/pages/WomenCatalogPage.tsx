'use client'
import { CatalogTemplate, type FilterGroup, type ChipFilter } from '../components/CatalogTemplate';
import type { Product } from '../components/ProductCard';
import { ACCENT_WOMEN as ACCENT } from '../constants/colors';
import { CATALOG_PAGE_LABELS as CL } from '../data/catalogPageLabels';
import { FILTER_QUICK_CHIPS as QC } from '../data/catalogFilterLabels';
import type { CatalogFilters } from '../../lib/oneentry/catalog/filters';
import type { PageBlock } from '../../lib/oneentry/blocks/page-blocks';

const PRODUCTS_PER_PAGE = 16;

const QUICK_CHIPS: ChipFilter[] = [
  { chip: QC.bestSellers,   filter: p => p.label === 'BESTSELLER' },
  { chip: QC.dresses,       filter: p => p.clothingType === 'Dresses' },
  { chip: QC.tops,          filter: p => ['Tank Tops', 'T-Shirts / Polo Shirts', 'Shirts', 'Hoodies / Sweatshirts'].includes(p.clothingType ?? '') },
  { chip: QC.bottoms,       filter: p => ['Jeans', 'Pants', 'Skirts', 'Trousers', 'Shorts'].includes(p.clothingType ?? '') },
  { chip: QC.outerwear,     filter: p => ['Outerwear', 'Blazers'].includes(p.clothingType ?? '') },
  { chip: QC.winterOutfits, filter: p => p.season === 'Winter' },
  { chip: QC.partyOutfits,  filter: p => p.clothingType === 'Dresses' },
];

export function WomenCatalogPage({
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
      catalogKey="women-clothing"
      products={initialProducts ?? []}
      filterGroups={initialFilterGroups ?? []}
      quickChips={QUICK_CHIPS}
      accentColor={ACCENT}
      title={CL.clothing}
      genderLabel={CL.women}
      totalStyles={initialTotalStyles}
      total={total}
      trendingBlock={trendingBlock}
      currentPage={currentPage}
      currentFilters={currentFilters}
      productsPerPage={PRODUCTS_PER_PAGE}
      showListMode={true}
      scrollbarClass="scrollbar-pink"
      breadcrumbs={[
        { label: CL.breadcrumbHome, href: '/' },
        { label: CL.breadcrumbClothing },
      ]}
    />
  );
}
