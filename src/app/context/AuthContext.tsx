'use client';
import { createContext, useCallback, useContext, useEffect, useRef, useState } from 'react';
import { useDispatch } from 'react-redux';

import { type Gender, type LoyaltyStatus } from '@/app/data/userData';
import type { AppDispatch } from '@/app/store';
import { cartActions } from '@/app/store/cartSlice';
import { recentlyViewedActions } from '@/app/store/recentlyViewedSlice';
import { clearAuth, setAuth } from '@/app/store/userSlice';
import { wishlistActions } from '@/app/store/wishlistSlice';
import { clearGuestId, getOrCreateGuestId } from '@/app/utils/guest-id';
import { getApiSafe, hasActiveSession, reDefine, REFRESH_TOKEN_KEY } from '@/lib/oneentry';
import {
  getCurrentUserAction,
  type OeAddress,
  type OeCartItem,
  type OeConsent,
  type OeLoyaltyTier,
  type OeOrder,
  type OeRecentlyViewedItem,
  type OeSubscriptions,
  type OeUser,
  type OeWishlistItem,
  type ProfileUpdate,
  signInAction,
  signOutAction,
  signUpAction,
  type SignUpInput,
  syncCartAction,
  syncWishlistAction,
  updateAddressesAction,
  updateConsentAction,
  updateProfileAction,
  updateSubscriptionsAction,
} from '@/lib/oneentry/auth/actions';

export interface User {
  firstName: string;
  lastName: string;
  email: string;
  phone: string;
  dob: string;
  gender: Gender;
  shoeSize: string;
  clothingSize: string;
  // Loyalty fields below have no OneEntry source in this tenant — kept as mock defaults so the existing UI can render.
  cardNumber: string;
  discount: number;
  bonuses: number;
  status: LoyaltyStatus;
  totalPurchases: number;
  nextLevelAmount: number;
  /** Cap on the personal discount value (in currency). */
  discountMaxAmount?: number;
  /** OE `applicability` (`TO_ORDER` / `TO_PRODUCT`). */
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
  /** `false` until the bootstrap /me call finishes (regardless of outcome). */
  authReady: boolean;
  loginModalOpen: boolean;
  registerModalOpen: boolean;
  openLoginModal: () => void;
  closeLoginModal: () => void;
  /** Human-readable error surfaced to the LoginModal when a login attempt (typically the Google OAuth callback) failed via redirect. */
  authError: string | null;
  setAuthError: (msg: string | null) => void;
  openRegisterModal: () => void;
  closeRegisterModal: () => void;
  /** Password-recovery modal (OE's code flow — see `auth/password-reset.ts`). */
  resetPasswordModalOpen: boolean;
  /** Open the recovery modal, carrying over whatever the shopper already typed in the sign-in field so they don't retype their address. */
  openResetPasswordModal: (prefillEmail?: string) => void;
  closeResetPasswordModal: () => void;
  /** Address to prefill the recovery modal's first step with; `''` when none. */
  resetPasswordEmail: string;
  login: (emailOrPhone: string, password: string) => Promise<boolean>;
  /** Start the Google OAuth authorization-code flow. */
  startGoogleOAuth: (returnTo?: string) => Promise<void>;
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
  emailNewsletter: false,
  smsNotifications: false,
  pushNotifications: false,
  orderUpdates: false,
  newArrivals: false,
  saleAlerts: false,
  loyaltyUpdates: false,
};
const DEFAULT_CONSENT = { dataProcessing: false, crossBorder: false };

/** Nice-cased tier label (`bronze` → `Bronze`). */
function toTierLabel(marker: string): LoyaltyStatus {
  const cleaned = marker.trim().toLowerCase();
  if (!cleaned) return 'Member';
  const label = cleaned[0].toUpperCase() + cleaned.slice(1);
  return label === 'Bronze' || label === 'Silver' || label === 'Gold' || label === 'Platinum' ? label : 'Member';
}

/** Lifetime value = sum of orders that actually generated revenue for the merchant. */
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

/** Pick the highest LTV-gated tier the shopper actually qualifies for. Pick the highest tier the shopper's LTV clears. */
function pickActiveTier(tiers: OeLoyaltyTier[], ltv: number): OeLoyaltyTier | null {
  const gated = tiers.filter((t) => typeof t.ltvThreshold === 'number');
  if (gated.length === 0) return null;
  for (let i = gated.length - 1; i >= 0; i--) {
    if (ltv >= (gated[i].ltvThreshold ?? Infinity)) return gated[i];
  }
  return null;
}

/** Hardcoded fallback ladder used ONLY when a merchant hasn't yet shipped the higher tiers in OE. */
const FALLBACK_TIER_LTV: Record<Exclude<LoyaltyStatus, 'Member'>, number> = {
  Bronze: 100,
  Silver: 500,
  Gold: 1000,
  Platinum: 2000,
};

