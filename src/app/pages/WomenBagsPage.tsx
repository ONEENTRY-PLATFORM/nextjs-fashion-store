'use client'
import { CatalogTemplate, type FilterGroup, type ChipFilter } from '../components/CatalogTemplate';
import type { Product } from '../components/ProductCard';
import { ACCENT_WOMEN as ACCENT } from '../constants/colors';
import { CATALOG_PAGE_LABELS as CL } from '../data/catalogPageLabels';
import { FILTER_QUICK_CHIPS as QC } from '../data/catalogFilterLabels';
import type { CatalogFilters } from '../../lib/oneentry/catalog/filters';
import type { PageBlock } from '../../lib/oneentry/blocks/page-blocks';

const PRODUCTS_PER_PAGE = 12;

const QUICK_CHIPS: ChipFilter[] = [
  { chip: QC.shoulderBags, filter: p => p.bagType === 'Shoulder Bag' },
  { chip: QC.toteBags,     filter: p => p.bagType === 'Tote Bag' },
  { chip: QC.clutches,     filter: p => p.bagType === 'Clutch' },
  { chip: QC.crossbody,    filter: p => p.bagType === 'Crossbody Bag' },
  { chip: QC.backpacks,    filter: p => p.bagType === 'Backpack' },
  { chip: QC.beltBags,     filter: p => p.bagType === 'Belt Bag' },
  { chip: QC.summerBags,   filter: p => p.bagType === 'Summer Bag' },
];

export function WomenBagsPage({
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
      catalogKey="women-bags"
      products={initialProducts ?? []}
      filterGroups={initialFilterGroups ?? []}
      quickChips={QUICK_CHIPS}
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
