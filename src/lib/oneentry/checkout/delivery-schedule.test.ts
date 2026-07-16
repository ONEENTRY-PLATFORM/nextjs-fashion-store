import { beforeEach, describe, expect, it, vi } from 'vitest';

// unstable_cache is transparent in tests — invoke the wrapped fn directly.
vi.mock('next/cache', () => ({
  unstable_cache: (fn: (...args: unknown[]) => unknown) => fn,
}));

const getAttributesByMarker = vi.fn();

vi.mock('../index', () => ({
  getApi: () => ({ AttributesSets: { getAttributesByMarker } }),
  isError: (v: unknown) =>
    !!v && typeof v === 'object' && 'statusCode' in (v as Record<string, unknown>),
}));

const importFresh = async () => {
  vi.resetModules();
  return import('./delivery-schedule');
};

import { DELIVERY_TIME_SLOTS } from '../../../app/data/checkoutConfig';

// ── Helpers ───────────────────────────────────────────────────────────────────

type RawHM = { hours?: number; minutes?: number };
type RawIntervalValue = {
  dates?: string[];
  times?: Array<[RawHM, RawHM]>;
};

/** Build a minimal AttributesSets response for a given marker and attribute name. */
function makeAsetResponse(
  attrMarker: string,
  row: RawIntervalValue,
): unknown[] {
  return [
    {
      marker: attrMarker,
      type: 'timeInterval',
      value: [{ values: [row] }],
    },
  ];
}

/** Standard three-slot times payload used in the authed happy-path test. */
const THREE_TIMES: Array<[RawHM, RawHM]> = [
  [{ hours: 9, minutes: 0 }, { hours: 13, minutes: 0 }],
  [{ hours: 13, minutes: 0 }, { hours: 17, minutes: 0 }],
  [{ hours: 17, minutes: 0 }, { hours: 21, minutes: 0 }],
];

// Mon 2026-07-20 → Fri 2026-07-24  ⇒  active {1,2,3,4,5}  ⇒  disabled [0,6]
const DATES_MON_FRI = ['2026-07-20T00:00:00.000Z', '2026-07-24T00:00:00.000Z'];
// Mon 2026-07-20 → Sat 2026-07-25  ⇒  active {1,2,3,4,5,6}  ⇒  disabled [0]
const DATES_MON_SAT = ['2026-07-20T00:00:00.000Z', '2026-07-25T00:00:00.000Z'];

beforeEach(() => {
  getAttributesByMarker.mockReset();
});

// ─────────────────────────────────────────────────────────────────────────────
describe('loadDeliverySchedule — authed happy path', () => {
  it('maps three time slots and derives disabledWeekdays from Mon–Fri date range', async () => {
    getAttributesByMarker.mockResolvedValue(
      makeAsetResponse('delivery_date-time', { dates: DATES_MON_FRI, times: THREE_TIMES }),
    );
    const { loadDeliverySchedule } = await importFresh();
    const schedule = await loadDeliverySchedule('authed', 'en_US');

    expect(schedule.slots).toHaveLength(3);

    const ids = schedule.slots.map((s) => s.id);
    expect(ids).toEqual(['0900-1300', '1300-1700', '1700-2100']);

    const labels = schedule.slots.map((s) => s.label);
    expect(labels).toEqual(['09:00 – 13:00', '13:00 – 17:00', '17:00 – 21:00']);

    const subs = schedule.slots.map((s) => s.sub);
    expect(subs).toEqual(['Morning', 'Afternoon', 'Evening']);

    expect(schedule.disabledWeekdays).toEqual([0, 6]);
    expect(schedule.daysAhead).toBe(7);
  });

  it('calls getAttributesByMarker with the checkout_home marker', async () => {
    getAttributesByMarker.mockResolvedValue(
      makeAsetResponse('delivery_date-time', { dates: DATES_MON_FRI, times: THREE_TIMES }),
    );
    const { loadDeliverySchedule } = await importFresh();
    await loadDeliverySchedule('authed', 'en_US');

    expect(getAttributesByMarker).toHaveBeenCalledWith('checkout_home', 'en_US');
  });
});

// ─────────────────────────────────────────────────────────────────────────────
describe('loadDeliverySchedule — guest happy path', () => {
  it('maps guest marker and derives disabledWeekdays from Mon–Sat date range', async () => {
    getAttributesByMarker.mockResolvedValue(
      makeAsetResponse('delivery_date-time_guest', { dates: DATES_MON_SAT, times: THREE_TIMES }),
    );
    const { loadDeliverySchedule } = await importFresh();
    const schedule = await loadDeliverySchedule('guest', 'en_US');

    expect(schedule.disabledWeekdays).toEqual([0]);
    expect(schedule.slots).toHaveLength(3);
  });

  it('calls getAttributesByMarker with the checkout_home_guest marker', async () => {
    getAttributesByMarker.mockResolvedValue(
      makeAsetResponse('delivery_date-time_guest', { dates: DATES_MON_SAT, times: THREE_TIMES }),
    );
    const { loadDeliverySchedule } = await importFresh();
    await loadDeliverySchedule('guest', 'en_US');

    expect(getAttributesByMarker).toHaveBeenCalledWith('checkout_home_guest', 'en_US');
    expect(getAttributesByMarker).not.toHaveBeenCalledWith('checkout_home', expect.anything());
  });
});

