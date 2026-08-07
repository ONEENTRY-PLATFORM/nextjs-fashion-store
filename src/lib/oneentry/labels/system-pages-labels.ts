import { getSystemSet, readSystemValue, type Lang } from '../system-text';
import { SYSTEM_PAGES_SET_MARKER, type SystemPagesDict } from './system-pages-types';
import { DEFAULT_LOCALE } from '../locale';
export { SYSTEM_PAGES_SET_MARKER } from './system-pages-types';
export type { SystemPagesDict } from './system-pages-types';

export async function loadSystemPagesSystemTexts(
  lang: Lang = DEFAULT_LOCALE,
): Promise<SystemPagesDict> {
  const schema = await getSystemSet(SYSTEM_PAGES_SET_MARKER, lang);
  const dict: SystemPagesDict = {};
  for (const [key, item] of Object.entries(schema)) {
    const v = readSystemValue(item, lang);
    if (typeof v === 'string' && v.length > 0) dict[key] = v;
  }
  return dict;
}
