'use client'
import { CatalogTemplate, type FilterGroup, type ChipFilter } from '../components/CatalogTemplate';
import type { Product } from '../components/ProductCard';
import { ACCENT_MEN as ACCENT } from '../constants/colors';
import { CATALOG_PAGE_LABELS as CL } from '../data/catalogPageLabels';
import { FILTER_QUICK_CHIPS as QC } from '../data/catalogFilterLabels';
import type { CatalogFilters } from '../../lib/oneentry/catalog/filters';
import type { PageBlock } from '../../lib/oneentry/blocks/page-blocks';

const PRODUCTS_PER_PAGE = 12;

const QUICK_CHIPS: ChipFilter[] = [
  { chip: QC.backpacks,    filter: p => p.bagType === 'Backpack' },
  { chip: QC.briefcases,   filter: p => p.bagType === 'Briefcase' },
  { chip: QC.laptopBags,   filter: p => p.bagType === 'Laptop Bag' },
  { chip: QC.beltBags,     filter: p => p.bagType === 'Belt Bag' },
  { chip: QC.travelBags,   filter: p => p.bagType === 'Travel Bag' },
  { chip: QC.shoulderBags, filter: p => p.bagType === 'Shoulder Bag' },
  { chip: QC.suitcases,    filter: p => p.bagType === 'Suitcase' },
];

export function MenBagsPage({
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
      catalogKey="men-bags"
      products={initialProducts ?? []}
      filterGroups={initialFilterGroups ?? []}
      quickChips={QUICK_CHIPS}
      accentColor={ACCENT}
      title={CL.bags}
      genderLabel={CL.men}
      totalStyles={initialTotalStyles}
      total={total}
      trendingBlock={trendingBlock}
      currentPage={currentPage}
      currentFilters={currentFilters}
      productsPerPage={PRODUCTS_PER_PAGE}
      priceMax={500}
      priceDefault={[0, 500]}
      scrollbarClass="scrollbar-red"
      breadcrumbs={[
        { label: CL.breadcrumbHome, href: '/' },
        { label: CL.breadcrumbMen, href: '/men' },
        { label: CL.breadcrumbBags },
      ]}
    />
  );
}
