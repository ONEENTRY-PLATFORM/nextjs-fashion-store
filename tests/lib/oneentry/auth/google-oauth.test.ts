/**
 * Google OAuth + session lifecycle.
 *
 * The session lives in the browser (MCP `tokens`), so the split under test is:
 *   • `oauth-actions.ts` — server-only: CSRF `state` cookie + the OE code
 *     exchange, which must be stamped with the *browser's* device fingerprint;
 *   • `actions.ts` — browser: `auth()` / `logout()` and the localStorage that
 *     backs `hasStoredSession()`.
 */
import { beforeEach, describe, expect, it, vi } from 'vitest';

// ---- SDK mocks ---------------------------------------------------------------
const getAuthProviderByMarker = vi.fn();
const oauth = vi.fn();
const authFn = vi.fn();
const logoutFn = vi.fn();
const getDeviceMetadata = vi.fn(() => 'browser-fingerprint');
const createRequestApi = vi.fn();

const isErrorMock = (v: unknown): v is { message?: string; statusCode?: number } =>
  !!v && typeof v === 'object' && 'statusCode' in (v as Record<string, unknown>);

const fakeApi = {
  AuthProvider: {
    getAuthProviderByMarker,
    oauth,
    auth: authFn,
    logout: logoutFn,
    getDeviceMetadata,
  },
  Users: {
    getUser: vi.fn(async () => ({ statusCode: 401, message: 'no user' })),
    getCart: vi.fn(async () => ({ statusCode: 401 })),
    getWishlist: vi.fn(async () => ({ statusCode: 401 })),
  },
  FormData: { getFormsDataByMarker: vi.fn(async () => ({ items: [], total: 0 })) },
  Orders: { getAllOrdersByMarker: vi.fn(async () => ({ items: [], total: 0 })) },
  Discounts: {
    getDiscountByMarker: vi.fn(async () => ({ statusCode: 404 })),
    getBonusBalance: vi.fn(async () => ({ balance: 0 })),
  },
};

vi.mock('@/lib/oneentry/index', async (importActual) => ({
  ...(await importActual<typeof import('@/lib/oneentry/index')>()),
  isOneEntryEnabled: true,
  isError: (v: unknown) => isErrorMock(v),
  getApiSafe: () => fakeApi,
  createRequestApi: (...args: unknown[]) => createRequestApi(...args),
  // The real implementations touch the SDK singleton; the storage side is what
  // these tests assert, so keep them observable but inert.
  storeSession: vi.fn(),
  clearTokens: vi.fn(() => {
    localStorage.removeItem('refresh-token');
    localStorage.removeItem('authProviderMarker');
  }),
}));

// ---- next/headers cookies() mock --------------------------------------------
type Store = Map<string, string>;
let store: Store;
const cookieGet = vi.fn((name: string) => {
  const v = store.get(name);
  return v === undefined ? undefined : { value: v };
});
const cookieSet = vi.fn((name: string, value: string) => {
  store.set(name, value);
});
const cookieDelete = vi.fn((name: string) => {
  store.delete(name);
});
vi.mock('next/headers', () => ({
  cookies: async () => ({ get: cookieGet, set: cookieSet, delete: cookieDelete }),
}));

// ---- unrelated deps pulled in by actions.ts (kept minimal) ------------------
vi.mock('@/lib/oneentry/catalog/product-previews-action', () => ({
  getProductPreviewsAction: vi.fn(async () => []),
}));

// ---- ensure a stable UUID for URL assertions ---------------------------------
const FIXED_UUID = '11111111-2222-3333-4444-555555555555';
vi.stubGlobal('crypto', {
  ...(globalThis.crypto ?? {}),
  randomUUID: () => FIXED_UUID,
});

const importOauth = async () => {
  vi.resetModules();
  return import('@/lib/oneentry/auth/oauth-actions');
};
const importActions = async () => {
  vi.resetModules();
  return import('@/lib/oneentry/auth/actions');
};

