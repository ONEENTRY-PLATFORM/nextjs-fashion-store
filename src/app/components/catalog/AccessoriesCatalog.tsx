'use client'
/**
 * AccessoriesCatalog — thin wrapper over ShoesCatalog.
 *
 * All rendering logic lives in ShoesCatalog; this file only overrides the
 * catalog title and breadcrumb label.
 */
import {
  ShoesCatalog,
  type ShoesCatalogProps,
  type FilterOption,
  type FilterGroup,
  type CrossSellCategory,
} from './ShoesCatalog';
import { CATALOG_PAGE_LABELS as CL } from '../../data/catalogPageLabels';
import { useCatalogPageT } from '../../../lib/oneentry/labels/CatalogPageLabelsContext';

export type { FilterOption, FilterGroup, CrossSellCategory };
export type AccessoriesCatalogProps = ShoesCatalogProps;

export function AccessoriesCatalog(props: AccessoriesCatalogProps) {
  // Title and breadcrumb resolve through the OE `catalog_page` set; the local
  // constants stay as the offline fallback.
  const title = useCatalogPageT('catalog_page_accessories', CL.accessories);
  const crumb = useCatalogPageT('catalog_page_breadcrumb_accessories', CL.breadcrumbAccessories);
  return (
    <ShoesCatalog
      {...props}
      catalogTitle={title}
      breadcrumbCategory={crumb}
    />
  );
}
