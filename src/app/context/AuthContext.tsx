'use client'
import { createContext, useContext, useState, useCallback, useEffect } from 'react';
import { useDispatch } from 'react-redux';
import { type LoyaltyStatus, type Gender, USER_DATASET } from '../data/userData';
import type { AppDispatch } from '../store';
import { setAuth, clearAuth } from '../store/userSlice';
import { validateCredentials } from '../actions/auth';
import {
  signInAction,
  signInWithGoogleAction,
  signUpAction,
  signOutAction,
  getCurrentUserAction,
  updateProfileAction,
  updateAddressesAction,
  updateSubscriptionsAction,
  updateConsentAction,
  syncCartAction,
  syncWishlistAction,
  type SignUpInput,
  type OeUser,
  type OeAddress,
  type OeSubscriptions,
  type OeConsent,
  type ProfileUpdate,
  type OeCartItem,
  type OeWishlistItem,
  type OeOrder,
  type OeLoyalty,
  type OeLoyaltyTier,
  type OeRecentlyViewedItem,
} from '../../lib/oneentry/auth/actions';

export interface User {
  firstName: string;
  lastName: string;
  email: string;
  phone: string;
  dob: string;
  gender: Gender;
  shoeSize: string;
  clothingSize: string;
  // Loyalty fields below have no OneEntry source in this tenant — kept as
  // mock defaults so the existing UI can render. When OE adds a loyalty
  // attribute set we'll pull these from /me too.
  cardNumber: string;
  discount: number;
  bonuses: number;
  status: LoyaltyStatus;
  totalPurchases: number;
  nextLevelAmount: number;
  /** Cap on the personal discount value (in currency). Set only when OE
   *  Discounts returned a `maxAmount` for the active tier. */
  discountMaxAmount?: number;
  /** OE `applicability` (`TO_ORDER` / `TO_PRODUCT`). Present only when a
   *  personal discount is active. */
  discountApplicability?: string;
  /** LTV required to keep the current tier (OE `USER_LTV` condition). */
  ltvThreshold?: number;
  addresses: OeAddress[];
  subscriptions: OeSubscriptions;
  consent: OeConsent;
  cartItems: OeCartItem[];
  wishlistItems: OeWishlistItem[];
  oeOrders: OeOrder[];
  recentlyViewedItems: OeRecentlyViewedItem[];
}

interface AuthContextType {
  isLoggedIn: boolean;
  user: User | null;
  /** `false` until the bootstrap /me call finishes (regardless of outcome).
   *  Consumers that need "logged out for sure" state must gate on this so
   *  the initial render doesn't flash a sign-in screen before the cookie
   *  session is resolved. */
  authReady: boolean;
  loginModalOpen: boolean;
  registerModalOpen: boolean;
  openLoginModal: () => void;
  closeLoginModal: () => void;
  openRegisterModal: () => void;
  closeRegisterModal: () => void;
  login: (emailOrPhone: string, password: string) => Promise<boolean>;
  /** Trade a Google ID token (from GIS popup) for a OE session. */
  loginWithGoogle: (idToken: string) => Promise<{ ok: boolean; error?: string }>;
  signUp: (input: SignUpInput) => Promise<{ ok: boolean; error?: string }>;
  logout: () => void;
  updateUser: (data: Partial<User>) => void;
  /** Persist a subset of profile fields to OE and refresh local state. */
  updateProfile: (patch: ProfileUpdate) => Promise<{ ok: boolean; error?: string }>;
  updateAddresses: (addresses: OeAddress[]) => Promise<{ ok: boolean; error?: string }>;
  updateSubscriptions: (subs: OeSubscriptions) => Promise<{ ok: boolean; error?: string }>;
  updateConsent: (consent: OeConsent) => Promise<{ ok: boolean; error?: string }>;
  syncCart: (items: OeCartItem[]) => Promise<void>;
  syncWishlist: (items: OeWishlistItem[]) => Promise<void>;
}