beforeEach(() => {
  store = new Map();
  localStorage.clear();
  getAuthProviderByMarker.mockReset();
  oauth.mockReset();
  authFn.mockReset();
  logoutFn.mockReset();
  createRequestApi.mockReset();
  createRequestApi.mockReturnValue(fakeApi);
  cookieGet.mockClear();
  cookieSet.mockClear();
  cookieDelete.mockClear();
  process.env.NEXT_PUBLIC_GOOGLE_CLIENT_ID = 'test-google-client-id';
});

// -----------------------------------------------------------------------------
// getGoogleAuthUrlAction
// -----------------------------------------------------------------------------
describe('getGoogleAuthUrlAction', () => {
  it('returns ok:false when NEXT_PUBLIC_GOOGLE_CLIENT_ID is missing', async () => {
    delete process.env.NEXT_PUBLIC_GOOGLE_CLIENT_ID;
    const { getGoogleAuthUrlAction } = await importOauth();
    const res = await getGoogleAuthUrlAction('https://example.com');
    expect(res.ok).toBe(false);
    if (!res.ok) expect(res.error).toMatch(/NEXT_PUBLIC_GOOGLE_CLIENT_ID/);
    expect(getAuthProviderByMarker).not.toHaveBeenCalled();
  });

  it('returns ok:false when origin does not look like http(s)', async () => {
    const { getGoogleAuthUrlAction } = await importOauth();
    const res = await getGoogleAuthUrlAction('javascript:alert(1)');
    expect(res.ok).toBe(false);
    if (!res.ok) expect(res.error).toBe('Invalid origin');
  });

  it('returns ok:false when provider is missing oauthAuthUrl', async () => {
    getAuthProviderByMarker.mockResolvedValue({ config: {} });
    const { getGoogleAuthUrlAction } = await importOauth();
    const res = await getGoogleAuthUrlAction('https://shop.example.com');
    expect(res.ok).toBe(false);
    if (!res.ok) expect(res.error).toBe('Provider missing oauthAuthUrl');
  });

  it('builds the auth URL from the OE provider config and parks the CSRF pair', async () => {
    getAuthProviderByMarker.mockResolvedValue({
      config: { oauthAuthUrl: 'https://accounts.google.com/o/oauth2/v2/auth' },
    });
    const { getGoogleAuthUrlAction } = await importOauth();
    const res = await getGoogleAuthUrlAction('https://shop.example.com', '/account');
    expect(res.ok).toBe(true);
    if (!res.ok) return;
    const u = new URL(res.url);
    expect(u.origin + u.pathname).toBe('https://accounts.google.com/o/oauth2/v2/auth');
    expect(u.searchParams.get('client_id')).toBe('test-google-client-id');
    expect(u.searchParams.get('redirect_uri')).toBe('https://shop.example.com/auth/callback/google');
    expect(u.searchParams.get('response_type')).toBe('code');
    expect(u.searchParams.get('scope')).toBe('openid email profile');
    expect(u.searchParams.get('access_type')).toBe('offline');
    expect(u.searchParams.get('prompt')).toBe('consent');
    expect(u.searchParams.get('state')).toBe(FIXED_UUID);

    expect(cookieSet).toHaveBeenCalledWith(
      'oe_google_oauth_state',
      FIXED_UUID,
      expect.objectContaining({ httpOnly: true, sameSite: 'lax', path: '/' }),
    );
    expect(cookieSet).toHaveBeenCalledWith(
      'oe_google_oauth_return',
      '/account',
      expect.objectContaining({ httpOnly: true }),
    );
  });

  it('coerces unsafe returnTo (starting with //) back to "/"', async () => {
    getAuthProviderByMarker.mockResolvedValue({
      config: { oauthAuthUrl: 'https://accounts.google.com/o/oauth2/v2/auth' },
    });
    const { getGoogleAuthUrlAction } = await importOauth();
    await getGoogleAuthUrlAction('https://shop.example.com', '//evil.com/steal');
    expect(cookieSet).toHaveBeenCalledWith('oe_google_oauth_return', '/', expect.objectContaining({ httpOnly: true }));
  });

  it('coerces absolute-URL returnTo back to "/"', async () => {
    getAuthProviderByMarker.mockResolvedValue({
      config: { oauthAuthUrl: 'https://accounts.google.com/o/oauth2/v2/auth' },
    });
    const { getGoogleAuthUrlAction } = await importOauth();
    await getGoogleAuthUrlAction('https://shop.example.com', 'https://evil.com/steal');
    expect(cookieSet).toHaveBeenCalledWith('oe_google_oauth_return', '/', expect.objectContaining({ httpOnly: true }));
  });
});

