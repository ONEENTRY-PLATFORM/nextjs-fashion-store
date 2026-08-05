import { getSystemSet, readSystemValue, type Lang } from '../system-text';
import { CATALOG_PAGE_SET_MARKER, type CatalogPageDict } from './catalog-page-types';
import { DEFAULT_LOCALE } from '../locale';
export { CATALOG_PAGE_SET_MARKER } from './catalog-page-types';
export type { CatalogPageDict } from './catalog-page-types';

/**
 * Catalog chrome copy — gender labels, category titles and breadcrumb
 * fragments — from the OE `catalog_page` set. An absent set yields an empty
 * dict, and every call site falls back to `data/catalogPageLabels.ts`.
 */
export async function loadCatalogPageSystemTexts(
  lang: Lang = DEFAULT_LOCALE,
): Promise<CatalogPageDict> {
  const schema = await getSystemSet(CATALOG_PAGE_SET_MARKER, lang);
  const dict: CatalogPageDict = {};
  for (const [key, item] of Object.entries(schema)) {
    const v = readSystemValue(item, lang);
    if (typeof v === 'string' && v.length > 0) dict[key] = v;
  }
  return dict;
}
