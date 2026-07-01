import { getSystemSet, readSystemValue, type Lang } from '../system-text';
import { SALE_PAGE_SET_MARKER, type SalePageDict } from './sale-page-types';
export { SALE_PAGE_SET_MARKER } from './sale-page-types';
export type { SalePageDict } from './sale-page-types';

export async function loadSalePageSystemTexts(
  lang: Lang = 'en_US',
): Promise<SalePageDict> {
  const schema = await getSystemSet(SALE_PAGE_SET_MARKER, lang);
  const dict: SalePageDict = {};
  for (const [key, item] of Object.entries(schema)) {
    const v = readSystemValue(item, lang);
    if (typeof v === 'string' && v.length > 0) dict[key] = v;
  }
  return dict;
}
