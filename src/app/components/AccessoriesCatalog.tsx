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
import { CATALOG_PAGE_LABELS as CL } from '../data/catalogPageLabels';

export type { FilterOption, FilterGroup, CrossSellCategory };
export type AccessoriesCatalogProps = ShoesCatalogProps;

export function AccessoriesCatalog(props: AccessoriesCatalogProps) {
  return (
    <ShoesCatalog
      {...props}
      catalogTitle={CL.accessories}
      breadcrumbCategory={CL.breadcrumbAccessories}
    />
  );
}