// ─────────────────────────────────────────────────────────────────────────────
describe('loadDeliverySchedule — slot sub buckets', () => {
  it('returns sub="" for a slot whose start hour is 22 (outside Morning/Afternoon/Evening)', async () => {
    const times: Array<[RawHM, RawHM]> = [
      [{ hours: 22, minutes: 0 }, { hours: 23, minutes: 30 }],
    ];
    getAttributesByMarker.mockResolvedValue(
      makeAsetResponse('delivery_date-time', { dates: DATES_MON_FRI, times }),
    );
    const { loadDeliverySchedule } = await importFresh();
    const schedule = await loadDeliverySchedule('authed', 'en_US');

    expect(schedule.slots).toHaveLength(1);
    expect(schedule.slots[0].sub).toBe('');
    expect(schedule.slots[0].id).toBe('2200-2330');
  });
});

// ─────────────────────────────────────────────────────────────────────────────
describe('loadDeliverySchedule — malformed slot hours are skipped', () => {
  it('drops a slot with missing hours but keeps the valid ones', async () => {
    const times: Array<[RawHM, RawHM]> = [
      [{ hours: 9, minutes: 0 }, { hours: 13, minutes: 0 }],     // valid
      [{ minutes: 0 } as RawHM, { hours: 17, minutes: 0 }],       // missing start hours → skip
      [{ hours: 13, minutes: 0 }, { hours: 17, minutes: 0 }],     // valid
    ];
    getAttributesByMarker.mockResolvedValue(
      makeAsetResponse('delivery_date-time', { dates: DATES_MON_FRI, times }),
    );
    const { loadDeliverySchedule } = await importFresh();
    const schedule = await loadDeliverySchedule('authed', 'en_US');

    expect(schedule.slots).toHaveLength(2);
    expect(schedule.slots.map((s) => s.id)).toEqual(['0900-1300', '1300-1700']);
  });
});

// ─────────────────────────────────────────────────────────────────────────────
describe('loadDeliverySchedule — empty times array', () => {
  it('falls back to DELIVERY_TIME_SLOTS but still uses dates for disabledWeekdays', async () => {
    getAttributesByMarker.mockResolvedValue(
      makeAsetResponse('delivery_date-time', { dates: DATES_MON_FRI, times: [] }),
    );
    const { loadDeliverySchedule } = await importFresh();
    const schedule = await loadDeliverySchedule('authed', 'en_US');

    expect(schedule.slots).toEqual(DELIVERY_TIME_SLOTS);
    expect(schedule.disabledWeekdays).toEqual([0, 6]);
  });
});

// ─────────────────────────────────────────────────────────────────────────────
describe('loadDeliverySchedule — empty dates range', () => {
  it('falls back disabledWeekdays to [0] but still builds slots from times', async () => {
    getAttributesByMarker.mockResolvedValue(
      makeAsetResponse('delivery_date-time', { dates: [], times: THREE_TIMES }),
    );
    const { loadDeliverySchedule } = await importFresh();
    const schedule = await loadDeliverySchedule('authed', 'en_US');

    expect(schedule.disabledWeekdays).toEqual([0]);
    expect(schedule.slots).toHaveLength(3);
  });
});

// ─────────────────────────────────────────────────────────────────────────────
describe('loadDeliverySchedule — end < start in dates', () => {
  it('falls back disabledWeekdays to [0] when the date range is inverted', async () => {
    // end (Jul 20) < start (Jul 24)
    getAttributesByMarker.mockResolvedValue(
      makeAsetResponse('delivery_date-time', {
        dates: ['2026-07-24T00:00:00.000Z', '2026-07-20T00:00:00.000Z'],
        times: THREE_TIMES,
      }),
    );
    const { loadDeliverySchedule } = await importFresh();
    const schedule = await loadDeliverySchedule('authed', 'en_US');

    expect(schedule.disabledWeekdays).toEqual([0]);
  });
});

// ─────────────────────────────────────────────────────────────────────────────
describe('loadDeliverySchedule — missing attribute on aset', () => {
  it('returns full FALLBACK when the aset has no matching timeInterval attribute', async () => {
    // Return an aset response but with a different marker — attribute not found
    getAttributesByMarker.mockResolvedValue([
      { marker: 'some_other_attr', type: 'text', value: [] },
    ]);
    const { loadDeliverySchedule } = await importFresh();
    const schedule = await loadDeliverySchedule('authed', 'en_US');

    expect(schedule.slots).toEqual(DELIVERY_TIME_SLOTS);
    expect(schedule.daysAhead).toBe(7);
    expect(schedule.disabledWeekdays).toEqual([0]);
  });
});

