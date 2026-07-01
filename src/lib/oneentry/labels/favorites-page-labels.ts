import { getSystemSet, readSystemValue, type Lang } from '../system-text';
import { FAVORITES_PAGE_SET_MARKER, type FavoritesPageDict } from './favorites-page-types';
export { FAVORITES_PAGE_SET_MARKER } from './favorites-page-types';
export type { FavoritesPageDict } from './favorites-page-types';

export async function loadFavoritesPageSystemTexts(
  lang: Lang = 'en_US',
): Promise<FavoritesPageDict> {
  const schema = await getSystemSet(FAVORITES_PAGE_SET_MARKER, lang);
  const dict: FavoritesPageDict = {};
  for (const [key, item] of Object.entries(schema)) {
    const v = readSystemValue(item, lang);
    if (typeof v === 'string' && v.length > 0) dict[key] = v;
  }
  return dict;
}
