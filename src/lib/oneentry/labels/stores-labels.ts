import { getSystemSet, readSystemValue, type Lang } from '../system-text';
import { STORES_SET_MARKERS, type StoresSystemTexts } from './stores-types';
export { STORES_SET_MARKERS } from './stores-types';
export type { StoresSetMarker, StoresSystemTexts } from './stores-types';

export async function loadStoresSystemTexts(
  lang: Lang = 'en_US',
): Promise<StoresSystemTexts> {
  const entries = await Promise.all(
    STORES_SET_MARKERS.map(async (marker) => {
      const schema = await getSystemSet(marker, lang);
      const dict: Record<string, string> = {};
      for (const [key, item] of Object.entries(schema)) {
        const v = readSystemValue(item, lang);
        if (typeof v === 'string' && v.length > 0) dict[key] = v;
      }
      return [marker, dict] as const;
    }),
  );
  return Object.fromEntries(entries) as StoresSystemTexts;
}