/** Next-tier threshold for the loyalty progress bar. */
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
  const oe = tiers.find((t) => t.tier.toLowerCase() === nextName.toLowerCase());
  if (oe && typeof oe.ltvThreshold === 'number') return oe.ltvThreshold;
  if (oe && typeof oe.minCartAmount === 'number') return oe.minCartAmount;
  return FALLBACK_TIER_LTV[nextName];
}

const TIER_LADDER: Array<Exclude<LoyaltyStatus, 'Member'>> = ['Bronze', 'Silver', 'Gold', 'Platinum'];

function mergeOeUser(oeUser: OeUser | null): User {
  if (!oeUser) {
    // Pre-auth state: empty user, no mock leakage.
    return {
      ...EMPTY_USER_DEFAULTS,
      firstName: '',
      lastName: '',
      email: '',
      phone: '',
      dob: '',
      gender: 'female',
      shoeSize: '',
      clothingSize: '',
      addresses: [],
      subscriptions: DEFAULT_SUBSCRIPTIONS,
      consent: DEFAULT_CONSENT,
      cartItems: [],
      wishlistItems: [],
      oeOrders: [],
      recentlyViewedItems: [],
    };
  }
  // Loyalty from OE.
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
    gender: oeUser.gender === 'male' || oeUser.gender === 'female' ? oeUser.gender : 'female',
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
    ...(loyalty
      ? {
          discount: activeTier?.discountPct ?? 0,
          bonuses: loyalty.bonusBalance,
          status,
          totalPurchases: ltv,
          nextLevelAmount: nextThreshold,
          discountMaxAmount: activeTier?.discountMaxAmount ?? undefined,
          discountApplicability: activeTier?.applicability || undefined,
          ltvThreshold: activeTier?.ltvThreshold ?? undefined,
        }
      : {}),
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
  const [resetPasswordModalOpen, setResetPasswordModalOpen] = useState(false);
  const [resetPasswordEmail, setResetPasswordEmail] = useState('');

  // StrictMode runs effects twice in dev.
  const bootstrappedRef = useRef(false);

  // Session bootstrap (MCP `tokens`): install the stored refresh token on the SDK singleton, then read `/me`. `reDefine` does not refresh by itself.
  useEffect(() => {
    if (bootstrappedRef.current) return;
    bootstrappedRef.current = true;

    let cancelled = false;

    const bootstrap = async () => {
      // Anonymous fingerprint for guest cart / wishlist / activity.
      const guestId = getOrCreateGuestId();
      const api = getApiSafe();
      if (api && guestId) api.Users.setGuestId(guestId);

      let refresh: string | null = null;
      try {
        refresh = localStorage.getItem(REFRESH_TOKEN_KEY);
      } catch {
        /* private mode — treat as signed out */
      }
      if (refresh && !hasActiveSession()) {
        await reDefine(refresh);
      }

      const me = refresh ? await getCurrentUserAction() : null;
      if (cancelled) return;
      if (me) {
        setUser(mergeOeUser(me));
        setIsLoggedIn(true);
        dispatch(setAuth({ accessToken: '', refreshToken: '', userIdentifier: me.identifier }));
      }
      setAuthReady(true);
    };

    void bootstrap();
    return () => {
      cancelled = true;
    };
  }, [dispatch]);

  const [authError, setAuthError] = useState<string | null>(null);
  const openLoginModal = useCallback(() => {
    setRegisterModalOpen(false);
    setResetPasswordModalOpen(false);
    setLoginModalOpen(true);
  }, []);
  const closeLoginModal = useCallback(() => {
    setLoginModalOpen(false);
    // A user-triggered close discards any pending auth error so the next open (e.g. from a fresh login CTA) doesn't inherit the old banner.
    setAuthError(null);
  }, []);

  const openRegisterModal = useCallback(() => {
    setLoginModalOpen(false);
    setResetPasswordModalOpen(false);
    setRegisterModalOpen(true);
  }, []);
  const closeRegisterModal = useCallback(() => setRegisterModalOpen(false), []);

  const openResetPasswordModal = useCallback((prefillEmail?: string) => {
    // Only an address is worth carrying over — a phone or a bare identifier would land in a field the recovery flow validates as an e-mail.
    setResetPasswordEmail(prefillEmail?.includes('@') ? prefillEmail.trim() : '');
    setLoginModalOpen(false);
    setRegisterModalOpen(false);
    setAuthError(null);
    setResetPasswordModalOpen(true);
  }, []);
  const closeResetPasswordModal = useCallback(() => setResetPasswordModalOpen(false), []);

  const login = useCallback(
    async (emailOrPhone: string, password: string): Promise<boolean> => {
      // Social provider buttons are a stub until OAuth is wired up.
      if (password === 'social') {
        setUser(mergeOeUser(null));
        setIsLoggedIn(true);
        setLoginModalOpen(false);
        return true;
      }

      const result = await signInAction(emailOrPhone, password);
      if (result.ok) {
        dispatch(
          setAuth({
            accessToken: '',
            refreshToken: '',
            userIdentifier: result.userIdentifier,
          }),
        );
        setUser(mergeOeUser(result.user));
        setIsLoggedIn(true);
        setLoginModalOpen(false);
        // The recovery flow signs the shopper in on its last step — close it here too, so a successful reset doesn't leave the modal standing.
        setResetPasswordModalOpen(false);
        return true;
      }

      return false;
    },
    [dispatch],
  );

  const startGoogleOAuth = useCallback(async (returnTo?: string): Promise<void> => {
    // Full-page redirect flow per MCP `auth-provider` rule.
    const { startGoogleOAuth: kickOff } = await import('@/lib/google-auth');
    await kickOff(returnTo);
  }, []);

  const signUp = useCallback(
    async (input: SignUpInput): Promise<{ ok: boolean; error?: string }> => {
      const result = await signUpAction(input);
      if (result.ok) {
        dispatch(
          setAuth({
            accessToken: '',
            refreshToken: '',
            userIdentifier: result.userIdentifier,
          }),
        );
        setUser(mergeOeUser(result.user));
        setIsLoggedIn(true);
        setRegisterModalOpen(false);
        return { ok: true };
      }
      return { ok: false, error: result.error };
    },
    [dispatch],
  );

  const logout = useCallback(() => {
    setIsLoggedIn(false);
    setUser(null);
    dispatch(clearAuth());
    // Clear shopper-scoped local state so nothing leaks into the next session on this browser.
    dispatch(cartActions.clearCart());
    dispatch(wishlistActions.clearAll());
    dispatch(recentlyViewedActions.hydrate([]));
    if (typeof window !== 'undefined') {
      try {
        // Cart/wishlist hydration guards — see `CartContext` / `WishlistContext` sessionStorage flags.
        sessionStorage.removeItem('oe_cart_merged');
        sessionStorage.removeItem('oe_wishlist_merged');
        sessionStorage.removeItem('oe_checkout_payload');
        sessionStorage.removeItem('oe_coupon_code');
        sessionStorage.removeItem('oe_last_order_id');
      } catch {
        /* private mode / quota — silent no-op */
      }
      // Drop the anonymous fingerprint too.
      clearGuestId();
    }
    void signOutAction();
  }, [dispatch]);

  const updateUser = useCallback((data: Partial<User>) => {
    setUser((prev) => (prev ? { ...prev, ...data } : null));
  }, []);

  const refresh = useCallback(async () => {
    const me = await getCurrentUserAction();
    if (me) setUser(mergeOeUser(me));
  }, []);

  const updateProfile = useCallback(
    async (patch: ProfileUpdate) => {
      const res = await updateProfileAction(patch);
      if (res.ok) await refresh();
      return res;
    },
    [refresh],
  );

  const updateAddresses = useCallback(async (addresses: OeAddress[]) => {
    const res = await updateAddressesAction(addresses);
    if (res.ok) {
      const persisted = res.addresses ?? addresses;
      setUser((prev) => (prev ? { ...prev, addresses: persisted } : prev));
    }
    return res;
  }, []);

  const updateSubscriptions = useCallback(async (subs: OeSubscriptions) => {
    const res = await updateSubscriptionsAction(subs);
    if (res.ok) setUser((prev) => (prev ? { ...prev, subscriptions: subs } : prev));
    return res;
  }, []);

  const updateConsent = useCallback(async (consent: OeConsent) => {
    const res = await updateConsentAction(consent);
    if (res.ok) setUser((prev) => (prev ? { ...prev, consent } : prev));
    return res;
  }, []);

  const syncCart = useCallback(async (items: OeCartItem[]) => {
    const res = await syncCartAction(items);
    if (res.ok) setUser((prev) => (prev ? { ...prev, cartItems: res.items } : prev));
  }, []);

  const syncWishlist = useCallback(async (items: OeWishlistItem[]) => {
    const res = await syncWishlistAction(items);
    if (res.ok) setUser((prev) => (prev ? { ...prev, wishlistItems: res.items } : prev));
  }, []);

  return (
    <AuthContext.Provider
      value={{
        isLoggedIn,
        user,
        authReady,
        loginModalOpen,
        registerModalOpen,
        openLoginModal,
        closeLoginModal,
        openRegisterModal,
        closeRegisterModal,
        resetPasswordModalOpen,
        openResetPasswordModal,
        closeResetPasswordModal,
        resetPasswordEmail,
        authError,
        setAuthError,
        login,
        startGoogleOAuth,
        signUp,
        logout,
        updateUser,
        updateProfile,
        updateAddresses,
        updateSubscriptions,
        updateConsent,
        syncCart,
        syncWishlist,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used within <AuthProvider>');
  return ctx;
}
