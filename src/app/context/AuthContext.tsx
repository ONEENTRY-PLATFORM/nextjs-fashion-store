'use client'
import { createContext, useContext, useState, useCallback, useEffect } from 'react';
import { useDispatch } from 'react-redux';
import { type LoyaltyStatus, type Gender } from '../data/userData';
import type { AppDispatch } from '../store';
import { setAuth, clearAuth } from '../store/userSlice';
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
  status: 'Bronze' as LoyaltyStatus,
  totalPurchases: 0,
  nextLevelAmount: 0,
} as const;

const DEFAULT_SUBSCRIPTIONS = {
  emailNewsletter: false, smsNotifications: false, pushNotifications: false,
  orderUpdates: false, newArrivals: false, saleAlerts: false, loyaltyUpdates: false,
};
const DEFAULT_CONSENT = { dataProcessing: false, crossBorder: false };

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

  // Bootstrap from server-side session cookie on mount.
  useEffect(() => {
    let cancelled = false;
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
