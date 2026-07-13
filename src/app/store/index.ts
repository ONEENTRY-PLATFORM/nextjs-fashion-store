import { configureStore, combineReducers } from '@reduxjs/toolkit';
import cartReducer from './cartSlice';
import wishlistReducer from './wishlistSlice';
import recentlyViewedReducer from './recentlyViewedSlice';
import catalogReducer, { type CatalogsState } from './catalogSlice';
import uiReducer from './uiSlice';
import userReducer from './userSlice';
import { wishlistApi } from './api/wishlistApi';
import { cartApi } from './api/cartApi';

const STORAGE_KEY = 'oe_store';
/**
 * Increment when Redux state shape changes.
 * Add a migration function in MIGRATIONS below for each version bump.
 */
const STORAGE_VERSION = 5;

type PersistedRaw = Record<string, unknown> & { __version?: number };

/**
 * Migration functions: key = target version, value = transform applied to the
 * raw persisted object to bring it up to that version.
 * v1→v2: userAddresses moved out of user.data into top-level key
 * v2→v3: recentlyViewed items gain viewedAt timestamp
 */
const MIGRATIONS: Record<number, (data: PersistedRaw) => PersistedRaw> = {
  2: (data) => {
    // No-op: v1 data without __version just gets a fresh start (handled below)
    return data;
  },
  3: (data) => {
    // Ensure recentlyViewed items have viewedAt (added in v3)
    const rv = data.recentlyViewed as { items?: unknown[] } | undefined;
    if (rv?.items) {
      const now = Date.now();
      rv.items = rv.items.map((item) => {
        const i = item as Record<string, unknown>;
        return 'viewedAt' in i ? i : { ...i, viewedAt: now };
      });
    }
    return data;
  },
  // v3→v4: defensive bump. Auth-token fields are added on user.data but
  // they are explicitly NOT persisted (token never hits localStorage),
  // so no state shape change is needed here — kept for traceability.
  4: (data) => data,
  // v4→v5: drop the legacy `userAddresses` key entirely. Real addresses
  // now come from OE via AuthContext (`user.addresses`); the persisted
  // copy only ever held the demo `Jane Smith` seed for guests, which was
  // never a valid data source.
  5: (data) => {
    delete (data as Record<string, unknown>).userAddresses;
    return data;
  },
};

function migrateStorage(raw: PersistedRaw): PersistedRaw {
  let version = raw.__version ?? 1;
  let data = { ...raw };
  while (version < STORAGE_VERSION) {
    version += 1;
    const migrate = MIGRATIONS[version];
    if (migrate) data = migrate(data);
  }
  data.__version = STORAGE_VERSION;
  return data;
}

function loadFromStorage() {
  if (typeof window === 'undefined') return undefined;
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return undefined;
    const parsed: PersistedRaw = JSON.parse(raw);
    // Unknown future version — wipe to avoid corruption
    if (typeof parsed.__version === 'number' && parsed.__version > STORAGE_VERSION) {
      localStorage.removeItem(STORAGE_KEY);
      return undefined;
    }
    const migrated = migrateStorage(parsed);
    const { catalog: _catalog, __version: _v, user: _legacyUser, cart: persistedCart, ...rest } = migrated;
    const result: Record<string, unknown> = { ...rest };
    if (persistedCart && typeof persistedCart === 'object') {
      // Drop any ephemeral UI flags (older builds persisted miniCartOpen,
      // which would re-open the mini-cart on every page load). Same for
      // `unavailableRemoved` — the notice is a one-shot per session, not a
      // sticky state that should survive reload.
      const {
        miniCartOpen: _miniCartOpen,
        unavailableRemoved: _unavailableRemoved,
        ...cleanCart
      } = persistedCart as Record<string, unknown>;
      result.cart = cleanCart;
    }
    return result;
  } catch {
    return undefined;
  }
}

/** Read only catalog state — called after client mount to avoid SSR hydration mismatch */
export function loadCatalogFromStorage() {
  if (typeof window === 'undefined') return undefined;
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return undefined;
    const parsed: PersistedRaw = JSON.parse(raw);
    if (typeof parsed.__version === 'number' && parsed.__version > STORAGE_VERSION) return undefined;
    const migrated = migrateStorage(parsed);
    return (migrated.catalog as CatalogsState) ?? undefined;
  } catch {
    return undefined;
  }
}

function saveToStorage(state: RootState) {
  try {
    // miniCartOpen is ephemeral UI state — keep it out of localStorage so it
    // can't leak across navigations and cause a hydration mismatch on the next
    // page load. Same rationale for `unavailableRemoved`: it's a one-shot
    // notice, not a preference to persist.
    const {
      miniCartOpen: _miniCartOpen,
      unavailableRemoved: _unavailableRemoved,
      ...persistedCart
    } = state.cart;
    localStorage.setItem(STORAGE_KEY, JSON.stringify({
      __version: STORAGE_VERSION,
      cart: persistedCart,
      wishlist: state.wishlist,
      recentlyViewed: state.recentlyViewed,
      catalog: state.catalog,
    }));
  } catch {
    // ignore quota errors
  }
}

const reducer = combineReducers({
  cart: cartReducer,
  wishlist: wishlistReducer,
  recentlyViewed: recentlyViewedReducer,
  catalog: catalogReducer,
  ui: uiReducer,
  user: userReducer,
  [wishlistApi.reducerPath]: wishlistApi.reducer,
  [cartApi.reducerPath]: cartApi.reducer,
});

export function makeStore() {
  const preloadedState = loadFromStorage();
  const store = configureStore({
    reducer,
    middleware: (getDefaultMiddleware) =>
      getDefaultMiddleware().concat(
        wishlistApi.middleware,
        cartApi.middleware,
      ),
    preloadedState,
  });

  store.subscribe(() => saveToStorage(store.getState()));

  return store;
}

export type AppStore = ReturnType<typeof makeStore>;
export type RootState = ReturnType<AppStore['getState']>;
export type AppDispatch = AppStore['dispatch'];
