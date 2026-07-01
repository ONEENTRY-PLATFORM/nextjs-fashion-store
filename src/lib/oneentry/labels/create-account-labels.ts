import { getSystemSet, readSystemValue, type Lang } from '../system-text';
import { CREATE_ACCOUNT_SET_MARKER, type CreateAccountDict } from './create-account-types';
export { CREATE_ACCOUNT_SET_MARKER } from './create-account-types';
export type { CreateAccountDict } from './create-account-types';

export async function loadCreateAccountSystemTexts(
  lang: Lang = 'en_US',
): Promise<CreateAccountDict> {
  const schema = await getSystemSet(CREATE_ACCOUNT_SET_MARKER, lang);
  const dict: CreateAccountDict = {};
  for (const [key, item] of Object.entries(schema)) {
    const v = readSystemValue(item, lang);
    if (typeof v === 'string' && v.length > 0) dict[key] = v;
  }
  return dict;
}
