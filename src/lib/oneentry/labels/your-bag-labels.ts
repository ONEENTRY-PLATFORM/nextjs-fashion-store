import { getSystemSet, readSystemValue, type Lang } from '../system-text';
import { YOUR_BAG_SET_MARKER, type YourBagDict } from './your-bag-types';
export { YOUR_BAG_SET_MARKER } from './your-bag-types';
export type { YourBagDict } from './your-bag-types';

export async function loadYourBagSystemTexts(
  lang: Lang = 'en_US',
): Promise<YourBagDict> {
  const schema = await getSystemSet(YOUR_BAG_SET_MARKER, lang);
  const dict: YourBagDict = {};
  for (const [key, item] of Object.entries(schema)) {
    const v = readSystemValue(item, lang);
    if (typeof v === 'string' && v.length > 0) dict[key] = v;
  }
  return dict;
}
