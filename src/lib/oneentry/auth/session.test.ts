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
  readAccessOrRefresh,
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
});
