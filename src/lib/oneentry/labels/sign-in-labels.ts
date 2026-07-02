import { getSystemSet, readSystemValue, type Lang } from '../system-text';
import { SIGN_IN_SET_MARKER, type SignInDict } from './sign-in-types';
import { DEFAULT_LOCALE } from '../locale';
export { SIGN_IN_SET_MARKER } from './sign-in-types';
export type { SignInDict } from './sign-in-types';

export async function loadSignInSystemTexts(
  lang: Lang = DEFAULT_LOCALE,
): Promise<SignInDict> {
  const schema = await getSystemSet(SIGN_IN_SET_MARKER, lang);
  const dict: SignInDict = {};
  for (const [key, item] of Object.entries(schema)) {
    const v = readSystemValue(item, lang);
    if (typeof v === 'string' && v.length > 0) dict[key] = v;
  }
  return dict;
}
