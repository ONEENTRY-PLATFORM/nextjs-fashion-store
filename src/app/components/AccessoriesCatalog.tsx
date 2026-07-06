'use client'
/**
 * AccessoriesCatalog — thin wrapper over ShoesCatalog.
 *
 * All rendering logic lives in ShoesCatalog; this file only provides
 * the accessories-specific chip alias map and overrides the title/breadcrumb.
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

const ACCESSORY_CHIP_MAP: Record<string, string> = {
  'Scarves':    'Scarves/Shawls',
  'Gloves':     'Gloves/Mittens',
  'Belts':      'Belt',
  'Wallets':    'Cardholders/Wallets',
  'Caps':       'Headwear',
  'Headwear':   'Headwear',
  'Sunglasses': 'Sunglasses',
  'Jewelry':    'Jewelry',
};

export function AccessoriesCatalog(props: AccessoriesCatalogProps) {
  return (
    <ShoesCatalog
      {...props}
      catalogTitle={CL.accessories}
      breadcrumbCategory={CL.breadcrumbAccessories}
      chipField="accessoryType"
      chipAliasMap={ACCESSORY_CHIP_MAP}
    />
  );
}
