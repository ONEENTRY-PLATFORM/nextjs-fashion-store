'use client';

import { createContext, type ReactNode, useContext, useMemo } from 'react';

import type { Dictionary } from '@/lib/oneentry/dictionary';

import { mergeDict } from './dict';

/** The one client-side handle on the CMS dictionary. */
const Ctx = createContext<Dictionary | null>(null);

/** Publish the dictionary loaded server-side by `getDictionary()`. */
export function DictProvider({ data, children }: { data: Dictionary; children: ReactNode }) {
  return <Ctx.Provider value={data}>{children}</Ctx.Provider>;
}

/** Read one label, falling back to the shipped English copy when the CMS has no value for the marker. */
export function useT(key: string, fallback: string): string {
  const dict = useContext(Ctx);
  const value = dict?.[key];
  return typeof value === 'string' && value.length > 0 ? value : fallback;
}

/** Overlay a whole local label object with the admin panel's values. */
export function useDict<T extends Record<string, unknown>>(prefix: string, fallbacks: T): T {
  const dict = useContext(Ctx);
  return useMemo(() => mergeDict(dict ?? undefined, prefix, fallbacks), [dict, prefix, fallbacks]);
}

/** Read a comma-separated label as a list (e.g. shipping regions). */
export function useList(key: string, fallback: readonly string[]): string[] {
  const dict = useContext(Ctx);
  const raw = dict?.[key];
  if (typeof raw !== 'string' || raw.trim().length === 0) return [...fallback];
  const parts = raw
    .split(',')
    .map((s) => s.trim())
    .filter(Boolean);
  return parts.length > 0 ? parts : [...fallback];
}
