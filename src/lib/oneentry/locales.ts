import { cache } from 'react';

import { getApiSafe, isError } from './index';
import { logCaught } from './log';

/** Active content locales configured on the OneEntry project (admin → Settings → Localization). */
export interface CmsLocale {
  /** Numeric OE id. */
  id: number;
  /** Two-letter code, e.g. `en`. Used for the compact switcher label. */
  shortCode: string;
  /** Full locale code, e.g. `en_US`. Matches `Lang` / `DEFAULT_LOCALE`. */
  code: string;
  /** English name, e.g. `English (USA)`. */
  name: string;
  /** Name in the language itself — preferred in a language switcher. */
  nativeName: string;
  /** Display order configured in the admin panel. */
  position: number;
}

/** Load active locales through the SDK. */
export const loadLocales = cache(async (): Promise<CmsLocale[]> => {
  const api = getApiSafe();
  if (!api) return [];
  try {
    const result = await api.Locales.getLocales();
    if (isError(result) || !Array.isArray(result)) return [];
    return result
      .filter((l) => l?.isActive !== false)
      .map((l) => ({
        id: typeof l.id === 'number' ? l.id : 0,
        shortCode: typeof l.shortCode === 'string' ? l.shortCode : '',
        code: typeof l.code === 'string' ? l.code : '',
        name: typeof l.name === 'string' ? l.name : '',
        nativeName: typeof l.nativeName === 'string' ? l.nativeName : '',
        position: typeof l.position === 'number' ? l.position : 0,
      }))
      .filter((l) => l.code.length > 0)
      .sort((a, b) => a.position - b.position);
  } catch (err) {
    logCaught('locales.loadLocales', err);
    return [];
  }
});
