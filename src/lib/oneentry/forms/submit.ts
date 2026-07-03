'use server';
import { oneentry, isError } from '../index';
import type { Lang } from '../system-text';
import { DEFAULT_LOCALE } from '../locale';

export interface FormField {
  marker: string;
  value: string;
  type?: string;
}

export type SubmitFormResult =
  | { ok: true }
  | { ok: false; error: string };

export interface SubmitFormBinding {
  /** The `moduleFormConfigs[].id` from the OE page where the form is
   *  registered. OE's `postFormsData` rejects the submission with
   *  "Incorrect formIdentifier for provided config" when this doesn't
   *  match one of the form's real module bindings — the default `0` only
   *  works for forms that have no page binding at all. Find the ID via
   *  `Pages.getPageByUrl(<page>)` → `page.moduleFormConfigs[N].id`. */
  moduleConfigId?: number;
  /** The `entityIdentifiers[0].id` from the same `moduleFormConfigs` entry
   *  (usually the page's `pageUrl`, e.g. `'subscribe'`). */
  moduleEntityIdentifier?: string;
}

export async function submitForm(
  marker: string,
  fields: FormField[],
  binding: SubmitFormBinding = {},
  lang: Lang = DEFAULT_LOCALE,
): Promise<SubmitFormResult> {
  if (!oneentry) return { ok: false, error: 'OneEntry SDK is not configured on the server.' };
  try {
    const result = await oneentry.FormData.postFormsData(
      {
        formIdentifier: marker,
        formModuleConfigId: binding.moduleConfigId ?? 0,
        moduleEntityIdentifier: binding.moduleEntityIdentifier ?? '',
        replayTo: null,
        status: 'sent',
        formData: fields.map((f) => ({
          marker: f.marker,
          value: f.value,
          type: (f.type ?? 'string') as 'string',
        })),
      },
      lang,
    );
    if (isError(result)) return { ok: false, error: result.message ?? `HTTP ${result.statusCode}` };
    return { ok: true };
  } catch (e) {
    const message = e instanceof Error ? e.message : 'Unknown error';
    return { ok: false, error: message };
  }
}
