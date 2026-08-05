import { getSystemSet, readSystemValue, type Lang } from '../system-text';
import { INFO_PAGE_SET_MARKER, type InfoPageDict } from './info-page-types';
import { DEFAULT_LOCALE } from '../locale';
export { INFO_PAGE_SET_MARKER } from './info-page-types';
export type { InfoPageDict } from './info-page-types';

export async function loadInfoPageSystemTexts(
  lang: Lang = DEFAULT_LOCALE,
): Promise<InfoPageDict> {
  const schema = await getSystemSet(INFO_PAGE_SET_MARKER, lang);
  const dict: InfoPageDict = {};
  for (const [key, item] of Object.entries(schema)) {
    const v = readSystemValue(item, lang);
    if (typeof v === 'string' && v.length > 0) dict[key] = v;
  }
  return dict;
}
