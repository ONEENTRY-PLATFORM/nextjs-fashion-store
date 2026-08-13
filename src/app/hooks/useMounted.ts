'use client';
import { useSyncExternalStore } from 'react';

/** No-op subscribe: the value never changes after hydration. */
const subscribe = () => () => {};
const getSnapshot = () => true;
const getServerSnapshot = () => false;

/** `false` during SSR and the hydration pass, `true` afterwards. */
export function useMounted(): boolean {
  return useSyncExternalStore(subscribe, getSnapshot, getServerSnapshot);
}
