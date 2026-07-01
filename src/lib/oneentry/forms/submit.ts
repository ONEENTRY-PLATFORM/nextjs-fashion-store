'use server';
import { oneentry } from '../index';
import type { Lang } from '../system-text';

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
  lang: Lang = 'en_US',
): Promise<SubmitFormResult> {
  if (!oneentry) return { ok: false, error: 'OneEntry SDK is not configured on the server.' };
  try {
    await oneentry.FormData.postFormsData(
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
    return { ok: true };
  } catch (e) {
    const message = e instanceof Error ? e.message : 'Unknown error';
    return { ok: false, error: message };
  }
}
