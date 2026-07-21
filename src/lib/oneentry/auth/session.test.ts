import { beforeEach, describe, expect, it, vi } from 'vitest';

// ---- SDK mocks ---------------------------------------------------------------
// vi.mock is hoisted, so we cannot reference outer `const` vars inside the
// factory. Instead return plain objects and grab spies via vi.mocked() after.
vi.mock('../index', () => ({
  oneentry: {
    AuthProvider: { refresh: vi.fn() },
  },
  isError: vi.fn((v: unknown) => {
    return !!v && typeof v === 'object' && 'statusCode' in (v as Record<string, unknown>);
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

// ---- subject & mocked SDK refs -----------------------------------------------
import { oneentry } from '../index';
import {
  ACCESS_COOKIE,
  REFRESH_COOKIE,
  IDENTIFIER_COOKIE,
  PROVIDER_COOKIE,
  AUTH_MARKER,
  readAccessOrRefresh,
  setSessionCookies,
  clearSessionCookies,
  getAuthProviderMarker,
  type CookieJar,
} from './session';

const refresh = vi.mocked(oneentry!.AuthProvider.refresh);

beforeEach(() => {
  store = new Map();
  refresh.mockReset();
  cookieGet.mockClear();
  cookieSet.mockClear();
  cookieDelete.mockClear();
});

// -----------------------------------------------------------------------------
// readAccessOrRefresh
// -----------------------------------------------------------------------------
describe('readAccessOrRefresh', () => {
  it('returns access token immediately when ACCESS_COOKIE is present', async () => {
    store.set(ACCESS_COOKIE, 'live-access-token');
    const result = await readAccessOrRefresh();
    expect(result).toBe('live-access-token');
    expect(refresh).not.toHaveBeenCalled();
  });

  it('returns null when neither ACCESS_COOKIE nor REFRESH_COOKIE is present', async () => {
    const result = await readAccessOrRefresh();
    expect(result).toBeNull();
    expect(refresh).not.toHaveBeenCalled();
  });

  it('calls refresh with AUTH_MARKER + refresh token when ACCESS_COOKIE is absent but REFRESH_COOKIE exists', async () => {
    store.set(REFRESH_COOKIE, 'old-refresh');
    refresh.mockResolvedValue({
      userIdentifier: 'user@example.com',
      authProviderIdentifier: 'email',
      accessToken: 'new-access',
      refreshToken: 'new-refresh',
    });
    await readAccessOrRefresh();
    expect(refresh).toHaveBeenCalledWith('email', 'old-refresh');
  });

  it('on successful refresh: sets session cookies and returns new access token', async () => {
    store.set(REFRESH_COOKIE, 'old-refresh');
    refresh.mockResolvedValue({
      userIdentifier: 'user@example.com',
      authProviderIdentifier: 'email',
      accessToken: 'new-access',
      refreshToken: 'new-refresh',
    });
    const result = await readAccessOrRefresh();
    expect(result).toBe('new-access');
    expect(cookieSet).toHaveBeenCalledWith(ACCESS_COOKIE, 'new-access', expect.any(Object));
    expect(cookieSet).toHaveBeenCalledWith(REFRESH_COOKIE, 'new-refresh', expect.any(Object));
    expect(cookieSet).toHaveBeenCalledWith(IDENTIFIER_COOKIE, 'user@example.com', expect.any(Object));
    expect(cookieDelete).not.toHaveBeenCalled();
  });

  it('on isError result from refresh: clears cookies and returns null', async () => {
    store.set(REFRESH_COOKIE, 'expired-refresh');
    refresh.mockResolvedValue({ statusCode: 401, message: 'Token expired' });
    const result = await readAccessOrRefresh();
    expect(result).toBeNull();
    expect(cookieDelete).toHaveBeenCalledWith(ACCESS_COOKIE);
    expect(cookieDelete).toHaveBeenCalledWith(REFRESH_COOKIE);
    expect(cookieDelete).toHaveBeenCalledWith(IDENTIFIER_COOKIE);
    expect(cookieSet).not.toHaveBeenCalled();
  });

  it('on thrown error from refresh: clears cookies and returns null', async () => {
    store.set(REFRESH_COOKIE, 'bad-refresh');
    refresh.mockRejectedValue(new Error('Network failure'));
    const result = await readAccessOrRefresh();
    expect(result).toBeNull();
    expect(cookieDelete).toHaveBeenCalledWith(ACCESS_COOKIE);
    expect(cookieDelete).toHaveBeenCalledWith(REFRESH_COOKIE);
    expect(cookieDelete).toHaveBeenCalledWith(IDENTIFIER_COOKIE);
  });

  it('calls refresh with the stored provider marker (google), not hardcoded "email"', async () => {
    store.set(REFRESH_COOKIE, 'google-refresh');
    store.set(PROVIDER_COOKIE, 'google');
    refresh.mockResolvedValue({
      userIdentifier: 'jane@example.com',
      authProviderIdentifier: 'google',
      accessToken: 'new-access',
      refreshToken: 'new-refresh',
    });
    await readAccessOrRefresh();
    expect(refresh).toHaveBeenCalledWith('google', 'google-refresh');
  });

  it('on successful refresh: writes PROVIDER_COOKIE with the stored marker', async () => {
    store.set(REFRESH_COOKIE, 'google-refresh');
    store.set(PROVIDER_COOKIE, 'google');
    refresh.mockResolvedValue({
      userIdentifier: 'jane@example.com',
      authProviderIdentifier: 'google',
      accessToken: 'new-access',
      refreshToken: 'new-refresh',
    });
    await readAccessOrRefresh();
    expect(cookieSet).toHaveBeenCalledWith(PROVIDER_COOKIE, 'google', expect.any(Object));
  });
});

// -----------------------------------------------------------------------------
// setSessionCookies
// -----------------------------------------------------------------------------

/** Minimal CookieJar backed by the same in-memory store used in the suite. */
function makeJar(): CookieJar {
  return {
    get: (name: string) => {
      const v = store.get(name);
      return v === undefined ? undefined : { value: v };
    },
    set: cookieSet,
    delete: cookieDelete,
  };
}

describe('setSessionCookies', () => {
  const ENTITY = {
    userIdentifier: 'user@example.com',
    authProviderIdentifier: 'email',
    accessToken: 'acc-tok',
    refreshToken: 'ref-tok',
  };

  it('writes PROVIDER_COOKIE with the supplied providerMarker', async () => {
    const jar = makeJar();
    await setSessionCookies(jar, ENTITY, 'google');
    expect(cookieSet).toHaveBeenCalledWith(PROVIDER_COOKIE, 'google', expect.any(Object));
  });

  it('defaults PROVIDER_COOKIE to AUTH_MARKER ("email") when no marker is supplied', async () => {
    const jar = makeJar();
    await setSessionCookies(jar, ENTITY);
    expect(cookieSet).toHaveBeenCalledWith(PROVIDER_COOKIE, AUTH_MARKER, expect.any(Object));
  });

  it('sets PROVIDER_COOKIE with httpOnly:true and 7-day maxAge', async () => {
    const jar = makeJar();
    await setSessionCookies(jar, ENTITY, 'google');
    expect(cookieSet).toHaveBeenCalledWith(
      PROVIDER_COOKIE,
      'google',
      expect.objectContaining({ httpOnly: true, maxAge: 60 * 60 * 24 * 7 }),
    );
  });
});

// -----------------------------------------------------------------------------
// clearSessionCookies
// -----------------------------------------------------------------------------
describe('clearSessionCookies', () => {
  it('deletes PROVIDER_COOKIE along with the other session cookies', async () => {
    const jar = makeJar();
    await clearSessionCookies(jar);
    expect(cookieDelete).toHaveBeenCalledWith(PROVIDER_COOKIE);
    expect(cookieDelete).toHaveBeenCalledWith(ACCESS_COOKIE);
    expect(cookieDelete).toHaveBeenCalledWith(REFRESH_COOKIE);
    expect(cookieDelete).toHaveBeenCalledWith(IDENTIFIER_COOKIE);
  });
});

// -----------------------------------------------------------------------------
// getAuthProviderMarker
// -----------------------------------------------------------------------------
describe('getAuthProviderMarker', () => {
  it('returns the stored cookie value when PROVIDER_COOKIE is present', () => {
    store.set(PROVIDER_COOKIE, 'google');
    const jar = makeJar();
    expect(getAuthProviderMarker(jar)).toBe('google');
  });

  it('falls back to AUTH_MARKER ("email") when PROVIDER_COOKIE is absent', () => {
    const jar = makeJar();
    expect(getAuthProviderMarker(jar)).toBe(AUTH_MARKER);
    expect(getAuthProviderMarker(jar)).toBe('email');
  });
});
