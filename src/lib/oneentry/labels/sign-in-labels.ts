import { getSystemSet, readSystemValue, type Lang } from '../system-text';
import { SIGN_IN_SET_MARKER, type SignInDict } from './sign-in-types';
export { SIGN_IN_SET_MARKER } from './sign-in-types';
export type { SignInDict } from './sign-in-types';

export async function loadSignInSystemTexts(
  lang: Lang = 'en_US',
): Promise<SignInDict> {
  const schema = await getSystemSet(SIGN_IN_SET_MARKER, lang);
  const dict: SignInDict = {};
  for (const [key, item] of Object.entries(schema)) {
    const v = readSystemValue(item, lang);
    if (typeof v === 'string' && v.length > 0) dict[key] = v;
  }
  return dict;
}
