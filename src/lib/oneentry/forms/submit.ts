'use server';
import { revalidateTag } from 'next/cache';

import { getApiSafe, isError } from '@/lib/oneentry/index';
import { DEFAULT_LOCALE } from '@/lib/oneentry/locale';
import { se } from '@/lib/oneentry/server-errors';
import type { Lang } from '@/lib/oneentry/system-text';

export interface FormField {
  marker: string;
  /** Scalar (`string`) for text-ish fields, `string[]` when the OE attribute is `type: 'list'` (multi-select). */
  value: string | string[];
  type?: string;
}

export type SubmitFormResult = { ok: true } | { ok: false; error: string };

export interface SubmitFormBinding {
  /** The `moduleFormConfigs[].id` from the OE page where the form is registered. */
  moduleConfigId?: number;
  /** The `entityIdentifiers[0].id` from the same `moduleFormConfigs` entry. */
  moduleEntityIdentifier?: string;
}

export async function submitForm(
  marker: string,
  fields: FormField[],
  binding: SubmitFormBinding = {},
  lang: Lang = DEFAULT_LOCALE,
): Promise<SubmitFormResult> {
  const api = getApiSafe();
  if (!api) return { ok: false, error: await se('sdkNotConfiguredServer', lang) };
  try {
    const result = await api.FormData.postFormsData(
      {
        formIdentifier: marker,
        formModuleConfigId: binding.moduleConfigId ?? 0,
        moduleEntityIdentifier: binding.moduleEntityIdentifier ?? '',
        replayTo: null,
        status: 'sent',
        formData: fields.map((f) => ({
          marker: f.marker,
          // SDK types `value` as `string`; OE actually accepts `string[]` when the attribute is `list`. Widening here to match the runtime shape.
          value: f.value as unknown as string,
          type: (f.type ?? 'string') as 'string',
        })),
      },
      lang,
    );
    if (isError(result)) return { ok: false, error: result.message ?? `HTTP ${result.statusCode}` };
    // Invalidate the read-side cache for the affected surface so the newly-posted submission surfaces immediately instead of hiding behind the loader's 5-minute TTL.
    try {
      if (marker === 'review_rating' || marker === 'review_feedback') {
        revalidateTag('oe-reviews', 'max');
      }
      revalidateTag('oe-forms', 'max');
    } catch {
      /* revalidateTag is a no-op outside a request context */
    }
    return { ok: true };
  } catch (e) {
    const message = e instanceof Error ? e.message : 'Unknown error';
    return { ok: false, error: message };
  }
}