/** Empty defaults for user fields with no OE source (loyalty card etc.). */
const EMPTY_USER_DEFAULTS = {
  // Loyalty / bonuses fields — no OE source in this tenant, kept as 0s.
  cardNumber: '',
  discount: 0,
  bonuses: 0,
  status: 'Member' as LoyaltyStatus,
  totalPurchases: 0,
  nextLevelAmount: 0,
} as const;

const DEFAULT_SUBSCRIPTIONS = {
  emailNewsletter: false, smsNotifications: false, pushNotifications: false,
  orderUpdates: false, newArrivals: false, saleAlerts: false, loyaltyUpdates: false,
};
const DEFAULT_CONSENT = { dataProcessing: false, crossBorder: false };

/** Build the mock signed-in user from USER_DATASET (Storybook + e2e). */
function buildMockUser(): User {
  return {
    ...EMPTY_USER_DEFAULTS,
    firstName: USER_DATASET.profile.firstName,
    lastName: '',
    email: USER_DATASET.profile.email,
    phone: USER_DATASET.profile.phone,
    dob: USER_DATASET.profile.dob,
    gender: USER_DATASET.profile.gender,
    shoeSize: USER_DATASET.profile.shoeSize,
    clothingSize: USER_DATASET.profile.clothingSize,
    cardNumber: USER_DATASET.loyalty.cardNumber,
    discount: USER_DATASET.loyalty.discount,
    bonuses: USER_DATASET.loyalty.bonuses,
    status: USER_DATASET.loyalty.status,
    totalPurchases: USER_DATASET.loyalty.totalPurchases,
    nextLevelAmount: USER_DATASET.loyalty.nextLevelAmount,
    addresses: USER_DATASET.addresses.map((a) => ({
      id: a.id,
      name: a.name,
      fullName: a.fullName,
      phone: a.phone,
      line1: a.line1,
      city: a.city,
      postcode: a.postcode,
      instructions: a.instructions,
      full: a.full,
    })),
    subscriptions: DEFAULT_SUBSCRIPTIONS,
    consent: DEFAULT_CONSENT,
    cartItems: [], wishlistItems: [], oeOrders: [], recentlyViewedItems: [],
  };
}

/** Nice-cased tier label (`bronze` → `Bronze`). Handles the empty case. */
function toTierLabel(marker: string): LoyaltyStatus {
  const cleaned = marker.trim().toLowerCase();
  if (!cleaned) return 'Member';
  const label = cleaned[0].toUpperCase() + cleaned.slice(1);
  return (label === 'Bronze' || label === 'Silver' || label === 'Gold' || label === 'Platinum')
    ? label
    : 'Member';
}

/** Lifetime value = sum of orders that actually generated revenue for the
 *  merchant — i.e. paid / completed / delivered. Orders still in flight
 *  (new / processing / pending) don't count until money changes hands,
 *  and cancelled / refunded / returned obviously don't either. Matching is
 *  by substring since OE merchants namespace status markers per storage
 *  (`home_paid`, `pickup_delivered`, `home_new`, `home_cancelled`, …). */
function computeLtv(orders: OeUser['orders'] | undefined): number {
  if (!orders) return 0;
  const REVENUE = /paid|complete|deliver|done|closed|finish/i;
  const REVERSAL = /cancel|refund|reject|void|fail|declin|return/i;
  let total = 0;
  for (const o of orders) {
    const status = (o.statusIdentifier ?? '').toLowerCase();
    // Reversal always wins — a "delivered_cancelled" (theoretical) is still cancelled.
    if (REVERSAL.test(status)) continue;
    if (!REVENUE.test(status)) continue;
    const n = Number(o.totalSum);
    if (Number.isFinite(n)) total += n;
  }
  return Math.round(total * 100) / 100;
}

/** Pick the highest LTV-gated tier the shopper actually qualifies for.
 *
 *  We deliberately IGNORE tiers without a `USER_LTV` condition — a merchant
 *  who omitted the LTV rule gates the tier by user-group only, and we don't
 *  have the user's group ids on the client, so we can't tell whether they
 *  qualify. Handing such a tier out by default (as previously) is how a
 *  brand-new shopper with LTV=$0 ended up Platinum.
 *
 *  Returns `null` when the shopper hasn't cleared even the lowest bar. */
