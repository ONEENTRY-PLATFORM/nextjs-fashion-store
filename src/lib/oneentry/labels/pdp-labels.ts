import { getSystemSet, readSystemValue, type Lang } from '../system-text';
import { PDP_SET_MARKERS, type PdpSystemTexts } from './pdp-types';
import { DEFAULT_LOCALE } from '../locale';
export { PDP_SET_MARKERS } from './pdp-types';
export type { PdpSetMarker, PdpSystemTexts } from './pdp-types';

export async function loadPdpSystemTexts(
  lang: Lang = DEFAULT_LOCALE,
): Promise<PdpSystemTexts> {
  const entries = await Promise.all(
    PDP_SET_MARKERS.map(async (marker) => {
      const schema = await getSystemSet(marker, lang);
      const dict: Record<string, string> = {};
      for (const [key, item] of Object.entries(schema)) {
        const v = readSystemValue(item, lang);
        if (typeof v === 'string' && v.length > 0) dict[key] = v;
      }
      return [marker, dict] as const;
    }),
  );
  return Object.fromEntries(entries) as PdpSystemTexts;
}
