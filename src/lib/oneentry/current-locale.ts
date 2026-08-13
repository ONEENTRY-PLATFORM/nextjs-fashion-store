import { type CmsLocaleCode, DEFAULT_LOCALE, toCmsLocale } from './locale';

/** The OE locale code for the route currently rendering. */
export async function currentCmsLocale(): Promise<CmsLocaleCode> {
  try {
    const { locale } = await import('next/root-params');
    return toCmsLocale(await locale());
  } catch {
    return DEFAULT_LOCALE;
  }
}
