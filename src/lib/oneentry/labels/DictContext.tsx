'use client';

import { createContext, useContext, useMemo, type ReactNode } from 'react';
import type { Dictionary } from '../dictionary';
import { mergeDict } from './dict';

/**
 * The one client-side handle on the CMS dictionary.
 *
 * Replaces the seventeen per-screen label contexts this storefront used to
 * mount: attribute markers are unique tenant-wide, so which admin-side set a
 * key belongs to is not information a component needs. One provider, one
 * namespace, three readers — {@link useT} for a single string, {@link useDict}
 * for a whole label object, {@link useList} for comma-separated values.
 *
 * The value is `null` when no provider is mounted (Storybook, isolated unit
 * tests, a Client Component rendered outside the root layout). Every reader
 * degrades to its inline fallback in that case rather than throwing, which is
 * what keeps `next build`'s static prerender of `/_not-found` working.
 */
const Ctx = createContext<Dictionary | null>(null);

/**
 * Publish the dictionary loaded server-side by `getDictionary()`.
 * @param   {object}       props          - Provider props.
 * @param   {Dictionary}   props.data     - Flat `marker → value` map.
 * @param   {ReactNode}    props.children - Subtree that reads the dictionary.
 * @returns {ReactNode}                   The provided subtree.
 */
export function DictProvider({
  data,
  children,
}: {
  data: Dictionary;
  children: ReactNode;
}) {
  return <Ctx.Provider value={data}>{children}</Ctx.Provider>;
}

/**
 * Read one label, falling back to the shipped English copy when the CMS has no
 * value for the marker (or no provider is mounted).
 * @param   {string} key      - Attribute marker, e.g. `header_search_label`.
 * @param   {string} fallback - Inline copy used when the CMS has nothing.
 * @returns {string}          The resolved label.
 */
export function useT(key: string, fallback: string): string {
  const dict = useContext(Ctx);
  const value = dict?.[key];
  return typeof value === 'string' && value.length > 0 ? value : fallback;
}

/**
 * Overlay a whole local label object with the admin panel's values.
 *
 * `useDict('checkout_delivery_', LABELS)` reads
 * `checkout_delivery_<snake_case_key>` for every string in `LABELS`. Non-string
 * entries pass through untouched — they are structure, not copy. See `dict.ts`
 * for the naming convention.
 * @param   {string} prefix    - Marker prefix, usually `${setMarker}_`.
 * @param   {object} fallbacks - Local dictionary; also the shape of the result.
 * @returns {object}           `fallbacks` with CMS values overlaid.
 */
export function useDict<T extends Record<string, unknown>>(
  prefix: string,
  fallbacks: T,
): T {
  const dict = useContext(Ctx);
  return useMemo(
    () => mergeDict(dict ?? undefined, prefix, fallbacks),
    [dict, prefix, fallbacks],
  );
}

/**
 * Read a comma-separated label as a list (e.g. shipping regions).
 *
 * Falls back to the local array when the key is missing, empty, or contains
 * only separators.
 * @param   {string}            key      - Attribute marker holding the CSV.
 * @param   {readonly string[]} fallback - Inline list used when the CMS has none.
 * @returns {string[]}                   Trimmed, non-empty entries.
 */
export function useList(key: string, fallback: readonly string[]): string[] {
  const dict = useContext(Ctx);
  const raw = dict?.[key];
  if (typeof raw !== 'string' || raw.trim().length === 0) return [...fallback];
  const parts = raw.split(',').map((s) => s.trim()).filter(Boolean);
  return parts.length > 0 ? parts : [...fallback];
}
