/**
 * Turn a delivery-slot id into the `[fromISO, toISO]` pair OE's `timeInterval`
 * attribute expects on the order.
 *
 * Two id shapes reach this function:
 *
 * - `HHMM-HHMM` (e.g. `0900-1300`) — what `loadDeliverySchedule` builds from the
 *   admin-configured `times[]`, so this is what production actually sends.
 * - `morning` / `afternoon` / `evening` — the hardcoded `DELIVERY_TIME_SLOTS`
 *   fallback, used when OE has no schedule (Storybook, bare unit tests).
 *
 * Anything unrecognised falls back to the morning window rather than throwing:
 * a mangled slot id should not cost the shopper their order.
 */

/** Legacy slot names from `DELIVERY_TIME_SLOTS`. */
const NAMED_WINDOWS: Record<string, [number, number]> = {
  morning: [9, 13],
  afternoon: [13, 17],
  evening: [17, 21],
};

const HHMM_RANGE = /^(\d{2})(\d{2})-(\d{2})(\d{2})$/;

const pad = (n: number) => String(n).padStart(2, '0');

/**
 * @param slotId - Slot id as stored in the delivery → payment handoff payload.
 * @param dayIso - The delivery day as `YYYY-MM-DD`.
 * @returns `[fromISO, toISO]`, both UTC instants on `dayIso`.
 */
export function slotWindow(slotId: string | undefined, dayIso: string): [string, string] {
  const at = (h: number, m: number) => `${dayIso}T${pad(h)}:${pad(m)}:00.000Z`;

  const range = slotId ? HHMM_RANGE.exec(slotId) : null;
  if (range) {
    const [, fromH, fromM, toH, toM] = range;
    return [at(Number(fromH), Number(fromM)), at(Number(toH), Number(toM))];
  }

  const [fromH, toH] = NAMED_WINDOWS[slotId ?? 'morning'] ?? NAMED_WINDOWS.morning;
  return [at(fromH, 0), at(toH, 0)];
}
