import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { configureStore } from '@reduxjs/toolkit';
import { wishlistApi, isWishlistApiEnabled } from '../api/wishlistApi';
import userReducer, { setAuth } from '../userSlice';

/**
 * Minimal Redux store wired up only with the user reducer (auth source)
 * and the wishlistApi slice. We feed the slice through `fetch` mocks so
 * we can assert the URL, method, headers and body of each call.
 *
 * RTK Query (v2) passes a `Request` instance as the first arg to
 * `fetch`, NOT a string URL — so we extract `url` / `method` /
 * `headers` from that object instead.
 */
function makeTestStore() {
  return configureStore({
    reducer: {
      user: userReducer,
      [wishlistApi.reducerPath]: wishlistApi.reducer,
    },
    middleware: (gdm) => gdm().concat(wishlistApi.middleware),
  });
}

/** Extract a Request-or-string fetch call into a normalized shape. */
async function captureFetchCall(call: Parameters<typeof fetch>): Promise<{
  url: string;
  method: string;
  headers: Headers;
  body: string | null;
}> {
  const [reqOrUrl, init] = call;
  if (reqOrUrl instanceof Request) {
    const cloned = reqOrUrl.clone();
    return {
      url: cloned.url,
      method: cloned.method,
      headers: cloned.headers,
      body: cloned.body ? await cloned.text() : null,
    };
  }
  const headers = new Headers(init?.headers ?? {});
  return {
    url: String(reqOrUrl),
    method: init?.method ?? 'GET',
    headers,
    body: typeof init?.body === 'string' ? init.body : null,
  };
}

describe('wishlistApi', () => {
  let fetchSpy: ReturnType<typeof vi.spyOn>;

  beforeEach(() => {
    fetchSpy = vi.spyOn(globalThis, 'fetch').mockResolvedValue(
      new Response(JSON.stringify({ items: [], total: 0 }), {
        status: 200,
        headers: { 'Content-Type': 'application/json' },
      }),
    );
  });

  afterEach(() => {
    fetchSpy.mockRestore();
  });

  it('isWishlistApiEnabled returns a boolean (captured at module load)', () => {
    expect(typeof isWishlistApiEnabled()).toBe('boolean');
  });

  it('GET /users/me/wishlist when initiate is fired', async () => {
    const store = makeTestStore();
    store.dispatch(setAuth({ accessToken: 'tkn', refreshToken: 'r', userIdentifier: 'u' }));
    await store.dispatch(wishlistApi.endpoints.getWishlist.initiate());
    expect(fetchSpy).toHaveBeenCalledTimes(1);
    const captured = await captureFetchCall(fetchSpy.mock.calls[0] as Parameters<typeof fetch>);
    expect(captured.url).toContain('/users/me/wishlist');
    expect(captured.headers.get('Authorization')).toBe('Bearer tkn');
  });

  it('POST add wishlist item sends productId in body', async () => {
    const store = makeTestStore();
    store.dispatch(setAuth({ accessToken: 'tkn', refreshToken: 'r', userIdentifier: 'u' }));
    await store.dispatch(
      wishlistApi.endpoints.addWishlistItem.initiate({ productId: 42 }),
    );
    const captured = await captureFetchCall(fetchSpy.mock.calls[0] as Parameters<typeof fetch>);
    expect(captured.method).toBe('POST');
    expect(captured.body).toBe(JSON.stringify({ productId: 42 }));
  });

  it('DELETE remove wishlist item encodes productId in URL', async () => {
    const store = makeTestStore();
    store.dispatch(setAuth({ accessToken: 'tkn', refreshToken: 'r', userIdentifier: 'u' }));
    await store.dispatch(
      wishlistApi.endpoints.removeWishlistItem.initiate({ productId: 7 }),
    );
    const captured = await captureFetchCall(fetchSpy.mock.calls[0] as Parameters<typeof fetch>);
    expect(captured.url).toMatch(/\/users\/me\/wishlist\/items\/7$/);
    expect(captured.method).toBe('DELETE');
  });

  it('does not set Authorization header when token is missing', async () => {
    const store = makeTestStore();
    await store.dispatch(wishlistApi.endpoints.getWishlist.initiate());
    const captured = await captureFetchCall(fetchSpy.mock.calls[0] as Parameters<typeof fetch>);
    expect(captured.headers.get('Authorization')).toBeNull();
  });
});
