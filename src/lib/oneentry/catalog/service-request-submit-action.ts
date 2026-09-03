import type { FormDataType, IBodyPostFormData, IPostFormResponse } from 'oneentry/types';

import { readUserIdentifier } from '@/lib/oneentry/auth/browser-session';
import { loadFormModuleConfigId } from '@/lib/oneentry/forms/module-config';
import { getApiSafe, hasStoredSession, isError } from '@/lib/oneentry/index';
import { DEFAULT_LOCALE } from '@/lib/oneentry/locale';
import { se } from '@/lib/oneentry/server-errors';

const SERVICE_REQUEST_FORM = 'service_request';

// Fallback only — the id is resolved from the form itself, because a literal
// keeps compiling after the form is recreated in the admin panel and the write
// then fails with `400 Incorrect formIdentifier for provided config`.
const SERVICE_REQUEST_MODULE_CONFIG_FALLBACK = 4;

export interface SubmitServiceRequestInput {
  item: string;
  category: string;
  description: string;
  date: string;
  orderId?: number;
}

export type SubmitServiceRequestResult = { ok: true; id: number } | { ok: false; error: string };

/** Submit a new entry to the OE `service_request` form. */
export async function submitServiceRequestAction(
  input: SubmitServiceRequestInput,
): Promise<SubmitServiceRequestResult> {
  const api = getApiSafe();
  if (!api) return { ok: false, error: await se('oneEntryEnvNotConfigured') };
  // The SDK singleton carries the session installed by `reDefine()`.
  if (!hasStoredSession()) return { ok: false, error: await se('notAuthenticated') };
  const userIdentifier = readUserIdentifier();

  // OE date type wants a full date envelope, not a bare ISO string.
  const isoDate = input.date ? new Date(input.date).toISOString() : new Date().toISOString();
  const yyyy = isoDate.slice(0, 4);
  const mm = isoDate.slice(5, 7);
  const dd = isoDate.slice(8, 10);

  // `FormDataType`'s per-type members plus its catch-all `Record<string, unknown>` cover every envelope below.
  const formDataArray: FormDataType[] = [
    { marker: 'item', type: 'string', value: input.item },
    { marker: 'category', type: 'list', value: [input.category] },
    ...(input.description.trim().length >= 5
      ? [
          {
            marker: 'description',
            type: 'text',
            value: [
              {
                htmlValue: `<p>${input.description.replace(/</g, '&lt;')}</p>`,
                params: { isEditorDisabled: false, isImageCompressed: true },
              },
            ],
          },
        ]
      : []),
    {
      marker: 'date',
      type: 'date',
      value: {
        fullDate: isoDate,
        formattedValue: `${dd}/${mm}/${yyyy}`,
        formatString: 'dd/MM/yyyy',
      },
    },
    { marker: 'order_id', type: 'integer', value: input.orderId ?? 0 },
  ];

  try {
    // `postFormsData` internally wraps `formData` in `{ [langCode]: [...] }`.
    const body: IBodyPostFormData = {
      formIdentifier: SERVICE_REQUEST_FORM,
      formModuleConfigId: await loadFormModuleConfigId(
        SERVICE_REQUEST_FORM,
        DEFAULT_LOCALE,
        SERVICE_REQUEST_MODULE_CONFIG_FALLBACK,
      ),
      moduleEntityIdentifier: userIdentifier,
      replayTo: null,
      status: 'sent',
      formData: formDataArray,
    };
    const result = await api.FormData.postFormsData(body, DEFAULT_LOCALE);
    if (isError(result)) {
      return { ok: false, error: result.message ?? (await se('formSubmitFailed')) };
    }
    // `IPostFormResponse` declares `{ formData: { id, … } }`; the real API sometimes returns the record flat instead.
    const raw = result as Partial<IPostFormResponse> & { id?: number };
    const id = raw.formData?.id ?? raw.id ?? 0;
    return { ok: true, id };
  } catch (err) {
    return { ok: false, error: err instanceof Error ? err.message : await se('network') };
  }
}
