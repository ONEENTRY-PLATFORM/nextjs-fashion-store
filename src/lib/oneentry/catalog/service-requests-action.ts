'use server';
import { cookies } from 'next/headers';
import type {
  ServiceRequest,
  ServiceCategory,
  ServiceStatus,
} from '../../../app/data/serviceData';

const IDENTIFIER_COOKIE = 'oe_user';

const STATUS_MAP: Record<string, ServiceStatus> = {
  new: 'open',
  pending: 'open',
  in_progress: 'in-progress',
  'in-progress': 'in-progress',
  ready: 'ready',
  completed: 'completed',
  cancelled: 'cancelled',
};

const CATEGORY_MAP: Record<string, ServiceCategory> = {
  alteration: 'alteration',
  repair: 'repair',
  cleaning: 'cleaning',
  // OE form has 'sole-replacement' which the UI model doesn't — closest match is repair
  'sole-replacement': 'repair',
  restoration: 'restoration',
  other: 'other',
};

type FormDataAttr = { marker: string; type: string; value: unknown };
type FormDataRecord = {
  id: number;
  createdDate?: string;
  statusIdentifier?: string;
  formData?: FormDataAttr[];
};

/**
 * Read the service-maintenance requests the current user has submitted via the
 * OE `service_request` form (formModuleConfigId=4). Returns the same shape the
 * legacy `SERVICE_REQUESTS` mock used, so `ServiceMaintenanceSection` can swap
 * in this server action with no UI changes.
 *
 * Fields the OE form doesn't currently capture (cost, estimatedReady, ref
 * number, photo) fall back to sensible defaults — the admin can flesh them
 * out in the OE form definition later without breaking the page.
 */
export async function getServiceRequestsAction(): Promise<ServiceRequest[]> {
  const url = process.env.ONEENTRY_URL;
  const appToken = process.env.ONEENTRY_TOKEN;
  if (!url || !appToken) return [];
  const jar = await cookies();
  const cookieUser = jar.get(IDENTIFIER_COOKIE)?.value;
  if (!cookieUser) return [];
  const userIdentifier = decodeURIComponent(cookieUser);

  try {
    const res = await fetch(
      `${url}/api/content/form-data/marker/service_request?formModuleConfigId=4&isExtended=0&langCode=en_US&offset=0&limit=30`,
      {
        method: 'POST',
        headers: {
          'x-app-token': appToken,
          'content-type': 'application/json',
          accept: 'application/json',
        },
        body: JSON.stringify({ userIdentifier }),
        cache: 'no-store',
      },
    );
    if (!res.ok) return [];
    const data = (await res.json()) as { items?: FormDataRecord[] };
    const items = Array.isArray(data.items) ? data.items : [];

    return items.map((r): ServiceRequest => {
      const fd = Array.isArray(r.formData) ? r.formData : [];
      const get = (m: string): unknown =>
        fd.find((f) => f.marker === m)?.value;
      const item = String(get('item') ?? '');
      const categoryArr = get('category');
      const categoryRaw = Array.isArray(categoryArr)
        ? String(categoryArr[0] ?? '')
        : String(categoryArr ?? '');
      const descriptionRaw = get('description');
      // text-type values come back as { htmlValue, plainValue, params }
      let description = '';
      if (Array.isArray(descriptionRaw) && descriptionRaw[0]) {
        const v = descriptionRaw[0] as {
          plainValue?: unknown;
          htmlValue?: unknown;
        };
        description = String(v.plainValue ?? v.htmlValue ?? '');
      }
      const dateRaw = get('date') as
        | { fullDate?: string; formattedValue?: string }
        | undefined;
      const droppedOff = dateRaw?.formattedValue
        ? dateRaw.formattedValue
        : dateRaw?.fullDate
          ? new Date(dateRaw.fullDate).toLocaleDateString('en-GB', {
              day: '2-digit',
              month: 'short',
              year: 'numeric',
            })
          : r.createdDate
            ? new Date(r.createdDate).toLocaleDateString('en-GB', {
                day: '2-digit',
                month: 'short',
                year: 'numeric',
              })
            : '';
      return {
        id: `srv-${r.id}`,
        ref: `SVC-${String(r.id).padStart(5, '0')}`,
        category: CATEGORY_MAP[categoryRaw] ?? 'other',
        item,
        description,
        droppedOff,
        estimatedReady: null,
        status: STATUS_MAP[r.statusIdentifier ?? 'new'] ?? 'open',
        cost: null,
        notes: '',
        img: '/placeholder.svg',
      };
    });
  } catch {
    return [];
  }
}