function pickActiveTier(tiers: OeLoyaltyTier[], ltv: number): OeLoyaltyTier | null {
  const gated = tiers.filter((t) => typeof t.ltvThreshold === 'number');
  if (gated.length === 0) return null;
  for (let i = gated.length - 1; i >= 0; i--) {
    if (ltv >= (gated[i].ltvThreshold ?? Infinity)) return gated[i];
  }
  return null;
}

/** Hardcoded fallback ladder used ONLY when a merchant hasn't yet shipped
 *  the higher tiers in OE. As soon as a tier lands in OE with a real
 *  `USER_LTV` condition, that value takes precedence. Mirrors what the
 *  storefront advertises in `L.perks` so the progress bar always has a
 *  visible target. */
const FALLBACK_TIER_LTV: Record<Exclude<LoyaltyStatus, 'Member'>, number> = {
  Bronze: 100,
  Silver: 500,
  Gold: 1500,
  Platinum: 5000,
};

/** Next-tier threshold for the loyalty progress bar. Reads OE first; when
 *  the merchant hasn't wired the next rung yet, falls back to
 *  `FALLBACK_TIER_LTV` so the shopper still sees a concrete target
 *  (industry practice — H&M / Sephora / Nike all keep the ladder visible
 *  even before the higher tiers unlock). Returns `0` only after the top
 *  hardcoded rung. */
function nextTierThreshold(tiers: OeLoyaltyTier[], activeStatus: LoyaltyStatus): number {
  const gated = tiers.filter((t) => typeof t.ltvThreshold === 'number');
  if (activeStatus === 'Member') {
    // Progress toward the first paid tier — Bronze, whatever LTV it lives at.
    return gated[0]?.ltvThreshold ?? FALLBACK_TIER_LTV.Bronze;
  }
  const idx = TIER_LADDER.indexOf(activeStatus);
  if (idx < 0 || idx === TIER_LADDER.length - 1) return 0;
  const nextName = TIER_LADDER[idx + 1];
  // Prefer OE's real threshold when the tier actually exists.
  const oe = gated.find((t) => t.tier.toLowerCase() === nextName.toLowerCase());
  if (oe && typeof oe.ltvThreshold === 'number') return oe.ltvThreshold;
  return FALLBACK_TIER_LTV[nextName];
}

const TIER_LADDER: Array<Exclude<LoyaltyStatus, 'Member'>> = ['Bronze', 'Silver', 'Gold', 'Platinum'];

function mergeOeUser(oeUser: OeUser | null): User {
  if (!oeUser) {
    // Pre-auth state: empty user, no mock leakage.
    return {
      ...EMPTY_USER_DEFAULTS,
      firstName: '', lastName: '', email: '', phone: '', dob: '',
      gender: 'female', shoeSize: '', clothingSize: '',
      addresses: [], subscriptions: DEFAULT_SUBSCRIPTIONS, consent: DEFAULT_CONSENT,
      cartItems: [], wishlistItems: [], oeOrders: [], recentlyViewedItems: [],
    };
  }
  // Loyalty from OE. `oeUser.loyalty` now carries the full ladder — pick the
  // rung the shopper actually qualifies for based on their computed LTV,
  // never blindly the first marker OE returned.
  const loyalty = oeUser.loyalty;
  const ltv = computeLtv(oeUser.orders);
  const activeTier = loyalty ? pickActiveTier(loyalty.tiers, ltv) : null;
  const status: LoyaltyStatus = activeTier ? toTierLabel(activeTier.tier) : EMPTY_USER_DEFAULTS.status;
  const nextThreshold = loyalty ? nextTierThreshold(loyalty.tiers, status) : 0;

  return {
    ...EMPTY_USER_DEFAULTS,
    firstName: oeUser.firstName ?? '',
    lastName: oeUser.lastName ?? '',
    email: oeUser.email ?? '',
    phone: oeUser.phone ?? '',
    gender: ((oeUser.gender === 'male' || oeUser.gender === 'female') ? oeUser.gender : 'female'),
    dob: oeUser.dob ?? '',
    shoeSize: oeUser.shoeSize ?? '',
    clothingSize: oeUser.clothingSize ?? '',
    addresses: oeUser.addresses ?? [],
    subscriptions: oeUser.subscriptions,
    consent: oeUser.consent,
    cartItems: oeUser.cart ?? [],
    wishlistItems: oeUser.wishlist ?? [],
    oeOrders: oeUser.orders ?? [],
    recentlyViewedItems: oeUser.recentlyViewed ?? [],
    // OE-driven loyalty overrides the mock defaults when data is available.
    ...(loyalty ? {
      discount: activeTier?.discountPct ?? 0,
      bonuses: loyalty.bonusBalance,
      status,
      totalPurchases: ltv,
      nextLevelAmount: nextThreshold,
      discountMaxAmount: activeTier?.discountMaxAmount ?? undefined,
      discountApplicability: activeTier?.applicability || undefined,
      ltvThreshold: activeTier?.ltvThreshold ?? undefined,
    } : {}),
  };
}

