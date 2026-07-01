import { getSystemSet, readSystemValue, type Lang } from '../system-text';
import { NEW_ARRIVALS_PAGE_SET_MARKER, type NewArrivalsPageDict } from './new-arrivals-page-types';
export { NEW_ARRIVALS_PAGE_SET_MARKER } from './new-arrivals-page-types';
export type { NewArrivalsPageDict } from './new-arrivals-page-types';

export async function loadNewArrivalsPageSystemTexts(
  lang: Lang = 'en_US',
): Promise<NewArrivalsPageDict> {
  const schema = await getSystemSet(NEW_ARRIVALS_PAGE_SET_MARKER, lang);
  const dict: NewArrivalsPageDict = {};
  for (const [key, item] of Object.entries(schema)) {
    const v = readSystemValue(item, lang);
    if (typeof v === 'string' && v.length > 0) dict[key] = v;
  }
  return dict;
}
