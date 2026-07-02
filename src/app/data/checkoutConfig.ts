/* ── Checkout configuration data ── */

export const CHECKOUT_COUPONS: Record<string, { label: string; pct: number }> = {
  Kekimoro10: { label: '10% off', pct: 10 },
  SAVE10:     { label: '10% off', pct: 10 },
  Kekimoro20: { label: '20% off', pct: 20 },
  SUMMER15:   { label: '15% off', pct: 15 },
  WELCOME25:  { label: '25% off', pct: 25 },
};

export const PICKUP_STORES = [
  { id: 's1', name: 'Kekimoro Oxford Street',  address: '234 Oxford St, London W1C 1AP',    hours: 'Mon–Sat 09:00–21:00, Sun 11:00–18:00' },
  { id: 's2', name: 'Kekimoro Covent Garden',  address: '14 James St, London WC2E 8BT',     hours: 'Mon–Sat 10:00–20:00, Sun 11:00–18:00' },
  { id: 's3', name: 'Kekimoro Canary Wharf',   address: 'Jubilee Place, London E14 5NY',    hours: 'Mon–Fri 08:00–21:00, Sat–Sun 10:00–19:00' },
];

export const PARCEL_LOCKERS = [
  'Paddington Station — Platform 8 Locker Hub',
  'Victoria Coach Station — Main Hall',
  "King's Cross St Pancras — West Entrance",
  'Waterloo Station — South Bank Exit',
];

export const DELIVERY_TIME_SLOTS = [
  { id: 'morning',   label: '09:00 – 13:00', sub: 'Morning' },
  { id: 'afternoon', label: '13:00 – 17:00', sub: 'Afternoon' },
  { id: 'evening',   label: '17:00 – 21:00', sub: 'Evening' },
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
