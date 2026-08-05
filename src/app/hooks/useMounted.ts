'use client';
import { useSyncExternalStore } from 'react';

/** No-op subscribe: the value never changes after hydration. */
const subscribe = () => () => {};
const getSnapshot = () => true;
const getServerSnapshot = () => false;

/**
 * `false` during SSR and the hydration pass, `true` afterwards — the standard
 * guard for markup that must not differ between server and client (persisted
 * cart / wishlist counts, locale-formatted dates, `window`-derived values).
 *
 * Implemented with `useSyncExternalStore` rather than the usual
 * `useState(false)` + `useEffect(() => setMounted(true))`: that pattern is a
 * synchronous `setState` inside an effect, which React flags as a cascading
 * render (MCP `common-mistakes`, "Calling setState synchronously inside
 * useEffect"). `useSyncExternalStore` gives the same two-phase value with a
 * single render pass and is the officially sanctioned way to read
 * "am I hydrated yet".
 * @returns {boolean} `true` once the component is running in the browser.
 */
export function useMounted(): boolean {
  return useSyncExternalStore(subscribe, getSnapshot, getServerSnapshot);
}
