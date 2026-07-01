import { getSystemSet, readSystemValue, type Lang } from '../system-text';
import { ACCOUNT_SET_MARKERS, type AccountSystemTexts } from './account-types';
export { ACCOUNT_SET_MARKERS } from './account-types';
export type { AccountSetMarker, AccountSystemTexts } from './account-types';

export async function loadAccountSystemTexts(
  lang: Lang = 'en_US',
): Promise<AccountSystemTexts> {
  const entries = await Promise.all(
    ACCOUNT_SET_MARKERS.map(async (marker) => {
      const schema = await getSystemSet(marker, lang);
      const dict: Record<string, string> = {};
      for (const [key, item] of Object.entries(schema)) {
        const v = readSystemValue(item, lang);
        if (typeof v === 'string' && v.length > 0) dict[key] = v;
      }
      return [marker, dict] as const;
    }),
  );
  return Object.fromEntries(entries) as AccountSystemTexts;
}
