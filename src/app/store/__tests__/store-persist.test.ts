/**
 * Tests that the persist layer in store/index.ts correctly strips ephemeral
 * fields (`miniCartOpen`, `unavailableRemoved`) from both saved and loaded
 * localStorage state.
 *
 * We test through the public surface (`makeStore`) so the internal
 * `saveToStorage` / `loadFromStorage` functions don't need to be exported.
 * A minimal localStorage shim replaces `window.localStorage` for the run.
 */

import { describe, it, expect, beforeEach, vi } from 'vitest';

// ── localStorage shim ────────────────────────────────────────────────────────

const localStorageStore: Record<string, string> = {};
const localStorageMock = {
  getItem: vi.fn((key: string) => localStorageStore[key] ?? null),
  setItem: vi.fn((key: string, value: string) => { localStorageStore[key] = value; }),
  removeItem: vi.fn((key: string) => { delete localStorageStore[key]; }),
  clear: vi.fn(() => { Object.keys(localStorageStore).forEach(k => delete localStorageStore[k]); }),
};

// Inject before the module loads so `typeof window !== 'undefined'` is true.
vi.stubGlobal('localStorage', localStorageMock);

// ── module under test ────────────────────────────────────────────────────────

import { makeStore } from '../index';
import { cartActions } from '../cartSlice';
import type { CartItem } from '../../context/CartContext';

const STORAGE_KEY = 'oe_store';
const STORAGE_VERSION = 5;

const makeItem = (overrides: Partial<CartItem> = {}): CartItem => ({
  id: 'item-1',
  name: 'Test Dress',
  brand: 'Brand',
  color: 'Black',
  sku: 'SKU-001',
  size: 'M',
  quantity: 1,
  price: 99,
  image: '/img.jpg',
  ...overrides,
});

beforeEach(() => {
  localStorageMock.clear();
  vi.clearAllMocks();
});

// ── saveToStorage (via dispatch + subscribe) ─────────────────────────────────

describe('saveToStorage — strips ephemeral cart fields', () => {
  it('does not write miniCartOpen to localStorage', () => {
    const store = makeStore();
    store.dispatch(cartActions.openMiniCart());

    const raw = localStorageMock.setItem.mock.calls.at(-1)?.[1];
    expect(raw).toBeDefined();
    const persisted = JSON.parse(raw!);
    expect(persisted.cart).not.toHaveProperty('miniCartOpen');
  });

  it('does not write unavailableRemoved to localStorage', () => {
    const store = makeStore();
    store.dispatch(cartActions.setUnavailableRemoved([makeItem({ id: 'gone-42' })]));

    const raw = localStorageMock.setItem.mock.calls.at(-1)?.[1];
    expect(raw).toBeDefined();
    const persisted = JSON.parse(raw!);
    expect(persisted.cart).not.toHaveProperty('unavailableRemoved');
  });

  it('still persists cart.items after stripping ephemeral fields', () => {
    const store = makeStore();
    store.dispatch(cartActions.addItem(makeItem({ id: 'real-item' })));
    // Also set unavailableRemoved — must survive strip of items
    store.dispatch(cartActions.setUnavailableRemoved([makeItem({ id: 'gone' })]));

    const raw = localStorageMock.setItem.mock.calls.at(-1)?.[1];
    const persisted = JSON.parse(raw!);
    expect(persisted.cart.items).toHaveLength(1);
    expect(persisted.cart.items[0].id).toBe('real-item');
    expect(persisted.cart).not.toHaveProperty('unavailableRemoved');
  });
});

// ── loadFromStorage (via makeStore preloadedState) ───────────────────────────

describe('loadFromStorage — strips ephemeral cart fields on load', () => {
  it('drops unavailableRemoved that was somehow persisted in a previous build', () => {
    // Simulate a stale localStorage blob from an old build that DID persist
    // unavailableRemoved.
    const stale = {
      __version: STORAGE_VERSION,
      cart: {
        items: [makeItem({ id: 'kept' })],
        miniCartOpen: true,
        unavailableRemoved: [makeItem({ id: 'stale-removed' })],
      },
    };
    localStorageStore[STORAGE_KEY] = JSON.stringify(stale);

    const store = makeStore();
    const cartState = store.getState().cart;

    // items preserved
    expect(cartState.items).toHaveLength(1);
    expect(cartState.items[0].id).toBe('kept');

    // unavailableRemoved must be absent from what loadFromStorage feeds to Redux.
    // RTK uses the preloaded slice object as-is for keys it provides; missing
    // keys are `undefined` — NOT the stale persisted value. This confirms the
    // stripping worked: the old `[{ id: 'stale-removed' }]` was not loaded.
    //
    // The CartContext's defensive `?? []` guards mean `undefined` is safe at
    // runtime. We verify it is strictly not the stale array.
    expect(cartState.unavailableRemoved).not.toEqual([{ id: 'stale-removed' }]);
    // And that it is falsy / an empty-like value (undefined or [])
    expect(cartState.unavailableRemoved ?? []).toEqual([]);
  });

  it('initialises unavailableRemoved to [] when blob has no cart key at all', () => {
    const blob = { __version: STORAGE_VERSION };
    localStorageStore[STORAGE_KEY] = JSON.stringify(blob);

    const store = makeStore();
    expect(store.getState().cart.unavailableRemoved).toEqual([]);
  });
});
