// ── User Dataset ──────────────────────────────────────────────────────────────
// Single source of user data for My Data and related sections.
// When integrating with the real API, replace the values with data from the server response.

export type LoyaltyStatus = 'Bronze' | 'Silver' | 'Gold' | 'Platinum';
export type Gender = 'female' | 'male';

interface UserProfile {
  firstName: string;
  email: string;
  phone: string;
  /** ISO date string YYYY-MM-DD */
  dob: string;
  gender: Gender;
  shoeSize: string;
  clothingSize: string;
}

export interface LoyaltyCard {
  cardNumber: string;
  status: LoyaltyStatus;
  /** Discount percentage (e.g. 10 = 10%) */
  discount: number;
  bonuses: number;
  totalPurchases: number;
  nextLevelAmount: number;
}

export interface UserAddress {
  id: string;
  /** Display label: "Home", "Office", etc. */
  name: string;
  /** Formatted one-line display string */
  full: string;
  /** Structured fields for delivery form */
  fullName: string;
  phone: string;
  line1: string;
  city: string;
  postcode: string;
  instructions?: string;
}

interface SocialConnection {
  id: string;
  name: string;
  connected: boolean;
}

interface BonusTransaction {
  date: string;
  desc: string;
  /** Formatted string, e.g. "+3,690" or "−500" */
  pts: string;
  /** 1 = earned, -1 = redeemed */
  sign: 1 | -1;
}


type OrderStatus = 'Delivered' | 'Processing' | 'Cancelled';

interface UserOrderItem {
  name: string;
  size: string;
  color: string;
  qty: number;
  price: number;
  img: string;
}

export interface UserOrder {
  id: string;
  /** Human-readable date, e.g. "12 Feb 2026" */
  date: string;
  status: OrderStatus;
  items: number;
  total: number;
  image: string;
  orderItems: UserOrderItem[];
  trackingNo?: string | null;
  estimatedDelivery?: string;
}

export interface WishlistItem {
  id: string;
  name: string;
  brand: string;
  price: number;
  originalPrice?: number;
  image: string;
  /** Hex colour values */
  colors: string[];
  sizes: string[];
}

export type HistoryOrderStatus = 'delivered' | 'shipped' | 'processing' | 'cancelled' | 'returned';

interface HistoryOrderItem {
  name: string;
  size: string;
  color: string;
  qty: number;
  price: number;
  img: string;
}

export interface HistoryOrder {
  id: string;
  orderNo: string;
  date: string;
  status: HistoryOrderStatus;
  total: number;
  itemCount: number;
  trackingNo: string | null;
  items: HistoryOrderItem[];
}

export type WaitingStockStatus = 'out_of_stock' | 'low_stock' | 'back_in_stock';

export interface WaitingItem {
  id: string;
  name: string;
  brand: string;
  price: number;
  img: string;
  size: string;
  color: string;
  status: WaitingStockStatus;
  /** Whether the user has email/push notifications enabled for this item */
  notify: boolean;
  addedDate: string;
}

interface ReferralStats {
  friendsInvited: number;
  ordersPlaced: number;
  creditsEarned: string;
}

interface ReferralData {
  /** Base URL — referral code is appended: linkBase + code */
  linkBase: string;
  /** Credit amount awarded to both referrer and referee (in $) */
  creditAmount: number;
  stats: ReferralStats;
  /** Minimum first purchase amount to unlock credit */
  minPurchase: number;
  /** Credit expiry in months */
  creditExpiryMonths: number;
}

interface UserCredentials {
  email: string;
  /** Plain-text for mock — replace with hashed token when connecting real API */
  password: string;
}

interface UserSubscriptions {
  emailNewsletter: boolean;
  smsNotifications: boolean;
  pushNotifications: boolean;
  orderUpdates: boolean;
  newArrivals: boolean;
  saleAlerts: boolean;
  loyaltyUpdates: boolean;
}

export interface UserDataset {
  credentials: UserCredentials;
  profile: UserProfile;
  loyalty: LoyaltyCard;
  addresses: UserAddress[];
  socials: SocialConnection[];
  orders: UserOrder[];
  bonusHistory: BonusTransaction[];
  purchaseHistory: HistoryOrder[];
  wishlist: WishlistItem[];
  waitingList: WaitingItem[];
  referral: ReferralData;
  subscriptions: UserSubscriptions;
  /** Data & Consent toggles */
  consent: {
    dataProcessing: boolean;
    crossBorder: boolean;
  };
  /**
   * JWT access token, populated after a successful Platform login. `null`
   * means the playground is in mock-only / unauthenticated mode and
   * RTK Query slices should be skipped.
   */
  authToken?: string | null;
  /** JWT refresh token; reserved for future refresh-on-401 flow. */
  refreshToken?: string | null;
  /** Platform identifier of the logged-in user (e.g. "seed-demo-user-active-1"). */
  userIdentifier?: string | null;
}

