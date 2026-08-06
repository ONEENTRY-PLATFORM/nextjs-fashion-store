'use client';
import { createContext, useContext, useMemo, type ReactNode } from 'react';
import { mergeDict } from './dict';
import type { AccountSetMarker, AccountSystemTexts } from './account-types';

const Ctx = createContext<AccountSystemTexts | null>(null);

export function AccountLabelsProvider({
  data,
  children,
}: {
  data: AccountSystemTexts;
  children: ReactNode;
}) {
  return <Ctx.Provider value={data}>{children}</Ctx.Provider>;
}

export function useT(
  set: AccountSetMarker,
  key: string,
  fallback: string,
): string {
  const data = useContext(Ctx);
  if (!data) return fallback;
  return data[set]?.[key] ?? fallback;
}

/**
 * Overlay a whole local dictionary with the admin panel's values.
 *
 * `useDict('checkout_delivery', 'checkout_delivery_', LABELS)` reads
 * `checkout_delivery_<snake_case_key>` for every string in `LABELS`. See
 * `dict.ts` for the naming convention.
 */
export function useAccountDict<T extends Record<string, unknown>>(
  set: AccountSetMarker,
  prefix: string,
  fallbacks: T,
): T {
  const data = useContext(Ctx);
  const dict = data?.[set];
  return useMemo(() => mergeDict(dict, prefix, fallbacks), [dict, prefix, fallbacks]);
}
