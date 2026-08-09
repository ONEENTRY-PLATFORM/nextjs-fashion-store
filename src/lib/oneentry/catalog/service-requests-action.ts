import type { ServiceCategory, ServiceRequest, ServiceStatus } from '@/app/data/serviceData';
import { readUserIdentifier } from '@/lib/oneentry/auth/browser-session';
import { getApiSafe, isError } from '@/lib/oneentry/index';
import { DEFAULT_LOCALE } from '@/lib/oneentry/locale';
import { logCaught } from '@/lib/oneentry/log';

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
  time?: string;
  statusIdentifier?: string;
  status?: string;
  formData?: FormDataAttr[];
};

const SERVICE_REQUEST_FORM_MODULE_CONFIG_ID = 4;

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
  const api = getApiSafe();
  if (!api) return [];
  const userIdentifier = readUserIdentifier();
  if (!userIdentifier) return [];

  try {
    // The SDK singleton carries the shopper's own token after `reDefine()`,
    // so OE sees an authenticated read — important because a tenant may
    // tighten the form-data read policy to require it, in which case the
    // app-token-only path would silently return `[]`.
    const result = await api.FormData.getFormsDataByMarker(
      'service_request',
      SERVICE_REQUEST_FORM_MODULE_CONFIG_ID,
      { userIdentifier },
      0,
      DEFAULT_LOCALE,
      0,
      30,
    );
    if (isError(result)) return [];
    // SDK typing uses `IFormByMarkerDataEntity` with a stricter formData
    // shape than what OE actually returns for a mixed form (list/date/text
    // fields). Narrow to the local `FormDataRecord` we already parse.
    const items = (result.items ?? []) as unknown as FormDataRecord[];

    return items.map((r): ServiceRequest => {
      const fd = Array.isArray(r.formData) ? r.formData : [];
      const get = (m: string): unknown => fd.find((f) => f.marker === m)?.value;
      const item = String(get('item') ?? '');
      const categoryArr = get('category');
      const categoryRaw = Array.isArray(categoryArr) ? String(categoryArr[0] ?? '') : String(categoryArr ?? '');
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
      const dateRaw = get('date') as { fullDate?: string; formattedValue?: string } | undefined;
      const createdRaw = r.createdDate ?? r.time;
      const droppedOff = dateRaw?.formattedValue
        ? dateRaw.formattedValue
        : dateRaw?.fullDate
          ? new Date(dateRaw.fullDate).toLocaleDateString('en-GB', {
              day: '2-digit',
              month: 'short',
              year: 'numeric',
            })
          : createdRaw
            ? new Date(createdRaw).toLocaleDateString('en-GB', {
                day: '2-digit',
                month: 'short',
                year: 'numeric',
              })
            : '';
      const statusRaw = r.statusIdentifier ?? r.status ?? 'new';
      return {
        id: `srv-${r.id}`,
        ref: `SVC-${String(r.id).padStart(5, '0')}`,
        category: CATEGORY_MAP[categoryRaw] ?? 'other',
        item,
        description,
        droppedOff,
        estimatedReady: null,
        status: STATUS_MAP[statusRaw] ?? 'open',
        cost: null,
        notes: '',
        img: '/icons/ui/bag-placeholder.svg',
      };
    });
  } catch (err) {
    logCaught('service-requests-action.getServiceRequestsAction', err);
    return [];
  }
}
