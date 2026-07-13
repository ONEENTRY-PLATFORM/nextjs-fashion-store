import { CURRENCY } from './seoData';

export interface Store {
  id: string;
  /** OneEntry numeric page id. Used as the `entity` value when placing a
   *  Store Pickup order — OE stores are represented as child pages under
   *  `stores`, and the checkout form field expects the numeric id, not the
   *  pageUrl slug. Only populated for stores that came from OE (mock fallback
   *  entries leave it undefined). */
  oeId?: number;
  name: string;
  city: string;
  address: string;
  postcode: string;
  phone: string;
  email: string;
  instagram: string;
  hours: { day: string; time: string }[];
  services: string[];
  image: string;
  mapUrl: string;
  isflagship: boolean;
  tag?: string;
}

/** Shared schema.org defaults used when building LocalBusiness JSON-LD.
 *  These are payment/currency/country defaults — not per-store data, so they
 *  stay local rather than coming from OE. */
export const STORE_SCHEMA_DEFAULTS = {
  currenciesAccepted: CURRENCY,
  paymentAccepted: 'Cash, Credit Card, Debit Card',
  priceRange: '££',
  addressCountry: 'GB',
} as const;

/** Mock store dataset — used as fallback by `loadStores()` while OE store
 *  pages are being filled in. Restored temporarily; once every OE store page
 *  has full attributes the fallback can be dropped again. */
export const STORES: Store[] = [
  {
    id: 'oxford-street',
    name: 'Oxford Street Flagship',
    city: 'London',
    address: '214 Oxford Street',
    postcode: 'W1C 1AX',
    phone: '+44 20 7946 0958',
    email: 'oxfordst@oneentryfashion.com',
    instagram: '@oneentry_oxfordst',
    hours: [
      { day: 'Mon – Sat', time: '9:00 – 21:00' },
      { day: 'Sunday', time: '11:00 – 18:00' },
      { day: 'Bank Holidays', time: '11:00 – 17:00' },
    ],
    services: ['Personal Styling', 'Click & Collect', 'Returns', 'Gift Wrapping', 'Alterations'],
    image: 'https://images.unsplash.com/photo-1750603247133-1fd1b4e4aca4?crop=entropy&cs=tinysrgb&fit=max&fm=jpg&w=800&q=80',
    mapUrl: 'https://maps.google.com/?q=214+Oxford+Street+London+W1C+1AX',
    isflagship: true,
    tag: 'FLAGSHIP',
  },
  {
    id: 'chelsea',
    name: 'Chelsea',
    city: 'London',
    address: "87 King's Road",
    postcode: 'SW3 4NX',
    phone: '+44 20 7946 0312',
    email: 'chelsea@oneentryfashion.com',
    instagram: '@oneentry_chelsea',
    hours: [
      { day: 'Mon – Sat', time: '10:00 – 19:00' },
      { day: 'Sunday', time: '11:00 – 17:00' },
    ],
    services: ['Personal Styling', 'Click & Collect', 'Returns', 'Gift Wrapping'],
    image: 'https://images.unsplash.com/photo-1765285333722-23780756fce1?crop=entropy&cs=tinysrgb&fit=max&fm=jpg&w=800&q=80',
    mapUrl: "https://maps.google.com/?q=87+Kings+Road+Chelsea+London+SW3+4NX",
    isflagship: false,
    tag: 'NEW',
  },
  {
    id: 'manchester',
    name: 'Manchester Spinningfields',
    city: 'Manchester',
    address: '3 Hardman Square',
    postcode: 'M3 3EB',
    phone: '+44 161 946 0247',
    email: 'manchester@oneentryfashion.com',
    instagram: '@oneentry_mcr',
    hours: [
      { day: 'Mon – Sat', time: '9:30 – 20:00' },
      { day: 'Sunday', time: '11:00 – 17:00' },
    ],
    services: ['Personal Styling', 'Click & Collect', 'Returns', 'Gift Wrapping'],
    image: 'https://images.unsplash.com/photo-1765603729821-804d347a3680?crop=entropy&cs=tinysrgb&fit=max&fm=jpg&w=800&q=80',
    mapUrl: 'https://maps.google.com/?q=3+Hardman+Square+Manchester+M3+3EB',
    isflagship: false,
  },
  {
    id: 'birmingham',
    name: 'Birmingham Bullring',
    city: 'Birmingham',
    address: '37 Upper Level, Bullring',
    postcode: 'B5 4BU',
    phone: '+44 121 946 0521',
    email: 'birmingham@oneentryfashion.com',
    instagram: '@oneentry_bham',
    hours: [
      { day: 'Mon – Sat', time: '9:00 – 20:00' },
      { day: 'Sunday', time: '11:00 – 17:00' },
    ],
    services: ['Click & Collect', 'Returns', 'Gift Wrapping'],
    image: 'https://images.unsplash.com/photo-1760942088467-f4647b261ab5?crop=entropy&cs=tinysrgb&fit=max&fm=jpg&w=800&q=80',
    mapUrl: 'https://maps.google.com/?q=Bullring+Birmingham+B5+4BU',
    isflagship: false,
  },
  {
    id: 'edinburgh',
    name: 'Edinburgh George Street',
    city: 'Edinburgh',
    address: '58 George Street',
    postcode: 'EH2 2LR',
    phone: '+44 131 946 0183',
    email: 'edinburgh@oneentryfashion.com',
    instagram: '@oneentry_edin',
    hours: [
      { day: 'Mon – Sat', time: '10:00 – 19:00' },
      { day: 'Sunday', time: '12:00 – 17:00' },
    ],
    services: ['Personal Styling', 'Click & Collect', 'Returns'],
    image: 'https://images.unsplash.com/photo-1769107805465-bfd41863f1a0?crop=entropy&cs=tinysrgb&fit=max&fm=jpg&w=800&q=80',
    mapUrl: 'https://maps.google.com/?q=58+George+Street+Edinburgh+EH2+2LR',
    isflagship: false,
  },
  {
    id: 'brighton',
    name: 'Brighton North Laine',
    city: 'Brighton',
    address: '22 Gardner Street',
    postcode: 'BN1 1UP',
    phone: '+44 1273 946 094',
    email: 'brighton@oneentryfashion.com',
    instagram: '@oneentry_brighton',
    hours: [
      { day: 'Mon – Sat', time: '10:00 – 18:30' },
      { day: 'Sunday', time: '11:00 – 17:00' },
    ],
    services: ['Click & Collect', 'Returns', 'Gift Wrapping'],
    image: 'https://images.unsplash.com/photo-1719418709598-e7af7b24a423?crop=entropy&cs=tinysrgb&fit=max&fm=jpg&w=800&q=80',
    mapUrl: 'https://maps.google.com/?q=22+Gardner+Street+Brighton+BN1+1UP',
    isflagship: false,
  },
];
