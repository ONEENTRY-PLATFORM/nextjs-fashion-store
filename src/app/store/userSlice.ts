import { createSlice, type PayloadAction } from '@reduxjs/toolkit';
import { type UserDataset, type UserAddress } from '../data/userData';

interface UserState {
  data: UserDataset;
  status: 'idle' | 'loading' | 'succeeded' | 'failed';
  error: string | null;
}

/**
 * Empty initial state. Real user data (profile / loyalty / addresses / cart /
 * wishlist / orders) flows in from OneEntry via `AuthContext` — this slice
 * only holds the JWT pair + identifier that RTK Query keys off, plus the
 * addresses list used by the delivery form.
 */
const initialState: UserState = {
  data: {
    profile: {
      firstName: '',
      email: '',
      phone: '',
      dob: '',
      gender: 'female',
      shoeSize: '',
      clothingSize: '',
    },
    loyalty: {
      cardNumber: '',
      status: 'Member',
      discount: 0,
      bonuses: 0,
      totalPurchases: 0,
      nextLevelAmount: 0,
    },
    addresses: [],
    socials: [],
    orders: [],
    bonusHistory: [],
    purchaseHistory: [],
    wishlist: [],
    waitingList: [],
    referral: {
      linkBase: '',
      creditAmount: 0,
      stats: { friendsInvited: 0, ordersPlaced: 0, creditsEarned: '' },
      minPurchase: 0,
      creditExpiryMonths: 0,
    },
    subscriptions: {
      emailNewsletter: false,
      smsNotifications: false,
      pushNotifications: false,
      orderUpdates: false,
      newArrivals: false,
      saleAlerts: false,
      loyaltyUpdates: false,
    },
    consent: {
      dataProcessing: false,
      crossBorder: false,
    },
    authToken: null,
    refreshToken: null,
    userIdentifier: null,
  },
  status: 'idle',
  error: null,
};

/**
 * Payload shape consumed by `setAuth`. Mirrors `UserTokenType` from
 * `cms/src/modules/users/types/user-token.type.ts` (accessToken /
 * refreshToken / userIdentifier).
 */
export interface AuthCredentials {
  accessToken: string;
  refreshToken: string;
  userIdentifier: string;
}

const userSlice = createSlice({
  name: 'user',
  initialState,
  reducers: {
    /** Patch a subset of user dataset fields (e.g. after a profile save). */
    patchUserData(state, action: PayloadAction<Partial<UserDataset>>) {
      Object.assign(state.data, action.payload);
    },
    /** Add a new address to the user's saved addresses. */
    addAddress(state, action: PayloadAction<UserAddress>) {
      state.data.addresses.push(action.payload);
    },
    /**
     * Store Platform-issued JWT pair and the user identifier after a
     * successful login. Triggers RTK Query caches keyed on the token
     * via `prepareHeaders`.
     */
    setAuth(state, action: PayloadAction<AuthCredentials>) {
      state.data.authToken = action.payload.accessToken;
      state.data.refreshToken = action.payload.refreshToken;
      state.data.userIdentifier = action.payload.userIdentifier;
    },
    /** Reset auth fields on logout. */
    clearAuth(state) {
      state.data.authToken = null;
      state.data.refreshToken = null;
      state.data.userIdentifier = null;
    },
  },
});

export const { patchUserData, addAddress, setAuth, clearAuth } = userSlice.actions;
export default userSlice.reducer;