// ─────────────────────────────────────────────────────────────────────────────
describe('loadDeliverySchedule — isError envelope', () => {
  it('returns full FALLBACK when OE responds with a statusCode error object', async () => {
    getAttributesByMarker.mockResolvedValue({ statusCode: 404, message: 'Not found' });
    const { loadDeliverySchedule } = await importFresh();
    const schedule = await loadDeliverySchedule('authed', 'en_US');

    expect(schedule.slots).toEqual(DELIVERY_TIME_SLOTS);
    expect(schedule.daysAhead).toBe(7);
    expect(schedule.disabledWeekdays).toEqual([0]);
  });
});

// ─────────────────────────────────────────────────────────────────────────────
describe('loadDeliverySchedule — SDK throws', () => {
  it('returns full FALLBACK when SDK rejects', async () => {
    getAttributesByMarker.mockRejectedValue(new Error('network timeout'));
    const { loadDeliverySchedule } = await importFresh();
    const schedule = await loadDeliverySchedule('authed', 'en_US');

    expect(schedule.slots).toEqual(DELIVERY_TIME_SLOTS);
    expect(schedule.daysAhead).toBe(7);
    expect(schedule.disabledWeekdays).toEqual([0]);
  });
});

// ─────────────────────────────────────────────────────────────────────────────
describe('buildDeliveryDates — happy path', () => {
  it('produces daysAhead dates starting tomorrow, skipping disabled weekdays', async () => {
    const { buildDeliveryDates } = await importFresh();

    // 2026-01-01 = Thursday (getDay() === 4)
    const now = new Date('2026-01-01T12:00:00Z');
    const dates = buildDeliveryDates(5, [0], now); // skip Sundays

    expect(dates).toHaveLength(5);

    // First date should be Fri 2026-01-02
    expect(dates[0].getUTCDate()).toBe(2);
    expect(dates[0].getUTCMonth()).toBe(0); // January

    // None of the dates should fall on a Sunday
    for (const d of dates) {
      expect(d.getDay()).not.toBe(0);
    }
  });
});

// ─────────────────────────────────────────────────────────────────────────────
describe('buildDeliveryDates — every weekday disabled', () => {
  it('returns an empty array without hanging when all 7 weekdays are disabled', async () => {
    const { buildDeliveryDates } = await importFresh();

    const now = new Date('2026-01-01T12:00:00Z');
    const dates = buildDeliveryDates(5, [0, 1, 2, 3, 4, 5, 6], now);

    expect(dates).toEqual([]);
  });
});

// ─────────────────────────────────────────────────────────────────────────────
describe('buildDeliveryDates — UTC timezone regression', () => {
  // 2026-01-01T21:00:00Z = Thursday UTC.
  // In +07:00 (Vladivostok) this moment is Friday local time.
  // The old `getDay()` / `setDate()` code would have used the HOST TZ when
  // the Node process ran with a non-UTC locale — causing Sundays to be
  // determined by local clock rather than UTC, misaligning the disabled set
  // that `activeWeekdaysFromRange` always derives in UTC.
  // The current implementation uses `getUTCDay()` / `setUTCDate` throughout,
  // so the result is identical regardless of where the server process runs.
  it('skips UTC Sundays regardless of local TZ — now=2026-01-01T21:00:00Z, daysAhead=3, disabledWeekdays=[0]', async () => {
    const { buildDeliveryDates } = await importFresh();

    // Thursday 21:00 UTC — in +07 this is already Friday 04:00.
    const now = new Date('2026-01-01T21:00:00Z');
    // daysAhead=3, skip UTC Sundays (0).
    const dates = buildDeliveryDates(3, [0], now);

    expect(dates).toHaveLength(3);

    // Cursor starts at next UTC day: 2026-01-02 (Friday UTC).
    // Dates in UTC: Jan 2 (Fri), Jan 3 (Sat), Jan 4 (Sun — SKIP), Jan 5 (Mon).
    // Expected: Jan 2, Jan 3, Jan 5.
    expect(dates[0].getUTCFullYear()).toBe(2026);
    expect(dates[0].getUTCMonth()).toBe(0);
    expect(dates[0].getUTCDate()).toBe(2);   // Friday UTC

    expect(dates[1].getUTCDate()).toBe(3);   // Saturday UTC

    // Jan 4 is Sunday UTC — must be skipped; next date is Jan 5 (Monday).
    expect(dates[2].getUTCDate()).toBe(5);   // Monday UTC

    // None of the returned dates should fall on a UTC Sunday.
    for (const d of dates) {
      expect(d.getUTCDay()).not.toBe(0);
    }
  });

  it('first cursor step is always +1 UTC day (not +1 local day)', async () => {
    const { buildDeliveryDates } = await importFresh();

    // 2026-01-01T23:30:00Z — still Thursday UTC, but Friday in UTC+01 and beyond.
    const now = new Date('2026-01-01T23:30:00Z');
    const dates = buildDeliveryDates(1, [], now); // no days disabled

    // The very first date must be 2026-01-02 UTC regardless of local TZ.
    expect(dates).toHaveLength(1);
    expect(dates[0].getUTCDate()).toBe(2);
    expect(dates[0].getUTCMonth()).toBe(0);
  });
});