// ── Dataset ───────────────────────────────────────────────────────────────────

export const USER_DATASET: UserDataset = {
  credentials: {
    email: 'test@test.com',
    password: '111',
  },
  profile: {
    firstName: 'Jane',
    email: 'test@test.com',
    phone: '+44 20 7946 0958',
    dob: '1993-06-15',
    gender: 'female',
    shoeSize: '38',
    clothingSize: 'S',
  },

  loyalty: {
    cardNumber: '105193386',
    status: 'Silver',
    discount: 10,
    bonuses: 1240,
    totalPurchases: 1240,
    nextLevelAmount: 2500,
  },

  addresses: [
    {
      id: 'a1',
      name: 'Home',
      fullName: 'Jane Smith',
      phone: '+44 20 7946 0958',
      line1: '14 Baker Street',
      city: 'London',
      postcode: 'W1U 3BW',
      instructions: '',
      full: 'Jane Smith · 14 Baker Street, London W1U 3BW · +44 20 7946 0958',
    },
    {
      id: 'a2',
      name: 'Office',
      fullName: 'Jane Smith',
      phone: '+44 20 7946 0958',
      line1: '100 Oxford Street',
      city: 'London',
      postcode: 'W1D 1LL',
      instructions: '',
      full: 'Jane Smith · 100 Oxford Street, London W1D 1LL · +44 20 7946 0958',
    },
  ],

  socials: [
    { id: 'google',   name: 'Google',   connected: true  },
    { id: 'apple',    name: 'Apple',    connected: false },
    { id: 'facebook', name: 'Facebook', connected: true  },
  ],

  orders: [
    {
      id: 'OE-A7F2K3',
      date: '12 Feb 2026',
      status: 'Delivered',
      items: 3,
      total: 368.99,
      image: 'https://images.unsplash.com/photo-1745962978498-13fac949e357?w=80&h=100&fit=crop',
      trackingNo: 'AU9281746350',
      estimatedDelivery: 'Delivered 15 Feb 2026',
      orderItems: [
        { name: 'Wool Double-Breasted Coat', size: 'S', color: 'Camel', qty: 1, price: 189.00, img: 'https://images.unsplash.com/photo-1745962978498-13fac949e357?w=200&q=80' },
        { name: 'Ribbed Knit Midi Dress',   size: 'XS', color: 'Blush', qty: 1, price: 89.99, img: 'https://images.unsplash.com/photo-1539109136881-3be0616acf4b?w=200&q=80' },
        { name: 'Leather Belt',             size: 'M',  color: 'Black', qty: 1, price: 90.00, img: 'https://images.unsplash.com/photo-1553062407-98eeb64c6a62?w=200&q=80' },
      ],
    },
    {
      id: 'OE-B9X1Q5',
      date: '28 Jan 2026',
      status: 'Processing',
      items: 1,
      total: 119.00,
      image: 'https://images.unsplash.com/photo-1574859154521-4f7aa07d91b9?w=80&h=100&fit=crop',
      trackingNo: null,
      estimatedDelivery: 'Est. delivery 3–5 Feb 2026',
      orderItems: [
        { name: 'Oversized Blazer', size: 'M', color: 'Ivory', qty: 1, price: 119.00, img: 'https://images.unsplash.com/photo-1574859154521-4f7aa07d91b9?w=200&q=80' },
      ],
    },
    {
      id: 'OE-C4M7R2',
      date: '05 Jan 2026',
      status: 'Delivered',
      items: 2,
      total: 248.00,
      image: 'https://images.unsplash.com/photo-1711113456820-639918258722?w=80&h=100&fit=crop',
      trackingNo: 'AU7761930284',
      estimatedDelivery: 'Delivered 9 Jan 2026',
      orderItems: [
        { name: 'Satin Midi Skirt',       size: 'XS', color: 'Champagne', qty: 1, price: 139.00, img: 'https://images.unsplash.com/photo-1711113456820-639918258722?w=200&q=80' },
        { name: 'Cotton Turtleneck Top',  size: 'S',  color: 'Cream',     qty: 1, price: 109.00, img: 'https://images.unsplash.com/photo-1583496661160-fb5218571b79?w=200&q=80' },
      ],
    },
  ],

  wishlist: [
    {
      id: 'wc-16',
      name: 'Classic Trench Coat',
      brand: 'Mango',
      price: 199.99,
      image: 'https://images.unsplash.com/photo-1763457990282-12c03d39bfb7?crop=entropy&cs=tinysrgb&fit=max&fm=jpg&ixid=M3w3Nzg4Nzd8MHwxfHNlYXJjaHwxfHx3b21lbiUyMHRyZW5jaCUyMGNvYXQlMjBzdHJlZXQlMjBmYXNoaW9ufGVufDF8fHx8MTc3MTQ5MzA3N3ww&ixlib=rb-4.1.0&q=80&w=1080',
      colors: ['#C4A882', '#000000', '#808080'],
      sizes: ['XS', 'S', 'M', 'L', 'XL'],
    },
    {
      id: 'wc-4',
      name: 'Oversized Double-Breasted Blazer',
      brand: 'ONEENTRY',
      price: 129.99,
      image: 'https://images.unsplash.com/photo-1752794674474-c0bf53a1ece0?crop=entropy&cs=tinysrgb&fit=max&fm=jpg&ixid=M3w3Nzg4Nzd8MHwxfHNlYXJjaHwxfHx3b21lbiUyMGJsYXplciUyMGNvYXQlMjBvdXRlcndlYXIlMjBmYXNoaW9ufGVufDF8fHx8MTc3MTQ5MzA2OXww&ixlib=rb-4.1.0&q=80&w=1080',
      colors: ['#000000', '#808080', '#C4A882'],
      sizes: ['XS', 'S', 'M', 'L', 'XL'],
    },
    {
      id: 'wc-12',
      name: 'Floral Print Wrap Dress',
      brand: 'ONEENTRY',
      price: 55.00,
      image: 'https://images.unsplash.com/photo-1762777777722-3242a1f1c575?crop=entropy&cs=tinysrgb&fit=max&fm=jpg&ixid=M3w3Nzg4Nzd8MHwxfHNlYXJjaHwxfHx3b21lbiUyMGZsb3JhbCUyMGRyZXNzJTIwc3ByaW5nJTIwZmFzaGlvbnxlbnwxfHx8fDE3NzE0OTMwNzV8MA&ixlib=rb-4.1.0&q=80&w=1080',
      colors: ['#FF6B6B', '#4169E1', '#2E8B57'],
      sizes: ['XS', 'S', 'M', 'L', 'XL'],
    },
  ],

  purchaseHistory: [
    {
      id: 'o1', orderNo: 'OE-209341', date: '24 Feb 2026', status: 'delivered', total: 184.90, itemCount: 2, trackingNo: 'AU9281746350',
      items: [
        { name: 'Ribbed Knit Midi Dress',   size: 'XS', color: 'Blush',  qty: 1, price: 89.95, img: 'https://images.unsplash.com/photo-1539109136881-3be0616acf4b?w=200&q=80' },
        { name: 'Linen Wide-Leg Trousers',  size: 'S',  color: 'Ivory',  qty: 1, price: 74.00, img: 'https://images.unsplash.com/photo-1594938298603-c8148c4dae35?w=200&q=80' },
      ],
    },
    {
      id: 'o2', orderNo: 'OE-198822', date: '10 Feb 2026', status: 'returned', total: 129.00, itemCount: 1, trackingNo: 'AU8827364011',
      items: [
        { name: 'Oversized Blazer', size: 'M', color: 'Camel', qty: 1, price: 129.00, img: 'https://images.unsplash.com/photo-1591047139829-d91aecb6caea?w=200&q=80' },
      ],
    },
    {
      id: 'o3', orderNo: 'OE-187560', date: '28 Jan 2026', status: 'shipped', total: 239.85, itemCount: 3, trackingNo: 'AU7761930284',
      items: [
        { name: 'Satin Slip Skirt',  size: 'XS', color: 'Champagne',   qty: 1, price: 59.95, img: 'https://images.unsplash.com/photo-1583496661160-fb5218571b79?w=200&q=80' },
        { name: 'Cotton Crop Tee',   size: 'S',  color: 'White',       qty: 2, price: 34.95, img: 'https://images.unsplash.com/photo-1523381210434-271e8be1f52b?w=200&q=80' },
        { name: 'Denim Mini Skirt',  size: 'XS', color: 'Light Wash',  qty: 1, price: 65.00, img: 'https://images.unsplash.com/photo-1542272604-787c3835535d?w=200&q=80' },
      ],
    },
    {
      id: 'o4', orderNo: 'OE-175003', date: '5 Jan 2026', status: 'cancelled', total: 94.95, itemCount: 1, trackingNo: null,
      items: [
        { name: 'Floral Wrap Dress', size: 'S', color: 'Multicolour', qty: 1, price: 94.95, img: 'https://images.unsplash.com/photo-1572804013427-4d7ca7268217?w=200&q=80' },
      ],
    },
    {
      id: 'o5', orderNo: 'OE-161447', date: '18 Dec 2025', status: 'delivered', total: 319.80, itemCount: 4, trackingNo: 'AU6643820177',
      items: [
        { name: 'Cashmere Knit Sweater', size: 'M',        color: 'Oatmeal', qty: 1, price: 149.00, img: 'https://images.unsplash.com/photo-1576566588028-4147f3842f27?w=200&q=80' },
        { name: 'Tailored Trench Coat',  size: 'S',        color: 'Beige',   qty: 1, price: 129.00, img: 'https://images.unsplash.com/photo-1548624313-0396a75d2462?w=200&q=80' },
        { name: 'Silk Scarf',            size: 'One Size', color: 'Ivory',   qty: 2, price: 20.90,  img: 'https://images.unsplash.com/photo-1601924994987-69e26d50dc26?w=200&q=80' },
      ],
    },
  ],

  bonusHistory: [
    { date: '12 Feb 2026', desc: 'Order OE-A7F2K3',      pts: '+3,690', sign:  1 },
    { date: '28 Jan 2026', desc: 'Order OE-B9X1Q5',      pts: '+1,190', sign:  1 },
    { date: '05 Jan 2026', desc: 'Redeemed for discount', pts: '−500',   sign: -1 },
  ],

  waitingList: [
    { id: 'wc-oos-1', name: 'Velvet Midi Skirt',            brand: 'ONEENTRY', price: 79.99,  img: 'https://images.unsplash.com/photo-1585487000160-6ebcfceb0d03?crop=entropy&cs=tinysrgb&fit=max&fm=jpg&q=80&w=1080',  size: 'S',  color: 'Burgundy', status: 'out_of_stock',  notify: true,  addedDate: '12 Jan 2026' },
    { id: 'wc-oos-2', name: 'Sheer Organza Blouse',         brand: 'ONEENTRY', price: 54.99,  img: 'https://images.unsplash.com/photo-1434389677669-e08b4cac3105?crop=entropy&cs=tinysrgb&fit=max&fm=jpg&q=80&w=1080',  size: 'XS', color: 'White',    status: 'out_of_stock',  notify: true,  addedDate: '28 Jan 2026' },
    { id: 'wc-7',     name: 'Pleated Midi Skirt',           brand: 'ONEENTRY', price: 49.99,  img: 'https://images.unsplash.com/photo-1685953851497-9b67b25f0ed7?crop=entropy&cs=tinysrgb&fit=max&fm=jpg&ixid=M3w3Nzg4Nzd8MHwxfHNlYXJjaHwxfHx3b21lbiUyMHNraXJ0JTIwZmxvd3klMjBmYXNoaW9uJTIwbW9kZWx8ZW58MXx8fHwxNzcxNDkzMDcwfDA&ixlib=rb-4.1.0&q=80&w=1080',  size: 'M',  color: 'Black',    status: 'back_in_stock', notify: false, addedDate: '3 Feb 2026'  },
    { id: 'wc-11',    name: 'Wide Leg Linen Trousers',      brand: 'ONEENTRY', price: 69.99,  img: 'https://images.unsplash.com/photo-1758543144593-95061a3f418a?crop=entropy&cs=tinysrgb&fit=max&fm=jpg&ixid=M3w3Nzg4Nzd8MHwxfHNlYXJjaHwxfHx3b21lbiUyMGxpbmVuJTIwcGFudHMlMjB3aWRlJTIwbGVnJTIwbWluaW1hbGlzdHxlbnwxfHx8fDE3NzE0OTMwNzV8MA&ixlib=rb-4.1.0&q=80&w=1080',  size: 'S',  color: 'Ivory',    status: 'back_in_stock', notify: true,  addedDate: '14 Feb 2026' },
  ],

  referral: {
    linkBase: 'https://oneentryfashion.com/ref/',
    creditAmount: 20,
    stats: {
      friendsInvited: 3,
      ordersPlaced: 1,
      creditsEarned: '$20',
    },
    minPurchase: 50,
    creditExpiryMonths: 12,
  },

  subscriptions: {
    emailNewsletter: true,
    smsNotifications: false,
    pushNotifications: true,
    orderUpdates: true,
    newArrivals: false,
    saleAlerts: true,
    loyaltyUpdates: true,
  },

  consent: {
    dataProcessing: true,
    crossBorder: true,
  },
};

// Error / status messages for the user slice (Redux)
export const USER_SLICE_MESSAGES = {
  failedToLoad: 'Failed to load user data',
} as const;
