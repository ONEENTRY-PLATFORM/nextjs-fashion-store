import { getSystemSet, readSystemValue, type Lang } from '../system-text';
import { FOOTER_SET_MARKER, type FooterDict } from './footer-types';
import { DEFAULT_LOCALE } from '../locale';
export { FOOTER_SET_MARKER } from './footer-types';
export type { FooterDict } from './footer-types';

/**
 * Footer branding copy — company blurb, support phone, copyright, social
 * links and the four support cards — from the OE `footer` set.
 *
 * These are the fields marketing changes without a release (a new phone
 * number, next year's copyright, an extra social channel), which is why they
 * belong in the CMS. An absent set yields an empty dict and every call site
 * falls back to `data/footerConfig.ts`.
 */
export async function loadFooterSystemTexts(
  lang: Lang = DEFAULT_LOCALE,
): Promise<FooterDict> {
  const schema = await getSystemSet(FOOTER_SET_MARKER, lang);
  const dict: FooterDict = {};
  for (const [key, item] of Object.entries(schema)) {
    const v = readSystemValue(item, lang);
    if (typeof v === 'string' && v.length > 0) dict[key] = v;
  }
  return dict;
}
