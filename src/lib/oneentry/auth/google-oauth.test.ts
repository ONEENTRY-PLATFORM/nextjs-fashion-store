import { beforeEach, describe, expect, it, vi } from 'vitest';

// ---- SDK mocks ---------------------------------------------------------------
const getAuthProviderByMarker = vi.fn();
const oauth = vi.fn();
const isErrorMock = vi.fn((v: unknown): v is { message?: string; statusCode?: number } => {
  return !!v && typeof v === 'object' && 'statusCode' in (v as Record<string, unknown>);
});

vi.mock('../index', () => ({
  oneentry: {
    AuthProvider: { getAuthProviderByMarker, oauth, logout: vi.fn() },
    Users: { getUser: vi.fn() },
  },
  isOneEntryEnabled: true,
  isError: (v: unknown) => isErrorMock(v),
  getUserApi: () => null,
  getGuestApi: () => null,
}));

// ---- next/headers cookies() mock --------------------------------------------
type Store = Map<string, string>;
let store: Store;
const cookieGet = vi.fn((name: string) => {
  const v = store.get(name);
  return v === undefined ? undefined : { value: v };
});
const cookieSet = vi.fn((name: string, value: string, _opts?: Record<string, unknown>) => {
  store.set(name, value);
});
const cookieDelete = vi.fn((name: string) => {
  store.delete(name);
});
vi.mock('next/headers', () => ({
  cookies: async () => ({ get: cookieGet, set: cookieSet, delete: cookieDelete }),
}));

// ---- unrelated deps pulled in by actions.ts (kept minimal) ------------------
vi.mock('../catalog/products', () => ({
  loadProductsByIds: vi.fn(async () => []),
}));

// ---- ensure a stable UUID for URL assertions ---------------------------------
const FIXED_UUID = '11111111-2222-3333-4444-555555555555';
vi.stubGlobal('crypto', {
  ...(globalThis.crypto ?? {}),
  randomUUID: () => FIXED_UUID,
});

const importFresh = async () => {
  vi.resetModules();
  return import('./actions');
};

beforeEach(() => {
  store = new Map();
  getAuthProviderByMarker.mockReset();
  oauth.mockReset();
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
    const { getGoogleAuthUrlAction } = await importFresh();
    const res = await getGoogleAuthUrlAction('https://example.com');
    expect(res.ok).toBe(false);
    if (!res.ok) expect(res.error).toMatch(/NEXT_PUBLIC_GOOGLE_CLIENT_ID/);
    expect(getAuthProviderByMarker).not.toHaveBeenCalled();
  });

  it('returns ok:false when origin does not look like http(s)', async () => {
    const { getGoogleAuthUrlAction } = await importFresh();
    const res = await getGoogleAuthUrlAction('javascript:alert(1)');
    expect(res.ok).toBe(false);
    if (!res.ok) expect(res.error).toBe('Invalid origin');
  });

  it('returns ok:false when provider is missing oauthAuthUrl', async () => {
    getAuthProviderByMarker.mockResolvedValue({ config: {} });
    const { getGoogleAuthUrlAction } = await importFresh();
    const res = await getGoogleAuthUrlAction('https://shop.example.com');
    expect(res.ok).toBe(false);
    if (!res.ok) expect(res.error).toBe('Provider missing oauthAuthUrl');
  });

  it('builds the auth URL, sets both httpOnly cookies, and returns ok:true', async () => {
    getAuthProviderByMarker.mockResolvedValue({
      config: { oauthAuthUrl: 'https://accounts.google.com/o/oauth2/v2/auth' },
    });
    const { getGoogleAuthUrlAction } = await importFresh();
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

    // state cookie
    expect(cookieSet).toHaveBeenCalledWith(
      'oe_google_oauth_state',
      FIXED_UUID,
      expect.objectContaining({ httpOnly: true, sameSite: 'lax', path: '/' }),
    );
    // return cookie carries the explicit local path
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
    const { getGoogleAuthUrlAction } = await importFresh();
    await getGoogleAuthUrlAction('https://shop.example.com', '//evil.com/steal');
    expect(cookieSet).toHaveBeenCalledWith(
      'oe_google_oauth_return',
      '/',
      expect.objectContaining({ httpOnly: true }),
    );
  });

  it('coerces absolute-URL returnTo back to "/"', async () => {
    getAuthProviderByMarker.mockResolvedValue({
      config: { oauthAuthUrl: 'https://accounts.google.com/o/oauth2/v2/auth' },
    });
    const { getGoogleAuthUrlAction } = await importFresh();
    await getGoogleAuthUrlAction('https://shop.example.com', 'https://evil.com/steal');
    expect(cookieSet).toHaveBeenCalledWith(
      'oe_google_oauth_return',
      '/',
      expect.objectContaining({ httpOnly: true }),
    );
  });
});

