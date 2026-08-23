import type { IFormByMarkerDataEntity } from 'oneentry/types';

import type { ServiceCategory, ServiceRequest, ServiceStatus } from '@/app/data/serviceData';
import { readUserIdentifier } from '@/lib/oneentry/auth/browser-session';
import { formDataValue } from '@/lib/oneentry/forms/form-data-entry';
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

// Keys are the OE `category` listTitles values; the map exists to absorb historical spellings rather than to translate.
const CATEGORY_MAP: Record<string, ServiceCategory> = {
  repair: 'repair',
  cleaning: 'cleaning',
  alteration: 'alteration',
  'sole-replacement': 'sole-replacement',
  restoration: 'other',
  other: 'other',
};

/** One `service_request` record: what the SDK declares, plus the two fields the endpoint returns but `IFormByMarkerDataEntity` does not name. */
type FormDataRecord = IFormByMarkerDataEntity & {
  createdDate?: string;
  statusIdentifier?: string;
};

const SERVICE_REQUEST_FORM_MODULE_CONFIG_ID = 4;

/** Read the service-maintenance requests the current user has submitted via the OE `service_request` form. */
export async function getServiceRequestsAction(): Promise<ServiceRequest[]> {
  const api = getApiSafe();
  if (!api) return [];
  const userIdentifier = readUserIdentifier();
  if (!userIdentifier) return [];

  try {
    // The SDK singleton carries the shopper's own token after `reDefine()`, so OE sees an authenticated read.
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
    const items: FormDataRecord[] = result.items ?? [];

    return items.map((r): ServiceRequest => {
      const get = (m: string): unknown => formDataValue(r.formData, m);
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
