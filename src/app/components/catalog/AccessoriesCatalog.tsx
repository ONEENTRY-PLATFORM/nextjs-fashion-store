'use client';
/** AccessoriesCatalog — thin wrapper over ShoesCatalog. */

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

export const ACCESSORIES_CATALOG_LABELS = {
  accessories: 'ACCESSORIES',
  breadcrumbAccessories: 'Accessories',
} as const;

export function AccessoriesCatalog(props: AccessoriesCatalogProps) {
  // Title and breadcrumb resolve through the OE `catalog_page` set; the local constants stay as the offline fallback.
  const title = useT('catalog_page_accessories', ACCESSORIES_CATALOG_LABELS.accessories);
  const crumb = useT('catalog_page_breadcrumb_accessories', ACCESSORIES_CATALOG_LABELS.breadcrumbAccessories);
  return <ShoesCatalog {...props} catalogTitle={title} breadcrumbCategory={crumb} />;
}