// -----------------------------------------------------------------------------
// exchangeGoogleCodeAction
// -----------------------------------------------------------------------------
describe('exchangeGoogleCodeAction', () => {
  it('returns ok:false when code is missing', async () => {
    const { exchangeGoogleCodeAction } = await importFresh();
    const res = await exchangeGoogleCodeAction({
      code: '',
      state: 'anything',
      origin: 'https://shop.example.com',
    });
    expect(res.ok).toBe(false);
    if (!res.ok) expect(res.error).toMatch(/authorization code/i);
    expect(oauth).not.toHaveBeenCalled();
  });

  it('returns ok:false and deletes cookies on state mismatch (CSRF)', async () => {
    store.set('oe_google_oauth_state', 'saved-state');
    store.set('oe_google_oauth_return', '/orders');
    const { exchangeGoogleCodeAction } = await importFresh();
    const res = await exchangeGoogleCodeAction({
      code: 'g-code',
      state: 'tampered-state',
      origin: 'https://shop.example.com',
    });
    expect(res.ok).toBe(false);
    if (!res.ok) expect(res.error).toBe('OAuth state mismatch (possible CSRF)');
    // Both cookies must be consumed immediately.
    expect(cookieDelete).toHaveBeenCalledWith('oe_google_oauth_state');
    expect(cookieDelete).toHaveBeenCalledWith('oe_google_oauth_return');
    expect(oauth).not.toHaveBeenCalled();
  });

  it('propagates SDK error when AuthProvider.oauth returns isError()', async () => {
    store.set('oe_google_oauth_state', 'saved-state');
    store.set('oe_google_oauth_return', '/checkout');
    oauth.mockResolvedValue({ statusCode: 400, message: 'Bad code' });
    const { exchangeGoogleCodeAction } = await importFresh();
    const res = await exchangeGoogleCodeAction({
      code: 'g-code',
      state: 'saved-state',
      origin: 'https://shop.example.com',
    });
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

  it('on success sets session cookies and returns userIdentifier + returnTo', async () => {
    store.set('oe_google_oauth_state', 'saved-state');
    store.set('oe_google_oauth_return', '/account/orders');
    oauth.mockResolvedValue({
      userIdentifier: 'jane@example.com',
      authProviderIdentifier: 'google',
      accessToken: 'access-xyz',
      refreshToken: 'refresh-xyz',
    });
    const { exchangeGoogleCodeAction } = await importFresh();
    const res = await exchangeGoogleCodeAction({
      code: 'g-code',
      state: 'saved-state',
      origin: 'https://shop.example.com',
    });
    expect(res.ok).toBe(true);
    if (!res.ok) return;
    expect(res.userIdentifier).toBe('jane@example.com');
    expect(res.returnTo).toBe('/account/orders');

    // Session cookies (from setSessionCookies) must be persisted.
    expect(cookieSet).toHaveBeenCalledWith(
      'oe_access',
      'access-xyz',
      expect.objectContaining({ httpOnly: true }),
    );
    expect(cookieSet).toHaveBeenCalledWith(
      'oe_refresh',
      'refresh-xyz',
      expect.objectContaining({ httpOnly: true }),
    );
    expect(cookieSet).toHaveBeenCalledWith(
      'oe_user',
      'jane@example.com',
      expect.objectContaining({ httpOnly: false }),
    );

    // CSRF pair consumed on success too.
    expect(cookieDelete).toHaveBeenCalledWith('oe_google_oauth_state');
    expect(cookieDelete).toHaveBeenCalledWith('oe_google_oauth_return');
  });
});
