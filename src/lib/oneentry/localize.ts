/** The two shapes OE answers `localizeInfos` in, and the title lookup the filter loaders share. Pure and client-safe. */
import type { ILocalizeInfo } from 'oneentry/types';

import { DEFAULT_LOCALE } from '@/lib/oneentry/locale';

/** `localizeInfos` as it actually arrives: already picked for the requested locale — all `ILocalizeInfo` describes — or wrapped in a per-locale map, depending on which endpoint answered. Fields are optional because a partially-translated record omits them. */
export type MaybeLocalizedInfo = Partial<ILocalizeInfo> | Record<string, Partial<ILocalizeInfo>>;

/** Title in `lang`, then in the default locale, then the flat one. The default-locale step is why an untranslated group keeps its English heading instead of disappearing. */
export function localizedTitle(info: MaybeLocalizedInfo | undefined, lang: string, fallback = ''): string {
  if (!info) return fallback;
  for (const key of [lang, DEFAULT_LOCALE]) {
    const nested = (info as Record<string, Partial<ILocalizeInfo> | undefined>)[key];
    if (nested && typeof nested.title === 'string' && nested.title.trim()) {
      return nested.title.trim();
    }
  }
  const flat = (info as Partial<ILocalizeInfo>).title;
  if (typeof flat === 'string' && flat.trim()) return flat.trim();
  return fallback;
}