// -----------------------------------------------------------------------------
// exchangeGoogleCodeAction
// -----------------------------------------------------------------------------
const ctx = (over: Partial<{ code: string; state: string; origin: string; deviceMetadata: string }> = {}) => ({
  code: 'g-code',
  state: 'saved-state',
  origin: 'https://shop.example.com',
  deviceMetadata: 'browser-fingerprint',
  ...over,
});

describe('exchangeGoogleCodeAction', () => {
  it('returns ok:false when code is missing', async () => {
    const { exchangeGoogleCodeAction } = await importOauth();
    const res = await exchangeGoogleCodeAction(ctx({ code: '' }));
    expect(res.ok).toBe(false);
    if (!res.ok) expect(res.error).toMatch(/authorization code/i);
    expect(oauth).not.toHaveBeenCalled();
  });

  it('returns ok:false and consumes the CSRF pair on state mismatch', async () => {
    store.set('oe_google_oauth_state', 'saved-state');
    store.set('oe_google_oauth_return', '/orders');
    const { exchangeGoogleCodeAction } = await importOauth();
    const res = await exchangeGoogleCodeAction(ctx({ state: 'tampered-state' }));
    expect(res.ok).toBe(false);
    if (!res.ok) expect(res.error).toBe('OAuth state mismatch (possible CSRF)');
    expect(cookieDelete).toHaveBeenCalledWith('oe_google_oauth_state');
    expect(cookieDelete).toHaveBeenCalledWith('oe_google_oauth_return');
    expect(oauth).not.toHaveBeenCalled();
  });

  it('propagates the SDK error when AuthProvider.oauth returns isError()', async () => {
    store.set('oe_google_oauth_state', 'saved-state');
    store.set('oe_google_oauth_return', '/checkout');
    oauth.mockResolvedValue({ statusCode: 400, message: 'Bad code' });
    const { exchangeGoogleCodeAction } = await importOauth();
    const res = await exchangeGoogleCodeAction(ctx());
    expect(res.ok).toBe(false);
    if (!res.ok) expect(res.error).toBe('Bad code');
    expect(oauth).toHaveBeenCalledWith(
      'google',
      expect.objectContaining({
        code: 'g-code',
        redirect_uri: 'https://shop.example.com/auth/callback/google',
      }),
    );
  });

  it('stamps the browser fingerprint on a throw-away instance, never the singleton', async () => {
    store.set('oe_google_oauth_state', 'saved-state');
    oauth.mockResolvedValue({
      userIdentifier: 'jane@example.com',
      accessToken: 'access-xyz',
      refreshToken: 'refresh-xyz',
    });
    const { exchangeGoogleCodeAction } = await importOauth();
    await exchangeGoogleCodeAction(ctx({ deviceMetadata: 'fp-from-browser' }));
    // A refresh token bound to the server's own Node fingerprint could never
    // be refreshed from the browser — hence the per-request instance.
    expect(createRequestApi).toHaveBeenCalledWith({ deviceMetadata: 'fp-from-browser' });
  });

  it('hands the tokens back to the caller instead of writing a session cookie', async () => {
    store.set('oe_google_oauth_state', 'saved-state');
    store.set('oe_google_oauth_return', '/account/orders');
    oauth.mockResolvedValue({
      userIdentifier: 'jane@example.com',
      authProviderIdentifier: 'google',
      accessToken: 'access-xyz',
      refreshToken: 'refresh-xyz',
    });
    const { exchangeGoogleCodeAction } = await importOauth();
    const res = await exchangeGoogleCodeAction(ctx());
    expect(res.ok).toBe(true);
    if (!res.ok) return;
    expect(res.userIdentifier).toBe('jane@example.com');
    expect(res.accessToken).toBe('access-xyz');
    expect(res.refreshToken).toBe('refresh-xyz');
    expect(res.returnTo).toBe('/account/orders');

    // The session belongs to the browser — no `oe_access` / `oe_refresh`.
    const cookieNames = cookieSet.mock.calls.map(([name]) => name);
    expect(cookieNames).not.toContain('oe_access');
    expect(cookieNames).not.toContain('oe_refresh');

    // CSRF pair consumed on success too.
    expect(cookieDelete).toHaveBeenCalledWith('oe_google_oauth_state');
    expect(cookieDelete).toHaveBeenCalledWith('oe_google_oauth_return');
  });

  it('rejects an incomplete session payload', async () => {
    store.set('oe_google_oauth_state', 'saved-state');
    oauth.mockResolvedValue({ userIdentifier: 'jane@example.com' });
    const { exchangeGoogleCodeAction } = await importOauth();
    const res = await exchangeGoogleCodeAction(ctx());
    expect(res.ok).toBe(false);
    if (!res.ok) expect(res.error).toMatch(/incomplete session/i);
  });
});

