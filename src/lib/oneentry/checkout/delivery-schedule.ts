import { unstable_cache } from 'next/cache';
import { isTimeIntervalAttribute } from 'oneentry';
import type { IAttributeValue, ITimeIntervalPoint } from 'oneentry/types';

import { DELIVERY_TIME_SLOTS } from '@/app/data/checkoutConfig';
import { REVALIDATE_STORES } from '@/lib/isr';
import { currentCmsLocale } from '@/lib/oneentry/current-locale';
import { getApi, isError } from '@/lib/oneentry/index';
import type { Lang } from '@/lib/oneentry/system-text';

export interface DeliveryTimeSlot {
  id: string;
  label: string;
  sub: string;
}

export interface DeliverySchedule {
  slots: DeliveryTimeSlot[];
  /** How many future dates to offer (excluding disabled weekdays). */
  daysAhead: number;
  /** Weekdays that should never be offered — 0 = Sunday … 6 = Saturday. */
  disabledWeekdays: number[];
}

const FALLBACK: DeliverySchedule = {
  slots: DELIVERY_TIME_SLOTS,
  daysAhead: 7,
  // Preserve the legacy "skip Sundays" behaviour so a completely-empty OE still produces the same date strip the storefront used to synthesise.
  disabledWeekdays: [0],
};

/** Marker triple per checkout variant. */
const MARKERS = {
  authed: {
    asetMarker: 'checkout_home',
    dateAttr: 'delivery_date-time',
  },
  guest: {
    asetMarker: 'checkout_home_guest',
    dateAttr: 'delivery_date-time_guest',
  },
} as const;

export type DeliveryScheduleVariant = keyof typeof MARKERS;

/** The attribute-schema row `getAttributesByMarker` returns: an `IAttributeValue` that also names its marker. */
type MarkedAttribute = IAttributeValue & { marker?: unknown };

const pad = (n: number): string => (n < 10 ? `0${n}` : String(n));

/** Bucket the slot's start hour into a short prose subtitle so the picker keeps the "Morning / Afternoon / Evening" chip it always had. */
function slotSub(startHour: number): string {
  if (startHour < 12) return 'Morning';
  if (startHour < 17) return 'Afternoon';
  if (startHour < 22) return 'Evening';
  return '';
}

/** Turn the OE `dates: [startISO, endISO]` range into the set of weekdays actually covered. */
function activeWeekdaysFromRange(dates: string[]): Set<number> {
  const out = new Set<number>();
  if (!Array.isArray(dates) || dates.length < 2) return out;
  const start = new Date(dates[0]);
  const end = new Date(dates[1]);
  if (Number.isNaN(start.getTime()) || Number.isNaN(end.getTime())) return out;
  if (end.getTime() < start.getTime()) return out;
  const cursor = new Date(start);
  // Cap the walk — a runaway range shouldn't hang the loader; 400 days is plenty to cover any legitimate weekly-recurrence window (>13 months).
  let safety = 400;
  while (cursor.getTime() <= end.getTime() && safety-- > 0) {
    out.add(cursor.getUTCDay());
    cursor.setUTCDate(cursor.getUTCDate() + 1);
    if (out.size === 7) break;
  }
  return out;
}

