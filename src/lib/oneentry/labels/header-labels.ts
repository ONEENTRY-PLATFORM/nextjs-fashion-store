import { getSystemSet, readSystemValue, type Lang } from '../system-text';
import { HEADER_SET_MARKER, type HeaderDict } from './header-types';
import { DEFAULT_LOCALE } from '../locale';
export { HEADER_SET_MARKER } from './header-types';
export type { HeaderDict } from './header-types';

export async function loadHeaderSystemTexts(
  lang: Lang = DEFAULT_LOCALE,
): Promise<HeaderDict> {
  const schema = await getSystemSet(HEADER_SET_MARKER, lang);
  const dict: HeaderDict = {};
  for (const [key, item] of Object.entries(schema)) {
    const v = readSystemValue(item, lang);
    if (typeof v === 'string' && v.length > 0) dict[key] = v;
  }
  return dict;
}
