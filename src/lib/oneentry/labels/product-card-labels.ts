import { getSystemSet, readSystemValue, type Lang } from '../system-text';
import { PRODUCT_CARD_SET_MARKER, type ProductCardDict } from './product-card-types';
import { DEFAULT_LOCALE } from '../locale';
export { PRODUCT_CARD_SET_MARKER } from './product-card-types';
export type { ProductCardDict } from './product-card-types';

export async function loadProductCardSystemTexts(
  lang: Lang = DEFAULT_LOCALE,
): Promise<ProductCardDict> {
  const schema = await getSystemSet(PRODUCT_CARD_SET_MARKER, lang);
  const dict: ProductCardDict = {};
  for (const [key, item] of Object.entries(schema)) {
    const v = readSystemValue(item, lang);
    if (typeof v === 'string' && v.length > 0) dict[key] = v;
  }
  return dict;
}
