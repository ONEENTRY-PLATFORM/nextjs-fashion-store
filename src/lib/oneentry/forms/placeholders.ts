/**
 * Load OE form content for the *current route's* locale.
 *
 * A thin wrapper over `load-form.ts`, which does the fetching and decoding. The
 * split is load-bearing: resolving the locale goes through `next/root-params`,
 * and that module may only be imported from Server Components — a `'use server'`
 * action file that reached it failed every route with "Invalid import:
 * 'next/root-params' cannot be imported from a Client Component module". Server
 * Actions and cached loaders that already know their locale import
 * `loadFormContentForLang` from `load-form.ts` directly.
 */
import { currentCmsLocale } from '@/lib/oneentry/current-locale';
import type { Lang } from '@/lib/oneentry/system-text';

import type { FormContent, FormPlaceholders } from './form-content';
import { loadFormContentForLang } from './load-form';

// Re-exported so existing importers keep their current specifier; the
// definitions live in a client-safe module (see `form-content.ts`), because
// this file reaches for `next/root-params` and cannot enter a client bundle.
export type {
  FieldLimits,
  FormAttributeContent,
  FormContent,
  FormFieldOption,
  FormFieldType,
  FormPlaceholders,
} from './form-content';
export { EMPTY_FORM_CONTENT, NO_FIELD_LIMITS } from './form-content';
export { loadFormContentForLang } from './load-form';

/**
 * Load a form's authored content (labels, placeholders, options, messages).
 *
 * @param marker    - OE form marker.
 * @param [langArg] - Explicit OE locale; defaults to the route's.
 * @returns The decoded form; {@link EMPTY_FORM_CONTENT} when OE has none.
 */
export async function loadFormContent(marker: string, langArg?: Lang): Promise<FormContent> {
  return loadFormContentForLang(marker, langArg ?? (await currentCmsLocale()));
}

/**
 * Back-compat wrapper returning only `additionalFields`.
 *
 * @param marker    - OE form marker.
 * @param [langArg] - Explicit OE locale; defaults to the route's.
 * @returns `{attributeMarker: {fieldMarker: value}}` for attributes that have any.
 * @deprecated Prefer {@link loadFormContent}, which also carries field labels,
 * option lists and the form's success/failure messages.
 */
export async function loadFormPlaceholders(marker: string, langArg?: Lang): Promise<FormPlaceholders> {
  const content = await loadFormContent(marker, langArg);
  const out: FormPlaceholders = {};
  for (const [attrMarker, attr] of Object.entries(content.attributes)) {
    if (Object.keys(attr.fields).length > 0) out[attrMarker] = attr.fields;
  }
  return out;
}