async function loadScheduleFor(variant: DeliveryScheduleVariant, lang: Lang): Promise<DeliverySchedule> {
  const spec = MARKERS[variant];
  try {
    const result = await getApi().AttributesSets.getAttributesByMarker(spec.asetMarker, lang);
    if (isError(result) || !Array.isArray(result)) return FALLBACK;
    // SDK types the response as `IAttributeSetsEntity[]`, but the payload is a per-attribute schema list carrying the storefront-shaped `value` field.
    const attrs = result as unknown as MarkedAttribute[];

    const dateAttr = attrs.find((a) => typeof a === 'object' && a !== null && a.marker === spec.dateAttr);
    // The SDK's guard is the `type === 'timeInterval'` check, and it types `value` as the schedule groups.
    if (!isTimeIntervalAttribute(dateAttr)) return FALLBACK;

    // The admin editor stores at least one `values[]` row inside the outer `value[]` wrapper.
    const row = dateAttr.value?.[0]?.values?.[0];
    if (!row) return FALLBACK;

    // Time slots — each `times[i]` is `[startHM, endHM]`. Sort by start time so the picker renders morning → evening even if the admin reordered rows.
    const times: ITimeIntervalPoint[][] = Array.isArray(row.times) ? row.times : [];
    const slots: DeliveryTimeSlot[] = times
      .map((pair): DeliveryTimeSlot | null => {
        if (!Array.isArray(pair) || pair.length < 2) return null;
        const [a, b] = pair;
        const ah = typeof a?.hours === 'number' ? a.hours : NaN;
        const am = typeof a?.minutes === 'number' ? a.minutes : 0;
        const bh = typeof b?.hours === 'number' ? b.hours : NaN;
        const bm = typeof b?.minutes === 'number' ? b.minutes : 0;
        if (!Number.isFinite(ah) || !Number.isFinite(bh)) return null;
        const startStr = `${pad(ah)}:${pad(am)}`;
        const endStr = `${pad(bh)}:${pad(bm)}`;
        return {
          id: `${startStr}-${endStr}`.replace(/:/g, ''),
          label: `${startStr} – ${endStr}`,
          sub: slotSub(ah),
        };
      })
      .filter((s): s is DeliveryTimeSlot => s !== null)
      .sort((a, b) => a.label.localeCompare(b.label));

    // Date range → allowed weekdays.
    const active = activeWeekdaysFromRange(Array.isArray(row.dates) ? row.dates : []);
    const disabledWeekdays: number[] =
      active.size > 0 ? [0, 1, 2, 3, 4, 5, 6].filter((d) => !active.has(d)) : FALLBACK.disabledWeekdays;

    return {
      slots: slots.length > 0 ? slots : FALLBACK.slots,
      // OE's timeInterval is a recurrence rule, not a bounded date list.
      daysAhead: FALLBACK.daysAhead,
      disabledWeekdays,
    };
  } catch {
    return FALLBACK;
  }
}

/** Read the delivery-schedule config from OneEntry for a given checkout variant. `lang` is an explicit argument so it forms part of the `unstable_cache` key. */
const loadDeliveryScheduleCached = unstable_cache(
  async (variant: DeliveryScheduleVariant, lang: Lang): Promise<DeliverySchedule> => loadScheduleFor(variant, lang),
  ['oe-delivery-schedule'],
  { revalidate: REVALIDATE_STORES, tags: ['oe-forms'] },
);

/** Delivery schedule for the current route's locale. */
export async function loadDeliverySchedule(
  variant: DeliveryScheduleVariant = 'authed',
  langArg?: Lang,
): Promise<DeliverySchedule> {
  return loadDeliveryScheduleCached(variant, langArg ?? (await currentCmsLocale()));
}

/** Build the calendar strip the picker renders: `daysAhead` future dates starting tomorrow, skipping any weekday in `disabledWeekdays`. Kept as a plain function (no `useMemo`) so it works identically in the server component and in unit tests. */
export function buildDeliveryDates(daysAhead: number, disabledWeekdays: number[], now: Date = new Date()): Date[] {
  const skip = new Set(disabledWeekdays);
  const out: Date[] = [];
  const cursor = new Date(now);
  cursor.setUTCDate(cursor.getUTCDate() + 1);
  let safety = daysAhead * 4 + 14;
  while (out.length < daysAhead && safety-- > 0) {
    // Compare against `getUTCDay()` because the disabled-weekday set was derived from `activeWeekdaysFromRange` which walks the OE range in UTC.
    if (!skip.has(cursor.getUTCDay())) out.push(new Date(cursor));
    cursor.setUTCDate(cursor.getUTCDate() + 1);
  }
  return out;
}
