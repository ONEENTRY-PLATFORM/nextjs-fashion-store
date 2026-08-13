/* ── Checkout configuration data ── */

// Coupons were previously mocked here; live coupons now flow through OE `previewOrder` / `Discounts.getDiscountByMarker` (see CartContext.applyCoupon).

/** Shape of a pickup store as consumed by the delivery-step store picker. */
export interface PickupStore {
  id: string;
  oeId?: number;
  name: string;
  address: string;
  hours: string;
}

export const PICKUP_STORES: PickupStore[] = [
  {
    id: 's1',
    name: 'Kekimoro Oxford Street',
    address: '234 Oxford St, London W1C 1AP',
    hours: 'Mon–Sat 09:00–21:00, Sun 11:00–18:00',
  },
  {
    id: 's2',
    name: 'Kekimoro Covent Garden',
    address: '14 James St, London WC2E 8BT',
    hours: 'Mon–Sat 10:00–20:00, Sun 11:00–18:00',
  },
  {
    id: 's3',
    name: 'Kekimoro Canary Wharf',
    address: 'Jubilee Place, London E14 5NY',
    hours: 'Mon–Fri 08:00–21:00, Sat–Sun 10:00–19:00',
  },
];

/** One parcel-locker pick-up point. */
export interface ParcelLocker {
  /** OE page id; `null` only in the local fallback, which cannot be ordered against. */
  oeId: number | null;
  /** Locker name as authored in the admin panel. */
  name: string;
}

/** Dev/test fallback, rendered when OE hands down no lockers at all (Storybook, bare unit tests). */
export const PARCEL_LOCKERS: ParcelLocker[] = [
  { oeId: null, name: 'Paddington Station — Platform 8 Locker Hub' },
  { oeId: null, name: 'Victoria Coach Station — Main Hall' },
  { oeId: null, name: "King's Cross St Pancras — West Entrance" },
  { oeId: null, name: 'Waterloo Station — South Bank Exit' },
];

export const DELIVERY_TIME_SLOTS = [
  { id: 'morning', label: '09:00 – 13:00', sub: 'Morning' },
  { id: 'afternoon', label: '13:00 – 17:00', sub: 'Afternoon' },
  { id: 'evening', label: '17:00 – 21:00', sub: 'Evening' },
];

export const DELIVERY_PERKS = [
  { icon: '✓', text: 'Free delivery on all orders' },
  { icon: '✓', text: 'Partial purchase allowed' },
  { icon: '✓', text: 'In-home fitting available' },
];

export const PICKUP_PERKS = [
  { text: 'Free pickup' },
  { text: 'Fitting room available' },
  { text: 'Partial purchase allowed' },
];
