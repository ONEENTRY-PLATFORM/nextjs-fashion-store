/** Load OE form content for the current route's locale. Server Components only — reaches `next/root-params`; callers that know their locale import `loadFormContentForLang` from `load-form.ts`. */
import { currentCmsLocale } from '@/lib/oneentry/current-locale';
import type { Lang } from '@/lib/oneentry/system-text';

import type { FormContent, FormPlaceholders } from './form-content';
import { loadFormContentForLang } from './load-form';

// Re-exported so existing importers keep their current specifier.
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

/** Load a form's authored content (labels, placeholders, options, messages). */
export async function loadFormContent(marker: string, langArg?: Lang): Promise<FormContent> {
  return loadFormContentForLang(marker, langArg ?? (await currentCmsLocale()));
}

/**
 * Back-compat wrapper returning only `additionalFields`.
 *
 * @deprecated Prefer {@link loadFormContent}.
 */
export async function loadFormPlaceholders(marker: string, langArg?: Lang): Promise<FormPlaceholders> {
  const content = await loadFormContent(marker, langArg);
  const out: FormPlaceholders = {};
  for (const [attrMarker, attr] of Object.entries(content.attributes)) {
    if (Object.keys(attr.fields).length > 0) out[attrMarker] = attr.fields;
  }
  return out;
}