const AuthContext = createContext<AuthContextType | null>(null);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const dispatch = useDispatch<AppDispatch>();
  const [isLoggedIn, setIsLoggedIn] = useState(false);
  const [user, setUser] = useState<User | null>(null);
  const [authReady, setAuthReady] = useState(false);
  const [loginModalOpen, setLoginModalOpen] = useState(false);
  const [registerModalOpen, setRegisterModalOpen] = useState(false);

  // Bootstrap from server-side session cookie on mount. When a Storybook/e2e
  // mock login flagged sessionStorage.__mock_auth, restore the mock USER_DATASET
  // profile instead of hitting OE — that way logged-in state persists across
  // client-side navigations for tests.
  useEffect(() => {
    let cancelled = false;
    if (typeof window !== 'undefined' && sessionStorage.getItem('__mock_auth') === '1') {
      setUser(buildMockUser());
      setIsLoggedIn(true);
      setAuthReady(true);
      return;
    }
    void getCurrentUserAction().then((me) => {
      if (cancelled) return;
      if (me) {
        setUser(mergeOeUser(me));
        setIsLoggedIn(true);
        dispatch(setAuth({ accessToken: '', refreshToken: '', userIdentifier: me.identifier }));
      }
      setAuthReady(true);
    });
    return () => { cancelled = true; };
  }, [dispatch]);

  const openLoginModal = useCallback(() => {
    setRegisterModalOpen(false);
    setLoginModalOpen(true);
  }, []);
  const closeLoginModal = useCallback(() => setLoginModalOpen(false), []);

  const openRegisterModal = useCallback(() => {
    setLoginModalOpen(false);
    setRegisterModalOpen(true);
  }, []);
  const closeRegisterModal = useCallback(() => setRegisterModalOpen(false), []);

  const login = useCallback(async (emailOrPhone: string, password: string): Promise<boolean> => {
    // Social provider buttons are a stub until OAuth is wired up — they
    // simply mark the session "logged in" with an empty user so the UI can
    // navigate; no fake profile is injected.
    if (password === 'social') {
      setUser(mergeOeUser(null));
      setIsLoggedIn(true);
      setLoginModalOpen(false);
      return true;
    }

    // Legacy mock short-circuit for Storybook + e2e (see docs/AUTH.md).
    // Accepts the fixture credentials from USER_DATASET without hitting OE
    // and persists a sessionStorage flag so that logged-in state survives
    // client-side navigations (bootstrap effect restores the mock user).
    if (await validateCredentials(emailOrPhone, password)) {
      if (typeof window !== 'undefined') {
        sessionStorage.setItem('__mock_auth', '1');
      }
      setUser(buildMockUser());
      setIsLoggedIn(true);
      setLoginModalOpen(false);
      return true;
    }

    const result = await signInAction(emailOrPhone, password);
    if (result.ok) {
      dispatch(setAuth({
        accessToken: '',
        refreshToken: '',
        userIdentifier: result.userIdentifier,
      }));
      setUser(mergeOeUser(result.user));
      setIsLoggedIn(true);
      setLoginModalOpen(false);
      return true;
    }

    return false;
  }, [dispatch]);

  const loginWithGoogle = useCallback(async (idToken: string): Promise<{ ok: boolean; error?: string }> => {
    const result = await signInWithGoogleAction(idToken);
    if (result.ok) {
      dispatch(setAuth({
        accessToken: '',
        refreshToken: '',
        userIdentifier: result.userIdentifier,
      }));
      setUser(mergeOeUser(result.user));
      setIsLoggedIn(true);
      setLoginModalOpen(false);
      setRegisterModalOpen(false);
      return { ok: true };
    }
    return { ok: false, error: result.error };
  }, [dispatch]);

  const signUp = useCallback(async (input: SignUpInput): Promise<{ ok: boolean; error?: string }> => {
    const result = await signUpAction(input);
    if (result.ok) {
      dispatch(setAuth({
        accessToken: '',
        refreshToken: '',
        userIdentifier: result.userIdentifier,
      }));
      setUser(mergeOeUser(result.user));
      setIsLoggedIn(true);
      setRegisterModalOpen(false);
      return { ok: true };
    }
    return { ok: false, error: result.error };
  }, [dispatch]);

  const logout = useCallback(() => {
    setIsLoggedIn(false);
    setUser(null);
    dispatch(clearAuth());
    if (typeof window !== 'undefined') sessionStorage.removeItem('__mock_auth');
    void signOutAction();
  }, [dispatch]);

  const updateUser = useCallback((data: Partial<User>) => {
    setUser(prev => prev ? { ...prev, ...data } : null);
  }, []);

  const refresh = useCallback(async () => {
    const me = await getCurrentUserAction();
    if (me) setUser(mergeOeUser(me));
  }, []);

  const updateProfile = useCallback(async (patch: ProfileUpdate) => {
    const res = await updateProfileAction(patch);
    if (res.ok) await refresh();
    return res;
  }, [refresh]);

  const updateAddresses = useCallback(async (addresses: OeAddress[]) => {
    const res = await updateAddressesAction(addresses);
    if (res.ok) {
      const persisted = res.addresses ?? addresses;
      setUser(prev => prev ? { ...prev, addresses: persisted } : prev);
    }
    return res;
  }, []);

  const updateSubscriptions = useCallback(async (subs: OeSubscriptions) => {
    const res = await updateSubscriptionsAction(subs);
    if (res.ok) setUser(prev => prev ? { ...prev, subscriptions: subs } : prev);
    return res;
  }, []);

  const updateConsent = useCallback(async (consent: OeConsent) => {
    const res = await updateConsentAction(consent);
    if (res.ok) setUser(prev => prev ? { ...prev, consent } : prev);
    return res;
  }, []);

  const syncCart = useCallback(async (items: OeCartItem[]) => {
    const res = await syncCartAction(items);
    if (res.ok) setUser(prev => prev ? { ...prev, cartItems: res.items } : prev);
  }, []);

  const syncWishlist = useCallback(async (items: OeWishlistItem[]) => {
    const res = await syncWishlistAction(items);
    if (res.ok) setUser(prev => prev ? { ...prev, wishlistItems: res.items } : prev);
  }, []);

  return (
    <AuthContext.Provider value={{
      isLoggedIn, user, authReady,
      loginModalOpen, registerModalOpen,
      openLoginModal, closeLoginModal,
      openRegisterModal, closeRegisterModal,
      login, loginWithGoogle, signUp, logout, updateUser,
      updateProfile, updateAddresses, updateSubscriptions, updateConsent,
      syncCart, syncWishlist,
    }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used within <AuthProvider>');
  return ctx;
}
