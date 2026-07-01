import { createSlice, createAsyncThunk, type PayloadAction } from '@reduxjs/toolkit';
import { USER_DATASET, USER_SLICE_MESSAGES, type UserDataset, type UserAddress } from '../data/userData';

interface UserState {
  data: UserDataset;
  status: 'idle' | 'loading' | 'succeeded' | 'failed';
  error: string | null;
}

/**
 * Initial user state. Includes mock dataset so UI renders without a
 * loading flash, plus null auth fields — populated after successful
 * Platform login via `setAuth` (see `AuthContext.login`).
 */
const initialState: UserState = {
  data: {
    ...USER_DATASET,
    authToken: null,
    refreshToken: null,
    userIdentifier: null,
  },
  status: 'idle',
  error: null,
};

/**
 * Simulates an API call that returns the user dataset.
 * When backend is ready, replace the mock body with:
 *   const response = await fetch('/api/user/me');
 *   return response.json() as UserDataset;
 */
export const fetchUserData = createAsyncThunk<UserDataset>(
  'user/fetchUserData',
  async () => {
    // TODO: replace with real API call
    return USER_DATASET;
  },
);

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
  extraReducers: builder => {
    builder
      .addCase(fetchUserData.pending, state => {
        state.status = 'loading';
        state.error = null;
      })
      .addCase(fetchUserData.fulfilled, (state, action) => {
        state.status = 'succeeded';
        state.data = {
          ...action.payload,
          authToken: state.data.authToken,
          refreshToken: state.data.refreshToken,
          userIdentifier: state.data.userIdentifier,
        };
      })
      .addCase(fetchUserData.rejected, (state, action) => {
        state.status = 'failed';
        state.error = action.error.message ?? USER_SLICE_MESSAGES.failedToLoad;
      });
  },
});

export const { patchUserData, addAddress, setAuth, clearAuth } = userSlice.actions;
export default userSlice.reducer;
