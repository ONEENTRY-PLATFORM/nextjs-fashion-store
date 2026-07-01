import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { configureStore } from '@reduxjs/toolkit';
import { cartApi, isCartApiEnabled } from '../api/cartApi';
import userReducer, { setAuth } from '../userSlice';

function makeTestStore() {
  return configureStore({
    reducer: {
      user: userReducer,
      [cartApi.reducerPath]: cartApi.reducer,
    },
    middleware: (gdm) => gdm().concat(cartApi.middleware),
  });
}

/** Extract a Request-or-string fetch call into a normalized shape. */
async function captureFetchCall(call: Parameters<typeof fetch>): Promise<{
  url: string;
  method: string;
  body: string | null;
}> {
  const [reqOrUrl, init] = call;
  if (reqOrUrl instanceof Request) {
    const cloned = reqOrUrl.clone();
    return {
      url: cloned.url,
      method: cloned.method,
      body: cloned.body ? await cloned.text() : null,
    };
  }
  return {
    url: String(reqOrUrl),
    method: init?.method ?? 'GET',
    body: typeof init?.body === 'string' ? init.body : null,
  };
}

describe('cartApi', () => {
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

  it('isCartApiEnabled returns a boolean', () => {
    expect(typeof isCartApiEnabled()).toBe('boolean');
  });

  it('POST add cart item sends productId AND absolute qty', async () => {
    const store = makeTestStore();
    store.dispatch(setAuth({ accessToken: 'tkn', refreshToken: 'r', userIdentifier: 'u' }));
    await store.dispatch(
      cartApi.endpoints.addCartItem.initiate({ productId: 12, qty: 3 }),
    );
    const captured = await captureFetchCall(fetchSpy.mock.calls[0] as Parameters<typeof fetch>);
    expect(captured.method).toBe('POST');
    expect(captured.body).toBe(JSON.stringify({ productId: 12, qty: 3 }));
  });

  it('PUT setCart sends full items array', async () => {
    const store = makeTestStore();
    store.dispatch(setAuth({ accessToken: 'tkn', refreshToken: 'r', userIdentifier: 'u' }));
    await store.dispatch(
      cartApi.endpoints.setCart.initiate({ items: [] }),
    );
    const captured = await captureFetchCall(fetchSpy.mock.calls[0] as Parameters<typeof fetch>);
    expect(captured.method).toBe('PUT');
    expect(captured.body).toBe(JSON.stringify({ items: [] }));
  });

  it('DELETE cart item targets the right URL', async () => {
    const store = makeTestStore();
    store.dispatch(setAuth({ accessToken: 'tkn', refreshToken: 'r', userIdentifier: 'u' }));
    await store.dispatch(
      cartApi.endpoints.removeCartItem.initiate({ productId: 5 }),
    );
    const captured = await captureFetchCall(fetchSpy.mock.calls[0] as Parameters<typeof fetch>);
    expect(captured.url).toMatch(/\/users\/me\/cart\/items\/5$/);
    expect(captured.method).toBe('DELETE');
  });
});
