'use server';
import { cookies } from 'next/headers';

const ACCESS_COOKIE = 'oe_access';

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
  const url = process.env.ONEENTRY_URL;
  const appToken = process.env.ONEENTRY_TOKEN;
  if (!url || !appToken) return { ok: false, error: 'OneEntry env not configured' };

  const jar = await cookies();
  const access = jar.get(ACCESS_COOKIE)?.value;
  if (!access) return { ok: false, error: 'Not authenticated' };

  // OE date type wants a full date envelope, not a bare ISO string.
  const isoDate = input.date
    ? new Date(input.date).toISOString()
    : new Date().toISOString();
  const yyyy = isoDate.slice(0, 4);
  const mm = isoDate.slice(5, 7);
  const dd = isoDate.slice(8, 10);

  const formData = {
    en_US: [
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
    ],
  };

  try {
    const res = await fetch(`${url}/api/content/form-data`, {
      method: 'POST',
      headers: {
        'x-app-token': appToken,
        Authorization: `Bearer ${access}`,
        'content-type': 'application/json',
        accept: 'application/json',
      },
      body: JSON.stringify({
        formIdentifier: 'service_request',
        formData,
      }),
      cache: 'no-store',
    });
    const txt = await res.text();
    if (!res.ok) {
      let msg = `HTTP ${res.status}`;
      try {
        const data = JSON.parse(txt) as { message?: string };
        if (data?.message) msg = data.message;
      } catch { /* ignore */ }
      return { ok: false, error: msg };
    }
    let id = 0;
    try { id = (JSON.parse(txt) as { id?: number }).id ?? 0; } catch { /* ignore */ }
    return { ok: true, id };
  } catch (err) {
    return { ok: false, error: err instanceof Error ? err.message : 'Network error' };
  }
}
