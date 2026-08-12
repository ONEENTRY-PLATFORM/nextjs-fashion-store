import { describe, expect, it } from 'vitest';

import { slotWindow } from '@/lib/oneentry/checkout/slot-window';

const DAY = '2026-08-13';

describe('slotWindow', () => {
  it('decodes the HHMM-HHMM ids that loadDeliverySchedule produces', () => {
    expect(slotWindow('1700-2100', DAY)).toEqual(['2026-08-13T17:00:00.000Z', '2026-08-13T21:00:00.000Z']);
  });

  it('keeps the minutes of a non-hourly window', () => {
    expect(slotWindow('0930-1245', DAY)).toEqual(['2026-08-13T09:30:00.000Z', '2026-08-13T12:45:00.000Z']);
  });

  it('still understands the legacy DELIVERY_TIME_SLOTS ids', () => {
    expect(slotWindow('afternoon', DAY)).toEqual(['2026-08-13T13:00:00.000Z', '2026-08-13T17:00:00.000Z']);
    expect(slotWindow('evening', DAY)).toEqual(['2026-08-13T17:00:00.000Z', '2026-08-13T21:00:00.000Z']);
  });

  it('falls back to the morning window for an unknown or missing id', () => {
    const morning = ['2026-08-13T09:00:00.000Z', '2026-08-13T13:00:00.000Z'];
    expect(slotWindow(undefined, DAY)).toEqual(morning);
    expect(slotWindow('whenever', DAY)).toEqual(morning);
  });
});
