// User data shape contracts consumed by account UI, cart/wishlist sync, and
// Redux slices. Real user data flows in from OneEntry via `AuthContext` +
// server actions in `src/lib/oneentry/auth/actions.ts` — this file no longer
// carries a `USER_DATASET` fixture. If you need a mock user for a test, build
// one inline in the test file (the fields below are all straight strings /
// numbers / arrays; no helper is warranted).

/** Loyalty tier label. `Member` is the entry-level bucket assigned to every
 *  signed-in shopper who hasn't yet cleared the LTV bar of any paid tier —
 *  no discount, no bonuses, just the standard account experience. */
export type LoyaltyStatus = 'Member' | 'Bronze' | 'Silver' | 'Gold' | 'Platinum';
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


/** Order status label. `Delivered`/`Processing`/`Cancelled` are the three
 *  canonical buckets kept as a UI shorthand. OE tenants can define their own
 *  markers (`shipped`, `in_progress`, `paid`, …) — those flow through as raw
 *  strings so we render the real status instead of forcing everything into
 *  "Processing". */
type OrderStatus = 'Delivered' | 'Processing' | 'Cancelled' | string;

interface UserOrderItem {
  name: string;
  size: string;
  color: string;
  qty: number;
  price: number;
  img: string;
  /** OE productId — populated for orders sourced from OneEntry. Enables
   *  Reorder → cart. */
  productId?: number;
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
  /** OE numeric order id — needed for cancel / update calls. */
  oeId?: number;
  /** OE storage marker (`home`, `store_pickup`, `locker`, …). Used to route
   *  the update call and to derive the cancelled-status marker. */
  oeStorage?: string;
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
  /** Optional admin-panel display name from OE `statusLocalizeInfos.title`
   *  (e.g. "Home Paid", "Home Shipped"). When present, the badge shows this
   *  verbatim instead of the coarse UI-bucket label. */
  statusTitle?: string;
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
   * means the shopper is unauthenticated and RTK Query slices should be
   * skipped.
   */
  authToken?: string | null;
  /** JWT refresh token; reserved for future refresh-on-401 flow. */
  refreshToken?: string | null;
  /** Platform identifier of the logged-in user. */
  userIdentifier?: string | null;
}
