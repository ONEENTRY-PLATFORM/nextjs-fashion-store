'use client';
import { createContext, useContext, type ReactNode } from 'react';
import type { HeaderDict } from './header-types';
import type { CmsLocale } from '../locales';

interface HeaderData {
  labels: HeaderDict;
  /** Active project locales — the language switcher renders from these. */
  locales: CmsLocale[];
}

const Ctx = createContext<HeaderData | null>(null);

export function HeaderLabelsProvider({
  data,
  children,
}: {
  data: HeaderData;
  children: ReactNode;
}) {
  return <Ctx.Provider value={data}>{children}</Ctx.Provider>;
}

/** Read a header label, falling back to the local constant when OE has none. */
export function useHeaderT(key: string, fallback: string): string {
  const data = useContext(Ctx);
  if (!data) return fallback;
  return data.labels[key] ?? fallback;
}

/**
 * Read a comma-separated header label as a list (e.g. shipping regions).
 * Falls back to the local array when the key is missing or empty.
 */
export function useHeaderList(key: string, fallback: readonly string[]): string[] {
  const data = useContext(Ctx);
  const raw = data?.labels[key];
  if (typeof raw !== 'string' || raw.trim().length === 0) return [...fallback];
  const parts = raw.split(',').map((s) => s.trim()).filter(Boolean);
  return parts.length > 0 ? parts : [...fallback];
}

/**
 * Active locales from the OneEntry project settings.
 *
 * The language switcher is driven by what the tenant actually publishes, not a
 * hardcoded list — adding a locale in the admin panel surfaces it here.
 * Returns an empty array when the CMS is unreachable; callers decide whether to
 * hide the switcher or show their default.
 */
export function useCmsLocales(): CmsLocale[] {
  return useContext(Ctx)?.locales ?? [];
}