// -----------------------------------------------------------------------------
// signInAction — browser-side session bookkeeping
// -----------------------------------------------------------------------------
describe('signInAction', () => {
  it('remembers the OE user identifier', async () => {
    authFn.mockResolvedValue({
      userIdentifier: 'bob@example.com',
      authProviderIdentifier: 'email',
      accessToken: 'acc',
      refreshToken: 'ref',
    });
    const { signInAction } = await importActions();
    const res = await signInAction('bob@example.com', 'password123');
    expect(res.ok).toBe(true);
    // `auth()` must run in the browser — OE binds the refresh token to the
    // fingerprint of the request that issued it.
    expect(authFn).toHaveBeenCalledWith('email', {
      authData: [
        { marker: 'email', value: 'bob@example.com' },
        { marker: 'password', value: 'password123' },
      ],
    });
    expect(localStorage.getItem('oe_user_identifier')).toBe('bob@example.com');
  });

  it('surfaces the OE message on a rejected sign-in', async () => {
    authFn.mockResolvedValue({ statusCode: 401, message: 'Wrong password' });
    const { signInAction } = await importActions();
    const res = await signInAction('bob@example.com', 'nope');
    expect(res.ok).toBe(false);
    if (!res.ok) expect(res.error).toBe('Wrong password');
    expect(localStorage.getItem('oe_user_identifier')).toBeNull();
  });
});

// -----------------------------------------------------------------------------
// signOutAction
// -----------------------------------------------------------------------------
describe('signOutAction', () => {
  it('passes the stored provider marker and refresh token to AuthProvider.logout', async () => {
    localStorage.setItem('refresh-token', 'google-refresh');
    localStorage.setItem('authProviderMarker', 'google');
    const { signOutAction } = await importActions();
    await signOutAction();
    expect(logoutFn).toHaveBeenCalledWith('google', 'google-refresh');
  });

  it('falls back to the "email" marker when none was stored', async () => {
    localStorage.setItem('refresh-token', 'email-refresh');
    const { signOutAction } = await importActions();
    await signOutAction();
    expect(logoutFn).toHaveBeenCalledWith('email', 'email-refresh');
  });

  it('clears the persisted session even when logout fails', async () => {
    localStorage.setItem('refresh-token', 'any-refresh');
    localStorage.setItem('authProviderMarker', 'google');
    localStorage.setItem('oe_user_identifier', 'jane@example.com');
    logoutFn.mockRejectedValue(new Error('network'));
    const { signOutAction } = await importActions();
    await signOutAction();
    expect(localStorage.getItem('refresh-token')).toBeNull();
    expect(localStorage.getItem('authProviderMarker')).toBeNull();
    expect(localStorage.getItem('oe_user_identifier')).toBeNull();
  });
});
