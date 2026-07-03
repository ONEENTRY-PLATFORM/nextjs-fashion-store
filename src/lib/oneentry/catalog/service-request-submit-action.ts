'use server';
import { cookies } from 'next/headers';
import { getUserApi, isError, isOneEntryEnabled } from '../index';

const ACCESS_COOKIE = 'oe_access';
const IDENTIFIER_COOKIE = 'oe_user';
const SERVICE_REQUEST_FORM_MODULE_CONFIG_ID = 4;

export interface SubmitServiceRequestInput {
  item: string;
  category: string;
  description: string;
  date: string;
  orderId?: number;
}

export type SubmitServiceRequestResult =
  | { ok: true; id: number }
  | { ok: false; error: string };

/**
 * Submit a new entry to the OE `service_request` form. Encodes each field with
 * its concrete OE form-data shape (list → array of value strings, text → array
 * of { htmlValue|plainValue, params }, date → object with fullDate /
 * formattedValue / formatString). The `order_id` attribute is `requiredValidator:
 * strict` on the OE side — pass 0 if no order context is available so the
 * request still reaches the server.
 */
export async function submitServiceRequestAction(
  input: SubmitServiceRequestInput,
): Promise<SubmitServiceRequestResult> {
  if (!isOneEntryEnabled) return { ok: false, error: 'OneEntry env not configured' };

  const jar = await cookies();
  const access = jar.get(ACCESS_COOKIE)?.value;
  if (!access) return { ok: false, error: 'Not authenticated' };
  const userIdentifier = jar.get(IDENTIFIER_COOKIE)?.value ?? '';

  const api = getUserApi(access);
  if (!api) return { ok: false, error: 'OneEntry SDK not initialised' };

  // OE date type wants a full date envelope, not a bare ISO string.
  const isoDate = input.date
    ? new Date(input.date).toISOString()
    : new Date().toISOString();
  const yyyy = isoDate.slice(0, 4);
  const mm = isoDate.slice(5, 7);
  const dd = isoDate.slice(8, 10);

  const formDataArray: unknown[] = [
    { marker: 'item', type: 'string', value: input.item },
    { marker: 'category', type: 'list', value: [input.category] },
    ...(input.description.trim().length >= 5
      ? [{
          marker: 'description',
          type: 'text',
          value: [{
            htmlValue: `<p>${input.description.replace(/</g, '&lt;')}</p>`,
            params: { isEditorDisabled: false, isImageCompressed: true },
          }],
        }]
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
    // SDK's postFormsData internally wraps `formData` in { [langCode]: [...] }
    // and typedefines `formData` as `FormDataType[]`. Our mixed shape is
    // structurally compatible but stricter typings would fight us — cast at
    // the boundary.
    const result = await api.FormData.postFormsData({
      formIdentifier: 'service_request',
      formModuleConfigId: SERVICE_REQUEST_FORM_MODULE_CONFIG_ID,
      moduleEntityIdentifier: userIdentifier,
      replayTo: null,
      status: 'sent',
      formData: formDataArray as unknown as Parameters<typeof api.FormData.postFormsData>[0]['formData'],
    }, 'en_US');
    if (isError(result)) {
      return { ok: false, error: result.message ?? 'Form submit failed' };
    }
    // Response shape: `{ formData: { id, ... } }` per SDK types, but real API
    // sometimes returns the record flat too. Handle both.
    const raw = result as unknown as {
      id?: number;
      formData?: { id?: number };
    };
    const id = raw.formData?.id ?? raw.id ?? 0;
    return { ok: true, id };
  } catch (err) {
    return { ok: false, error: err instanceof Error ? err.message : 'Network error' };
  }
}
