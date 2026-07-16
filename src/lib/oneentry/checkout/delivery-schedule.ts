import { unstable_cache } from 'next/cache';
import { getApi, isError } from '../index';
import { DEFAULT_LOCALE } from '../locale';
import type { Lang } from '../system-text';
import { REVALIDATE_STORES } from '../../isr';
import { DELIVERY_TIME_SLOTS } from '../../../app/data/checkoutConfig';

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
  // Preserve the legacy "skip Sundays" behaviour so a completely-empty OE
  // still produces the same date strip the storefront used to synthesise.
  disabledWeekdays: [0],
};

/** Marker triple per checkout variant. The `_guest` variant mirrors the
 *  authed form field-for-field — same attribute types on `forForms_*_guest`,
 *  every marker gets a `_guest` suffix (matches the OE admin convention
 *  used by `PaymentPage.tsx.delivery_date-time_guest` etc.).
 *
 *  `asetMarker` is the attribute-SET marker, not the form marker — the
 *  timeInterval config lives on the schema of the aset the form's built on
 *  (`Forms.getFormByMarker` strips schema `.value` down to a placeholder,
 *  so we hit `AttributesSets.getAttributesByMarker` instead). */
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

type RawHM = { hours?: number; minutes?: number };
type RawIntervalValue = {
  dates?: string[];
  times?: Array<[RawHM, RawHM]>;
  inEveryWeek?: boolean;
  inEveryMonth?: boolean;
  inEveryYears?: boolean;
};
type RawAttrSchema = {
  marker?: unknown;
  type?: unknown;
  value?: Array<{ values?: RawIntervalValue[] }>;
};

const pad = (n: number): string => (n < 10 ? `0${n}` : String(n));

/** Bucket the slot's start hour into a short prose subtitle so the picker
 *  keeps the "Morning / Afternoon / Evening" chip it always had. Falls back
 *  to an empty string when the admin picks an odd time (e.g. overnight) —
 *  the label alone still communicates the range. */
function slotSub(startHour: number): string {
  if (startHour < 12) return 'Morning';
  if (startHour < 17) return 'Afternoon';
  if (startHour < 22) return 'Evening';
  return '';
}

/** Turn the OE `dates: [startISO, endISO]` range into the set of weekdays
 *  actually covered (inclusive, using UTC to avoid TZ drift — admin encodes
 *  the range in UTC and `2026-07-20T00:00:00Z` should count as Monday for
 *  every visitor). */
function activeWeekdaysFromRange(dates: string[]): Set<number> {
  const out = new Set<number>();
  if (!Array.isArray(dates) || dates.length < 2) return out;
  const start = new Date(dates[0]);
  const end = new Date(dates[1]);
  if (Number.isNaN(start.getTime()) || Number.isNaN(end.getTime())) return out;
  if (end.getTime() < start.getTime()) return out;
  const cursor = new Date(start);
  // Cap the walk — a runaway range shouldn't hang the loader; 400 days is
  // plenty to cover any legitimate weekly-recurrence window (>13 months).
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
    // SDK types the response as `IAttributeSetsEntity[]`, but the payload is
    // a per-attribute schema list carrying the storefront-shaped `value`
    // field. Cast through `unknown` to the local raw type.
    const attrs = result as unknown as RawAttrSchema[];

    const dateAttr = attrs.find(
      (a) =>
        typeof a === 'object' && a !== null &&
        a.marker === spec.dateAttr &&
        a.type === 'timeInterval',
    );
    if (!dateAttr) return FALLBACK;

    // The admin editor stores at least one `values[]` row inside the outer
    // `value[]` wrapper. Take the first — a compound recurrence would need
    // richer UI on our end than a flat date strip supports anyway.
    const row = dateAttr.value?.[0]?.values?.[0];
    if (!row) return FALLBACK;

    // Time slots — each `times[i]` is `[startHM, endHM]`. Sort by start
    // time so the picker renders morning → evening even if the admin
    // reordered rows.
    const times: Array<[RawHM, RawHM]> = Array.isArray(row.times) ? row.times : [];
    const slots: DeliveryTimeSlot[] = times
      .map((pair, i): DeliveryTimeSlot | null => {
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

    // Date range → allowed weekdays. Admin's Mon–Fri range → {1..5}, so
    // disabledWeekdays = {0, 6}. Everything outside `active` is disabled.
    const active = activeWeekdaysFromRange(Array.isArray(row.dates) ? row.dates : []);
    const disabledWeekdays: number[] = active.size > 0
      ? [0, 1, 2, 3, 4, 5, 6].filter((d) => !active.has(d))
      : FALLBACK.disabledWeekdays;

    return {
      slots: slots.length > 0 ? slots : FALLBACK.slots,
      // OE's timeInterval is a recurrence rule, not a bounded date list.
      // The storefront still needs "N future days" for the strip UI —
      // keep the fallback count as the tunable knob until we surface it.
      daysAhead: FALLBACK.daysAhead,
      disabledWeekdays,
    };
  } catch {
    return FALLBACK;
  }
}

/**
 * Read the delivery-schedule config from OneEntry for a given checkout
 * variant. Structural shape on OE:
 *
 * - `authed` → attribute-set marker `checkout_home`, timeInterval attribute
 *   `delivery_date-time`.
 * - `guest`  → attribute-set marker `checkout_home_guest`, timeInterval
 *   attribute `delivery_date-time_guest`.
 *
 * The attribute's `value[0].values[0]` carries:
 *   - `dates: [startISO, endISO]` — availability window used to infer which
 *     weekdays are allowed (admin range Mon..Sat → we skip Sunday).
 *   - `times: [[startHM, endHM], …]` — one entry per delivery slot; label
 *     built from the times, subtitle bucketed by start hour.
 *
 * Falls back to the hardcoded 7-days / skip-Sun / three-slot config when
 * OE is unreachable, the attribute is missing, or the row is empty.
 */
export const loadDeliverySchedule = unstable_cache(
  async (variant: DeliveryScheduleVariant = 'authed', lang: Lang = DEFAULT_LOCALE): Promise<DeliverySchedule> => {
    return loadScheduleFor(variant, lang);
  },
  ['oe-delivery-schedule'],
  { revalidate: REVALIDATE_STORES, tags: ['oe-forms'] },
);

/** Build the calendar strip the picker renders: `daysAhead` future dates
 *  starting tomorrow, skipping any weekday in `disabledWeekdays`. Kept as a
 *  plain function (no `useMemo`) so it works identically in the server
 *  component and in unit tests. */
export function buildDeliveryDates(
  daysAhead: number,
  disabledWeekdays: number[],
  now: Date = new Date(),
): Date[] {
  const skip = new Set(disabledWeekdays);
  const out: Date[] = [];
  const cursor = new Date(now);
  cursor.setUTCDate(cursor.getUTCDate() + 1);
  let safety = daysAhead * 4 + 14;
  while (out.length < daysAhead && safety-- > 0) {
    // Compare against `getUTCDay()` because the disabled-weekday set was
    // derived from `activeWeekdaysFromRange` which walks the OE range in
    // UTC. Mixing `getDay()` (local TZ) here would misalign around the
    // day boundary for shoppers far from UTC — e.g. Vladivostok Sunday
    // 21:00 local reads UTC=Sunday but local=Monday.
    if (!skip.has(cursor.getUTCDay())) out.push(new Date(cursor));
    cursor.setUTCDate(cursor.getUTCDate() + 1);
  }
  return out;
}
