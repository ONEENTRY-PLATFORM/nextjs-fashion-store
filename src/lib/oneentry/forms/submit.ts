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

export async function submitForm(
  marker: string,
  fields: FormField[],
  lang: Lang = DEFAULT_LOCALE,
): Promise<SubmitFormResult> {
  if (!oneentry) return { ok: false, error: 'OneEntry SDK is not configured on the server.' };
  try {
    const result = await oneentry.FormData.postFormsData(
      {
        formIdentifier: marker,
        formModuleConfigId: 0,
        moduleEntityIdentifier: '',
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
