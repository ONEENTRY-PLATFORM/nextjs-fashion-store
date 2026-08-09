'use client';
/**
 * AccessoriesCatalog — thin wrapper over ShoesCatalog.
 *
 * All rendering logic lives in ShoesCatalog; this file only overrides the
 * catalog title and breadcrumb label.
 */
import { CATALOG_PAGE_LABELS as CL } from '@/app/data/catalogPageLabels';
import { useT } from '@/lib/oneentry/labels/DictContext';

import {
  type CrossSellCategory,
  type FilterGroup,
  type FilterOption,
  ShoesCatalog,
  type ShoesCatalogProps,
} from './ShoesCatalog';

export type { CrossSellCategory, FilterGroup, FilterOption };
export type AccessoriesCatalogProps = ShoesCatalogProps;

export function AccessoriesCatalog(props: AccessoriesCatalogProps) {
  // Title and breadcrumb resolve through the OE `catalog_page` set; the local
  // constants stay as the offline fallback.
  const title = useT('catalog_page_accessories', CL.accessories);
  const crumb = useT('catalog_page_breadcrumb_accessories', CL.breadcrumbAccessories);
  return <ShoesCatalog {...props} catalogTitle={title} breadcrumbCategory={crumb} />;
}
