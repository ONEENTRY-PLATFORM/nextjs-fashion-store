/** Turn a delivery-slot id into the `[fromISO, toISO]` pair OE's `timeInterval` attribute expects on the order. */

/** Legacy slot names from `DELIVERY_TIME_SLOTS`. */
const NAMED_WINDOWS: Record<string, [number, number]> = {
  morning: [9, 13],
  afternoon: [13, 17],
  evening: [17, 21],
};

const HHMM_RANGE = /^(\d{2})(\d{2})-(\d{2})(\d{2})$/;

const pad = (n: number) => String(n).padStart(2, '0');

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
